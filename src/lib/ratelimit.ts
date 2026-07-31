import { supabase } from './supabase';

// Hash IP, nech sa surová adresa nikam neukladá (rovnaký princíp ako sviečky).
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fixné okno na (endpoint + hash IP). Vracia true = požiadavka prejde,
 * false = prekročený limit. Fail-open: keď databáza nie je po ruke alebo
 * RPC zlyhá, vraciame true — rate limiter nesmie zhodiť verejný formulár.
 */
export async function rateLimitOk(
  endpoint: string,
  ip: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!supabase) return true;
  try {
    const h = await sha256(`${ip}|${import.meta.env.SVIECKA_SALT ?? 'paciga-rl'}`);
    const { data, error } = await supabase.rpc('rate_limit_hit', {
      p_key: `${endpoint}:${h}`,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}
