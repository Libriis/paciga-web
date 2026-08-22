#!/usr/bin/env node
// Biele siluety log partnerov pre logo cloud na homepage.
//
//   node scripts/loga-partnerov.mjs
//
// Načo to je: web je tmavý a monochromatický. Farebné logá partnerov
// (zelený Victor, zlatá Silencia, chrómový Mercedes) by sa navzájom bili
// a rozbili by čierno-bielu tóninu. Riešenie je biela silueta: z originálu
// sa vezme alfa kanál a vyplní sa bielou. Kresba loga tým ostane presná,
// zmizne len farba. Priehľadnosť v origináli je preto podmienka; logo
// na plnom bielom podklade by dalo biely obdĺžnik.
//
// Zdroje sú stiahnuté z webov partnerov (adresy nižšie) do zdrojoveho
// priečinka. Skript ich needituje, len prepočíta. Keď partner logo zmení,
// stiahni nový súbor pod rovnakým menom a spusti skript.
//
// `vyska` je optická veľkosť v CSS px, nie mechanická. Široký wordmark
// pri rovnakej výške ako štvorcová značka pôsobí väčšie, preto má každé
// logo vlastnú hodnotu. Rovnaké čísla drží PARTNERI v src/pages/index.astro
// (pole w a h), inak by sa rezervované miesto rozišlo so skutočnosťou.

import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZDROJE = join(KOREN, 'src', 'assets', 'partneri');
const CIEL = join(KOREN, 'public', 'partneri');

const LOGA = [
  { nazov: 'potom', zdroj: 'potom.svg', vyska: 60, web: 'https://potom.sk/logo.svg' },
  { nazov: 'kvety', zdroj: 'kvety.svg', vyska: 58, web: 'https://kvetyvictor.sk/ (wp-content/uploads/2025/03/logo.svg)' },
  { nazov: 'matrace', zdroj: 'matrace.png', vyska: 78, web: 'https://more-matracov.sk/css/mediahelp/public/images/public-logo.png' },
  { nazov: 'arena', zdroj: 'arena.png', vyska: 76, web: 'https://www.restauracia-arena.sk/theme/default/images/logo.png' },
  { nazov: 'izlato', zdroj: 'izlato.svg', vyska: 58, web: 'https://www.izlato.sk/face/images/ml/izlato-sk-logo.svg' },
  { nazov: 'silencia', zdroj: 'silencia.png', vyska: 74, web: 'https://silencia.sk/ (wp-content/uploads/2024/01/...png)' },
  { nazov: 'spominam', zdroj: 'spominam.svg', vyska: 64, web: 'https://spominam.sk/logo.svg' },
  { nazov: 'mercedes', zdroj: 'mercedes.svg', vyska: 66, web: 'Wikimedia Commons, Mercedes-Logo.svg' },
];

/* Strop šírky: bez neho by dlhý wordmark (spominam) roztiahol celý rad
   a ostatné logá by vedľa neho pôsobili ako poznámka pod čiarou. */
const MAX_SIRKA = 300;

const kB = (n) => Math.round((n / 1024) * 10) / 10 + ' kB';

if (!existsSync(ZDROJE)) {
  console.error(`Chýba priečinok so zdrojmi: ${ZDROJE}`);
  process.exit(1);
}
mkdirSync(CIEL, { recursive: true });

console.log('Biele siluety log partnerov:');
for (const l of LOGA) {
  const cesta = join(ZDROJE, l.zdroj);
  if (!existsSync(cesta)) { console.log(`  ! chýba zdroj ${l.zdroj}, preskakujem`); continue; }

  /* SVG rasterizujeme cez šírku, nie cez density: jedno z log má taký
     viewBox, že pri density 200 prekročilo limit 32767 px a sharp spadol. */
  const vstup = l.zdroj.endsWith('.svg')
    ? sharp(cesta).resize({ width: 1600, fit: 'inside' })
    : sharp(cesta);
  const png = await vstup.png().toBuffer();

  /* Alfa ako maska. Kreslíme z trojnásobku cieľovej veľkosti, aby tenké
     ťahy (script Silencia, vlasové linky Arény) neostali zubaté. */
  const velka = await sharp(png)
    .ensureAlpha()
    .extractChannel(3)
    .resize({ height: l.vyska * 3, width: MAX_SIRKA * 3, fit: 'inside' })
    .toBuffer();

  const riadok = [];
  for (const nasobok of [1, 2]) {
    const maska = await sharp(velka)
      .resize({ height: l.vyska * nasobok, width: MAX_SIRKA * nasobok, fit: 'inside' })
      .toBuffer();
    const { width, height } = await sharp(maska).metadata();
    const biela = await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
      .png()
      .toBuffer();
    const out = join(CIEL, `${l.nazov}${nasobok === 2 ? '@2x' : ''}.webp`);
    const info = await sharp(biela)
      .joinChannel(maska)
      .webp({ quality: 92, alphaQuality: 100 })
      .toFile(out);
    riadok.push(`${nasobok}x=${info.width}x${info.height} ${kB(info.size)}`);
  }
  console.log(`  ${l.nazov.padEnd(10)} ${riadok.join('  ')}`);
}

const pocet = readdirSync(CIEL).length;
console.log(`\nSpolu ${pocet} súborov v public/partneri.`);
