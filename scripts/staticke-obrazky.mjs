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

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
  /* Hero klasickej homepage (od 15. 8. 2026, nahradila pinovanú jazdu):
     tímová fotka z originálu 6088 px, zmenšená na 2560 px. Má drobné detaily
     (postavy, tráva), na ktorých q58 robila rozmaz, preto KVALITA_KARTA a
     2560 px variant navyše pre displeje so škálovaním. */
  { zdroj: 'o-nas-tim.jpg', nazov: 'hero-tim', sirky: [480, 768, 1080, 1440, 1920, 2560], kvalita: 70 },
  /* Fotopásy homepage (limuzína, šperk): stĺpec vedľa textu, SIRKY_KRONIKA. */
  { zdroj: 'svc-limuzina.jpg', nazov: 'pas-limuzina', sirky: [480, 640, 960, 1280], kvalita: 70 },
  { zdroj: 'svc-sperky-odtlacok.jpg', nazov: 'pas-sperk', sirky: [480, 640, 960, 1152], kvalita: 80 },
  // Zdroje z 14. 8. 2026 majú 1413 až 1600 px (fotky klienta, štvorcový orez).
  // 1280 pokryje kartu na mobile pri DPR 3 (92vw ≈ 400 CSS px), viac netreba.
  { zdroj: 'svc-obrad.jpg', nazov: 'svc-obrad', sirky: [320, 480, 640, 960, 1280], kvalita: 70 },
  { zdroj: 'svc-starostlivost.jpg', nazov: 'svc-starostlivost', sirky: [320, 480, 640, 960, 1280], kvalita: 70 },
  { zdroj: 'svc-kamenarstvo.jpg', nazov: 'svc-kamenarstvo', sirky: [320, 480, 640, 960, 1280], kvalita: 70 },
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

/* AVIF popri WebP (22. 8. 2026). Dôvod: svc-kamenarstvo je žulový pomník
   na štrku, čo je pre kodek samá šumová textúra. Vo WebP q70 mal 1280w
   variant 400 kB, kým rovnako veľký svc-obrad len 100 kB. Znižovanie
   kvality nepomohlo: ani q46 nešiel pod 317 kB, len fotku rozmazal.
   AVIF ten istý záber zvládne na 221 kB pri porovnateľnej kvalite.
   Prevodné pravidlo: AVIF je pri zhruba o 20 nižšom čísle kvality tam,
   kde WebP pri svojom. Fallback na WebP ostáva, rozhoduje <picture>. */
const avifKvalita = (webpKvalita) => Math.max(35, webpKvalita - 20);

console.log('\nObrazky na SSR strankach:');
mkdirSync(join(PUBLIC, 'assets', 'ssr'), { recursive: true });
for (const o of SSR_OBRAZKY) {
  const riadok = [];
  for (const w of o.sirky) {
    const zdroj = join(ZDROJE, o.zdroj);
    const webp = await sharp(zdroj)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: o.kvalita })
      .toFile(join(PUBLIC, 'assets', 'ssr', `${o.nazov}-${w}.webp`));
    const avif = await sharp(zdroj)
      .resize({ width: w, withoutEnlargement: true })
      .avif({ quality: avifKvalita(o.kvalita) })
      .toFile(join(PUBLIC, 'assets', 'ssr', `${o.nazov}-${w}.avif`));
    riadok.push(`${w}=${kB(webp.size)}/${kB(avif.size)}`);
  }
  console.log(`  ${o.nazov.padEnd(20)} ${riadok.join('  ')}`);
}
console.log('  (webp/avif)');

/* Fotky článkov. Detail článku aj prehľad aktualít bežia ako SSR, lebo
   obsah spravuje redaktor v /admin/clanky. Komponent Foto.astro preto pre
   lokálne cesty siahne po týchto hotových variantoch namiesto astro:assets.
   Mapa nižšie mu povie, ktoré šírky reálne existujú. */
console.log('\nFotky clankov:');
const mapa = {};
const SIRKY_CLANOK = [320, 480, 640, 960, 1440, 1920];
mkdirSync(join(PUBLIC, 'clanky'), { recursive: true });

for (const { cesta, relativna } of ogZdroje()) {
  if (!existsSync(cesta)) continue;
  const zaklad = relativna.replace(/\//g, '-').replace(/\.[^.]+$/, '');
  const meta = await sharp(cesta).metadata();
  const sirky = SIRKY_CLANOK.filter((w, i) => w <= meta.width || SIRKY_CLANOK[i - 1] < meta.width);
  const hotove = [];
  for (const w of sirky) {
    const skutocna = Math.min(w, meta.width);
    const out = join(PUBLIC, 'clanky', `${zaklad}-${skutocna}.webp`);
    if (!hotove.includes(skutocna)) {
      await sharp(cesta).resize({ width: skutocna, withoutEnlargement: true }).webp({ quality: 72 }).toFile(out);
      hotove.push(skutocna);
    }
  }
  mapa['/assets/' + relativna] = { zaklad, sirky: hotove, pomer: meta.width / meta.height };
  console.log(`  ${zaklad.padEnd(24)} ${hotove.join(', ')}`);
}
writeFileSync(join(KOREN, 'src', 'data', 'staticke-obrazky.json'), JSON.stringify(mapa, null, 1) + '\n', 'utf8');
console.log(`  mapa: src/data/staticke-obrazky.json (${Object.keys(mapa).length} fotiek)`);

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
