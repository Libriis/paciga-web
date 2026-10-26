/* Kondolencie pozostalým: náhľad e-mailu a odoslanie rodine.

   GET  ?parte=<id>                  náhľad e-mailu, počty a história odoslaní
   POST { parte, emaily: [...] }     pošle schválené kondolencie, každému zvlášť

   Každý adresát dostane vlastný e-mail, nie jeden spoločný. Pozostalí tak
   nevidia adresy jeden druhého.

   Prístup ako /api/admin/moderne: hlavička Authorization: Bearer <access_token
   zo Supabase> a právo 'web'. Databázu číta aj zapisuje pod prihlásením
   obsluhy, takže RLS aj denník aktivity vidia skutočného človeka.
   Cookies sa tu nepoužívajú, takže cudzia stránka nemá čo zneužiť (CSRF).
   Tabuľka záznamov: supabase/schema-kondolencie-odoslania.sql. */
import type { APIRoute } from 'astro';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendBatch } from '../../../lib/email';
import { zaBehu } from '../../../lib/env';
import { rateLimitOk } from '../../../lib/ratelimit';
import { zostavEmail, type KondolenciaEmail, type ParteEmail } from '../../../lib/kondolencie-email';

export const prerender = false;

/** Najviac adries na jedno odoslanie. Drží to aj check v databáze. */
const MAX_ADRIES = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const odosielatel = () => zaBehu('KONDOLENCIE_FROM') ?? 'Pohrebné služby Paciga <kondolencie@paciga.sk>';

type Pristup = { sb: SupabaseClient; userId: string };

/** Klient pod prihlásením obsluhy, alebo hotová odpoveď s chybou. */
async function overPristup(request: Request): Promise<Pristup | Response> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return json({ error: 'Databáza nie je nakonfigurovaná.' }, 503);

  const token = /^Bearer\s+([\w.-]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return json({ error: 'Nie si prihlásený.' }, 401);

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const [pouzivatel, web] = await Promise.all([
    sb.auth.getUser(token),
    sb.rpc('ma_pristup', { p_sekcia: 'web' }),
  ]);
  if (pouzivatel.error || !pouzivatel.data.user || web.error) {
    return json({ error: 'Prihlásenie vypršalo. Obnov stránku.' }, 401);
  }
  if (web.data !== true) return json({ error: 'Na parte nemáš právo.' }, 403);
  return { sb, userId: pouzivatel.data.user.id };
}

/** Parte a jeho kondolencie. Do e-mailu idú len schválené, od najstaršej. */
async function nacitaj(sb: SupabaseClient, id: string) {
  const [p, k, c] = await Promise.all([
    sb.from('parte')
      .select('meno, slug, datum_narodenia, datum_umrtia, foto_url, published, sviecky')
      .eq('id', id).maybeSingle(),
    sb.from('kondolencie')
      .select('meno, odkaz, created_at')
      .eq('parte_id', id).eq('schvalene', true).order('created_at', { ascending: true }),
    sb.from('kondolencie')
      .select('id', { count: 'exact', head: true })
      .eq('parte_id', id).eq('schvalene', false),
  ]);
  if (p.error || k.error) throw new Error(p.error?.message || k.error?.message);
  return {
    parte: p.data as ParteEmail | null,
    kondolencie: (k.data || []) as KondolenciaEmail[],
    cakaju: c.count ?? 0,
  };
}

export const GET: APIRoute = async ({ request, url }) => {
  const pristup = await overPristup(request);
  if (pristup instanceof Response) return pristup;
  const { sb } = pristup;

  const id = url.searchParams.get('parte') ?? '';
  if (!UUID.test(id)) return json({ error: 'Neplatné parte.' }, 400);

  try {
    const { parte, kondolencie, cakaju } = await nacitaj(sb, id);
    if (!parte) return json({ error: 'Parte sa nenašlo.' }, 404);

    // Keď tabuľka záznamov ešte nie je v databáze, náhľad aj odoslanie
    // fungujú ďalej. História je potom null a admin to povie.
    const h = await sb.from('kondolencie_odoslania')
      .select('created_at, komu, pocet, odoslal_email')
      .eq('parte_id', id).order('created_at', { ascending: false });

    const email = kondolencie.length ? zostavEmail(parte, kondolencie) : null;
    return json({
      parte: { meno: parte.meno, slug: parte.slug, published: parte.published },
      pocet: kondolencie.length,
      cakaju,
      od: odosielatel(),
      predmet: email?.predmet ?? null,
      html: email?.html ?? null,
      odoslania: h.error ? null : h.data,
    });
  } catch (e) {
    console.error('[kondolencie-pozostalym]', e);
    return json({ error: 'Kondolencie sa nepodarilo načítať.' }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const pristup = await overPristup(request);
  if (pristup instanceof Response) return pristup;
  const { sb, userId } = pristup;

  const body = await request.json().catch(() => null);
  const id = typeof body?.parte === 'string' ? body.parte : '';
  if (!UUID.test(id)) return json({ error: 'Neplatné parte.' }, 400);

  const surove: unknown[] = Array.isArray(body?.emaily) ? body.emaily : [];
  const emaily = [...new Set(surove
    .filter((e): e is string => typeof e === 'string')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean))];
  if (emaily.length === 0) return json({ error: 'Zadaj aspoň jednu e-mailovú adresu.' }, 400);
  if (emaily.length > MAX_ADRIES) return json({ error: `Naraz sa dá poslať najviac na ${MAX_ADRIES} adries.` }, 400);
  const zla = emaily.find((e) => e.length > 254 || !EMAIL.test(e));
  if (zla) return json({ error: `Adresa „${zla}" nevyzerá ako e-mail. Skontroluj ju.` }, 400);

  // Poistka pre prípad ukradnutého prihlásenia: náš e-mail nesmie
  // poslúžiť na hromadné rozosielanie. Bežná práca sa sem nedostane.
  if (!(await rateLimitOk('kondolencie-pozostalym', userId, 20, 3600))) {
    return json({ error: 'Priveľa odoslaní za hodinu. Skús to neskôr.' }, 429);
  }

  try {
    const { parte, kondolencie } = await nacitaj(sb, id);
    if (!parte) return json({ error: 'Parte sa nenašlo.' }, 404);
    if (!kondolencie.length) {
      return json({ error: 'Pri tomto parte nie je žiadna schválená kondolencia.' }, 400);
    }

    const { predmet, html, text } = zostavEmail(parte, kondolencie);
    const from = odosielatel();
    const chyba = await sendBatch(emaily.map((to) => ({ from, to, subject: predmet, html, text })));
    if (chyba) return json({ error: chyba }, 502);

    const zaznam = await sb.from('kondolencie_odoslania')
      .insert({ parte_id: id, komu: emaily, pocet: kondolencie.length, odoslal: userId });
    if (zaznam.error) console.error('[kondolencie-pozostalym] zaznam', zaznam.error);

    return json({
      ok: true,
      odoslane: emaily.length,
      pocet: kondolencie.length,
      ...(zaznam.error ? { varovanie: 'E-maily odišli, ale záznam o odoslaní sa neuložil.' } : {}),
    });
  } catch (e) {
    console.error('[kondolencie-pozostalym]', e);
    return json({ error: 'Kondolencie sa nepodarilo odoslať.' }, 500);
  }
};
