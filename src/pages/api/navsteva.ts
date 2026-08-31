import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { cudziPovod } from '../../lib/povod';

export const prerender = false;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ZARIADENIA = ['mobile', 'desktop', 'unknown'] as const;

/* Zatriedenie odkazovača. Klient posiela iba doménu, tu z nej robíme
   kategóriu. Rozhoduje sa na serveri, nie v prehliadači: pravidlo sa dá
   zmeniť jedným nasadením a staré beacony ho hneď rešpektujú. */
const ZDROJE: Array<[RegExp, string]> = [
  [/(^|\.)google\./, 'google'],
  [/(^|\.)seznam\.cz$/, 'seznam'],
  [/(^|\.)(bing|duckduckgo|ecosia|yahoo)\./, 'bing'],
  [/(^|\.)(facebook\.com|fb\.com|m\.facebook\.com|l\.facebook\.com|lm\.facebook\.com)$/, 'facebook'],
  [/(^|\.)(instagram\.com|l\.instagram\.com)$/, 'instagram'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)(mail\.|webmail\.|outlook\.|gmail\.)/, 'email'],
];

function zatried(odkazovac: string | null): string {
  if (!odkazovac) return 'priamo';
  for (const [vzor, zdroj] of ZDROJE) if (vzor.test(odkazovac)) return zdroj;
  return 'ine';
}

/* Roboty, ktoré spúšťajú JavaScript (náhľady odkazov, monitoring, časť
   crawlerov). Bez tohto filtra by nám do návštevnosti tiekli stroje.
   Bežné crawlery sem nedôjdu, tie JavaScript nepustia vôbec. */
const ROBOT = /bot|crawl|spider|slurp|headless|preview|lighthouse|pagespeed|monitor|uptime|curl|wget|python|scrapy|facebookexternalhit|whatsapp|telegram|discord|vercel-screenshot/i;

export const POST: APIRoute = async ({ request }) => {
  // Beacon chodí z našich stránok. Cudzí pôvod nemá čo plniť telemetriu.
  const cudzia = cudziPovod(request);
  if (cudzia) return cudzia;

  const ua = request.headers.get('user-agent') ?? '';
  // Robot dostane 204 ako každý iný. Nech nevie, že sme ho nezapočítali.
  if (!ua || ROBOT.test(ua)) return new Response(null, { status: 204 });

  const raw = await request.text().catch(() => '');
  let b: Record<string, unknown> | null = null;
  try { b = JSON.parse(raw); } catch { return json({ error: 'Neplatná požiadavka.' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: 'Neplatná požiadavka.' }, 400);

  const cesta = String(b.cesta ?? '');
  if (!/^\/[\w\-/]{0,199}$/.test(cesta)) return json({ error: 'Neplatná cesta.' }, 400);

  const zariadenie = String(b.zariadenie ?? 'unknown');
  const nova = b.nova === true;

  /* Odkazovač: berieme len doménu a len keď vyzerá ako doména. Vlastnú
     doménu zahadzujeme, preklik v rámci webu nie je zdroj návštevy. */
  let odkazovac: string | null = typeof b.odkazovac === 'string' ? b.odkazovac.toLowerCase().slice(0, 100) : null;
  if (odkazovac && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(odkazovac)) odkazovac = null;
  if (odkazovac && /(^|\.)paciga\.sk$/.test(odkazovac)) odkazovac = null;

  const krajinaRaw = request.headers.get('x-vercel-ip-country') ?? '';
  const krajina = /^[A-Za-z]{2}$/.test(krajinaRaw) ? krajinaRaw.toUpperCase() : null;

  if (!supabase) return json({ error: 'Databáza nie je nakonfigurovaná.' }, 503);

  const { error } = await supabase.from('navstevy').insert({
    cesta,
    zdroj: zatried(odkazovac),
    odkazovac,
    zariadenie: ZARIADENIA.includes(zariadenie as typeof ZARIADENIA[number]) ? zariadenie : 'unknown',
    nova,
    krajina,
  });

  // Telemetria nesmie nikdy rušiť návštevníka. Aj pri chybe vraciame 204.
  if (error) console.error('[navsteva]', error.message);
  return new Response(null, { status: 204 });
};
