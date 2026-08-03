/*
  Obsah dvanástich detailných stránok pohrebných služieb.

  Texty vychádzajú z pôvodného webu paciga.sk, ale sú prepísané do hlasu
  nového webu: krátke vety, činný rod, vykanie (celý web vyká, tykanie
  platí len pre sociálne siete). Fakty sa nedopĺňajú odhadom — čo na
  starom webe nebolo, nie je ani tu.

  Kamenárstvo, 3D vizualizácia pomníka a spomienkové šperky tu zámerne
  nie sú. Majú vlastné stránky /kamenarstvo a /sperky, na ktoré vedie
  rozcestník aj súvisiace odkazy.

  Stránky vykresľuje src/pages/pohrebne-sluzby/[slug].astro.
*/
import type { FaqItem } from '../components/Faq.astro';

/*
  Blok obsahu. Typ určuje, ako ho [slug].astro vykreslí.

  `id` sa píše ručne a musí sedieť s kotvou v `chips`. Neodvodzuj ho zo
  slovenského nadpisu: „Výber" by dal id="výber" a odkaz #vyber by nikam
  neviedol. Bez id sa sekcia vykreslí bez kotvy, čo je v poriadku.
*/
export type Blok =
  /** nadpis a odseky bežného textu */
  | { typ: 'text'; id?: string; nadpis?: string; eyebrow?: string; odseky: string[] }
  /** mriežka kariet, každá s nadpisom a vetou */
  | { typ: 'karty'; id?: string; nadpis: string; eyebrow?: string; uvod?: string; polozky: { h: string; p: string }[] }
  /** číslovaný postup */
  | { typ: 'kroky'; id?: string; nadpis: string; eyebrow?: string; uvod?: string; polozky: { h: string; p: string }[] }
  /** dvojstĺpcový zoznam faktov (kľúč a hodnota) */
  | { typ: 'fakty'; id?: string; nadpis: string; eyebrow?: string; uvod?: string; polozky: { k: string; v: string }[] }
  /** citát cez celú šírku */
  | { typ: 'citat'; id?: string; text: string; zdroj?: string };

/** Špeciálne sekcie s vlastnou logikou a fotkami. */
export type Specialny = 'katalog-rakiev' | 'katalog-kvetov' | 'flotila' | 'mapa-krajin';

export interface Sluzba {
  slug: string;
  /** krátky názov do kariet, rozcestníka a drobečkovej navigácie */
  nazov: string;
  skupina: 'obrad' | 'prevoz' | 'podpora';
  eyebrow: string;
  h1: string;
  lead: string;
  /** kľúč fotky v HERO_MAPA v [slug].astro */
  hero: string;
  heroAlt: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  /** kotvy v hlavičke stránky */
  chips?: { label: string; href: string }[];
  bloky: Blok[];
  /** špeciálna sekcia sa vloží za bloky */
  specialny?: Specialny;
  faq?: FaqItem[];
  cta: { nadpis: string; text: string; akcia: 'tel' | 'mail' };
  /** slugy súvisiacich služieb; /kamenarstvo a /sperky sa píšu s lomkou */
  suvisiace: string[];
}

export const SKUPINY = [
  { kluc: 'obrad', nazov: 'Rozlúčka a obrad' },
  { kluc: 'prevoz', nazov: 'Prevoz a technológie' },
  { kluc: 'podpora', nazov: 'Podpora a spomienka' },
] as const;

export const SLUZBY: Sluzba[] = [
  /* ─────────────────────────── ROZLÚČKA A OBRAD ─────────────────────────── */
  {
    slug: 'rakvy',
    nazov: 'Rakvy',
    skupina: 'obrad',
    eyebrow: 'Rakvy',
    h1: 'Vyberiete si v pokoji, nie z katalógu na kolene.',
    lead: 'Rakvu si pozriete naživo v showroome v Poprade. Dvadsať prevedení od svetlého dreva po mahagón, s výstelkou aj kovaním. Poradíme vám, čo sa hodí k obradu, ktorý plánujete.',
    hero: 'nosici',
    heroAlt: 'Nosiči Paciga nesú rakvu pred kostolom',
    title: 'Rakvy | Pohrebné služby Paciga',
    description: 'Dvadsať rakiev v showroome v Poprade: svetlé, medové aj mahagónové odtiene, s výstelkou a kovaním. Pozrite si katalóg a príďte si vybrať naživo.',
    ogTitle: 'Rakvy | Paciga',
    ogDescription: 'Dvadsať prevedení od svetlého dreva po mahagón. Pozrite si katalóg.',
    chips: [
      { label: 'Katalóg rakiev', href: '#katalog' },
      { label: 'Ako vyberať', href: '#vyber' },
      { label: 'Časté otázky', href: '#faq' },
    ],
    bloky: [
      {
        typ: 'text',
        odseky: [
          'Rakva je prvá vec, ktorú od nás pozostalí chcú vidieť. Býva to aj prvé rozhodnutie, ktoré musia urobiť rýchlo a bez prípravy.',
          'Preto ich neposielame listovať katalóg. V showroome stoja rakvy vedľa seba, môžete si ich obzrieť z každej strany a porovnať odtiene naživo. Farba dreva na fotke a farba dreva v miestnosti sú dve odlišné veci.',
        ],
      },
      {
        typ: 'karty',
        id: 'vyber',
        nadpis: 'Podľa čoho sa rozhodovať',
        eyebrow: 'Výber',
        uvod: 'Štyri veci, ktoré rozhodujú častejšie než cena.',
        polozky: [
          { h: 'Spôsob pochovania', p: 'Pri kremácii sa rakva spopolní spolu so zosnulým. Pri pochovaní do zeme ide do hrobu. Ovplyvňuje to výber materiálu aj kovania.' },
          { h: 'Odtieň dreva', p: 'Svetlé odtiene pôsobia civilnejšie, mahagón slávnostnejšie. Zladiť sa dá s výzdobou obradu aj s farbou kvetov.' },
          { h: 'Výstelka', p: 'Vnútro s látkovou výstelkou a čipkou. Vidno ju, ak je rakva počas rozlúčky otvorená.' },
          { h: 'Kovanie a kríž', p: 'Úchyty, kríž alebo rezaný ornament na veku. Detail, ktorý mení celkový dojem najviac.' },
        ],
      },
    ],
    specialny: 'katalog-rakiev',
    faq: [
      {
        q: 'Musím si rakvu vybrať hneď?',
        a: 'Nie. Zavolajte nám, prevezmeme zosnulého a rakvu vyberiete, keď na to budete mať priestor. Bežne to býva do dvoch dní pred obradom.',
      },
      {
        q: 'Koľko stojí rakva?',
        a: 'Cena závisí od prevedenia, kovania a výstelky. Presnú sumu vám povieme pri výbere v showroome a vždy skôr, než sa na čokoľvek zaviažete.',
      },
      {
        q: 'Sú tieto rakvy vhodné aj na kremáciu?',
        a: 'Áno, len sa líšia materiálom a kovaním. Pri kremácii vám ukážeme prevedenia, ktoré sú na spopolnenie určené.',
      },
      {
        q: 'Kde si rakvy pozriem naživo?',
        a: 'V showroome v Poprade na Francisciho 3288/35. Ak sa tam neviete dostať, prídeme za vami s fotkami a vzorkami.',
      },
    ],
    cta: {
      nadpis: 'Príďte si vybrať v pokoji',
      text: 'Zavolajte nám vopred a pripravíme showroom tak, aby ste v ňom boli sami.',
      akcia: 'tel',
    },
    suvisiace: ['rozlucka-a-pochovanie', 'kremacia', 'kvetinarstvo'],
  },

  {
    slug: 'rozlucka-a-pochovanie',
    nazov: 'Rozlúčka a pochovanie na cintoríne',
    skupina: 'obrad',
    eyebrow: 'Klasický pohreb',
    h1: 'Posledná rozlúčka a pochovanie na cintoríne.',
    lead: 'Obrad na cintoríne dáva priestor spomienkam a úcte. Zabezpečíme celý priebeh: prípravu hrobového miesta, výzdobu, nosičov aj techniku. Vy sa nemusíte starať o nič, len o rozlúčku.',
    hero: 'obrad',
    heroAlt: 'Smútočný obrad pod stanom Paciga na cintoríne',
    title: 'Rozlúčka a pochovanie na cintoríne | Pohrebné služby Paciga',
    description: 'Kompletné zabezpečenie klasického pohrebu: príprava hrobového miesta, dom smútku alebo kostol, nosiči, výzdoba, ozvučenie a stan. Poprad, Spišská Belá, Liptovský Mikuláš.',
    ogTitle: 'Rozlúčka a pochovanie na cintoríne | Paciga',
    ogDescription: 'Obrad zabezpečíme od prípravy hrobu po poslednú kyticu.',
    chips: [
      { label: 'Čo zabezpečíme', href: '#zabezpecime' },
      { label: 'Priebeh dňa', href: '#priebeh' },
      { label: 'Časté otázky', href: '#faq' },
    ],
    bloky: [
      {
        typ: 'text',
        odseky: [
          'Klasický pohreb má svoj poriadok. Ten poriadok je to jediné, čoho sa pozostalí v ten deň držia, a preto na ňom záleží do minúty.',
          'Obrad vieme pripraviť v dome smútku aj v kostole, s kňazom alebo bez neho. Rešpektujeme tradície obce aj želania rodiny. Ak si nie ste istí, ako to má prebiehať, prevedieme vás tým krok po kroku.',
        ],
      },
      {
        typ: 'karty',
        id: 'zabezpecime',
        nadpis: 'Čo pri obrade zabezpečíme',
        eyebrow: 'Rozsah',
        polozky: [
          { h: 'Hrobové miesto', p: 'Výkop, obloženie a úprava okolia. Po obrade miesto odovzdáme upravené.' },
          { h: 'Dom smútku alebo kostol', p: 'Dohodneme termín so správcom cintorína aj s farským úradom.' },
          { h: 'Nosiči a technika', p: 'Nosiči v rovnošatách, katafalk a vozík. Rakvu nesieme my, ak si to rodina nechce vziať na seba.' },
          { h: 'Výzdoba a ozvučenie', p: 'Smútočná výzdoba, ozvučenie a hudba podľa vášho výberu.' },
          { h: 'Stan v každom počasí', p: 'Vlastné stany s logom Paciga. Obrad zvládneme aj v daždi a v mraze.' },
          { h: 'Administratíva', p: 'Vybavíme úmrtný list, ohlásenie na matrike aj doklady pre pohrebisko.' },
        ],
      },
      {
        typ: 'kroky',
        id: 'priebeh',
        nadpis: 'Ako prebieha deň obradu',
        eyebrow: 'Priebeh',
        polozky: [
          { h: 'Príprava', p: 'Prídeme na miesto skôr. Postavíme stan, pripravíme katafalk a výzdobu.' },
          { h: 'Rozlúčka', p: 'Obrad v dome smútku alebo v kostole. Rečník alebo kňaz podľa dohody.' },
          { h: 'Sprievod', p: 'Odprevadíme rakvu k hrobu. Tempo držíme podľa rodiny, nie podľa hodín.' },
          { h: 'Uloženie', p: 'Uloženie do hrobu a rozlúčka pri hrobe. Miesto potom upravíme a odovzdáme.' },
        ],
      },
    ],
    faq: [
      {
        q: 'Ako rýchlo sa dá obrad pripraviť?',
        a: 'Bežne do troch až piatich dní. Termín závisí od správcu cintorína, farského úradu a od toho, kedy sa zíde rodina zo zahraničia.',
      },
      {
        q: 'Musí byť obrad cirkevný?',
        a: 'Nie. Zabezpečíme aj civilnú rozlúčku s rečníkom. Vieme vám odporučiť rečníka, s ktorým spolupracujeme dlhodobo.',
      },
      {
        q: 'Čo ak prší alebo mrzne?',
        a: 'Máme vlastné stany a obrad pod nimi zvládneme za každého počasia. Nie je to dôvod meniť termín.',
      },
      {
        q: 'Vybavíte aj papiere na matrike?',
        a: 'Áno. Úmrtný list a ohlásenie na matrike vybavíme za vás, potrebujeme len doklady zosnulého.',
      },
    ],
    cta: {
      nadpis: 'Nemusíte vybavovať nič sami',
      text: 'Zavolajte kedykoľvek. Poradíme, prevezmeme a s úctou zabezpečíme všetko potrebné.',
      akcia: 'tel',
    },
    suvisiace: ['rakvy', 'kvetinarstvo', 'kremacia'],
  },

  {
    slug: 'kremacia',
    nazov: 'Kremácia s obradom alebo bez',
    skupina: 'obrad',
    eyebrow: 'Kremácia',
    h1: 'Kremácia s obradom alebo bez neho.',
    lead: 'Kremácia dáva rodine priestor rozhodnúť sa, ako má rozlúčka vyzerať. Môže mať plný obrad v kostole alebo v dome smútku. Môže prebehnúť aj ticho, bez obradu, a spomienku si necháte na neskôr.',
    hero: 'kostol',
    heroAlt: 'Kostol v obci pod Tatrami z výšky',
    title: 'Kremácia s obradom alebo bez | Pohrebné služby Paciga',
    description: 'Kremácia s obradom v kostole či dome smútku, alebo bez obradu. Zabezpečíme prevoz do krematória, urnu aj uloženie popola. Poprad, Spišská Belá, Liptovský Mikuláš.',
    ogTitle: 'Kremácia s obradom alebo bez | Paciga',
    ogDescription: 'Rozlúčka podľa želania rodiny. S obradom aj bez neho.',
    chips: [
      { label: 'S obradom', href: '#s-obradom' },
      { label: 'Bez obradu', href: '#bez-obradu' },
      { label: 'Časté otázky', href: '#faq' },
    ],
    bloky: [
      {
        typ: 'text',
        id: 's-obradom',
        nadpis: 'Kremácia s obradom',
        eyebrow: 'S obradom',
        odseky: [
          'Obrad prebehne v kostole alebo v dome smútku, rovnako ako pri klasickom pohrebe. Rodina sa rozlúči pri rakve, potom prevezieme zosnulého na spopolnenie.',
          'Popol vám odovzdáme v urne, ktorú si vyberiete. Uložiť sa dá do urnového miesta, do existujúceho hrobu, alebo si ju rodina ponechá.',
        ],
      },
      {
        typ: 'text',
        id: 'bez-obradu',
        nadpis: 'Kremácia bez obradu',
        eyebrow: 'Bez obradu',
        odseky: [
          'Bez obradu prebehne všetko ticho a bez zbytočných formalít. Volí sa čoraz častejšie, najmä keď si to zosnulý sám želal alebo keď je rodina rozptýlená po svete.',
          'Nie je to menej dôstojná rozlúčka. Je len iná. Spomienkové stretnutie si môžete urobiť neskôr, vo svojom čase a bez tlaku termínov.',
        ],
      },
      {
        typ: 'karty',
        nadpis: 'Čo pri kremácii zariadime',
        eyebrow: 'Rozsah',
        polozky: [
          { h: 'Prevoz do krematória', p: 'Zabezpečíme celý prevoz aj potrebné doklady. Najbližšie krematóriá sú mimo regiónu, cestu riešime my.' },
          { h: 'Výber rakvy a urny', p: 'Ukážeme vám prevedenia určené na spopolnenie aj ponuku urien.' },
          { h: 'Obrad podľa želania', p: 'Kostol, dom smútku, kňaz alebo civilný rečník. Alebo nič z toho.' },
          { h: 'Uloženie popola', p: 'Urnové miesto, existujúci hrob alebo odovzdanie rodine. Kamenárske práce vieme naviazať.' },
        ],
      },
    ],
    faq: [
      {
        q: 'Ako dlho trvá, kým dostaneme urnu?',
        a: 'Bežne dva až tri týždne od spopolnenia. Presný termín závisí od krematória, ozveme sa vám hneď, ako urnu prevezmeme.',
      },
      {
        q: 'Dá sa mať otvorená rakva aj pri kremácii?',
        a: 'Áno. Rozlúčka pri otvorenej rakve prebehne rovnako ako pri klasickom pohrebe, spopolnenie nasleduje až po nej.',
      },
      {
        q: 'Môžeme urnu uložiť do existujúceho hrobu?',
        a: 'Áno, ak to povoľuje prevádzkový poriadok pohrebiska. Overíme to za vás u správcu cintorína.',
      },
      {
        q: 'Je kremácia lacnejšia než pochovanie do zeme?',
        a: 'Väčšinou áno, lebo odpadá výkop a hrobka. Rozdiel ale závisí od rozsahu obradu. Konkrétne čísla vám povieme pri konzultácii.',
      },
    ],
    cta: {
      nadpis: 'Poradíme, čo dáva vo vašej situácii zmysel',
      text: 'Zavolajte a povedzte nám, ako si rozlúčku predstavujete. Zvyšok vysvetlíme my.',
      akcia: 'tel',
    },
    suvisiace: ['rozlucka-a-pochovanie', 'rakvy', '/kamenarstvo'],
  },

  {
    slug: 'kvetinarstvo',
    nazov: 'Kvetinárstvo',
    skupina: 'obrad',
    eyebrow: 'Kvetinárstvo',
    h1: 'Kvety povedia to, na čo v ten deň nemáte slová.',
    lead: 'Vlastné kvetinárstvo pre pohrebné služby. Rakvové kytice a vence zo živých kvetov viažeme na deň obradu. Umelé vence vydržia mráz aj dážď, preto ich v zime odporúčame častejšie.',
    hero: 'kytica',
    heroAlt: 'Rakvová kytica z bielych ruží na drevenej rakve',
    title: 'Kvetinárstvo | Pohrebné služby Paciga',
    description: 'Smútočné vence a rakvové kytice zo živých aj umelých kvetov. Katalóg s cenami umelých vencov od 18 € do 120 €, veľkosti 55 až 120 cm. Poprad, Spišská Belá, Liptovský Mikuláš.',
    ogTitle: 'Kvetinárstvo | Paciga',
    ogDescription: 'Rakvové kytice a vence. Osemdesiat prevedení v katalógu.',
    chips: [
      { label: 'Katalóg kvetov', href: '#katalog' },
      { label: 'Živé alebo umelé', href: '#zive-alebo-umele' },
      { label: 'Časté otázky', href: '#faq' },
    ],
    bloky: [
      {
        typ: 'text',
        odseky: [
          'Kvetinová výzdoba nie je doplnok obradu. Býva to jediná vec, ktorú si ľudia z rozlúčky zapamätajú vizuálne.',
          'Viažeme priamo pre naše pohrebné služby, takže kytica dorazí na obrad čerstvá a v správny čas. Nemusíte nič voziť ani stíhať.',
        ],
      },
      {
        typ: 'fakty',
        id: 'zive-alebo-umele',
        nadpis: 'Živé alebo umelé kvety',
        eyebrow: 'Rozhodovanie',
        uvod: 'Obe majú svoje miesto. Rozhoduje ročné obdobie a to, ako dlho má výzdoba na hrobe vydržať.',
        polozky: [
          { k: 'Živé kvety', v: 'Vôňa a farba, ktorú nič nenahradí. Viažeme ich na deň obradu z toho, čo je práve v sezóne. Cena preto závisí od dostupnosti, povieme vám ju pri objednávke.' },
          { k: 'Umelé vence', v: 'Vydržia mráz, dážď aj vietor. Majú pevnú cenu a rozmer, takže viete presne, čo si objednávate. V zime ich odporúčame ako prvú voľbu.' },
          { k: 'Kombinácia', v: 'Bežne sa robí živá kytica na rakvu a umelé vence na hrob. Živé kvety vydržia obrad, umelé mesiace po ňom.' },
        ],
      },
    ],
    specialny: 'katalog-kvetov',
    faq: [
      {
        q: 'Kedy najneskôr si musím kvety objednať?',
        a: 'Živé kytice viažeme na deň obradu, objednajte ich aspoň deň vopred. Umelé vence máme skladom, tie vieme dať aj v ten istý deň.',
      },
      {
        q: 'Prídu kvety priamo na obrad?',
        a: 'Áno. Kytice a vence privezieme na miesto rozlúčky a rozmiestnime ich pred začiatkom obradu.',
      },
      {
        q: 'Dá sa na stuhu dať vlastný text?',
        a: 'Áno. Text na stuhu napíšeme podľa vás, stačí ho poslať pri objednávke.',
      },
      {
        q: 'Prečo pri živých kvetoch nie je cena?',
        a: 'Závisí od sezóny a od toho, čo je v deň obradu dostupné. Konkrétnu sumu vám povieme hneď pri objednávke, skôr než čokoľvek potvrdíte.',
      },
    ],
    cta: {
      nadpis: 'Napíšte nám. Radi vám poradíme.',
      text: 'Pošlite nám číslo z katalógu alebo len predstavu o farbách. Ozveme sa vám s návrhom.',
      akcia: 'mail',
    },
    suvisiace: ['rozlucka-a-pochovanie', 'rakvy', 'spomienkove-karty'],
  },

  {
    slug: 'oblecenie-pre-zosnuleho',
    nazov: 'Oblečenie pre zosnulého',
    skupina: 'obrad',
    eyebrow: 'Oblečenie',
    h1: 'Oblečenie, v ktorom ho rodina uvidí naposledy.',
    lead: 'Ak máte doma šaty, ktoré mal rád, oblečieme ho do nich. Ak nemáte alebo na to teraz nemáte silu, zabezpečíme dôstojné oblečenie my. Aj obuv, bielizeň a doplnky.',
    hero: 'tim',
    heroAlt: 'Členovia tímu Paciga v rovnošatách',
    title: 'Oblečenie pre zosnulého | Pohrebné služby Paciga',
    description: 'Zabezpečíme dôstojné oblečenie pre zosnulého vrátane obuvi a bielizne, alebo použijeme šaty, ktoré prinesiete. Úprava a obliekanie s rešpektom. Poprad, Spišská Belá, Liptovský Mikuláš.',
    ogTitle: 'Oblečenie pre zosnulého | Paciga',
    ogDescription: 'Vlastné šaty alebo dôstojné oblečenie od nás. Postaráme sa.',
    chips: [
      { label: 'Ako to prebieha', href: '#priebeh' },
      { label: 'Čo priniesť', href: '#co-priniest' },
      { label: 'Časté otázky', href: '#faq' },
    ],
    bloky: [
      {
        typ: 'text',
        odseky: [
          'Rodiny sa nás na to pýtajú takmer vždy a takmer vždy s rozpakmi. Nemusíte ich mať. Je to bežná súčasť našej práce a vieme ju vziať celú na seba.',
          'Niekomu pomôže vybrať oblek, v ktorom chodil do kostola. Niekto na to v tej chvíli silu nemá. Obe riešenia sú v poriadku a ani jedno nie je o tom, koľko vám na zosnulom záležalo.',
        ],
      },
      {
        typ: 'kroky',
        id: 'priebeh',
        nadpis: 'Ako to prebieha',
        eyebrow: 'Priebeh',
        polozky: [
          { h: 'Dohodneme sa', p: 'Pri preberaní zosnulého sa vás spýtame, či oblečenie prinesiete, alebo ho máme zabezpečiť my.' },
          { h: 'Prinesiete alebo vyberieme', p: 'Šaty môžete priniesť na ktorúkoľvek pobočku. Ak nemáte, ukážeme vám, čo vieme zabezpečiť.' },
          { h: 'Úprava a oblečenie', p: 'Zosnulého oblečieme a upravíme. Robíme to v pokoji, s rešpektom a bez zbytočných očí navyše.' },
          { h: 'Rozlúčka', p: 'Ak si prajete otvorenú rakvu, uvidíte ho upraveného ešte pred obradom.' },
        ],
      },
      {
        typ: 'fakty',
        id: 'co-priniest',
        nadpis: 'Čo priniesť, ak máte vlastné',
        eyebrow: 'Čo priniesť',
        uvod: 'Nič z toho nie je povinné. Je to len zoznam, na ktorý sa v tých dňoch ťažko spomína.',
        polozky: [
          { k: 'Vrchné oblečenie', v: 'Oblek, košeľa a kravata, alebo šaty a sveter. Pokojne to, čo nosil najradšej, nie nutne to najslávnostnejšie.' },
          { k: 'Bielizeň a ponožky', v: 'Spodná bielizeň, ponožky alebo pančuchy.' },
          { k: 'Obuv', v: 'Topánky, ak si ich prajete. Nie je to podmienka a mnohé rodiny ich nedávajú.' },
          { k: 'Osobné veci', v: 'Ruženec, krížik, okuliare, fotka. Povedzte nám, čo má ostať pri ňom.' },
        ],
      },
    ],
    faq: [
      {
        q: 'Musíme oblečenie doniesť my?',
        a: 'Nie. Ak nemáte alebo nechcete, dôstojné oblečenie zabezpečíme my. Stačí nám to povedať.',
      },
      {
        q: 'Kedy najneskôr treba oblečenie priniesť?',
        a: 'Ideálne do dňa pred obradom. Ak sa to nestíha, ozvite sa nám a dohodneme sa.',
      },
      {
        q: 'Môže zostať pri zosnulom ruženec alebo fotka?',
        a: 'Áno. Osobné veci uložíme podľa vášho želania a povieme vám, čo pri kremácii ostať nemôže.',
      },
      {
        q: 'Upravíte aj vlasy a tvár?',
        a: 'Áno, základnú úpravu robíme vždy. Ak si prajete konkrétny účes alebo líčenie, prineste fotku.',
      },
    ],
    cta: {
      nadpis: 'Spýtajte sa na čokoľvek',
      text: 'Aj na to, čo vám pripadá nevhodné. Počuli sme to už a odpovieme bez rozpakov.',
      akcia: 'tel',
    },
    suvisiace: ['prevoz-zosnulych', 'rakvy', 'rozlucka-a-pochovanie'],
  },

  {
    slug: 'spomienkove-karty',
    nazov: 'Spomienkové karty',
    skupina: 'obrad',
    eyebrow: 'Spomienkové karty',
    h1: 'Kartička, ktorá ostane v peňaženke roky.',
    lead: 'Spomienková karta nesie fotku, meno, dátumy a text, ktorý si vyberiete. Rozdávajú sa po obrade. Ľudia si ich odkladajú medzi doklady a nájdu ich tam aj o desať rokov.',
    hero: 'parte',
    heroAlt: 'Smútočné parte s fotografiou',
    title: 'Spomienkové karty | Pohrebné služby Paciga',
    description: 'Spomienkové karty s fotografiou, menom, dátumami a textom podľa vášho výberu. Klasické aj moderné prevedenie, tlač do druhého dňa. Poprad, Spišská Belá, Liptovský Mikuláš.',
    ogTitle: 'Spomienkové karty | Paciga',
    ogDescription: 'Fotka, meno, dátum a text, ktorý si vyberiete.',
    chips: [
      { label: 'Čo na karte býva', href: '#obsah' },
      { label: 'Ako to prebieha', href: '#priebeh' },
      { label: 'Časté otázky', href: '#faq' },
    ],
    bloky: [
      {
        typ: 'text',
        odseky: [
          'Parte oznamuje. Spomienková karta ostáva. To je celý rozdiel medzi nimi a je väčší, než sa zdá.',
          'Pripravíme klasické prevedenie aj civilnejšie, bez sakrálnych symbolov. Text, fotku aj rozloženie vám ukážeme na náhľade skôr, než čokoľvek pôjde do tlače.',
        ],
      },
      {
        typ: 'fakty',
        id: 'obsah',
        nadpis: 'Čo na karte býva',
        eyebrow: 'Obsah',
        polozky: [
          { k: 'Fotografia', v: 'Stačí bežná fotka z telefónu alebo z albumu. Ak je poškodená alebo tmavá, upravíme ju.' },
          { k: 'Meno a dátumy', v: 'Meno, dátum narodenia a dátum úmrtia. Prípadne miesto, odkiaľ pochádzal.' },
          { k: 'Text', v: 'Citát, modlitba alebo veta od rodiny. Ak neviete, čo napísať, ukážeme vám, čo volia iní.' },
          { k: 'Prevedenie', v: 'Od klasického so sakrálnym motívom po civilné a strohé. Vyberáte z ponuky na pobočke.' },
        ],
      },
      {
        typ: 'kroky',
        id: 'priebeh',
        nadpis: 'Ako to prebieha',
        eyebrow: 'Priebeh',
        polozky: [
          { h: 'Prinesiete podklady', p: 'Fotku a údaje. Stačí ich poslať e-mailom alebo ukázať v telefóne na pobočke.' },
          { h: 'Pripravíme náhľad', p: 'Ukážeme vám, ako bude karta vyzerať. Text aj rozloženie ešte meníme.' },
          { h: 'Odsúhlasíte', p: 'Do tlače ide až to, čo ste videli a schválili.' },
          { h: 'Odovzdáme', p: 'Karty dodáme pred obradom, aby sa dali rozdať hosťom.' },
        ],
      },
    ],
    faq: [
      {
        q: 'Ako rýchlo viete karty pripraviť?',
        a: 'Bežne do druhého dňa. Ak je obrad skôr, povedzte nám to hneď a prispôsobíme sa.',
      },
      {
        q: 'Aká fotka je dobrá?',
        a: 'Ostrá, s dobre viditeľnou tvárou. Nemusí byť portrét, výrez si spravíme. Aj staršiu alebo poškodenú fotku vieme upraviť.',
      },
      {
        q: 'Koľko kariet si objednať?',
        a: 'Podľa počtu hostí, väčšinou s malou rezervou. Ak si nie ste istí, poradíme podľa veľkosti obradu.',
      },
      {
        q: 'Robíte aj parte?',
        a: 'Áno. Parte aj smútočné oznámenie pripravíme spolu s kartami, aby ladili.',
      },
    ],
    cta: {
      nadpis: 'Napíšte nám. Radi vám poradíme.',
      text: 'Pošlite fotku a údaje. Náhľad karty vám vrátime obratom.',
      akcia: 'mail',
    },
    suvisiace: ['kvetinarstvo', 'rozlucka-a-pochovanie', '/sperky'],
  },

  /* ─────────────────────────── PREVOZ A TECHNOLÓGIE ─────────────────────── */
  {
    slug: 'prevoz-zosnulych',
    nazov: 'Prevoz zosnulých NON STOP',
    skupina: 'prevoz',
    eyebrow: 'NON STOP',
    h1: 'Zdvihneme telefón o tretej ráno.',
    lead: 'Prevoz zosnulých z bytov, nemocníc a zariadení, 24 hodín denne, sedem dní v týždni. Prídeme, prevezmeme zosnulého a povieme vám, čo bude nasledovať. Ostatné počká do rána.',
    hero: 'flotila',
    heroAlt: 'Flotila vozidiel Paciga v hmle pod Tatrami',
    title: 'Prevoz zosnulých NON STOP | Pohrebné služby Paciga',
    description: 'Prevoz zosnulých z bytov, nemocníc a sociálnych zariadení 24/7. Rýchly príjazd, hygienické aj legislatívne predpisy, dôstojné zaobchádzanie. Poprad, Spišská Belá, Liptovský Mikuláš.',
    ogTitle: 'Prevoz zosnulých NON STOP | Paciga',
    ogDescription: 'Nonstop linka 0903 596 364. Prídeme a prevezmeme zosnulého.',
    chips: [
      { label: 'Čo robiť teraz', href: '#co-robit' },
      { label: 'Ako to prebieha', href: '#priebeh' },
      { label: 'Časté otázky', href: '#faq' },
    ],
    bloky: [
      {
        typ: 'citat',
        text: 'Keď niekto zomrie doma, väčšina ľudí nevie, čo má urobiť ako prvé. To je normálne. Preto máme nonstop linku.',
      },
      {
        typ: 'kroky',
        id: 'co-robit',
        nadpis: 'Čo robiť, keď niekto zomrie doma',
        eyebrow: 'Čo robiť teraz',
        uvod: 'Štyri kroky. Nič viac od vás v tej chvíli nikto nechce.',
        polozky: [
          { h: 'Zavolajte lekára', p: 'Obhliadku vykoná lekár alebo záchranná služba. Bez obhliadky sa zosnulý previezť nesmie.' },
          { h: 'Zavolajte nám', p: 'Na 0903 596 364, kedykoľvek. Povieme vám, čo pripraviť, a dohodneme príjazd.' },
          { h: 'Pripravte doklady', p: 'Občiansky preukaz zosnulého a list o obhliadke od lekára. Ak ich neviete nájsť, vyriešime to neskôr.' },
          { h: 'Ostatné počká', p: 'Obrad, rakvu ani kvety neriešte v noci. Vrátime sa k tomu, keď sa vyspíte.' },
        ],
      },
      {
        typ: 'karty',
        nadpis: 'Odkiaľ zosnulých prevážame',
        eyebrow: 'Rozsah',
        polozky: [
          { h: 'Z bytov a domov', p: 'Po obhliadke lekárom. Prídeme diskrétne, bez zbytočného ruchu na chodbe.' },
          { h: 'Z nemocníc', p: 'Prevezmeme zosnulého priamo od zdravotníckeho zariadenia a vybavíme papiere.' },
          { h: 'Zo sociálnych zariadení', p: 'Z domovov seniorov a zariadení sociálnych služieb, s ktorými spolupracujeme dlhodobo.' },
          { h: 'Na súdnu pitvu a späť', p: 'Ak je nariadená obhliadka súdnym lekárom, prevoz zabezpečíme oboma smermi.' },
        ],
      },
      {
        typ: 'text',
        id: 'priebeh',
        nadpis: 'Ako to prebieha u nás',
        eyebrow: 'Priebeh',
        odseky: [
          'Vozidlá máme pripravené na všetkých troch pobočkách, takže do väčšiny obcí v regióne sa dostaneme rýchlo. Prevoz robíme v zakrytých vozidlách, nie v dodávke s nápisom cez celý bok.',
          'Dodržiavame hygienické aj legislatívne predpisy, ale to je najmenej dôležitá časť. Dôležitejšie je, ako sa pri tom správame k rodine, ktorá stojí vedľa.',
        ],
      },
    ],
    faq: [
      {
        q: 'Za ako dlho prídete?',
        a: 'Do väčšiny obcí v regióne do hodiny. Presný čas vám povieme hneď v telefóne, nie odhadom.',
      },
      {
        q: 'Voláme vás pred lekárom alebo po ňom?',
        a: 'Najprv lekára na obhliadku. Bez listu o obhliadke zosnulého previezť nesmieme. Ale zavolať nám môžete aj skôr, poradíme vám.',
      },
      {
        q: 'Čo ak sa to stalo v noci alebo cez sviatok?',
        a: 'Linka 0903 596 364 je nonstop, vrátane víkendov a sviatkov. Nie je to odkazovač.',
      },
      {
        q: 'Musíme si vás vybrať, ak nás privezie iná služba?',
        a: 'Nie. Pohrebnú službu si vyberá rodina a môže ju zmeniť. Ak vám niekto tvrdí opak, nie je to pravda.',
      },
    ],
    cta: {
      nadpis: 'NON STOP · 0903 596 364',
      text: 'Zavolajte kedykoľvek. Zdvihneme aj v noci, cez víkend a cez sviatky.',
      akcia: 'tel',
    },
    suvisiace: ['prenosne-chladenie', 'medzinarodny-prevoz', 'oblecenie-pre-zosnuleho'],
  },

  {
    slug: 'pohrebna-limuzina',
    nazov: 'Pohrebná limuzína',
    skupina: 'prevoz',
    eyebrow: 'Flotila',
    h1: 'Najkrajšia pohrebná limuzína na Slovensku.',
    lead: 'Mercedes-Benz E 400 získal v roku 2024 ocenenie za najkrajšiu pohrebnú limuzínu na Slovensku. Nie je to trofej do vitríny. Je to vozidlo, ktoré vezie niekoho blízkeho poslednú cestu.',
    hero: 'limuzina',
    heroAlt: 'Biela pohrebná limuzína Mercedes-Benz Paciga',
    title: 'Pohrebná limuzína | Pohrebné služby Paciga',
    description: 'Mercedes-Benz E 400, ocenený ako najkrajšia pohrebná limuzína na Slovensku 2024, a Mercedes-Benz E 270. Dôstojná posledná cesta za každého počasia.',
    ogTitle: 'Pohrebná limuzína | Paciga',
    ogDescription: 'Mercedes-Benz E 400, ocenený v roku 2024. Pozrite si flotilu.',
    chips: [
      { label: 'Naša flotila', href: '#flotila' },
      { label: 'Ocenenie 2024', href: '#ocenenie' },
      { label: 'Časté otázky', href: '#faq' },
    ],
    bloky: [
      {
        typ: 'text',
        id: 'ocenenie',
        nadpis: 'Prečo na vozidle záleží',
        eyebrow: 'Ocenenie',
        odseky: [
          'Pri poslednej rozlúčke rozhodujú detaily, ktoré si nikto nevšimne, keď sú v poriadku. Čisté vozidlo, ktoré naštartuje, dorazí načas a vyzerá dôstojne, je jedným z nich.',
          'Ocenenie z roku 2024 nás potešilo. Viac však znamená, že si rodiny všimnú, ako limuzína vyzerá, a povedia nám to. To je spätná väzba, ktorá sa počíta.',
        ],
      },
    ],
    specialny: 'flotila',
    faq: [
      {
        q: 'Je limuzína súčasťou bežného pohrebu?',
        a: 'Áno, prevoz na obrad zabezpečujeme vždy. Konkrétne vozidlo zvolíme podľa termínu a trasy, poviete si aj vy.',
      },
      {
        q: 'Vozíte limuzínou aj rodinu?',
        a: 'Limuzína vezie zosnulého. Pre rodinu vieme zabezpečiť sprievodné vozidlo, dohodneme sa vopred.',
      },
      {
        q: 'Ide limuzína aj do horských obcí v zime?',
        a: 'Áno. Flotilu máme pripravenú na zimné podmienky, obrad kvôli počasiu nepresúvame.',
      },
    ],
    cta: {
      nadpis: 'Nemusíte vybavovať nič sami',
      text: 'Zavolajte kedykoľvek. Poradíme, prevezmeme a s úctou zabezpečíme všetko potrebné.',
      akcia: 'tel',
    },
    suvisiace: ['prevoz-zosnulych', 'medzinarodny-prevoz', 'rozlucka-a-pochovanie'],
  },

  {
    slug: 'prenosne-chladenie',
    nazov: 'Prenosné chladenie',
    skupina: 'prevoz',
    eyebrow: 'Vlastná technológia',
    h1: 'Rozlúčka doma, nie v chladiacom boxe.',
    lead: 'Prenosné chladenie udrží zosnulého na mieste, kde zomrel, až do dňa pohrebu. Rodina sa môže rozlúčiť doma a v pokoji. Technológiu sme ako prví predstavili na výstave Slovak Funeral.',
    hero: 'tim-vozidla',
    heroAlt: 'Tím Paciga pri vozidlách',
    title: 'Prenosné chladenie | Pohrebné služby Paciga',
    description: 'Prenosné chladenie zosnulých MT 100 s kazetami MT 10. Chladenie na -8 °C priamo v byte alebo v zariadení. Prenájom pre klientov aj predaj pohrebným službám a zariadeniam.',
    ogTitle: 'Prenosné chladenie | Paciga',
    ogDescription: 'Rozlúčka doma až do dňa pohrebu. Vlastná technológia.',
    chips: [
      { label: 'Ako to funguje', href: '#funguje' },
      { label: 'Technické údaje', href: '#technicke-udaje' },
      { label: 'Prenájom a predaj', href: '#prenajom' },
    ],
    bloky: [
      {
        typ: 'text',
        id: 'funguje',
        nadpis: 'Ako to funguje',
        eyebrow: 'Princíp',
        odseky: [
          'Chladiaca kazeta sa uloží pod zosnulého a napojí sa na prístroj. Ten cez ňu ženie chladiacu kvapalinu a udrží telo na teplote okolo -8 °C.',
          'Zosnulý tak môže ostať doma alebo v zariadení až do dňa pohrebu. Rodina za ním nemusí chodiť do chladiaceho boxu a rozlúčiť sa môže postupne, ako komu vyhovuje.',
          'Kazety sú jednorazové a biologicky rozložiteľné. Technológiu vyvinul výrobca s dlhoročnou praxou v pohrebníctve, nie ako univerzálne chladenie prispôsobené dodatočne.',
        ],
      },
      {
        typ: 'karty',
        nadpis: 'Kde sa používa',
        eyebrow: 'Použitie',
        polozky: [
          { h: 'V domácnosti', p: 'Rodina sa rozlúči doma, v prostredí, ktoré zosnulý poznal. Bez cesty do chladiaceho zariadenia.' },
          { h: 'V zariadeniach pre seniorov', p: 'Rýchle zachladenie na mieste, kým prebehne obhliadka súdnym lekárom.' },
          { h: 'V sociálnych zariadeniach', p: 'Riešenie pre zariadenia, ktoré vlastné chladenie nemajú a potrebujú získať čas.' },
        ],
      },
      {
        typ: 'fakty',
        id: 'technicke-udaje',
        nadpis: 'Technické údaje',
        eyebrow: 'Parametre',
        uvod: 'Údaje výrobcu. Podrobnú špecifikáciu pošleme na vyžiadanie.',
        polozky: [
          { k: 'Chladiaca kazeta MT 10', v: 'Rozmer 360 × 660 × 18 mm, chladiaca plocha 1,2 m². Napojenie ventilom MT 15 na prístroj MT 100.' },
          { k: 'Prístroj MT 100', v: 'Napájanie 230 V / 50 Hz. Prietok kvapaliny 0,9 m³/hod. Prevádzkový tlak 1,0 MPa.' },
          { k: 'Teplota', v: 'Chladenie na približne -8 °C. Telo sa zachladí rýchlo, do obhliadky súdnym lekárom.' },
          { k: 'Kazety', v: 'Jednorazové a biologicky rozložiteľné. Po použití sa nevracajú ani nečistia.' },
        ],
      },
      {
        typ: 'karty',
        id: 'prenajom',
        nadpis: 'Prenájom aj predaj',
        eyebrow: 'Prenájom',
        polozky: [
          { h: 'Prenájom pre rodiny', p: 'Ak vybavujete pohreb u nás, chladenie zapožičiame a obsluhu zabezpečíme my.' },
          { h: 'Predaj pohrebným službám', p: 'Zariadenie predávame aj iným pohrebným službám. Zaškolíme obsluhu.' },
          { h: 'Predaj zariadeniam a obciam', p: 'Domovom seniorov, zariadeniam sociálnych služieb a samosprávam. Ozvite sa na paciga@paciga.sk.' },
        ],
      },
    ],
    faq: [
      {
        q: 'Ako dlho môže zosnulý ostať doma?',
        a: 'Až do dňa pohrebu. Presný čas závisí od podmienok v byte, posúdime ho na mieste a poradíme vám.',
      },
      {
        q: 'Je to hlučné?',
        a: 'Prístroj beží ticho, porovnateľne s chladničkou. V byte cez noc nevadí.',
      },
      {
        q: 'Musíme s tým niečo robiť?',
        a: 'Nie. Zariadenie inštalujeme aj odoberáme my a počas prevádzky ho kontrolujeme.',
      },
      {
        q: 'Predávate zariadenie aj mimo regiónu?',
        a: 'Áno. Napíšte nám na paciga@paciga.sk a pošleme špecifikáciu aj podmienky dodania.',
      },
    ],
    cta: {
      nadpis: 'Napíšte nám. Radi vám poradíme.',
      text: 'Zaujíma vás prenájom pre rodinu alebo kúpa zariadenia? Pošlite nám správu.',
      akcia: 'mail',
    },
    suvisiace: ['prevoz-zosnulych', 'rozlucka-a-pochovanie', 'predpriprava-pohrebu'],
  },

  {
    slug: 'medzinarodny-prevoz',
    nazov: 'Medzinárodný prevoz',
    skupina: 'prevoz',
    eyebrow: 'Zo zahraničia',
    h1: 'Prevezieme ho domov aj spoza hraníc.',
    lead: 'Medzinárodný prevoz zosnulých vrátane dokladov, komunikácie s úradmi a povolení. Vybavujeme ho od prvého telefonátu po uloženie na cintoríne. Rodina nemusí riešiť cudzí jazyk ani cudzie predpisy.',
    hero: 'flotila-hory',
    heroAlt: 'Vozidlá Paciga v poli pod Tatrami',
    title: 'Medzinárodný prevoz zosnulých | Pohrebné služby Paciga',
    description: 'Medzinárodný prevoz zosnulých na Slovensko z Nemecka, Rakúska, Česka, Maďarska, Chorvátska, Belgicka, Holandska, Dánska a Švajčiarska. Vybavíme doklady, povolenia aj úradné preklady.',
    ogTitle: 'Medzinárodný prevoz | Paciga',
    ogDescription: 'Prevoz zo zahraničia vrátane dokladov a povolení.',
    chips: [
      { label: 'Odkiaľ vozíme', href: '#krajiny' },
      { label: 'Čo vybavíme', href: '#vybavime' },
      { label: 'Časté otázky', href: '#faq' },
    ],
    bloky: [
      {
        typ: 'text',
        odseky: [
          'Keď niekto zomrie v zahraničí, rodina naraz rieši úrady v cudzom jazyku, prevoz cez hranice a termín pohrebu doma. Väčšinou z telefónu a väčšinou bez toho, aby vedela, kde začať.',
          'Toto robíme dlhodobo a v regióne sme s tým začali medzi prvými. Preberieme celú administratívu a vy sa venujete rozlúčke.',
        ],
      },
      {
        typ: 'karty',
        id: 'vybavime',
        nadpis: 'Čo vybavíme',
        eyebrow: 'Rozsah',
        polozky: [
          { h: 'Doklady a povolenia', p: 'Potvrdenia, povolenia na prevoz a úradné preklady potrebné na prekročenie hraníc.' },
          { h: 'Komunikáciu s úradmi', p: 'Jednáme so zahraničnými úradmi, nemocnicami aj miestnou pohrebnou službou.' },
          { h: 'Samotný prevoz', p: 'Pozemný prevoz zosnulého na Slovensko vlastnými vozidlami.' },
          { h: 'Doklady pre pohreb doma', p: 'Zabezpečíme dokumenty potrebné na pochovanie zosnulého na Slovensku.' },
        ],
      },
    ],
    /* Zoznam krajín vypisuje komponent MapaKrajin, nie textový blok.
       Do 3. 8. 2026 tu bol aj odsek s tým istým zoznamom a nadpis
       „Odkiaľ sme už vozili" sa na stránke objavil dvakrát. */
    specialny: 'mapa-krajin',
    faq: [
      {
        q: 'Ako dlho trvá prevoz zo zahraničia?',
        a: 'Väčšinou päť až desať dní. Najviac času zaberú doklady na strane cudzieho úradu, nie samotná cesta.',
      },
      {
        q: 'Čo máme urobiť ako prví?',
        a: 'Zavolajte nám na 0903 596 364. Povieme vám, čo si vypýtať od miestnych úradov a čo zariadime my.',
      },
      {
        q: 'Vybavíte aj prevoz zo Slovenska do zahraničia?',
        a: 'Áno, aj opačným smerom. Podmienky závisia od cieľovej krajiny, overíme ich za vás.',
      },
      {
        q: 'Koľko to stojí?',
        a: 'Cena závisí od krajiny, vzdialenosti a rozsahu administratívy. Po prvom telefonáte vám pošleme konkrétnu kalkuláciu.',
      },
    ],
    cta: {
      nadpis: 'Zavolajte, aj keď ste v zahraničí',
      text: 'Ozvite sa nám na 0903 596 364. Povieme vám, čo robiť ďalej.',
      akcia: 'tel',
    },
    suvisiace: ['prevoz-zosnulych', 'pohrebna-limuzina', 'rozlucka-a-pochovanie'],
  },

  /* ─────────────────────────── PODPORA A SPOMIENKA ──────────────────────── */
  {
    slug: 'predpriprava-pohrebu',
    nazov: 'Predpríprava pohrebu',
    skupina: 'podpora',
    eyebrow: 'Predpríprava',
    h1: 'Rozhodnite sa teraz, aby nemuseli oni.',
    lead: 'Predpríprava znamená, že si poslednú rozlúčku naplánujete vopred. Vyberiete rakvu, kvety, hudbu aj typ obradu. Vaši blízki potom nebudú v najhorší týždeň života hádať, čo by ste chceli.',
    hero: 'mesto',
    heroAlt: 'Námestie v Spišskej Belej',
    title: 'Predpríprava pohrebu | Pohrebné služby Paciga',
    description: 'Naplánujte si poslednú rozlúčku vopred: rakva, kvety, hudba, typ obradu aj miesto pochovania. Zapíšeme vaše želania a odbremeníme vašich blízkych.',
    ogTitle: 'Predpríprava pohrebu | Paciga',
    ogDescription: 'Rozhodnite sa v pokoji, aby nemuseli oni v žiali.',
    chips: [
      { label: 'Čo sa dá dohodnúť', href: '#rozsah' },
      { label: 'Ako to prebieha', href: '#priebeh' },
      { label: 'Časté otázky', href: '#faq' },
    ],
    bloky: [
      {
        typ: 'text',
        odseky: [
          'O vlastnom pohrebe sa nehovorí ľahko. Ale rodiny, ktoré k nám prídu po úmrtí, kladú stále tie isté otázky: chcel by kremáciu? mal rád tú pieseň? do ktorého hrobu?',
          'Kto to vopred povie nahlas, ušetrí svojim blízkym týždeň dohadov v čase, keď nemajú silu na nič. Býva to jedna z posledných praktických vecí, ktoré pre nich môžete urobiť.',
        ],
      },
      {
        typ: 'fakty',
        id: 'rozsah',
        nadpis: 'Čo sa dá dohodnúť vopred',
        eyebrow: 'Rozsah',
        polozky: [
          { k: 'Typ rozlúčky', v: 'Pochovanie do zeme alebo kremácia. S obradom alebo bez. Cirkevný alebo civilný.' },
          { k: 'Rakva a urna', v: 'Konkrétne prevedenie, ktoré si vyberiete v showroome.' },
          { k: 'Kvety a výzdoba', v: 'Druh kytice, farby, umelé alebo živé vence.' },
          { k: 'Hudba a rečník', v: 'Skladby, ktoré majú znieť. Kňaz alebo civilný rečník.' },
          { k: 'Miesto pochovania', v: 'Cintorín, hrobové miesto alebo urnové miesto.' },
          { k: 'Osobné želania', v: 'Čokoľvek, na čo by rodina sama neprišla. Zapíšeme to.' },
        ],
      },
      {
        typ: 'kroky',
        id: 'priebeh',
        nadpis: 'Ako to prebieha',
        eyebrow: 'Priebeh',
        polozky: [
          { h: 'Stretneme sa', p: 'Na pobočke alebo u vás doma. Nikam sa neponáhľame a k ničomu vás netlačíme.' },
          { h: 'Prejdeme možnosti', p: 'Vysvetlíme, čo sa dá a čo to obnáša. Otázky sú vítané, aj tie nepríjemné.' },
          { h: 'Zapíšeme želania', p: 'Vaše rozhodnutia spíšeme. Kópiu dostanete vy, kópiu si necháme my.' },
          { h: 'Kedykoľvek zmeníte', p: 'Nič nie je definitívne. Ozvite sa a záznam upravíme.' },
        ],
      },
    ],
    faq: [
      {
        q: 'Musím niečo platiť vopred?',
        a: 'Nie. Predpríprava je zápis vašich želaní, nie záloha. Ak chcete pohreb financovať vopred, dohodneme sa osobitne.',
      },
      {
        q: 'Je to záväzné?',
        a: 'Pre nás áno, pre vás nie. Kedykoľvek to môžete zmeniť alebo zrušiť.',
      },
      {
        q: 'Môže predprípravu urobiť rodina za niekoho iného?',
        a: 'Áno, ak vážne ochorel alebo o svojich želaniach hovoril. Zapíšeme to, čo o jeho prianiach viete.',
      },
      {
        q: 'Ako sa dozviete, že som zomrel?',
        a: 'Ozve sa nám rodina. Preto im povedzte, že predprípravu máte u nás, a nechajte im naše číslo.',
      },
    ],
    cta: {
      nadpis: 'Napíšte nám. Radi vám poradíme.',
      text: 'Dohodneme si stretnutie na pobočke alebo u vás doma. Bez ponáhľania.',
      akcia: 'mail',
    },
    suvisiace: ['smutkove-poradenstvo', 'rozlucka-a-pochovanie', 'kremacia'],
  },

  {
    slug: 'smutkove-poradenstvo',
    nazov: 'Smútkové poradenstvo',
    skupina: 'podpora',
    eyebrow: 'Podpora',
    h1: 'Keď odíde niekto blízky, svet sa na chvíľu zastaví.',
    lead: 'Smútok nie je slabosť ani zlyhanie. Je to proces a niekedy potrebuje sprevádzanie. Spolupracujeme s mentálnou koučkou, ktorá pracuje s ľuďmi po strate blízkeho. Diskrétne a bez hodnotenia.',
    hero: 'cintorin',
    heroAlt: 'Stan Paciga na cintoríne pod zasneženými Tatrami',
    title: 'Smútkové poradenstvo | Pohrebné služby Paciga',
    description: 'Individuálna podpora po strate blízkeho. Spolupracujeme s mentálnou koučkou, ktorá sprevádza pozostalých aj rodiny s deťmi. Diskrétne stretnutia bez hodnotenia.',
    ogTitle: 'Smútkové poradenstvo | Paciga',
    ogDescription: 'Nie ste v tom sami. Individuálna podpora po strate blízkeho.',
    chips: [
      { label: 'Na čo sa ľudia pýtajú', href: '#otazky' },
      { label: 'Ako stretnutie vyzerá', href: '#stretnutie' },
      { label: 'Deti a strata', href: '#deti' },
    ],
    bloky: [
      {
        typ: 'text',
        id: 'otazky',
        nadpis: 'Na čo sa ľudia pýtajú najčastejšie',
        eyebrow: 'Otázky',
        odseky: [
          'Prečo ma to bolí ešte aj po pár týždňoch? Prečo sa mi stále chce plakať? Prečo sa neviem sústrediť na prácu, ktorú robím dvadsať rokov?',
          'Ako mám podržať rodinu, keď sám stojím na vode? A čo mám povedať deťom, aby som im neublížil?',
          'Na žiadnu z týchto otázok neexistuje jedna správna odpoveď. Ale ani jedna z nich neznamená, že s vami niečo nie je v poriadku.',
        ],
      },
      {
        typ: 'karty',
        id: 'stretnutie',
        nadpis: 'Ako stretnutie vyzerá',
        eyebrow: 'Stretnutie',
        polozky: [
          { h: 'Pomenujeme, čo cítite', p: 'Prvý krok býva najťažší. Pomenovať emóciu znamená prestať sa jej báť.' },
          { h: 'Usporiadame myšlienky', p: 'Tie, čo sa vracajú stále dokola, aj tie, ktoré si nechcete priznať.' },
          { h: 'Nájdeme oporné body', p: 'Konkrétne veci, ktoré pomôžu v ťažkých dňoch a pri výročiach.' },
          { h: 'Bez hodnotenia', p: 'Nikto vám nepovie, že už by ste mali byť ďalej. Tempo určujete vy.' },
        ],
      },
      {
        typ: 'text',
        id: 'deti',
        nadpis: 'Keď je v rodine dieťa',
        eyebrow: 'Deti',
        odseky: [
          'Deti smútia inak než dospelí. Striedajú plač a hru v priebehu hodiny a rodičov to desí, hoci je to normálne.',
          'Poradíme vám, ako o smrti hovoriť podľa veku dieťaťa, čo mu povedať a čomu sa vyhnúť. A či ho vziať na pohreb, alebo nie.',
        ],
      },
      {
        typ: 'citat',
        text: 'Smútok nie je problém, ktorý treba vyriešiť. Je to cesta, ktorou treba prejsť. Nemusíte po nej ísť sami.',
      },
    ],
    faq: [
      {
        q: 'Je to psychoterapia?',
        a: 'Nie. Je to sprevádzanie mentálnou koučkou. Ak by ste potrebovali odbornú psychologickú alebo psychiatrickú starostlivosť, povie vám to a odporučí ďalší krok.',
      },
      {
        q: 'Musím byť váš klient?',
        a: 'Nie. Poradenstvo je dostupné aj vtedy, ak ste pohreb vybavovali inde.',
      },
      {
        q: 'Dozvie sa o tom niekto?',
        a: 'Nie. Stretnutia sú diskrétne a ich obsah ostáva medzi vami a koučkou.',
      },
      {
        q: 'Kedy sa ozvať?',
        a: 'Vtedy, keď to cítite. Niekto príde o týždeň, niekto o pol roka. Neskoro to nie je nikdy.',
      },
    ],
    cta: {
      nadpis: 'Nie ste v tom sami',
      text: 'Zavolajte na 0903 596 364 a dohodneme vám stretnutie. Nemusíte vysvetľovať prečo.',
      akcia: 'tel',
    },
    suvisiace: ['predpriprava-pohrebu', '/sperky', 'spomienkove-karty'],
  },
];

/** Rýchle hľadanie podľa slugu. */
export const PODLA_SLUGU = new Map(SLUZBY.map((s) => [s.slug, s]));

/**
 * Odkaz a názov pre blok súvisiacich služieb. Slug s lomkou je stránka
 * mimo /pohrebne-sluzby (kamenárstvo, šperky), tie majú vlastné názvy.
 */
const MIMO_ROZCESTNIKA: Record<string, string> = {
  '/kamenarstvo': 'Kamenárstvo',
  '/sperky': 'Spomienkové šperky s odtlačkom',
};

export function odkazSluzby(slug: string): { href: string; nazov: string } | null {
  if (slug.startsWith('/')) {
    const nazov = MIMO_ROZCESTNIKA[slug];
    return nazov ? { href: slug, nazov } : null;
  }
  const s = PODLA_SLUGU.get(slug);
  return s ? { href: `/pohrebne-sluzby/${s.slug}`, nazov: s.nazov } : null;
}
