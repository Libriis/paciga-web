/*
  Aktuality — jediný zdroj pravdy pre prehľad aj pre detail článku.

  Článok dostane vlastnú stránku /aktuality/<slug> len vtedy, keď má
  vyplnené `telo`. Ostatné položky ostávajú kartou v prehľade, kým
  klient nedodá texty. Karta bez tela sa neprekliká na prázdnu stránku.

  Telo článku „Odtlačok prsta zosnulého na pamiatku" je doslovne
  prevzaté z paciga.sk (30. 7. 2026).
*/

export interface Clanok {
  slug: string;
  datum: string;
  /** ISO dátum pre <time> a schema.org */
  datumIso: string;
  tag: 'Rada' | 'Novinka' | 'Spolupráca';
  /** kľúč filtra na prehľade */
  t: 'rada' | 'novinka' | 'spolupraca';
  foto: string;
  fotoAlt: string;
  titulok: string;
  /** perex na karte aj v úvode článku */
  text: string;
  /** odstavce tela; prázdne pole = článok zatiaľ nemá detail */
  telo?: string[];
  /** odkaz z karty, keď článok nemá vlastnú stránku */
  link?: string;
  linkText?: string;
  /** CTA na konci článku */
  cta?: { nadpis: string; text: string; odkaz: string; odkazText: string };
}

export const CLANKY: Clanok[] = [
  {
    slug: 'odtlacok-prsta-zosnuleho-na-pamiatku',
    datum: '29. mája 2026',
    datumIso: '2026-05-29',
    tag: 'Rada',
    t: 'rada',
    foto: '/assets/sperky-studio.jpg',
    fotoAlt: 'Spomienkový prívesok v tvare srdca s gravírovaným odtlačkom prsta',
    titulok: 'Odtlačok prsta zosnulého na pamiatku',
    text: 'Ako vzniká spomienkový šperk: od sňatia odtlačku až po gravírovanie do striebra, zlata alebo ružového zlata. Kúsok blízkeho človeka, ktorý zostáva navždy.',
    telo: [
      'Spomienkové predmety na zosnulých sú bežnou záležitosťou po celom svete. Aj Slováci si chcú zvečniť pamiatku na svojho zosnulého rôznymi spôsobmi. Už to nie sú len podobizne zosnulých vo fotorámčekoch, ale aj popol, vlasy, či odtlačok prstov zosnulého. V súčasnej dobe existujú rôzne ozdobné predmety s vygravírovanou podobizňou zosnulého, jeho pozostatky zaliate v skle, keramike, umiestnené v príveskoch, náramkoch, či šperkoch.',
      'Pohrebné služby Paciga rozšírili svoju ponuku o predmety s vygravírovanými odtlačkami prstov. Ponúkame rôzne tvary a farby príveskov na krk alebo náramkov na ruku, na ktoré je možné vygravírovať odtlačok prsta zosnulého. Taktiež je možné k odtlačku vygravírovať aj rôzny text. Tieto prívesky si môže u nás objednať ktokoľvek, kto k nám prinesie odtlačky prstov, teda nie iba pozostalí či obstarávateľ pohrebu.',
      'Odtlačky berieme vždy z toho prsta, na ktorom sú najlepšie vidieť papilárne línie prsta, najčastejšie je to však ukazovák alebo palec. Po odobratí odtlačkov ich následne vložíme do skenera a po zoskenovaní odtlačok prenesieme do digitálnej podoby. Nasleduje zadanie grafiky do gravírovacieho stroja, ktorý prenesie odtlačok do kovu. My používame zlato a striebro v tvare srdca alebo kruhu v štyroch farebných prevedeniach. Vybavenie každej objednávky bežne trvá maximálne 10 dní.',
    ],
    cta: {
      nadpis: 'Napíšte nám. Radi vám poradíme.',
      text: 'Tvary, farby aj znenie gravíru si môžete vyskúšať v konfigurátore alebo pozrieť naživo v showroome v Poprade.',
      odkaz: '/sperky',
      odkazText: 'Pozrieť kolekciu šperkov',
    },
  },
  {
    slug: 'medzinarodna-konferencia-pohrebnych-sluzieb',
    datum: '26. mája 2026',
    datumIso: '2026-05-26',
    tag: 'Novinka',
    t: 'novinka',
    foto: '/assets/o-nas-tim.jpg',
    fotoAlt: 'Tím Paciga pri pohrebných vozidlách pod Tatrami',
    titulok: 'Zúčastnili sme sa Medzinárodnej konferencie pohrebných služieb na Slovensku',
    text: 'Priniesli sme si poznatky a kontakty, ktoré posúvajú naše služby ďalej. Vzdelávame sa, aby ste u nás vždy našli aktuálny štandard starostlivosti.',
  },
  {
    slug: 'viac-nez-pohrebna-sluzba',
    datum: '30. januára 2026',
    datumIso: '2026-01-30',
    tag: 'Rada',
    t: 'rada',
    foto: '/assets/sluzby-hero.jpg',
    fotoAlt: 'Flotila vozidiel Paciga na lúke pod Tatrami',
    titulok: 'Viac než pohrebná služba: kompletné riešenie pre pozostalých',
    text: 'Od prevozu a obradu po kamenárstvo a smútkové poradenstvo. Prehľad všetkého, čo za vás vieme vybaviť, aby ste sa mohli sústrediť na rozlúčku.',
    link: '/pohrebne-sluzby',
    linkText: 'Prehľad služieb →',
  },
  {
    slug: 'riesenie-pozostalosti-po-pohrebe',
    datum: '14. januára 2026',
    datumIso: '2026-01-14',
    tag: 'Rada',
    t: 'rada',
    foto: '/assets/info-hero.jpg',
    fotoAlt: 'Smútočný obrad pod stanom Paciga',
    titulok: 'Riešenie pozostalosti po pohrebe',
    text: 'Dedičské konanie, úrady, zmluvy a účty. Na koho sa obrátiť po pohrebe a s čím vám vieme pomôcť my a naši partneri.',
    link: '/informacie-pre-pozostalych',
    linkText: 'Sprievodca pre pozostalých →',
  },
  {
    slug: 'spolupraca-so-spominam-sk',
    datum: '11. decembra 2025',
    datumIso: '2025-12-11',
    tag: 'Spolupráca',
    t: 'spolupraca',
    foto: '/assets/cintorin.jpg',
    fotoAlt: 'Cintorín so stanom Paciga',
    titulok: 'Spolupráca so Spomínam.sk',
    text: 'Spájame sa s platformou Spomínam.sk, aby spomienky na blízkych zostali živé aj v digitálnom priestore.',
  },
  {
    slug: 'digitalna-pomoc-po-pohrebe-potom-sk',
    datum: '26. novembra 2025',
    datumIso: '2025-11-26',
    tag: 'Spolupráca',
    t: 'spolupraca',
    foto: '/assets/o-nas-limuzina.jpg',
    fotoAlt: 'Biela pohrebná limuzína Paciga',
    titulok: 'Digitálna pomoc po pohrebe: spolupracujeme s platformou Potom.sk',
    text: 'Potom.sk uľahčuje pozostalým vybavovanie všetkého, čo po pohrebe nasleduje. Sme radi, že našim rodinám vieme ponúknuť aj túto podporu.',
  },
  {
    slug: 'smutocne-oznamenia-fotografia-a-hudba',
    datum: '13. októbra 2025',
    datumIso: '2025-10-13',
    tag: 'Rada',
    t: 'rada',
    foto: '/assets/asset-01.jpg',
    fotoAlt: 'Sprievod nosičov s rakvou',
    titulok: 'Smútočné oznámenia, fotografia zosnulého a smútočná hudba',
    text: 'Praktický sprievodca prípravou parte, výberom fotografie a hudby na rozlúčku. Malé rozhodnutia, ktoré dodajú obradu osobný tón.',
  },
  {
    slug: 'xxi-konferencia-hca-slovakia',
    datum: '9. októbra 2025',
    datumIso: '2025-10-09',
    tag: 'Novinka',
    t: 'novinka',
    foto: '/assets/asset-05.jpg',
    fotoAlt: 'Členovia tímu Paciga pri limuzíne',
    titulok: 'XXI. Konferencia HCA Slovakia',
    text: 'Boli sme pri tom: odborná konferencia o štandardoch a inováciách v pohrebníctve. Držíme krok s tým najlepším v odbore.',
  },
];

/** článok má vlastnú stránku, len keď má telo */
export const maDetail = (c: Clanok): boolean => !!c.telo && c.telo.length > 0;

export const getClanok = (slug: string): Clanok | undefined =>
  CLANKY.find((c) => c.slug === slug && maDetail(c));

/** ďalšie články pod detailom: najnovšie okrem aktuálneho */
export const ostatneClanky = (slug: string, n = 3): Clanok[] =>
  CLANKY.filter((c) => c.slug !== slug).slice(0, n);
