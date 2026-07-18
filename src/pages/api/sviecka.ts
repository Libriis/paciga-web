import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!supabase) return json({ error: 'Databáza nie je nakonfigurovaná.' }, 503);

  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === 'string' ? body.slug : '';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return json({ error: 'Neplatná požiadavka.' }, 400);

  // 1 sviečka na IP a deň pre každé parte — hash IP sa nikde neukladá v čitateľnej podobe
  let ip = 'unknown';
  try { ip = clientAddress; } catch { /* lokálny build bez adaptéra */ }
  const ipHash = await sha256(`${ip}|${import.meta.env.SVIECKA_SALT ?? 'paciga-sviecka'}`);

  const { data, error } = await supabase.rpc('zapal_sviecku', { p_slug: slug, p_ip_hash: ipHash });
  if (error) return json({ error: 'Sviečku sa nepodarilo zapáliť.' }, 500);
  if (data === null) return json({ error: 'Parte sa nenašlo.' }, 404);

  return json({ sviecky: data });
};
