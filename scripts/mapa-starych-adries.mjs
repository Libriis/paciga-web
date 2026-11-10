// Dočasná mapa starých adries WordPressu (SEO fáza 3, 10. 11. 2026).
// Google podľa nej znova prečíta staré adresy, uvidí trvalé presmerovanie a vyradí ich.
// Mapa sa odosiela LEN v Search Console, nie v robots.txt ani sitemap-index.xml.
// Zmazať, keď staré adresy z indexu zmiznú (sledovať v Search Console).
// Zdroj: mapy starého webu, čítané priamo zo starého servera (IP web195.webhouse.sk).
import https from 'node:https';
import { writeFileSync } from 'node:fs';

const OLD_IP = '93.184.77.195';
const get = (path) => new Promise((res, rej) => {
  https.get({ host: 'www.paciga.sk', path, servername: 'www.paciga.sk', rejectUnauthorized: false,
    lookup: (h, o, cb) => (o && o.all ? cb(null, [{ address: OLD_IP, family: 4 }]) : cb(null, OLD_IP, 4)) }, (r) => {
    let d = ''; r.setEncoding('utf8'); r.on('data', (c) => (d += c)); r.on('end', () => res(d));
  }).on('error', rej);
});

const mapy = ['/opustili_ns-sitemap1.xml', '/opustili_ns-sitemap2.xml', '/kytice-sitemap.xml', '/category-sitemap.xml'];
const adresy = new Set();
for (const m of mapy) for (const x of (await get(m)).matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const u = x[1].trim();
  if (/\/(opustili_ns|kytice|category)\/[^/]+\/?$/.test(u)) adresy.add(u);
}
const dnes = new Date().toISOString().slice(0, 10);
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [...adresy].sort().map((u) => `<url><loc>${u}</loc><lastmod>${dnes}</lastmod></url>`).join('\n') + '\n</urlset>\n';
writeFileSync('public/sitemap-stare-adresy.xml', xml);
const pocet = (re) => [...adresy].filter((u) => re.test(u)).length;
console.log('adries', adresy.size, '| parte', pocet(/opustili_ns/), '| kytice', pocet(/kytice/), '| kategorie', pocet(/category/));
