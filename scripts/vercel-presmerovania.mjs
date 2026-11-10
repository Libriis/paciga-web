// Zloží pole "redirects" vo vercel.json. Spúšťaj po každej zmene src/data/presmerovania.mjs:
//   node scripts/vercel-presmerovania.mjs
//
// Prečo (SEO fáza 3, 10. 11. 2026): pravidlo /:cesta+/ odstrihne lomku samostatným
// skokom, až potom príde cieľ. Staré adresy WordPressu (všetky s lomkou) tak išli
// cez 2 až 5 presmerovaní. Pred to pravidlo preto dávame priame pravidlá pre tvar
// s lomkou, každá stará adresa skončí na cieli jedným skokom.
// Poradie je dôležité: Vercel použije prvé pravidlo, ktoré sedí.
import { readFileSync, writeFileSync } from 'node:fs';
import { PRESMEROVANIA } from '../src/data/presmerovania.mjs';

const r = (source, destination) => ({ source, destination, permanent: true });

const redirects = [
  // Testovacia adresa Vercelu je kópia webu. Presmerovať na ostrú doménu (SEO fáza 3).
  // Náhľady vetiev majú iné adresy (paciga-xxxx-...vercel.app), tých sa to netýka.
  { source: '/:cesta*', has: [{ type: 'host', value: 'paciga-web.vercel.app' }], destination: 'https://www.paciga.sk/:cesta*', permanent: true },

  // Staré statické adresy .html (zdieľané na sociálnych sieťach). Predtým ich riešil
  // len middleware, a ten na predgenerovaných stránkach nebeží (404, /aktuality/index.html 500).
  r('/index.html', '/'),
  // Zoznam parte: /parte samo osebe stránku nemá, staré /opustili_ns/ bol zoznam.
  r('/parte/index.html', '/opustili-nas'),
  r('/parte', '/opustili-nas'),
  r('/parte/', '/opustili-nas'),
  r('/opustili_ns/', '/opustili-nas'),
  r('/:cesta+/index.html', '/:cesta+'),
  r('/:cesta+.html', '/:cesta+'),

  // Parte zo starého WordPressu: /opustili_ns/meno/ rovno na /parte/meno.
  r('/opustili_ns/:slug/', '/parte/:slug'),
  r('/opustili_ns/:slug', '/parte/:slug'),

  // Search Console 10. 11. 2026: ďalšie staré tvary adries.
  // Parte na koreni starého webu. Vercel na chybovej ceste (404) presmerovať nedovolí,
  // preto po jednom. Z 17 takých adries v Search Console má parte v databáze len táto.
  r('/jozef-mikusiak', '/parte/jozef-mikusiak'),
  r('/opustili-nas/:slug/', '/parte/:slug'),
  r('/opustili-nas/:slug', '/parte/:slug'),
  r('/pohrebne_sluzby/spomienkove-sperky-s-odtlackom(.*)', '/sperky'),
  r('/spomienkove-sperky-s-(.*)', '/sperky'),
  r('/pohrebne_sluzby(.*)', '/pohrebne-sluzby'),
  r('/:rok(\\d{4})/:mesiac(\\d{2})/:den(\\d{2})(.*)', '/aktuality'),

  // Kategórie starého webu: tri boli kvety, štvrtá („bez kategórie“) články.
  r('/category/ziadna-kategoria(.*)', '/aktuality'),
  r('/category(.*)', '/pohrebne-sluzby/kvetinarstvo'),
  r('/kytice(.*)', '/pohrebne-sluzby/kvetinarstvo'),

  // Tvar s lomkou pre každé presmerovanie z presmerovania.mjs, rovno na cieľ.
  ...Object.entries(PRESMEROVANIA).map(([z, kam]) => r(z + '/', kam.destination)),

  // Všetko ostatné s lomkou na konci: odstrihnúť lomku.
  r('/:cesta+/', '/:cesta+'),
  r('/opustili_ns(.*)', '/opustili-nas'),
];

const subor = 'vercel.json';
const json = JSON.parse(readFileSync(subor, 'utf8'));
json.redirects = redirects;
writeFileSync(subor, JSON.stringify(json, null, 2) + '\n');
console.log('vercel.json: redirects', redirects.length);
