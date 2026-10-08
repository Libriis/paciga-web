/* Prevod pohrebu z Moderného pohrebníctva (MP) na polia parte.

   Čisté funkcie bez tajomstiev. Používa ich server (/api/admin/moderne)
   aj admin v prehliadači (ParteSync), preto tu nesmie byť nič, čo číta
   kľúč alebo volá MP.

   Overené na živých dátach 8. 10. 2026 (1 094 aktívnych pohrebov):
   - Dátumy chodia v UTC. Slovenská polnoc je 23:00 alebo 22:00 UTC
     predošlého dňa, takže bez prevodu na Europe/Bratislava by narodenie
     aj rozlúčka vyšli o deň skôr.
   - Rozlúčka so slovenským časom 00:00 znamená „deň vieme, hodinu nie".
     Čas vtedy nechávame prázdny.
   - place_funeral je voľný text a býva neporiadny („DS", „Kostol",
     „Xxxxxx", „00"). Zjavný balast zahodíme, zvyšok skontroluje človek
     pred zverejnením.
   - d_gender má tvar „1 - muž" / „2 - žena" a príde len s oprávnením
     personal:read. Bez neho odhadujeme rod z priezviska ako formulár. */

/** Polia parte, ktoré plníme z MP. Snímka z poslednej synchronizácie
    má presne tieto kľúče (tabuľka parte_moderne, stĺpec snimka). */
export type Snimka = {
  meno: string;
  pohlavie: 'zena' | 'muz';
  datum_narodenia: string | null;
  datum_umrtia: string | null;
  vek: number | null;
  rozlucka_datum: string | null;
  rozlucka_cas: string | null;
  rozlucka_miesto: string | null;
  miesto_pohrebu: string | null;
};

export const POLIA_SNIMKY = [
  'meno', 'pohlavie', 'datum_narodenia', 'datum_umrtia', 'vek',
  'rozlucka_datum', 'rozlucka_cas', 'rozlucka_miesto', 'miesto_pohrebu',
] as const satisfies readonly (keyof Snimka)[];

/** Pohreb tak, ako ho vracia GET /api/v1/funerals (skupina funerals:read).
    Detail pridáva d_gender, ak má kľúč personal:read. */
export type MpPohreb = {
  id: string;
  deceased?: string | null;
  d_birth?: string | null;
  d_death?: string | null;
  funeral_type?: string | null;
  funeral_variant?: string | null;
  town_funeral?: string | null;
  place_funeral?: string | null;
  date_funeral?: string | null;
  urn_funeral_place?: string | null;
  urn_funeral_date?: string | null;
  d_gender?: string | null;
};

export const ID_MP = /^[a-f0-9]{24}$/;

const SK_CAS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Bratislava',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** UTC čas z MP → slovenský dátum a čas. */
export function slovenskyCas(iso: string | null | undefined): { datum: string; cas: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const c = Object.fromEntries(SK_CAS.formatToParts(d).map((p) => [p.type, p.value]));
  return { datum: `${c.year}-${c.month}-${c.day}`, cas: `${c.hour}:${c.minute}` };
}

/** Zjavný balast z voľných polí MP: „Xxxxxx", „00", „-". */
const BALAST = /^(x+|0+|-+|\.+)$/i;

function cisti(s: string | null | undefined, max = 200): string {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t && !BALAST.test(t) ? t.slice(0, max) : '';
}

const bezDiakritiky = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Meno na porovnanie s ručne pridaným parte: bez diakritiky a medzier navyše. */
export const menoNaPorovnanie = (meno: string) => bezDiakritiky(meno).replace(/\s+/g, ' ').trim();

/** „DS" je v MP skratka pre dom smútku. Na webe ju čítajú rodiny. */
function rozpisSkratky(miesto: string) {
  return miesto.replace(/^DS\b\.?/, 'Dom smútku');
}

/** Miesto rozlúčky = miesto z MP a obec, ak obec v mieste ešte nie je. */
export function miestoRozlucky(miesto: string | null | undefined, obec: string | null | undefined) {
  const m = rozpisSkratky(cisti(miesto));
  const o = cisti(obec);
  if (m && o && !bezDiakritiky(m).includes(bezDiakritiky(o))) return `${m}, ${o}`.slice(0, 200);
  return m || o || null;
}

/** Meno písané celé verzálkami prevedie na „Ján Novák". Inak ho nechá. */
export function upravMeno(meno: string | null | undefined) {
  const m = cisti(meno, 120);
  if (!m || m !== m.toUpperCase()) return m;
  return m.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}

/* Rovnaké pravidlo ako v ParteFormular: slovenské ženské priezviská
   končia na dlhé á (Kičáková, Justová), mužské prakticky nikdy. */
export const odhadniPohlavie = (meno: string): 'zena' | 'muz' => {
  const slova = meno.trim().split(/\s+/);
  return (slova[slova.length - 1] || '').toLowerCase().endsWith('á') ? 'zena' : 'muz';
};

/** „2 - žena" → zena, „1 - muž" → muz. Neznáme alebo chýbajúce → null. */
export function pohlavieZMp(g: string | null | undefined): 'zena' | 'muz' | null {
  const t = bezDiakritiky(String(g ?? ''));
  if (/^\s*2\b/.test(t) || /\bzena\b/.test(t)) return 'zena';
  if (/^\s*1\b/.test(t) || /\bmuz\b/.test(t)) return 'muz';
  return null;
}

/** Rovnaký výpočet ako v ParteFormular. */
export function vypocitajVek(nar: string | null, umr: string | null): number | null {
  if (!nar || !umr) return null;
  const [rn, mn, dn] = nar.split('-').map(Number);
  const [ru, mu, du] = umr.split('-').map(Number);
  let v = ru - rn;
  if (mu < mn || (mu === mn && du < dn)) v--;
  return v >= 0 && v <= 130 ? v : null;
}

/** Pohreb z MP → polia parte. */
export function mapujPohreb(p: MpPohreb): Snimka {
  const meno = upravMeno(p.deceased);
  const narodenie = slovenskyCas(p.d_birth);
  const umrtie = slovenskyCas(p.d_death);
  const rozlucka = slovenskyCas(p.date_funeral);
  const rozluckaMiesto = miestoRozlucky(p.place_funeral, p.town_funeral);

  /* Uloženie urny býva inde a neskôr než rozlúčka. Keď je to tá istá obec,
     ktorá už je v mieste rozlúčky, pole necháme prázdne. Formulár k nemu
     píše „vyplň, len keď sa pochováva inde". */
  const urna = cisti(p.urn_funeral_place);
  const inde = urna && !(rozluckaMiesto && bezDiakritiky(rozluckaMiesto).includes(bezDiakritiky(urna)));

  return {
    meno,
    pohlavie: pohlavieZMp(p.d_gender) ?? odhadniPohlavie(meno),
    datum_narodenia: narodenie?.datum ?? null,
    datum_umrtia: umrtie?.datum ?? null,
    vek: vypocitajVek(narodenie?.datum ?? null, umrtie?.datum ?? null),
    rozlucka_datum: rozlucka?.datum ?? null,
    rozlucka_cas: rozlucka && rozlucka.cas !== '00:00' ? rozlucka.cas : null,
    rozlucka_miesto: rozluckaMiesto,
    miesto_pohrebu: inde ? urna : null,
  };
}

const norm = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v));

/** Polia, ktoré sa dajú porovnať už zo zoznamu. Pohlavie príde až s detailom. */
const POLIA_ZOZNAMU = POLIA_SNIMKY.filter((k) => k !== 'pohlavie');

/** Zmenil sa pohreb v MP od poslednej synchronizácie? */
export function zmenenyVMp(stara: Partial<Snimka> | null | undefined, nova: Snimka) {
  if (!stara) return false;
  return POLIA_ZOZNAMU.some((k) => norm(stara[k]) !== norm(nova[k]));
}

/** Trojcestné zlúčenie. Pole prepíše len vtedy, keď sa v MP zmenilo
    a v parte má stále hodnotu zo starej snímky, čiže ho nikto ručne
    neopravil. Vráti len polia na prepis. */
export function zlucZmeny(parte: Record<string, unknown>, stara: Partial<Snimka>, nova: Snimka) {
  const zmeny: Partial<Snimka> = {};
  for (const k of POLIA_SNIMKY) {
    const s = norm(stara[k]);
    if (norm(nova[k]) !== s && norm(parte[k]) === s) (zmeny as Record<string, unknown>)[k] = nova[k];
  }
  return zmeny;
}

/** Webová adresa z mena, rovnako ako vo formulári. */
export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
