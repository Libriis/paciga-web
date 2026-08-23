/* Paciga admin — zdieľané jadro pre všetky admin stránky.
   Vyberá ostrý Supabase klient alebo DEMO klienta (localStorage),
   rieši prihlásenie a poskytuje helpery + číselníky CRM. */
import { createClient } from '@supabase/supabase-js';
import parteSeed from '../data/parte-seed.json';

const URL_ = import.meta.env.PUBLIC_SUPABASE_URL;
const KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const DEMO = !URL_ || !KEY;

/* ---------- návrat po prihlásení ---------- */

/** Očistí parameter ?next= na bezpečnú cestu v rámci nášho webu.
    Bez tejto brány sa dá do location.href poslať `javascript:` (XSS na našej
    doméne, čiže krádež admin tokenu z localStorage) alebo `//cudzi.web`
    (otvorené presmerovanie na phishing). Preto: iba relatívna cesta, ktorá
    po zložení s naším pôvodom zostane na našom pôvode. Všetko ostatné padá
    na náhradu. */
export function bezpecnyNext(surova, nahrada = '/admin') {
  if (typeof surova !== 'string' || surova === '') return nahrada;
  // Prehliadač berie spätné lomítko ako lomítko, tak ho normalizuj skôr,
  // než sa rozhoduješ — inak `/\cudzi.web` prejde ako relatívna cesta.
  const cesta = surova.replace(/\\/g, '/');
  if (!cesta.startsWith('/') || cesta.startsWith('//')) return nahrada;
  try {
    const url = new URL(cesta, location.origin);
    if (url.origin !== location.origin) return nahrada;
    return url.pathname + url.search + url.hash;
  } catch {
    return nahrada;
  }
}

/* ---------- číselníky ---------- */

export const STAVY = [
  { key: 'novy', label: 'Nová' },
  { key: 'prevoz', label: 'Prevoz' },
  { key: 'priprava', label: 'Príprava' },
  { key: 'obrad', label: 'Obrad' },
  { key: 'vybavene', label: 'Vybavená' },
  { key: 'vyuctovane', label: 'Vyúčtovaná' },
];
export const AKTIVNE_STAVY = ['novy', 'prevoz', 'priprava', 'obrad'];

export const POBOCKY = ['Poprad', 'Spišská Belá', 'Liptovský Mikuláš'];

// farby pobočiek v grafoch — validované dataviz kontrolami na tmavom podklade
export const POBOCKY_FARBY = {
  'Poprad': '#4a8fd6',
  'Spišská Belá': '#bf7c2c',
  'Liptovský Mikuláš': '#2f9e77',
};

export const TYPY_POHREBU = [
  { key: 'pochovanie', label: 'Pochovanie' },
  { key: 'kremacia', label: 'Kremácia' },
];
export const typLabel = (key) => (TYPY_POHREBU.find((t) => t.key === key) || { label: key || '—' }).label;

export const ZDROJE = [
  { key: 'telefon', label: 'Telefonát' },
  { key: 'osobne', label: 'Osobná návšteva' },
  { key: 'odporucanie', label: 'Odporúčanie' },
  { key: 'web', label: 'Web' },
];
export const zdrojLabel = (key) => (ZDROJE.find((z) => z.key === key) || { label: key || '—' }).label;

// kostra podľa zákona č. 131/2010 Z. z. — poradie krokov vybavenia pohrebu
export const UKONY_TEMPLATE = [
  'Prevzatie oznámenia o úmrtí, prvý kontakt s pozostalými',
  'Prevoz zosnulého (NON STOP služba)',
  'List o obhliadke mŕtveho — prevziať od lekára',
  'Splnomocnenie od objednávateľa pohrebu',
  'Matrika — vybavenie úmrtného listu',
  'Výber a objednávka rakvy a smútočného tovaru',
  'Dohodnúť termín a miesto poslednej rozlúčky',
  'Povolenie na pochovanie / kremáciu',
  'Kvetinová výzdoba a vence',
  'Parte — príprava a zverejnenie',
  'Príprava a oblečenie zosnulého',
  'Obrad / posledná rozlúčka',
  'Pochovanie / kremácia',
  'Odovzdanie dokladov pozostalým',
  'Vyúčtovanie zákazky',
];

export const DOKUMENT_TYPY = [
  ['list_o_obhliadke', 'List o obhliadke mŕtveho'],
  ['umrtny_list', 'Úmrtný list'],
  ['splnomocnenie', 'Splnomocnenie'],
  ['povolenie', 'Povolenie na pochovanie / kremáciu'],
  ['pas', 'Pas pre mŕtvolu'],
  ['foto_zosnuly', 'Fotografia zosnulého'],
  ['foto_vykop', 'Fotografia výkopu'],
  ['ine', 'Iný dokument'],
];

export const dokumentTypLabel = (typ) =>
  (DOKUMENT_TYPY.find(([k]) => k === typ) || [null, typ])[1];

export const stavLabel = (key) => (STAVY.find((s) => s.key === key) || { label: key }).label;

/* ---------- helpery ---------- */

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const fmtD = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)}. ${Number(m)}. ${y}`;
};

export const fmtDT = (iso) => {
  if (!iso) return '—';
  const dt = new Date(iso);
  return dt.toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** termíny ukladáme ako text 'YYYY-MM-DDTHH:mm' (bez časových pásiem) */
export const fmtTermin = (t) => {
  if (!t) return '—';
  const [d, cas] = t.split('T');
  return `${fmtD(d)}${cas ? ` o ${cas}` : ''}`;
};

export const fmtEUR = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(Number(n)).toLocaleString('sk-SK') + ' €';
};

export const MESIACE_KRATKE = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];

/** „AK" z „Anna Kičáková" — pre krúžok v zozname, keď parte nemá fotku.
    Rovnaká logika ako inicialky() v lib/parte.ts; sem je skopírovaná
    zámerne, ten modul ťahá vlastného Supabase klienta a admin má svojho. */
export const inicialky = (meno) => {
  const w = String(meno ?? '').trim().split(/\s+/);
  return ((w[0]?.[0] ?? '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
};

export const uuid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));

export const nowLocalISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:mm'
};

/* ---------- klient ---------- */

let _sb = null;
export function getClient() {
  if (!_sb) _sb = DEMO ? demoClient() : createClient(URL_, KEY);
  return _sb;
}

/* ---------- právomoci ---------- */

/** Kam vedie ktorá sekcia. Mimo SEKCIE, lebo to je vec navigácie. */
export const ODKAZY = {
  dashboard: '/admin',
  zakazky: '/admin/zakazky',
  kontakty: '/admin/kontakty',
  statistiky: '/admin/statistiky',
  web: '/admin/web',
  clanky: '/admin/clanky',
  vitals: '/admin/vitals',
  obsah: '/admin/obsah',
};

/** Sekcie administrácie. Kľúč sedí s hodnotou v admini.pristupy a s RLS. */
export const SEKCIE = [
  { key: 'dashboard', label: 'Dashboard', popis: 'Prehľad a najbližšie udalosti' },
  { key: 'zakazky', label: 'Zákazky', popis: 'Zákazky, úkony a doklady' },
  { key: 'kontakty', label: 'Kontakty', popis: 'Pozostalí a objednávatelia' },
  { key: 'statistiky', label: 'Štatistiky', popis: 'Grafy a porovnanie pobočiek' },
  { key: 'web', label: 'Web a parte', popis: 'Parte, kondolencie, dopyty' },
  { key: 'clanky', label: 'Aktuality', popis: 'Články na webe' },
  { key: 'vitals', label: 'Rýchlosť webu', popis: 'Merania z terénu' },
  { key: 'obsah', label: 'Obsah webu', popis: 'Úprava textov a fotiek priamo na stránkach' },
];

/* Prístupy prihláseného. Načítajú sa raz za stránku.
   Slúžia na skladanie menu a na presmerovanie zo zakázanej stránky.
   Skutočnú hranicu drží RLS: aj keby si to niekto v prehliadači prepísal,
   z databázy nedostane ani riadok. */
let _pristupy = null;

export async function mojProfil() {
  if (_pristupy) return _pristupy;
  const sb = getClient();
  if (DEMO) {
    _pristupy = { meno: 'Demo', email: 'demo', pristupy: ['*'], hlavny: true };
    return _pristupy;
  }
  const { data, error } = await sb.rpc('moje_pristupy');
  const r = Array.isArray(data) ? data[0] : data;
  _pristupy = error || !r
    ? { meno: null, email: null, pristupy: [], hlavny: false }
    : { meno: r.meno, email: r.email, pristupy: r.pristupy ?? [], hlavny: !!r.hlavny };
  return _pristupy;
}

export const maPristup = (profil, sekcia) =>
  !!profil && (profil.hlavny || profil.pristupy.includes('*') || profil.pristupy.includes(sekcia));

/* Menu sa vykresľuje až tu, nie v layoute. Layout je statické HTML a
   nevie, kto sa prihlási; prístupy prídu až z databázy po prihlásení. */
function zostavMenu(profil) {
  const nav = document.querySelector('.adm-nav');
  if (!nav) return;

  const polozky = SEKCIE.filter((s) => maPristup(profil, s.key));
  if (profil.hlavny) polozky.push({ key: 'pouzivatelia', label: 'Používatelia' });

  const tu = location.pathname.replace(/\/$/, '') || '/admin';
  nav.innerHTML = polozky.map((s) => {
    const href = s.key === 'pouzivatelia' ? '/admin/pouzivatelia' : ODKAZY[s.key];
    const aktivna = href === tu || (href !== '/admin' && tu.startsWith(href));
    return `<a href="${href}"${aktivna ? ' class="on"' : ''}>${s.label}<span class="badge" id="nav-badge-${s.key}"></span></a>`;
  }).join('');

  // Novú zákazku ponúkame len tomu, kto zákazky vôbec vidí.
  const cta = document.querySelector('.adm-cta');
  if (cta && !maPristup(profil, 'zakazky')) cta.remove();
}

/** Auth brána: bez session presmeruje na /admin/login. Keď je zadaná sekcia,
    overí aj právomoc a bez nej pošle používateľa na prvú dostupnú stránku.
    Vracia session a zapojí user box v layoute. */
export async function requireAuth(sekcia) {
  const sb = getClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    location.href = '/admin/login?next=' + encodeURIComponent(location.pathname + location.search);
    return new Promise(() => {}); // stránka odchádza, nič ďalej nerob
  }

  const profil = await mojProfil();
  zostavMenu(profil);

  if (sekcia && !maPristup(profil, sekcia)) {
    const prva = SEKCIE.find((s) => maPristup(profil, s.key));
    location.href = prva ? ODKAZY[prva.key] : '/admin/bez-pristupu';
    return new Promise(() => {});
  }
  const who = document.getElementById('adm-user');
  // Prihlasujeme sa menom, nie adresou, tak aj v pätke ukazujeme meno.
  // Účty mimo firemnej domény necháme celé, nech je jasné, kto je prihlásený.
  if (who) who.textContent = String(session.user.email ?? '').replace(/@paciga\.sk$/, '');
  const out = document.getElementById('adm-logout');
  if (out) out.addEventListener('click', async () => { await sb.auth.signOut(); location.href = '/admin/login'; });
  if (DEMO) document.getElementById('demo-banner')?.classList.remove('hidden');
  return session;
}

/* ============================================================
   DEMO DATASET — deterministický generátor ~100 zákaziek za
   posledných 14 mesiacov naprieč 3 pobočkami, so sezónnosťou,
   typmi pohrebu, sumami a zdrojmi. Rovnaký seed = rovnaké dáta.
   ============================================================ */

function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const MENA_Z = ['Mária', 'Anna', 'Helena', 'Zuzana', 'Katarína', 'Margita', 'Alžbeta', 'Emília', 'Terézia', 'Božena', 'Jolana', 'Veronika', 'Agnesa', 'Žofia', 'Ľudmila', 'Irena'];
const MENA_M = ['Ján', 'Jozef', 'Štefan', 'Michal', 'Peter', 'Pavol', 'Ondrej', 'František', 'Martin', 'Tomáš', 'Andrej', 'Milan', 'Vladimír', 'Karol', 'Ladislav', 'Rudolf'];
const PRIEZVISKA = [
  ['Novák', 'Nováková'], ['Polák', 'Poláková'], ['Gallik', 'Galliková'], ['Bednár', 'Bednárová'],
  ['Krupa', 'Krupová'], ['Zemčák', 'Zemčáková'], ['Šoltés', 'Šoltésová'], ['Hudák', 'Hudáková'],
  ['Britaňák', 'Britaňáková'], ['Kováč', 'Kováčová'], ['Pavlík', 'Pavlíková'], ['Olekšák', 'Olekšáková'],
  ['Dravecký', 'Dravecká'], ['Majer', 'Majerová'], ['Fabian', 'Fabianová'], ['Lizák', 'Lizáková'],
  ['Bača', 'Bačová'], ['Krišanda', 'Krišandová'], ['Vojtek', 'Vojteková'], ['Slodičák', 'Slodičáková'],
];
const VZTAHY = ['dcéra', 'syn', 'manželka', 'manžel', 'nevesta', 'zať', 'sestra', 'brat', 'vnučka', 'vnuk'];
const MIESTA = {
  'Poprad': ['Dom smútku v Poprade', 'Dom smútku vo Svite', 'Konkatedrála Sedembolestnej v Poprade', 'Dom smútku vo Švábovciach', 'Rímskokatolícky kostol v Spišskom Bystrom', 'Dom smútku Poprad-Veľká'],
  'Spišská Belá': ['Dom smútku v Spišskej Belej', 'Rímskokatolícky kostol v Lendaku', 'Rímskokatolícky kostol v Ždiari', 'Dom smútku v Slovenskej Vsi', 'Kostol sv. Antona v Spišskej Belej'],
  'Liptovský Mikuláš': ['Dom smútku v Liptovskom Mikuláši', 'Evanjelický kostol vo Važci', 'Dom smútku v Liptovskom Jáne', 'Rímskokatolícky kostol v Hybiach', 'Dom smútku v Liptovskej Tepličke'],
};
const MIESTA_UMRTIA = {
  'Poprad': ['Poprad', 'Svit', 'Švábovce', 'Spišské Bystré', 'NsP Poprad', 'Veľká'],
  'Spišská Belá': ['Spišská Belá', 'Lendak', 'Ždiar', 'Slovenská Ves', 'NsP Kežmarok'],
  'Liptovský Mikuláš': ['Liptovský Mikuláš', 'Važec', 'Hybe', 'Liptovský Ján', 'NsP Liptovský Mikuláš'],
};
const CASY_ROZLUCKY = ['10:00', '11:00', '13:00', '13:30', '14:00', '15:00'];

function docPlaceholder(nazov) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#16181c"/><rect x="40" y="40" width="520" height="720" fill="none" stroke="#3a3d44" stroke-width="2"/><text x="300" y="120" fill="#f5f5f5" font-family="Arial" font-size="30" font-weight="bold" text-anchor="middle">${nazov}</text><text x="300" y="170" fill="#8a8d94" font-family="Arial" font-size="20" text-anchor="middle">ukážkový dokument (demo)</text><g fill="#2a2d34">${Array.from({ length: 14 }, (_, i) => `<rect x="80" y="${230 + i * 36}" width="${440 - (i % 3) * 60}" height="14" rx="7"/>`).join('')}</g></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function demoData() {
  const rnd = lcg(20260712);
  const vyber = (pole) => pole[Math.floor(rnd() * pole.length)];
  const dnes = new Date();
  const dnesISO = dnes.toISOString().slice(0, 10);
  const posunDni = (iso, dni) => {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + dni);
    return d.toISOString().slice(0, 10);
  };

  const kontakty = [];
  const zakazky = [];
  const ukony = [];
  const dopyty = [];

  const pridajUkony = (zakazkaId, hotovoPo, zalozene) => {
    UKONY_TEMPLATE.forEach((nazov, i) => {
      ukony.push({ id: `${zakazkaId}-u${i}`, zakazka_id: zakazkaId, poradie: i, nazov, hotovo: i < hotovoPo, created_at: zalozene });
    });
  };

  /* ---- generované zákazky: 14 mesiacov dozadu vrátane aktuálneho ---- */
  const BAZA = { 'Poprad': 3.3, 'Spišská Belá': 2.2, 'Liptovský Mikuláš': 1.8 };
  let poradove = 0;

  for (let mIdx = 13; mIdx >= 0; mIdx--) {
    const mesiac = new Date(dnes.getFullYear(), dnes.getMonth() - mIdx, 1);
    const rok = mesiac.getFullYear();
    const m = mesiac.getMonth(); // 0-11
    const sezona = [1.35, 1.3, 1.15, 1.05, 0.95, 0.8, 0.8, 0.85, 0.95, 1.05, 1.2, 1.3][m];
    const dniVMesiaci = new Date(rok, m + 1, 0).getDate();

    for (const pobocka of POBOCKY) {
      const pocet = Math.round(BAZA[pobocka] * sezona + rnd() * 1.4);
      for (let i = 0; i < pocet; i++) {
        poradove++;
        const zena = rnd() < 0.52;
        const priezvisko = vyber(PRIEZVISKA);
        const meno = `${vyber(zena ? MENA_Z : MENA_M)} ${priezvisko[zena ? 1 : 0]}`;
        const vek = 58 + Math.floor(rnd() * 37); // 58–94
        let denUmrtia = 1 + Math.floor(rnd() * dniVMesiaci);
        let umrtie = `${rok}-${String(m + 1).padStart(2, '0')}-${String(denUmrtia).padStart(2, '0')}`;
        if (umrtie > dnesISO) umrtie = dnesISO;
        const narodenie = posunDni(umrtie, -Math.round(vek * 365.25 + rnd() * 300));

        const kremacia = rnd() < 0.24 + (13 - mIdx) * 0.012; // podiel kremácií pomaly rastie
        const suma = Math.round((kremacia ? 1300 + rnd() * 900 : 2000 + rnd() * 1500) / 10) * 10;
        const zdrojR = rnd();
        const zdroj = zdrojR < 0.48 ? 'telefon' : zdrojR < 0.75 ? 'osobne' : zdrojR < 0.9 ? 'odporucanie' : 'web';

        const rozluckaDen = posunDni(umrtie, 2 + Math.floor(rnd() * 4));
        const rozlucka = `${rozluckaDen}T${vyber(CASY_ROZLUCKY)}`;
        const vyzdvihnutie = `${umrtie}T${String(8 + Math.floor(rnd() * 13)).padStart(2, '0')}:${rnd() < 0.5 ? '00' : '30'}`;
        const rakva = rnd() < 0.7 ? `${posunDni(rozluckaDen, -1)}T09:00` : null;

        // stav podľa toho, ako dávno bola rozlúčka
        let stav;
        if (rozluckaDen < posunDni(dnesISO, -14)) stav = rnd() < 0.9 ? 'vyuctovane' : 'vybavene';
        else if (rozluckaDen < dnesISO) stav = rnd() < 0.5 ? 'vybavene' : 'vyuctovane';
        else stav = ['prevoz', 'priprava', 'priprava', 'obrad'][Math.floor(rnd() * 4)];

        // objednávateľ — 78 % nový kontakt, inak opakovaný
        let kontaktId;
        const vztah = vyber(VZTAHY);
        if (kontakty.length < 3 || rnd() < 0.78) {
          kontaktId = `kon-g${poradove}`;
          const zenaK = ['dcéra', 'manželka', 'nevesta', 'sestra', 'vnučka'].includes(vztah);
          kontakty.push({
            id: kontaktId,
            meno: `${vyber(zenaK ? MENA_Z : MENA_M)} ${priezvisko[zenaK ? 1 : 0]}`,
            telefon: `09${String(Math.floor(rnd() * 90) + 10)} ${String(Math.floor(rnd() * 900) + 100)} ${String(Math.floor(rnd() * 900) + 100)}`,
            email: rnd() < 0.35 ? `${priezvisko[0].toLowerCase()}${Math.floor(rnd() * 90) + 10}@example.com` : null,
            adresa: `${vyber(MIESTA_UMRTIA[pobocka].filter((x) => !x.startsWith('NsP')))}`,
            poznamka: null,
            created_at: `${umrtie}T09:00:00.000Z`,
          });
        } else {
          kontaktId = vyber(kontakty).id;
        }

        const id = `zak-g${poradove}`;
        zakazky.push({
          id,
          cislo: null, // dopĺňa sa nižšie podľa dátumu
          stav,
          pobocka,
          typ: kremacia ? 'kremacia' : 'pochovanie',
          suma,
          zdroj,
          zosnuly_meno: meno,
          zosnuly_pohlavie: zena ? 'zena' : 'muz',
          datum_narodenia: narodenie,
          datum_umrtia: umrtie,
          miesto_umrtia: vyber(MIESTA_UMRTIA[pobocka]),
          objednavatel_id: kontaktId,
          vztah,
          parte_id: null,
          dopyt_id: null,
          termin_vyzdvihnutie: vyzdvihnutie,
          termin_rakva: rakva,
          termin_rozlucka: rozlucka,
          miesto_rozlucky: vyber(MIESTA[pobocka]),
          poznamka: null,
          created_at: `${umrtie}T08:00:00.000Z`,
          updated_at: `${umrtie}T08:00:00.000Z`,
        });

        const hotovoPodlaStavu = { vyuctovane: 15, vybavene: 14, obrad: 12, priprava: 6 + Math.floor(rnd() * 5), prevoz: 3, novy: 1 };
        pridajUkony(id, hotovoPodlaStavu[stav] ?? 1, `${umrtie}T08:00:00.000Z`);
      }
    }
  }

  /* ---- ručné zákazky previazané s parte na webe ---- */
  const iso = (predHod) => new Date(Date.now() - predHod * 36e5).toISOString();
  kontakty.push(
    { id: 'kon-1', meno: 'Mária Kičáková', telefon: '0904 552 118', email: 'maria.kicakova@example.com', adresa: 'Liptovská Teplička 214', poznamka: 'dcéra zosnulej', created_at: iso(80) },
    { id: 'kon-2', meno: 'Peter Mlynár', telefon: '0911 733 402', email: null, adresa: 'Švábovce 89', poznamka: 'syn zosnulého', created_at: iso(60) },
    { id: 'kon-3', meno: 'Anna Siváková', telefon: '0907 218 655', email: 'sivakova.anna@example.com', adresa: 'Liptovský Mikuláš, Nábrežie 12', poznamka: null, created_at: iso(340) },
    { id: 'kon-4', meno: 'Eva Gallová', telefon: '0915 660 233', email: null, adresa: 'Spišská Belá, Hviezdoslavova 7', poznamka: 'manželka zosnulého', created_at: iso(4) },
  );
  const dnesStr = dnesISO;
  zakazky.push(
    {
      id: 'zak-2', cislo: null, stav: 'priprava', pobocka: 'Poprad', typ: 'pochovanie', suma: 2840, zdroj: 'telefon',
      zosnuly_meno: 'Ondrej Mlynár', zosnuly_pohlavie: 'muz', datum_narodenia: '1949-11-27', datum_umrtia: '2026-07-06', miesto_umrtia: 'Švábovce',
      objednavatel_id: 'kon-2', vztah: 'syn', parte_id: 'ondrej-mlynar', dopyt_id: null,
      termin_vyzdvihnutie: '2026-07-06T21:30', termin_rakva: '2026-07-13T09:00', termin_rozlucka: '2026-07-13T14:00',
      miesto_rozlucky: 'Dom smútku na cintoríne vo Švábovciach',
      poznamka: 'Rodina prosí o výzdobu v bielej farbe.', created_at: iso(140), updated_at: iso(6),
    },
    {
      id: 'zak-4', cislo: null, stav: 'novy', pobocka: 'Spišská Belá', typ: 'kremacia', suma: 1890, zdroj: 'osobne',
      zosnuly_meno: 'Michal Gallo', zosnuly_pohlavie: 'muz', datum_narodenia: '1941-03-02', datum_umrtia: dnesStr, miesto_umrtia: 'NsP Kežmarok',
      objednavatel_id: 'kon-4', vztah: 'manželka', parte_id: null, dopyt_id: null,
      termin_vyzdvihnutie: dnesStr + 'T20:00', termin_rakva: null, termin_rozlucka: null, miesto_rozlucky: null,
      poznamka: 'Prijaté telefonicky dnes ráno.', created_at: iso(3), updated_at: iso(3),
    },
    {
      id: 'zak-1', cislo: null, stav: 'vybavene', pobocka: 'Liptovský Mikuláš', typ: 'pochovanie', suma: 3120, zdroj: 'odporucanie',
      zosnuly_meno: 'Anna Kičáková', zosnuly_pohlavie: 'zena', datum_narodenia: '1934-11-13', datum_umrtia: '2026-07-09', miesto_umrtia: 'Liptovská Teplička',
      objednavatel_id: 'kon-1', vztah: 'dcéra', parte_id: 'anna-kicakova', dopyt_id: null,
      termin_vyzdvihnutie: '2026-07-09T08:30', termin_rakva: '2026-07-10T10:00', termin_rozlucka: '2026-07-11T13:00',
      miesto_rozlucky: 'Dom smútku v Liptovskej Tepličke',
      poznamka: null, created_at: iso(90), updated_at: iso(20),
    },
    {
      id: 'zak-3', cislo: null, stav: 'vyuctovane', pobocka: 'Liptovský Mikuláš', typ: 'pochovanie', suma: 2610, zdroj: 'telefon',
      zosnuly_meno: 'Jozefa Siváková', zosnuly_pohlavie: 'zena', datum_narodenia: '1933-09-12', datum_umrtia: '2026-06-28', miesto_umrtia: 'Liptovský Mikuláš',
      objednavatel_id: 'kon-3', vztah: 'dcéra', parte_id: 'jozefa-sivakova', dopyt_id: null,
      termin_vyzdvihnutie: '2026-06-28T14:00', termin_rakva: '2026-06-29T11:00', termin_rozlucka: '2026-06-30T13:30',
      miesto_rozlucky: 'Dom smútku v Liptovskom Mikuláši',
      poznamka: null, created_at: iso(360), updated_at: iso(280),
    },
  );
  pridajUkony('zak-2', 9, iso(140));
  pridajUkony('zak-4', 2, iso(3));
  pridajUkony('zak-1', 14, iso(90));
  pridajUkony('zak-3', 15, iso(360));

  /* ---- čísla zákaziek podľa dátumu úmrtia (Z-RRRR-NN) ---- */
  const podlaDatumu = [...zakazky].sort((a, b) => ((a.datum_umrtia || '') < (b.datum_umrtia || '') ? -1 : 1));
  const citace = {};
  for (const z of podlaDatumu) {
    const rok = (z.datum_umrtia || dnesISO).slice(0, 4);
    citace[rok] = (citace[rok] || 0) + 1;
    z.cislo = `Z-${rok}-${citace[rok]}`;
  }

  /* ---- dopyty z webu ---- */
  dopyty.push(
    { id: 'demo-d1', meno: 'Peter Hudák', telefon: '0905 123 456', email: null, sprava: 'Dobrý deň, chcem sa informovať na výstavbu hrobky na cintoríne v Poprade. Kedy by ste mali čas na obhliadku?', precitane: false, created_at: iso(5) },
    { id: 'demo-d2', meno: 'Mária Tomková', telefon: null, email: 'maria.tomkova@example.com', sprava: 'Dobrý deň, chcela by som sa opýtať na spomienkové šperky s odtlačkom prsta. Ďakujem.', precitane: true, created_at: iso(50) },
    { id: 'demo-d3', meno: 'Ján Bednár', telefon: '0949 300 122', email: 'jan.bednar@example.com', sprava: 'Prosím o cenovú ponuku na žulový pomník, dvojhrob, cintorín Veľká. Ďakujem.', precitane: false, created_at: iso(28) },
    { id: 'demo-d4', meno: 'Alžbeta Lizáková', telefon: '0918 555 741', email: null, sprava: 'Dobrý deň, potrebovala by som poradiť s predplatením pohrebu pre mamu. Ako to u vás funguje?', precitane: true, created_at: iso(120) },
    { id: 'demo-d5', meno: 'Marek Vojtek', telefon: null, email: 'm.vojtek@example.com', sprava: 'Zdravím, viete zabezpečiť aj prevoz zo zahraničia (Rakúsko)? Aké doklady treba?', precitane: true, created_at: iso(200) },
    { id: 'demo-d6', meno: 'Katarína Fabianová', telefon: '0902 664 310', email: null, sprava: 'Dobrý deň, chcem sa opýtať na možnosti kvetinovej výzdoby na rozlúčku budúci týždeň v Kežmarku.', precitane: true, created_at: iso(320) },
  );

  return {
    session: null,
    fotky: {
      'demo/zak-1-umrtny': docPlaceholder('Úmrtný list'),
      'demo/zak-2-obhliadka': docPlaceholder('List o obhliadke'),
      'demo/zak-2-splnomocnenie': docPlaceholder('Splnomocnenie'),
    },
    parte: parteSeed.map((p, i) => ({
      ...p,
      published: true,
      sviecky: [34, 19, 41, 16, 52, 9, 21, 13, 27, 11, 46, 23][i] ?? 8,
      created_at: iso((i + 1) * 12),
    })),
    kondolencie: [
      { id: 'demo-k1', parte_id: 'anna-kicakova', meno: 'Rodina Kováčová', odkaz: 'Úprimnú sústrasť celej rodine. S úctou spomíname na pani Annu, bola to výnimočná žena.', schvalene: false, created_at: iso(2) },
      { id: 'demo-k2', parte_id: 'ondrej-mlynar', meno: 'Ján Novák', odkaz: 'Nech odpočíva v pokoji. Susedom a rodine vyjadrujem úprimnú sústrasť.', schvalene: false, created_at: iso(7) },
      { id: 'demo-k3', parte_id: 'anna-kicakova', meno: 'Susedia z Liptovskej Tepličky', odkaz: 'Nikdy nezabudneme na jej dobré srdce. Odpočívajte v pokoji, pani Anka.', schvalene: true, created_at: iso(26) },
      { id: 'demo-k4', parte_id: 'vladimir-koscak', meno: 'Spolužiaci z Lendaku', odkaz: 'Vladko, navždy ostaneš v našich spomienkach. Rodine vyjadrujeme úprimnú sústrasť.', schvalene: true, created_at: iso(60) },
      { id: 'demo-k5', parte_id: 'jozefa-sivakova', meno: 'Rodina Majerová', odkaz: 'S úctou a vďakou za všetko dobré. Odpočívajte v pokoji.', schvalene: true, created_at: iso(300) },
    ],
    dopyty,
    kontakty,
    zakazky,
    ukony,
    dokumenty: [
      { id: 'dok-1', zakazka_id: 'zak-1', typ: 'umrtny_list', nazov: 'Úmrtný list — Anna Kičáková', storage_path: 'demo/zak-1-umrtny', created_at: iso(30) },
      { id: 'dok-2', zakazka_id: 'zak-2', typ: 'list_o_obhliadke', nazov: 'List o obhliadke — Ondrej Mlynár', storage_path: 'demo/zak-2-obhliadka', created_at: iso(100) },
      { id: 'dok-3', zakazka_id: 'zak-2', typ: 'splnomocnenie', nazov: 'Splnomocnenie — Peter Mlynár', storage_path: 'demo/zak-2-splnomocnenie', created_at: iso(96) },
    ],
  };
}

function demoClient() {
  const LS = 'paciga-admin-demo-v3';

  let db;
  try { db = JSON.parse(localStorage.getItem(LS)); } catch (e) {}
  if (!db || !db.zakazky) db = demoData();
  const uloz = () => { try { localStorage.setItem(LS, JSON.stringify(db)); } catch (e) {} };
  uloz();

  function tabulka(nazov) {
    const st = { op: 'select', sel: '*', filtre: [], radenia: [], limitN: null, payload: null };
    const vysledok = () => {
      const sedi = (r) => st.filtre.every(([c, v]) => r[c] === v);
      if (st.op === 'insert') {
        const rows = Array.isArray(st.payload) ? st.payload : [st.payload];
        rows.forEach((row) => db[nazov].push({ id: uuid(), created_at: new Date().toISOString(), sviecky: 0, ...row }));
        uloz();
        return { data: null, error: null };
      }
      if (st.op === 'update') {
        db[nazov].filter(sedi).forEach((r) => Object.assign(r, st.payload, { updated_at: new Date().toISOString() }));
        uloz();
        return { data: null, error: null };
      }
      if (st.op === 'delete') {
        db[nazov] = db[nazov].filter((r) => !sedi(r));
        if (nazov === 'parte') db.kondolencie = db.kondolencie.filter((k) => db.parte.some((p) => p.id === k.parte_id));
        if (nazov === 'zakazky') {
          db.ukony = db.ukony.filter((u) => db.zakazky.some((z) => z.id === u.zakazka_id));
          db.dokumenty = db.dokumenty.filter((d) => db.zakazky.some((z) => z.id === d.zakazka_id));
        }
        uloz();
        return { data: null, error: null };
      }
      let out = db[nazov].filter(sedi).map((r) => ({ ...r }));
      for (const [col, asc] of [...st.radenia].reverse()) {
        out.sort((a, b) => ((a[col] ?? '') < (b[col] ?? '') ? -1 : 1) * (asc ? 1 : -1));
      }
      if (nazov === 'kondolencie' && st.sel.includes('parte(meno)')) {
        out.forEach((k) => { k.parte = { meno: (db.parte.find((p) => p.id === k.parte_id) || {}).meno }; });
      }
      if (st.limitN) out = out.slice(0, st.limitN);
      if (st.single) return { data: out[0] ?? null, error: null };
      return { data: out, error: null };
    };
    const api = {
      select(sel) { st.sel = sel || '*'; return api; },
      order(col, opts) { st.radenia.push([col, !opts || opts.ascending !== false]); return api; },
      limit(n) { st.limitN = n; return api; },
      eq(col, val) { st.filtre.push([col, val]); return api; },
      maybeSingle() { st.single = true; return api; },
      single() { st.single = true; return api; },
      insert(obj) { st.op = 'insert'; st.payload = obj; return api; },
      update(obj) { st.op = 'update'; st.payload = obj; return api; },
      delete() { st.op = 'delete'; return api; },
      then(res, rej) { return Promise.resolve(vysledok()).then(res, rej); },
    };
    return api;
  }

  return {
    auth: {
      async getSession() { return { data: { session: db.session } }; },
      async signInWithPassword({ email, password }) {
        if (!email || !password) return { data: null, error: new Error('empty') };
        db.session = { user: { email: email + ' (demo)' } };
        uloz();
        return { data: { session: db.session }, error: null };
      },
      async signOut() { db.session = null; uloz(); },
    },
    from: tabulka,
    storage: {
      from() {
        return {
          upload(cesta, blob) {
            return new Promise((resolve) => {
              const r = new FileReader();
              r.onload = () => { db.fotky[cesta] = r.result; uloz(); resolve({ error: null }); };
              r.onerror = () => resolve({ error: new Error('Čítanie súboru zlyhalo.') });
              r.readAsDataURL(blob);
            });
          },
          getPublicUrl(cesta) { return { data: { publicUrl: db.fotky[cesta] || '' } }; },
          async createSignedUrl(cesta) { return { data: { signedUrl: db.fotky[cesta] || '' }, error: null }; },
          async remove(cesty) { cesty.forEach((c) => delete db.fotky[c]); uloz(); return { error: null }; },
        };
      },
    },
  };
}

/* ---------- spoločné dátové operácie ---------- */

/** URL dokumentu — v demo dataURL, v ostrom podpísaná URL z privátneho bucketu */
export async function dokumentUrl(sb, storagePath) {
  const { data } = await sb.storage.from('dokumenty').createSignedUrl(storagePath, 3600);
  return data?.signedUrl || '';
}

/** zmenšenie fotky/scanu v prehliadači → webp (max 1400 px) */
export function zmensiFotku(file, max = 1400, kvalita = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Konverzia fotky zlyhala.'))), 'image/webp', kvalita);
    };
    img.onerror = () => reject(new Error('Súbor sa nedá načítať ako obrázok.'));
    img.src = URL.createObjectURL(file);
  });
}

/** nové číslo zákazky Z-RRRR-NN */
export async function noveCisloZakazky(sb) {
  const rok = new Date().getFullYear();
  const { data } = await sb.from('zakazky').select('cislo').order('created_at', { ascending: false }).limit(500);
  const n = (data || [])
    .map((z) => (z.cislo || '').match(new RegExp(`^Z-${rok}-(\\d+)$`)))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  return `Z-${rok}-${(n.length ? Math.max(...n) : 0) + 1}`;
}

/** založí zákazku + checklist z template; vráti id */
export async function vytvorZakazku(sb, zaznam) {
  const id = uuid();
  const { error } = await sb.from('zakazky').insert({ id, stav: 'novy', ...zaznam });
  if (error) throw new Error(error.message);
  const ukony = UKONY_TEMPLATE.map((nazov, i) => ({ id: uuid(), zakazka_id: id, poradie: i, nazov, hotovo: false }));
  const { error: e2 } = await sb.from('ukony').insert(ukony);
  if (e2) throw new Error(e2.message);
  return id;
}

/* ---------- pobočkový filter (zdieľaný medzi stránkami) ---------- */

export function getPobockaFilter() {
  try { return localStorage.getItem('paciga-adm-pobocka') || ''; } catch (e) { return ''; }
}
export function setPobockaFilter(p) {
  try { localStorage.setItem('paciga-adm-pobocka', p || ''); } catch (e) {}
}

/** vykreslí chips filter pobočiek do elementu a volá onChange(pobocka|'') */
export function pobockaChips(el, onChange, aktualna = getPobockaFilter()) {
  const render = () => {
    el.innerHTML = ['', ...POBOCKY].map((p) =>
      `<button type="button" class="chip${aktualna === p ? ' on' : ''}" data-p="${esc(p)}">${p ? `<span class="dot-p" style="background:${POBOCKY_FARBY[p]}"></span>${esc(p)}` : 'Všetky pobočky'}</button>`).join('');
    el.querySelectorAll('.chip').forEach((ch) => {
      ch.addEventListener('click', () => {
        aktualna = ch.dataset.p;
        setPobockaFilter(aktualna);
        render();
        onChange(aktualna);
      });
    });
  };
  render();
  return () => aktualna;
}
