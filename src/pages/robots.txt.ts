import type { APIRoute } from 'astro';

// Robots sa skladá podľa hosta, nie natvrdo. Dôvod: web beží súbežne na
// staging adrese *.vercel.app a (po prepnutí) na www.paciga.sk. Natvrdo
// zapísaný noindex by sa pri prepnutí odniesol so sebou a zhodil produkciu.
// Preto: staging zakáže všetko, produkcia pustí všetko okrem administrácie,
// API a lab stránok.
//
// prerender = false je nutné. Pri output: 'static' by sa inak robots.txt
// predgeneroval v čase buildu a host by sa vyhodnotil raz, na build serveri.
export const prerender = false;

const STAGING = `User-agent: *
Disallow: /
`;

// Bez lomky na konci. `Disallow: /admin/` je predpona, ktorá nesadne na
// holé /admin — a práve to je adresa, na ktorú vedie prihlásenie. Nájdené
// auditom ASVS 5.0 L2 (23. 8. 2026). Teraz platí pre /admin aj /admin/*.
const produkcia = (site: string) => `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /lab-

Sitemap: ${site}/sitemap-index.xml
`;

export const GET: APIRoute = ({ url, site }) => {
  const jeStaging = url.hostname.endsWith('.vercel.app') || url.hostname === 'localhost';
  const zaklad = (site ?? new URL('https://www.paciga.sk')).origin;

  return new Response(jeStaging ? STAGING : produkcia(zaklad), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Krátka platnosť: pri prepnutí domény sa nesmie držať staging verzia.
      'Cache-Control': 'public, max-age=300',
    },
  });
};
