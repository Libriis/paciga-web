import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { cudziPovod } from '../../lib/povod';

export const prerender = false;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const METRIKY = ['LCP', 'CLS', 'INP', 'FCP', 'TTFB'] as const;
const RATINGY = ['good', 'needs-improvement', 'poor'] as const;
const ZARIADENIA = ['mobile', 'desktop', 'unknown'] as const;

// Horné hranice pre zjavný nezmysel. Beacon je verejný endpoint, takže
// beriem len hodnoty, ktoré vedia vzniknúť v prehliadači.
const MAX: Record<string, number> = { LCP: 120000, CLS: 100, INP: 120000, FCP: 120000, TTFB: 120000 };

// Jeden beacon nesie metriky jedného zobrazenia, teda najviac päť.
// Rezerva pre prípad, že web-vitals niektorú ohlási znova.
const MAX_METRIK = 10;

type Metrika = { metrika: string; hodnota: number; rating: string; navigacia: string | null };

/** Overí jednu metriku. Vráti hotovú časť riadku, alebo text chyby. */
function overMetriku(m: unknown): Metrika | string {
  if (!m || typeof m !== 'object') return 'Neplatná metrika.';
  const o = m as Record<string, unknown>;
  const metrika = String(o.metrika ?? '');
  const rating = String(o.rating ?? '');
  const hodnota = Number(o.hodnota);

  if (!METRIKY.includes(metrika as typeof METRIKY[number])) return 'Neplatná metrika.';
  if (!RATINGY.includes(rating as typeof RATINGY[number])) return 'Neplatný rating.';
  if (!Number.isFinite(hodnota) || hodnota < 0 || hodnota > MAX[metrika]) return 'Neplatná hodnota.';

  const navigacia = typeof o.navigacia === 'string' ? o.navigacia.slice(0, 20) : null;
  return { metrika, hodnota, rating, navigacia };
}

export const POST: APIRoute = async ({ request }) => {
  // Beacon chodí z našich stránok. Cudzí pôvod nemá čo plniť telemetriu.
  const cudzia = cudziPovod(request);
  if (cudzia) return cudzia;

  // Vstup sa validuje pred kontrolou databázy. Nezmysel má padnúť vždy,
  // nielen keď je Supabase po ruke, a dá sa to overiť aj lokálne.

  // Beacon chodí ako application/json (text/plain zhodí Astro CSRF ochrana
  // na 403). Telo aj tak čítame ako text, aby prešlo čokoľvek validné.
  const raw = await request.text().catch(() => '');
  let b: Record<string, unknown> | null = null;
  try { b = JSON.parse(raw); } catch { return json({ error: 'Neplatná požiadavka.' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: 'Neplatná požiadavka.' }, 400);

  // Od 18. 9. 2026 nesie beacon všetky metriky zobrazenia v poli `metriky`.
  // Jedna metrika priamo v tele je starý formát. vitals.js má krátku cache
  // (max-age=0 a SWR 60 s), takže ho prehliadač môže ešte chvíľu posielať.
  // Prijímame oba.
  const polozky: unknown[] = Array.isArray(b.metriky) ? b.metriky : [b];
  if (polozky.length === 0 || polozky.length > MAX_METRIK) return json({ error: 'Neplatná požiadavka.' }, 400);

  // Neplatnú metriku zahodíme a zvyšok uložíme. Jedna odľahlá hodnota
  // (napríklad TTFB nad strop) nesmie vziať so sebou ostatné, rovnako ako
  // keď chodila každá zvlášť. 400 len vtedy, keď neprejde ani jedna.
  const overene = polozky.map(overMetriku);
  const platne = overene.filter((v): v is Metrika => typeof v !== 'string');
  if (platne.length === 0) return json({ error: overene[0] as string }, 400);

  const cesta = String(b.cesta ?? '');
  if (!/^\/[\w\-/]{0,199}$/.test(cesta)) return json({ error: 'Neplatná cesta.' }, 400);

  const zariadenieRaw = String(b.zariadenie ?? 'unknown');
  const zariadenie = ZARIADENIA.includes(zariadenieRaw as typeof ZARIADENIA[number]) ? zariadenieRaw : 'unknown';
  const siet = typeof b.siet === 'string' ? b.siet.slice(0, 20) : null;

  if (!supabase) return json({ error: 'Databáza nie je nakonfigurovaná.' }, 503);

  const { error } = await supabase.from('web_vitals').insert(
    platne.map((m) => ({ ...m, cesta, zariadenie, siet })),
  );

  // Telemetria nesmie nikdy rušiť návštevníka. Aj pri chybe vraciame 204.
  if (error) console.error('[vitals]', error.message);
  return new Response(null, { status: 204 });
};
