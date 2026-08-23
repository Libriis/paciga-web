import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { rateLimitOk } from '../../lib/ratelimit';

export const prerender = false;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// HMAC podpis požiadavky (23. 8. 2026). Databázová funkcia zapal_sviecku
// ho overí proti kľúču, ktorý pozná len server a databáza. Bez neho sa
// dala sviečka zapáliť priamym volaním RPC s vymysleným ip_hash a počítadlo
// sa dalo nafúknuť donekonečna. Kľúč je vo Vercel env SVIECKA_RPC_SECRET
// aj v tabuľke private.app_secret; obe hodnoty sa musia zhodovať.
async function hmacHex(sprava: string, kluc: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(kluc),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(sprava));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!supabase) return json({ error: 'Databáza nie je nakonfigurovaná.' }, 503);

  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === 'string' ? body.slug : '';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return json({ error: 'Neplatná požiadavka.' }, 400);

  // 1 sviečka na IP a deň pre každé parte — hash IP sa nikde neukladá v čitateľnej podobe
  let ip = 'unknown';
  try { ip = clientAddress; } catch { /* lokálny build bez adaptéra */ }

  // burst limit: max 30 pokusov za hodinu z jednej IP (proti enumerácii parte)
  if (!(await rateLimitOk('sviecka', ip, 30, 3600))) {
    return json({ error: 'Priveľa požiadaviek. Skúste to prosím o chvíľu.' }, 429);
  }

  const ipHash = await sha256(`${ip}|${import.meta.env.SVIECKA_SALT ?? 'paciga-sviecka'}`);

  // Bez podpisového kľúča RPC odmietne, takže radšej zrozumiteľná chyba
  // než tiché „parte sa nenašlo“. V produkcii je kľúč vždy nastavený.
  const secret = import.meta.env.SVIECKA_RPC_SECRET;
  if (!secret) return json({ error: 'Databáza nie je nakonfigurovaná.' }, 503);
  const sig = await hmacHex(`${slug}:${ipHash}`, secret);

  const { data, error } = await supabase.rpc('zapal_sviecku', { p_slug: slug, p_ip_hash: ipHash, p_sig: sig });
  if (error) return json({ error: 'Sviečku sa nepodarilo zapáliť.' }, 500);
  if (data === null) return json({ error: 'Parte sa nenašlo.' }, 404);

  return json({ sviecky: data });
};
