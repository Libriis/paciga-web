/*
  Mostík medzi textovými cestami v dátach a Astro obrázkovým pipeline.

  Fotky žijú v src/assets/, takže ich Astro pri builde prepočíta do WebP
  a vygeneruje srcset. Dátové súbory (aktuality.ts, parte-seed.json) ale
  držia obrázok ako reťazec '/assets/nieco.jpg' a rovnaký tvar chodí aj
  zo Supabase. Táto mapa preto páruje starú verejnú cestu na importovaný
  modul. Čo v mape nie je (Supabase URL, externá adresa), vráti null a
  stránka spadne späť na obyčajný <img>.
*/
import type { ImageMetadata } from 'astro';


const moduly = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/**/*.{jpg,jpeg,png,webp,avif}',
  { eager: true },
);

const podlaCesty = new Map<string, ImageMetadata>();
for (const [kluc, modul] of Object.entries(moduly)) {
  const i = kluc.indexOf('/assets/');
  if (i === -1) continue;
  podlaCesty.set(kluc.slice(i), modul.default);
}

/** '/assets/foto.jpg' → ImageMetadata, alebo null pre externé zdroje. */
export function lokalnyObrazok(src: string | null | undefined): ImageMetadata | null {
  if (!src) return null;
  return podlaCesty.get(src) ?? null;
}

/* Šírky, ktoré pokrývajú reálne mobilné aj desktopové plochy.
   Mobil pri DPR 3 potrebuje ~1170 px na plnú šírku, desktop hero ~2000 px. */
export const SIRKY_HERO = [480, 768, 1080, 1440, 1920];
export const SIRKY_KARTA = [320, 480, 640, 960];
export const SIRKY_MEDAILON = [340, 512, 768, 1024];

/* Kvalita WebP.
   Telefón s DPR 3 si pri sizes="100vw" vypýta 1440 px variantu, takže na
   plnoplošných fotkách rozhoduje kompresia. Hero a pásy ležia pod tmavým
   prechodom (opacity 0.32 až 0.55), kde sa artefakty nemajú kde prejaviť —
   tam ideme nižšie. Šperky a fotky, na ktoré sa človek naozaj pozerá,
   ostávajú vyššie. */
export const KVALITA_POZADIE = 58;
export const KVALITA_KARTA = 70;
export const KVALITA_DETAIL = 80;

/*
  Poster videa cez obrázkovú službu NEPUSTÍŤ. Atribút poster berie iba URL
  a getImage() v SSR stránke (prerender = false) vráti runtime cestu na
  endpoint /_image. Web má output: 'static', takže sa ten endpoint
  nenasadzuje a na produkcii vracia 404. V deve to pritom funguje, čo je
  presne ten druh rozdielu, ktorý sa ľahko prehliadne.

  Postery preto žijú ako hotové statické WebP v public/assets/poster-*.webp
  (960 px, kvalita 70; karta má na mobile 325 px, pri DPR 3 teda ~975 px).
  Prekresliť ich treba ručne, ak sa zmenia zdrojové fotky.
*/
