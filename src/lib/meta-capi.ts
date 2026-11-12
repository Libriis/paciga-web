/* Meta Conversions API (CAPI): udalosti zo servera do Meta Pixela.

   Pixel v prehliadači (Base.astro) a tento modul posielajú tú istú udalosť
   s rovnakým event_id. Meta ich spáruje a zaráta raz. Server doplní to, čo
   prehliadač nevie spoľahlivo: IP adresu, user agent a pri dopyte odtlačok
   e-mailu a telefónu. Blokovač reklám serverovú cestu nezastaví.

   Súhlas: server posiela LEN keď prehliadač výslovne povie, že návštevník
   klikol Súhlasím. Volajúci (api/meta.ts, api/kontakt.ts) to musí overiť
   skôr, než zavolá posliMeta().

   Token: META_CAPI_TOKEN vo Verceli (Events Manager > Pixel > Settings >
   Conversions API > Generate access token). Bez tokenu modul ticho nič
   nerobí. Na skúšku v Test Events sa dá nastaviť META_TEST_EVENT_CODE.
   Oba sa čítajú za behu cez zaBehu(), nie import.meta.env (src/lib/env.ts). */

import { zaBehu } from './env';

/** Pixel „Paciga-web-navstevy" v Events Manageri. ID je verejné, je aj v HTML. */
export const META_PIXEL_ID = '1378451786193317';
const GRAPH = 'https://graph.facebook.com/v24.0';

export type MetaUdalost = 'PageView' | 'ViewContent' | 'FindLocation' | 'Contact' | 'Lead';

/** Kategórie pre ViewContent a FindLocation. Prehliadač posiela len tieto,
    čokoľvek iné server zahodí. Parte, kondolencie a sviečky sem nepatria. */
export const KATEGORIE = ['pohrebne-sluzby', 'kamenarstvo', 'sperky', 'pobocka', 'kontakt'] as const;
export type Kategoria = (typeof KATEGORIE)[number];

export type MetaVstup = {
  udalost: MetaUdalost;
  eventId: string;
  url: string;
  ip?: string;
  ua?: string;
  fbp?: string;
  fbc?: string;
  email?: string;
  telefon?: string;
  kategoria?: Kategoria;
};

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Telefón podľa pravidiel Meta: len číslice, s predvoľbou krajiny.
    Slovenské 09xx xxx xxx sa zmení na 4219xx xxx xxx. */
export function telefonE164(t: string): string | null {
  let c = t.trim();
  if (c.startsWith('+')) c = c.slice(1);
  else if (c.startsWith('00')) c = c.slice(2);
  c = c.replace(/\D/g, '');
  if (!c) return null;
  if (c.startsWith('0')) c = '421' + c.slice(1);
  return c.length >= 9 && c.length <= 15 ? c : null;
}

/* Formát cookies, ktoré nastavuje fbevents.js: fb.1.<čas>.<náhoda>.
   Čokoľvek iné zahadzujeme, nech do Meta neodíde náhodný text. */
const FB_COOKIE = /^fb\.\d\.\d{10,13}\.[\w.-]{1,200}$/;
export const EVENT_ID = /^[\w-]{8,64}$/;

/** Pošle jednu udalosť do Meta. Nikdy nevyhodí chybu; vráti true pri 2xx. */
export async function posliMeta(v: MetaVstup): Promise<boolean> {
  const token = zaBehu('META_CAPI_TOKEN');
  if (!token) return false;
  if (!EVENT_ID.test(v.eventId)) return false;

  const user_data: Record<string, unknown> = {};
  if (v.ip) user_data.client_ip_address = v.ip;
  if (v.ua) user_data.client_user_agent = v.ua.slice(0, 500);
  if (v.fbp && FB_COOKIE.test(v.fbp)) user_data.fbp = v.fbp;
  if (v.fbc && FB_COOKIE.test(v.fbc)) user_data.fbc = v.fbc;
  const email = v.email?.trim().toLowerCase();
  if (email && email.includes('@')) user_data.em = [await sha256(email)];
  const tel = v.telefon ? telefonE164(v.telefon) : null;
  if (tel) user_data.ph = [await sha256(tel)];
  // Všetci zákazníci sú zo Slovenska. Krajina zlepší párovanie, nič neprezradí.
  user_data.country = [await sha256('sk')];

  const telo: Record<string, unknown> = {
    data: [{
      event_name: v.udalost,
      event_time: Math.floor(Date.now() / 1000),
      event_id: v.eventId,
      event_source_url: v.url,
      action_source: 'website',
      user_data,
      ...(v.kategoria ? { custom_data: { content_category: v.kategoria } } : {}),
    }],
  };
  const test = zaBehu('META_TEST_EVENT_CODE');
  if (test) telo.test_event_code = test;

  try {
    const r = await fetch(`${GRAPH}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telo),
      // Meta nesmie zdržať odpoveď formulára. Radšej stratiť jednu udalosť.
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) console.error('meta-capi', v.udalost, r.status, (await r.text().catch(() => '')).slice(0, 300));
    return r.ok;
  } catch (e) {
    console.error('meta-capi', v.udalost, String(e).slice(0, 200));
    return false;
  }
}

/** Údaje z tela požiadavky, ktoré prehliadač posiela len so súhlasom.
    Vráti null, keď súhlas chýba alebo je event_id neplatné. */
export function metaZTela(m: unknown): { eventId: string; fbp?: string; fbc?: string } | null {
  if (!m || typeof m !== 'object') return null;
  const o = m as Record<string, unknown>;
  if (o.suhlas !== true) return null;
  const eventId = typeof o.eventId === 'string' ? o.eventId : '';
  if (!EVENT_ID.test(eventId)) return null;
  return {
    eventId,
    fbp: typeof o.fbp === 'string' ? o.fbp : undefined,
    fbc: typeof o.fbc === 'string' ? o.fbc : undefined,
  };
}

/** URL udalosti: len náš web, bez query (môže niesť e-mail alebo fbclid). */
export function nasaUrl(u: unknown): string | null {
  if (typeof u !== 'string' || u.length > 500) return null;
  try {
    const x = new URL(u);
    if (!/^(www\.)?paciga\.sk$/.test(x.hostname)) return null;
    return `https://www.paciga.sk${x.pathname}`;
  } catch {
    return null;
  }
}
