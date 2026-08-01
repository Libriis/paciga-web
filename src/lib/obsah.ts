/*
  Editovateľný obsah webu.

  Texty a fotky ostávajú napísané v stránkach ako predvolené hodnoty.
  Databáza drží iba to, čo klient prepísal. Prázdna tabuľka teda znamená
  web presne taký, aký je dnes, a zmazanie riadku vráti pôvodné znenie.

  Načítava sa raz za požiadavku, nie raz za blok. Stránka má rádovo desiatky
  editovateľných miest a samostatný dopyt na každé z nich by ju zabil.
*/
import { supabase } from './supabase';

export interface Blok {
  kluc: string;
  hodnota: string;
  typ: 'text' | 'obrazok';
}

/* Cache v rámci jedného behu servera. Astro pri SSR vytvára modul raz,
   takže bez časového stropu by web po úprave ukazoval staré texty až do
   ďalšieho nasadenia. Pol minúty stačí, aby klient videl zmenu takmer
   hneď a zároveň sa databáza nepýtala pri každom obrázku. */
let cache: Map<string, string> | null = null;
let nacitaneO = 0;
const PLATNOST_MS = 30_000;

export async function nacitajObsah(): Promise<Map<string, string>> {
  const teraz = Date.now();
  if (cache && teraz - nacitaneO < PLATNOST_MS) return cache;
  if (!supabase) return (cache = new Map());

  const { data, error } = await supabase.from('obsah').select('kluc, hodnota');
  if (error) {
    console.error('[obsah]', error.message);
    // Radšej pôvodné texty zo stránky než prázdny web.
    return cache ?? new Map();
  }

  cache = new Map((data ?? []).map((r) => [r.kluc, r.hodnota]));
  nacitaneO = teraz;
  return cache;
}

/** Hodnota bloku, alebo predvolená zo stránky. */
export function hodnota(mapa: Map<string, string>, kluc: string, predvolena: string): string {
  const v = mapa.get(kluc);
  return v === undefined || v === '' ? predvolena : v;
}
