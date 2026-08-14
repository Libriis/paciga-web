/*
  Aktuality: čítanie článkov z databázy.

  Články sa presunuli zo src/data/aktuality.ts do tabuľky `clanky`, aby ich
  vedel spravovať redaktor v /admin/clanky bez zásahu do kódu a nasadenia.
  Pôvodný súbor ostáva ako fallback pre beh bez env premenných (rovnaký
  vzor ako parte-seed.json pri parte) a ako zdroj jednorazového importu.

  Riadok z databázy sa mapuje na tvar `Clanok`, ktorý šablóny už poznajú,
  takže aktuality.astro ani detail článku nemusia prepisovať polia.
*/
import { supabase } from './supabase';
import { CLANKY as ZALOZNE, type Clanok, bloky, type Blok } from '../data/aktuality';

export type { Clanok, Blok };
export { bloky };

export type Kategoria = 'prve-kroky' | 'smutok' | 'planovanie' | 'sperky' | 'zo-zivota';

export const KATEGORIE: { key: Kategoria; label: Clanok['tag'] }[] = [
  { key: 'prve-kroky', label: 'Prvé kroky' },
  { key: 'smutok', label: 'Smútok a spomínanie' },
  { key: 'planovanie', label: 'Plánovanie vopred' },
  { key: 'sperky', label: 'Spomienkové šperky' },
  { key: 'zo-zivota', label: 'Zo života Pacigy' },
];

/* Kľúče z čias troch kategórií (do 14. 8. 2026). Riadky v databáze ich
   môžu niesť, kým prebehne migracia-kategorie.sql, preto ich mapujeme. */
const STARE_KLUCE: Record<string, Kategoria> = {
  rada: 'prve-kroky',
  novinka: 'zo-zivota',
  spolupraca: 'zo-zivota',
};

const naKategoriu = (k: string): Kategoria =>
  KATEGORIE.some((x) => x.key === k) ? (k as Kategoria) : STARE_KLUCE[k] ?? 'zo-zivota';

const stitok = (k: Kategoria): Clanok['tag'] =>
  KATEGORIE.find((x) => x.key === k)!.label;

/* Mesiace v genitíve: „29. mája", nie „29. máj". Intl by pri sk-SK vrátil
   nominatív, preto vlastná tabuľka. */
const MESIACE = [
  'januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
  'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra',
];

export function slovenskyDatum(iso: string): string {
  const [r, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!r || !m || !d) return iso;
  return `${d}. ${MESIACE[m - 1]} ${r}`;
}

/** Riadok z tabuľky `clanky` na tvar, ktorý čakajú šablóny. */
function zRiadku(r: Record<string, unknown>): Clanok {
  const cta = r.cta_nadpis
    ? {
        nadpis: String(r.cta_nadpis),
        text: String(r.cta_text ?? ''),
        odkaz: String(r.cta_odkaz ?? '/kontakt'),
        odkazText: String(r.cta_odkaz_text ?? 'Kontakt'),
      }
    : undefined;

  const iso = String(r.datum ?? '').slice(0, 10);
  const kategoria = naKategoriu(String(r.kategoria));
  return {
    slug: String(r.slug),
    datum: slovenskyDatum(iso),
    datumIso: iso,
    tag: stitok(kategoria),
    t: kategoria,
    foto: String(r.foto_url ?? ''),
    fotoAlt: String(r.foto_alt ?? ''),
    titulok: String(r.titulok),
    text: String(r.perex ?? ''),
    telo: Array.isArray(r.telo) ? (r.telo as string[]) : [],
    link: (r.odkaz as string) ?? undefined,
    linkText: (r.odkaz_text as string) ?? undefined,
    cta,
  };
}

/** Publikované články, najnovšie prvé. Bez databázy vracia pôvodný súbor. */
export async function getClanky(): Promise<Clanok[]> {
  if (!supabase) return ZALOZNE;

  const { data, error } = await supabase
    .from('clanky')
    .select('*')
    .eq('published', true)
    .order('datum', { ascending: false });

  if (error) {
    console.error('[clanky]', error.message);
    return ZALOZNE;
  }
  // Prázdna tabuľka pred importom neznamená web bez aktualít.
  if (!data || data.length === 0) return ZALOZNE;

  return data.map(zRiadku);
}

/** Článok má vlastnú stránku, len keď má telo. */
export const maDetail = (c: Clanok): boolean => !!c.telo && c.telo.length > 0;

export async function getClanok(slug: string): Promise<Clanok | undefined> {
  const vsetky = await getClanky();
  const c = vsetky.find((x) => x.slug === slug);
  return c && maDetail(c) ? c : undefined;
}

/** Ďalšie články pod detailom: najnovšie okrem aktuálneho. */
export async function ostatneClanky(slug: string, n = 3): Promise<Clanok[]> {
  const vsetky = await getClanky();
  return vsetky.filter((c) => c.slug !== slug).slice(0, n);
}
