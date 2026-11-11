/* Texty videa parte z riadku tabuľky parte. Pracovník ich v admine môže pred
   stiahnutím ešte prepísať, toto sú len predvyplnené hodnoty. */

const MES_GEN = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
const DNI = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];

function casti(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return [y, m, d];
}

/** „12. 11. 1939“ */
export function datumKratky(iso) {
  if (!iso) return '';
  const [y, m, d] = casti(iso);
  return `${d}. ${m}. ${y}`;
}

/** „utorok 10. novembra 2026“ */
export function denRozlucky(iso) {
  if (!iso) return '';
  const [y, m, d] = casti(iso);
  const den = DNI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${den} ${d}. ${MES_GEN[m - 1]} ${y}`;
}

/** „09:30:00“ → „9:30“ */
export function casRozlucky(cas) {
  if (!cas) return '';
  const [h, min] = String(cas).split(':');
  return `${Number(h)}:${min || '00'}`;
}

/** Meno do dvoch riadkov: posledné slovo dole, zvyšok hore.
    Titul za menom (napr. „CSc.“) ostáva pri priezvisku. */
export function rozdelMeno(meno) {
  const slova = String(meno || '').trim().split(/\s+/).filter(Boolean);
  if (slova.length < 2) return [slova[0] || '', ''];
  let k = slova.length - 1;
  while (k > 1 && slova[k].includes('.')) k--;
  return [slova.slice(0, k).join(' '), slova.slice(k).join(' ')];
}

/** Iniciály bez titulov: „Mgr. Jozef Ivan“ → „JI“ */
export function inicialy(meno) {
  return String(meno || '').split(/\s+/).filter((s) => s && !s.includes('.') && !s.endsWith(','))
    .map((s) => s[0]).slice(0, 2).join('').toLocaleUpperCase('sk');
}

const bezDiakritiky = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[-–,]/g, ' ').replace(/\s+/g, ' ').trim();

/** Pohreb v tej istej obci ako rozlúčka? Potom riadok o pohrebe netreba
    (pravidlo Tomáša 10. 11. 2026: miesto len raz). */
export function pohrebNaRovnakomMieste(rozlucka, pohreb) {
  if (!pohreb) return true;
  const r = bezDiakritiky(rozlucka), p = bezDiakritiky(pohreb);
  if (!r) return false;
  if (r === p) return true;
  const obec = p.replace(/^(cintorin(e)?|dom smutku|dom nadeje|urnovy haj|kolumbarium)\s+(v |vo |na )?/, '');
  return obec.length > 2 && r.includes(obec);
}

/** Predvolené texty videa pre jedno parte. */
export function textyZParte(p) {
  const [meno1, meno2] = rozdelMeno(p.meno);
  const zena = p.pohlavie !== 'muz';
  const iny = p.miesto_pohrebu && !pohrebNaRovnakomMieste(p.rozlucka_miesto, p.miesto_pohrebu);
  return {
    lead: 'Odpočívaj v pokoji',
    meno1, meno2,
    d1: datumKratky(p.datum_narodenia),
    d2: datumKratky(p.datum_umrtia),
    mikro: zena ? 'Posledná rozlúčka s našou drahou zosnulou' : 'Posledná rozlúčka s naším drahým zosnulým',
    den: denRozlucky(p.rozlucka_datum),
    miesto: p.rozlucka_miesto || '',
    cas: casRozlucky(p.rozlucka_cas),
    poPohrebeZobraz: !!iny,
    poPohrebeText: 'Miesto pohrebu',
    poPohrebeMiesto: p.miesto_pohrebu || '',
    inicialy: inicialy(p.meno),
  };
}
