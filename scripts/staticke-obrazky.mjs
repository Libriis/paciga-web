#!/usr/bin/env node
// Predgeneruje obrázky, ktoré nesmú ísť cez astro:assets.
//
//   node scripts/staticke-obrazky.mjs
//
// Načo to je: Base.astro obaľuje aj stránky s `prerender = false`
// (index, opustili-nas, parte/[slug]). Tam <Image> a getImage() nevrátia
// hotový súbor, ale runtime cestu /_image?href=..., a ten endpoint sa pri
// output: 'static' nenasadzuje. Výsledok je 404: na homepage zmizlo logo
// a og:image pre zdieľanie na Facebooku neexistoval. Ten istý dôvod, prečo
// museli byť postery kariet pobočiek hotové súbory (commit fc64033).
//
// Riešenie sú hotové súbory v public/, ktoré Vercel kopíruje doslova.
// Spusti tento skript vždy, keď sa zmení logo alebo niektorá OG fotka.

import { readdirSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZDROJE = join(KOREN, 'src', 'assets');
const PUBLIC = join(KOREN, 'public');

// Logo je v hlavičke aj v päte, obe s vlastnou šírkou a 2x variantom.
const LOGO_SIRKY = [110, 130, 220, 260];

/* Obrázky na homepage. Tá má prerender = false kvôli parte z databázy,
   takže <Image> na nej vracia runtime cestu a všetky tieto fotky boli 404.
   Šírky a kvality držia hodnoty zo src/lib/images.ts, nech sa optimalizácia
   z 30. 7. nestratí: SIRKY_HERO/KVALITA_POZADIE a SIRKY_KARTA/KVALITA_KARTA. */
const SSR_OBRAZKY = [
  { zdroj: 'journey-poster.jpg', nazov: 'journey-poster', sirky: [480, 768, 1080, 1440, 1920], kvalita: 58 },
  // Zdrojové fotky kariet majú 560 px, väčšie šírky by boli duplikáty:
  // withoutEnlargement ich nezväčší a 640 aj 960 vyjdú byte za byte rovnako.
  { zdroj: 'svc-obrad.jpg', nazov: 'svc-obrad', sirky: [320, 480, 560], kvalita: 70 },
  { zdroj: 'svc-starostlivost.jpg', nazov: 'svc-starostlivost', sirky: [320, 480, 560], kvalita: 70 },
  { zdroj: 'svc-kamenarstvo.jpg', nazov: 'svc-kamenarstvo', sirky: [320, 480, 560], kvalita: 70 },
];

// og:image musí byť hotová adresa, Facebook si ju nepredpočíta.
// 1200 px je odporúčaná šírka náhľadu.
const OG_SIRKA = 1200;

/* Len obrázky, ktoré sa reálne dostanú do og:image. Generovať všetkých
   45 fotiek zo src/assets by pribalilo 3 MB, z toho vyše dvoch na varianty
   šperkov, ktoré ako náhľad zdieľania nikdy neposlúžia.
   Zdroje: ogImage="..." v src/pages a foto: '...' v src/data/aktuality.ts. */
function ogZdroje() {
  const zoznam = new Set();
  const zbieraj = (subor, vzor) => {
    const text = readFileSync(join(KOREN, subor), 'utf8');
    for (const m of text.matchAll(vzor)) zoznam.add(m[1]);
  };

  for (const s of readdirSync(join(KOREN, 'src', 'pages'), { recursive: true })) {
    const rel = join('src', 'pages', String(s));
    if (!/\.astro$/.test(String(s))) continue;
    zbieraj(rel, /ogImage="(\/assets\/[^"]+)"/g);
  }
  zbieraj(join('src', 'data', 'aktuality.ts'), /foto: '(\/assets\/[^']+)'/g);
  zbieraj(join('src', 'data', 'parte-seed.json'), /"foto_url": *"(\/assets\/[^"]+)"/g);

  return [...zoznam].sort().map((verejna) => ({
    cesta: join(ZDROJE, verejna.replace('/assets/', '')),
    relativna: verejna.replace('/assets/', ''),
  }));
}

/** '/assets/sperky/kolekcia.jpg' → '/og/sperky-kolekcia.jpg' */
export const ogNazov = (relativna) => relativna.replace(/\//g, '-').replace(/\.[^.]+$/, '.jpg');

const kB = (n) => Math.round((n / 1024) * 10) / 10 + ' kB';

mkdirSync(join(PUBLIC, 'assets'), { recursive: true });
mkdirSync(join(PUBLIC, 'og'), { recursive: true });

console.log('Logo:');
for (const w of LOGO_SIRKY) {
  const out = join(PUBLIC, 'assets', `logo-${w}.webp`);
  const info = await sharp(join(ZDROJE, 'asset-02.png')).resize({ width: w }).webp({ quality: 90 }).toFile(out);
  console.log(`  logo-${w}.webp  ${info.width}x${info.height}  ${kB(info.size)}`);
}

console.log('\nObrazky na SSR strankach:');
mkdirSync(join(PUBLIC, 'assets', 'ssr'), { recursive: true });
for (const o of SSR_OBRAZKY) {
  const riadok = [];
  for (const w of o.sirky) {
    const out = join(PUBLIC, 'assets', 'ssr', `${o.nazov}-${w}.webp`);
    const info = await sharp(join(ZDROJE, o.zdroj))
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: o.kvalita })
      .toFile(out);
    riadok.push(`${w}=${kB(info.size)}`);
  }
  console.log(`  ${o.nazov.padEnd(20)} ${riadok.join('  ')}`);
}

console.log('\nOG nahlady:');
let spolu = 0;
for (const { cesta, relativna } of ogZdroje()) {
  if (!existsSync(cesta)) { console.log(`  ! chyba zdroj ${relativna}, preskakujem`); continue; }
  const out = join(PUBLIC, 'og', ogNazov(relativna));
  const info = await sharp(cesta)
    .resize({ width: OG_SIRKA, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(out);
  spolu += info.size;
  console.log(`  ${ogNazov(relativna).padEnd(34)} ${String(info.width).padStart(4)}x${String(info.height).padStart(4)}  ${kB(info.size)}`);
}
console.log(`\nSpolu OG: ${kB(spolu)}`);
