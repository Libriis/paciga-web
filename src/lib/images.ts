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
import { getImage } from 'astro:assets';

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
  Poster videa sa nedá poslať cez <Image>, atribút poster berie iba URL.
  Preto ho prepustíme obrázkovou službou ručne a vrátime hotovú cestu.

  Bez tohto ostával v markupe natvrdo '/assets/asset-03.jpg', čo po
  presune fotiek do src/assets vracalo 404 a karta pobočky ostala bez
  posteru. Karta má na mobile 325 px, pri DPR 3 teda ~975 px; 960 stačí.
*/
export async function posterVidea(src: string): Promise<string> {
  const zdroj = lokalnyObrazok(src);
  if (!zdroj) return src;
  const { src: cesta } = await getImage({
    src: zdroj,
    width: 960,
    format: 'webp',
    quality: KVALITA_KARTA,
  });
  return cesta;
}
