import type { APIRoute } from 'astro';
import { getParteList } from '../lib/parte';
import { getClanky, maDetail } from '../lib/clanky';

// Druhá mapa stránok pre obsah z databázy: parte a články.
//
// Prečo: @astrojs/sitemap vidí len stránky, ktoré vzniknú pri builde.
// Parte (/parte/[slug]) a články (/aktuality/[slug]) sa vykresľujú až
// na požiadanie, takže v sitemap-0.xml chýbali. Audit 4. 11. 2026:
// 92 parte a 23 článkov mimo mapy. Parte sú pritom stránky, ktoré ľudia
// hľadajú menom zosnulého.
//
// Mapa sa skladá pri každej požiadavke (CDN ju drží hodinu), takže nové
// parte sa v nej objaví bez nového buildu. Do sitemap-index.xml ju
// pridáva `customSitemaps` v astro.config.mjs.
export const prerender = false;

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ site }) => {
  const zaklad = (site ?? new URL('https://www.paciga.sk')).origin;
  const [parte, clanky] = await Promise.all([getParteList(), getClanky()]);

  const polozky: { loc: string; lastmod?: string }[] = [
    ...clanky
      .filter(maDetail)
      .map((c) => ({ loc: `${zaklad}/aktuality/${c.slug}`, lastmod: c.upravenoIso || c.datumIso || undefined })),
    /* lastmod parte = posledná úprava riadku (SEO, 11/2026). Parte sa po
       zverejnení mení (čas rozlúčky, fotka), Google tak vie, čo prečítať znova. */
    ...parte.map((p) => ({ loc: `${zaklad}/parte/${p.slug}`, lastmod: p.updated_at ? String(p.updated_at).slice(0, 10) : undefined })),
  ];

  const telo =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    polozky
      .map((p) => `<url><loc>${xml(p.loc)}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`)
      .join('\n') +
    '\n</urlset>\n';

  return new Response(telo, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
