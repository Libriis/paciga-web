/* Brána pôvodu pre /api/*.
   Audit ASVS 5.0 L2 (23. 8. 2026): cudzia stránka vedela prehliadaču
   návštevníka prikázať POST na /api/kontakt a /api/vitals. Prešlo to a
   zapísalo riadok, /api/kontakt navyše poslal e-mail. Astro má vlastnú
   ochranu (checkOrigin), tá ale kontroluje len formulárové typy obsahu
   (text/plain, application/x-www-form-urlencoded, multipart/form-data).
   Naše štyri koncové body berú application/json, takže sa jej nikdy
   nedotkli. Overené naživo: Origin: https://evil.example.net + JSON
   vrátilo 204 a 200, to isté s text/plain vrátilo 403.

   Preto vlastná brána. Tri podmienky, každá sama o sebe zastaví bežný
   CSRF z prehliadača:
     1. typ obsahu musí byť presne application/json,
     2. Sec-Fetch-Site nesmie byť cross-site (posiela každý dnešný prehliadač),
     3. ak je Origin prítomný, musí sa zhodovať s naším pôvodom.

   Prečo nie „Origin musí byť vždy prítomný": prehliadač ho pri POST posiela
   vždy, ale server-to-server volania (monitoring, cron) ho nemajú. Tie nie
   sú CSRF — CSRF stojí na cudzej stránke, ktorá zneužije prehliadač obete.
   Na takého volajúceho ďalej platia rate limit aj validácia vstupu. */

const NASE_HOSTY = ['www.paciga.sk', 'paciga.sk'];

/** Pôvody, ktoré berieme za svoje: kanonická doména, doména z hlavičky
    Host (pokrýva vercel.app náhľady) a pôvod z adresy požiadavky. */
function nasePovody(request: Request): Set<string> {
  const povody = new Set<string>();
  for (const host of NASE_HOSTY) povody.add(`https://${host}`);
  try {
    povody.add(new URL(request.url).origin);
  } catch { /* neplatná adresa — ostatné zdroje stačia */ }
  const host = request.headers.get('host');
  if (host) {
    povody.add(`https://${host}`);
    // localhost pri vývoji
    povody.add(`http://${host}`);
  }
  return povody;
}

function odmietni(): Response {
  return new Response(JSON.stringify({ error: 'Neplatná požiadavka.' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Vráti hotovú odpoveď 403, keď požiadavka neprišla z nášho webu.
 * Vráti null, keď je všetko v poriadku a handler môže pokračovať.
 *
 * Použitie ako prvý riadok v POST:
 *   const cudzia = cudziPovod(request);
 *   if (cudzia) return cudzia;
 */
export function cudziPovod(request: Request): Response | null {
  const typ = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (typ !== 'application/json') return odmietni();

  if (request.headers.get('sec-fetch-site') === 'cross-site') return odmietni();

  const origin = request.headers.get('origin');
  if (origin && !nasePovody(request).has(origin)) return odmietni();

  return null;
}
