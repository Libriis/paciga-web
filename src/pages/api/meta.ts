import type { APIRoute } from 'astro';
import { cudziPovod } from '../../lib/povod';
import { ROBOT } from '../../lib/robot';
import { metaZTela, nasaUrl, posliMeta, type MetaUdalost } from '../../lib/meta-capi';

export const prerender = false;

/* Serverová kópia udalosti z Meta Pixela (CAPI). Prehliadač sem posiela
   PageView a Contact len po súhlase s cookies, s rovnakým event_id ako
   fbq(). Lead sem nechodí, ten posiela /api/kontakt aj s kontaktom.
   Odpoveď je vždy 204: volajúci nemá čo čítať a robot nemá čo zistiť. */

const POVOLENE: MetaUdalost[] = ['PageView', 'Contact'];
const nic = () => new Response(null, { status: 204 });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const cudzia = cudziPovod(request);
  if (cudzia) return cudzia;

  const ua = request.headers.get('user-agent') ?? '';
  if (!ua || ROBOT.test(ua)) return nic();

  const b = await request.json().catch(() => null);
  if (!b || typeof b !== 'object') return nic();

  const udalost = (b as { udalost?: unknown }).udalost as MetaUdalost;
  if (!POVOLENE.includes(udalost)) return nic();
  const meta = metaZTela(b);
  const url = nasaUrl((b as { url?: unknown }).url);
  if (!meta || !url) return nic();

  let ip: string | undefined;
  try { ip = clientAddress; } catch { /* lokálny build bez adaptéra */ }

  // Await je nutný: Vercel po odoslaní odpovede funkciu zastaví.
  await posliMeta({ udalost, url, ip, ua, ...meta });
  return nic();
};
