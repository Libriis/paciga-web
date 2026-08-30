// Kontrola po prepnutí domény. Spusť: node scripts/kontrola-domeny.mjs
// Nič nemení, len číta. Vypíše stav, Location a pár hlavičiek.
const ADRESY = [
  'https://paciga.sk/',
  'https://www.paciga.sk/',
  'https://www.paciga.sk/robots.txt',
  'https://www.paciga.sk/sitemap-index.xml',
  'https://www.paciga.sk/admin',
  'https://www.paciga.sk/pohrebne-sluzby',
  'https://www.paciga.sk/poprad',
  'https://www.paciga.sk/opustili-nas',
  'https://www.paciga.sk/o-nas.html',
  'https://www.paciga.sk/opustili_ns/nieco',
  'https://www.paciga.sk/kytice/nieco',
  'https://www.paciga.sk/category/nieco',
  'https://paciga-web.vercel.app/robots.txt',
];

for (const adresa of ADRESY) {
  try {
    const r = await fetch(adresa, { redirect: 'manual' });
    const loc = r.headers.get('location');
    const robots = r.headers.get('x-robots-tag');
    const riadky = [`${r.status}`];
    if (loc) riadky.push(`-> ${loc}`);
    if (robots) riadky.push(`[X-Robots-Tag: ${robots}]`);
    if (adresa.endsWith('robots.txt') && r.status === 200) {
      const t = await r.text();
      riadky.push(t.includes('Disallow: /\n') ? '[STAGING zavretý]' : '[PRODUKCIA otvorená]');
    }
    if (adresa === 'https://www.paciga.sk/' && r.status === 200) {
      const t = await r.text();
      const m = t.match(/rel="canonical" href="([^"]+)"/);
      riadky.push(`canonical=${m ? m[1] : 'CHÝBA'}`);
    }
    console.log(adresa.padEnd(52), riadky.join(' '));
  } catch (e) {
    console.log(adresa.padEnd(52), 'CHYBA', e.cause?.code ?? e.message);
  }
}
