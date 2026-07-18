import { supabase } from './supabase';
import seed from '../data/parte-seed.json';

export interface Parte {
  id: string;
  slug: string;
  meno: string;
  pohlavie: 'zena' | 'muz';
  datum_narodenia: string | null;
  datum_umrtia: string;
  vek: number | null;
  foto_url: string | null;
  rozlucka_datum: string | null;
  rozlucka_cas: string | null;
  rozlucka_miesto: string | null;
  odkaz_rodine: string | null;
  sviecky: number;
}

export interface Kondolencia {
  id: string;
  meno: string;
  odkaz: string;
  created_at: string;
}

const SEED = seed as Parte[];

export async function getParteList(): Promise<Parte[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('parte')
      .select('*')
      .eq('published', true)
      .order('datum_umrtia', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) return data as Parte[];
  }
  return SEED;
}

export async function getParteBySlug(slug: string): Promise<Parte | null> {
  if (supabase) {
    const { data } = await supabase
      .from('parte')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();
    return (data as Parte) ?? null;
  }
  return SEED.find((p) => p.slug === slug) ?? null;
}

export async function getKondolencie(parteId: string): Promise<Kondolencia[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('kondolencie')
    .select('id, meno, odkaz, created_at')
    .eq('parte_id', parteId)
    .eq('schvalene', true)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data as Kondolencia[]) ?? [];
}

/* ---------- formátovanie ---------- */

const MES_GEN = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
const MES_NOM = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return [y, m, d];
}

/** „9. júla 2026" */
export function fmtDlhy(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = parts(iso);
  return `${d}. ${MES_GEN[m - 1]} ${y}`;
}

/** „9. júla" (bez roka — formát kariet) */
export function fmtDenMesiac(iso: string | null): string {
  if (!iso) return '';
  const [, m, d] = parts(iso);
  return `${d}. ${MES_GEN[m - 1]}`;
}

/** „09. 07. 2026" */
export function fmtKratky(iso: string): string {
  const [y, m, d] = parts(iso);
  return `${String(d).padStart(2, '0')}. ${String(m).padStart(2, '0')}. ${y}`;
}

/** „Júl 2026" — nadpis mesačnej skupiny */
export function mesiacLabel(iso: string): string {
  const [y, m] = parts(iso);
  return `${MES_NOM[m - 1]} ${y}`;
}

/** „AK" z „Anna Kičáková" */
export function inicialky(meno: string): string {
  const w = meno.trim().split(/\s+/);
  return ((w[0]?.[0] ?? '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
}

/** „1 zapálená sviečka / 3 zapálené sviečky / 12 zapálených sviečok" */
export function svieckyText(n: number): string {
  if (n === 1) return '1 zapálená sviečka';
  if (n >= 2 && n <= 4) return `${n} zapálené sviečky`;
  return `${n} zapálených sviečok`;
}

export function mapUrl(miesto: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(miesto)}`;
}

/** data: URL s .ics pozvánkou na rozlúčku (rovnaký princíp ako pôvodné parte) */
export function icsDataUrl(p: Parte): string | null {
  if (!p.rozlucka_datum || !p.rozlucka_cas) return null;
  const d = p.rozlucka_datum.replaceAll('-', '');
  const [hh, mm] = p.rozlucka_cas.split(':').map(Number);
  const start = `${d}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
  const end = `${d}T${String(hh + 1).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Paciga//Parte//SK',
    'BEGIN:VEVENT',
    `UID:${p.slug}@paciga.sk`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Posledna rozlucka: ${p.meno}`,
    `LOCATION:${p.rozlucka_miesto ?? ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
