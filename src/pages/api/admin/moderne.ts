/* Most medzi adminom a Moderným pohrebníctvom (MP).

   Kľúč k MP je tajný, preto ho drží server a prehliadač sa pýta tu.
   Zapisovať do databázy nič nemusí: parte zakladá admin v prehliadači
   pod vlastným prihlásením, ako všetko ostatné v admine. RLS a denník
   aktivity tak vidia skutočného človeka.

   GET ?cursor=…          stránka zoznamu pohrebov (polia parte)
   GET ?id=…              detail jedného pohrebu (aj pohlavie a stav portrétu)
   GET ?id=…&foto=…       portrét zmenšený na 900 px WebP

   Prístup: hlavička Authorization: Bearer <access_token zo Supabase>.
   Token overí Supabase a ma_pristup('web') rozhodne, či môže na parte.
   Cookies sa tu nepoužívajú, takže cudzia stránka nemá čo zneužiť (CSRF). */
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { ChybaMp, detailPohrebu, portretWebp, zoznamPohrebov } from '../../../lib/moderne';
import { ID_MP } from '../../../lib/moderne-mapa';

export const prerender = false;

const json = (body: object, status = 200, hlavicky: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...hlavicky },
  });

/** Vráti hotovú odpoveď, keď volajúci nie je admin s právom 'web'. */
async function overPristup(request: Request): Promise<Response | null> {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return json({ error: 'Databáza nie je nakonfigurovaná.' }, 503);

  const token = /^Bearer\s+([\w.-]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return json({ error: 'Nie si prihlásený.' }, 401);

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  // Neplatný alebo vypršaný token PostgREST odmietne chybou. Anon funkciu
  // ma_pristup volať nesmie vôbec (revoke v schema-pristupy.sql).
  const { data, error } = await sb.rpc('ma_pristup', { p_sekcia: 'web' });
  if (error) return json({ error: 'Prihlásenie vypršalo. Obnov stránku.' }, 401);
  if (data !== true) return json({ error: 'Na parte nemáš právo.' }, 403);
  return null;
}

export const GET: APIRoute = async ({ request, url }) => {
  const zamietnute = await overPristup(request);
  if (zamietnute) return zamietnute;

  const id = url.searchParams.get('id');
  const foto = url.searchParams.get('foto');
  const kurzor = url.searchParams.get('cursor');

  try {
    if (id !== null) {
      if (!ID_MP.test(id)) return json({ error: 'Neplatné ID pohrebu.' }, 400);
      if (foto !== null) {
        if (!/^[\w.-]{1,100}$/.test(foto)) return json({ error: 'Neplatné ID fotky.' }, 400);
        const webp = await portretWebp(id, foto);
        return new Response(webp, {
          headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store' },
        });
      }
      return json(await detailPohrebu(id));
    }
    if (kurzor !== null && (kurzor.length < 1 || kurzor.length > 512)) {
      return json({ error: 'Neplatný kurzor.' }, 400);
    }
    return json(await zoznamPohrebov(kurzor));
  } catch (e) {
    if (e instanceof ChybaMp) {
      return json({ error: e.message }, e.status >= 400 && e.status < 600 ? e.status : 502,
        e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {});
    }
    console.error('[moderne]', e);
    return json({ error: 'Niečo sa pokazilo pri komunikácii s Moderným pohrebníctvom.' }, 500);
  }
};
