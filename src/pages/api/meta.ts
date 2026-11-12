import type { APIRoute } from 'astro';
import { cudziPovod } from '../../lib/povod';
import { ROBOT } from '../../lib/robot';
import { KATEGORIE, metaZTela, nasaUrl, posliMeta, type Kategoria, type MetaUdalost } from '../../lib/meta-capi';

export const prerender = false;

/* Serverová kópia udalosti z Meta Pixela (CAPI). Prehliadač sem posiela
   PageView, ViewContent, FindLocation a Contact len po súhlase s cookies, s rovnakým event_id ako
   fbq(). Lead sem nechodí, ten posiela /api/kontakt aj s kontaktom.
   Odpoveď je vždy 204: volajúci nemá čo čítať a robot nemá čo zistiť. */

const POVOLENE: MetaUdalost[] = ['PageView', 'ViewContent', 'FindLocation', 'Contact'];
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

  const k = (b as { kategoria?: unknown }).kategoria;
  const kategoria = KATEGORIE.includes(k as Kategoria) ? (k as Kategoria) : undefined;
  // ViewContent bez platnej kategórie nemá zmysel (napríklad podvrhnutý z parte).
  if (udalost === 'ViewContent' && !kategoria) return nic();

  let ip: string | undefined;
  try { ip = clientAddress; } catch { /* lokálny build bez adaptéra */ }

  // Await je nutný: Vercel po odoslaní odpovede funkciu zastaví.
  await posliMeta({ udalost, url, ip, ua, kategoria, ...meta });
  return nic();
};
