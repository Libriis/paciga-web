import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const METRIKY = ['LCP', 'CLS', 'INP', 'FCP', 'TTFB'] as const;
const RATINGY = ['good', 'needs-improvement', 'poor'] as const;
const ZARIADENIA = ['mobile', 'desktop', 'unknown'] as const;

// Horné hranice pre zjavný nezmysel. Beacon je verejný endpoint, takže
// beriem len hodnoty, ktoré vedia vzniknúť v prehliadači.
const MAX: Record<string, number> = { LCP: 120000, CLS: 100, INP: 120000, FCP: 120000, TTFB: 120000 };

export const POST: APIRoute = async ({ request }) => {
  // Vstup sa validuje pred kontrolou databázy. Nezmysel má padnúť vždy,
  // nielen keď je Supabase po ruke, a dá sa to overiť aj lokálne.

  // Beacon chodí ako application/json (text/plain zhodí Astro CSRF ochrana
  // na 403). Telo aj tak čítame ako text, aby prešlo čokoľvek validné.
  const raw = await request.text().catch(() => '');
  let b: Record<string, unknown> | null = null;
  try { b = JSON.parse(raw); } catch { return json({ error: 'Neplatná požiadavka.' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: 'Neplatná požiadavka.' }, 400);

  const metrika = String(b.metrika ?? '');
  const rating = String(b.rating ?? '');
  const hodnota = Number(b.hodnota);
  const cesta = String(b.cesta ?? '');

  if (!METRIKY.includes(metrika as typeof METRIKY[number])) return json({ error: 'Neplatná metrika.' }, 400);
  if (!RATINGY.includes(rating as typeof RATINGY[number])) return json({ error: 'Neplatný rating.' }, 400);
  if (!Number.isFinite(hodnota) || hodnota < 0 || hodnota > MAX[metrika]) return json({ error: 'Neplatná hodnota.' }, 400);
  if (!/^\/[\w\-/]{0,199}$/.test(cesta)) return json({ error: 'Neplatná cesta.' }, 400);

  const zariadenie = String(b.zariadenie ?? 'unknown');
  const siet = typeof b.siet === 'string' ? b.siet.slice(0, 20) : null;
  const navigacia = typeof b.navigacia === 'string' ? b.navigacia.slice(0, 20) : null;

  if (!supabase) return json({ error: 'Databáza nie je nakonfigurovaná.' }, 503);

  const { error } = await supabase.from('web_vitals').insert({
    metrika,
    hodnota,
    rating,
    cesta,
    zariadenie: ZARIADENIA.includes(zariadenie as typeof ZARIADENIA[number]) ? zariadenie : 'unknown',
    siet,
    navigacia,
  });

  // Telemetria nesmie nikdy rušiť návštevníka. Aj pri chybe vraciame 204.
  if (error) console.error('[vitals]', error.message);
  return new Response(null, { status: 204 });
};
