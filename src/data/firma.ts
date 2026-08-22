/**
 * Údaje o firme pre vyhľadávače (schema.org).
 *
 * Doteraz niesli schema značku len detaily služieb (Service + FuneralHome
 * ako poskytovateľ). Homepage, /kontakt ani /o-nas nemali žiadnu, takže
 * Google nemal odkiaľ prečítať adresy, telefóny ani otváracie hodiny troch
 * pobočiek. Pri firme, ktorá stojí na lokálnom vyhľadávaní, je to najväčšia
 * strata, akú web mal. Doplnené 22. 8. 2026.
 *
 * Zdroj údajov: reálne podklady od klienta z 3. 8. 2026, tie isté, ktoré
 * vypisujú karty v components/PobockyKarty.astro. Právny názov a IČO sú
 * overené vo Finstate. Pri zmene čísla, adresy alebo hodín uprav OBE
 * miesta — karty majú okrem údajov aj vlastný text („Sídlo firmy“,
 * „NON STOP aj prevádzka“), ktorý sa z týchto dát vygenerovať nedá.
 *
 * Zámerne tu NIE JE aggregateRating. Hodnotenie 5,0 v data/recenzie.ts sa
 * drží ručne a počet recenzií klient zatiaľ nepotvrdil. Hviezdičky
 * v schema bez overeného počtu sú presne to, za čo Google dáva ručný
 * postih, takže radšej nič než odhad.
 *
 * Zemepisné súradnice tu tiež nie sú. Nemáme ich od klienta a vymyslené
 * súradnice by poslali pozostalých na zlú adresu.
 */

export const FIRMA = {
  pravnyNazov: 'Pohrebné a kamenárske služby Paciga, s. r. o.',
  znacka: 'Paciga',
  ico: '51736039',
  icDph: 'SK2120765900',
  zalozena: '2018',
  telefon: '+421903596364',
  email: 'paciga@paciga.sk',
  socialne: [
    'https://www.facebook.com/pakspaciga/',
    'https://www.youtube.com/@PacigaPohrebneSluzby',
  ],
  popis:
    'Rodinná pohrebná a kamenárska služba pod Tatrami. Pohrebné obrady, ' +
    'kremácia, prevoz zosnulých NON STOP, kvetinárstvo, kamenárstvo ' +
    'a spomienkové šperky. Pobočky v Poprade, Spišskej Belej ' +
    'a Liptovskom Mikuláši.',
};

export interface Pobocka {
  nazov: string;
  ulica: string;
  psc: string;
  mesto: string;
  telefon: string;
  /** číslo prevádzky, ak sa líši od NON STOP linky */
  telefonPrevadzka?: string;
  email: string;
  /** true = pobočka je dostupná nepretržite, nielen v otváracích hodinách */
  nonstop: boolean;
}

export const POBOCKY: Pobocka[] = [
  {
    nazov: 'Paciga Poprad',
    ulica: 'Francisciho 3288/35',
    psc: '058 01',
    mesto: 'Poprad',
    telefon: '+421903596364',
    telefonPrevadzka: '+421949011012',
    email: 'pacigapp@gmail.com',
    nonstop: false,
  },
  {
    nazov: 'Paciga Spišská Belá',
    ulica: 'Letná 17',
    psc: '059 01',
    mesto: 'Spišská Belá',
    telefon: '+421903596364',
    email: 'info.paciga@gmail.com',
    nonstop: true,
  },
  {
    nazov: 'Paciga Liptovský Mikuláš',
    ulica: 'Ester Šimerovej Martinčekovej 4506/4',
    psc: '031 01',
    mesto: 'Liptovský Mikuláš',
    telefon: '+421903596364',
    telefonPrevadzka: '+421949011051',
    email: 'pacigalm@gmail.com',
    nonstop: false,
  },
];

const DNI = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function adresa(p: Pobocka) {
  return {
    '@type': 'PostalAddress',
    streetAddress: p.ulica,
    postalCode: p.psc,
    addressLocality: p.mesto,
    addressCountry: 'SK',
  };
}

/* Kancelária má Po až Pi 8:00 až 16:00. Spišská Belá je dostupná
   nepretržite, tam ide sedem dní od polnoci do polnoci. */
function hodiny(p: Pobocka) {
  if (p.nonstop) {
    return [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [...DNI, 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59',
      },
    ];
  }
  return [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DNI,
      opens: '08:00',
      closes: '16:00',
    },
  ];
}

/**
 * Hlavná značka ako FuneralHome, tri pobočky ako jej oddelenia.
 *
 * @id drží stabilnú identitu naprieč stránkami: keď tú istú firmu spomenie
 * viac stránok, Google vie, že ide o jeden subjekt, nie o tri.
 *
 * @param zaklad absolútny základ webu (Astro.site), s lomkou na konci
 */
export function firmaLd(zaklad: string) {
  const url = new URL('/', zaklad).href;
  return {
    '@context': 'https://schema.org',
    '@type': 'FuneralHome',
    '@id': url + '#firma',
    name: FIRMA.pravnyNazov,
    alternateName: FIRMA.znacka,
    description: FIRMA.popis,
    url,
    telephone: FIRMA.telefon,
    email: FIRMA.email,
    foundingDate: FIRMA.zalozena,
    taxID: FIRMA.icDph,
    vatID: FIRMA.icDph,
    identifier: FIRMA.ico,
    image: new URL('/og/asset-07.jpg', zaklad).href,
    sameAs: FIRMA.socialne,
    address: adresa(POBOCKY[1]), // sídlo firmy je Spišská Belá
    areaServed: POBOCKY.map((p) => ({ '@type': 'City', name: p.mesto })),
    /* NON STOP linka je to najdôležitejšie, čo o firme treba vedieť:
       prevoz zosnulých beží 24 hodín denne, každý deň v roku. */
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'emergency',
        name: 'NON STOP prevoz zosnulých',
        telephone: FIRMA.telefon,
        availableLanguage: ['sk'],
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [...DNI, 'Saturday', 'Sunday'],
          opens: '00:00',
          closes: '23:59',
        },
      },
    ],
    department: POBOCKY.map((p) => ({
      '@type': 'FuneralHome',
      '@id': url + '#pobocka-' + p.mesto.toLowerCase().replace(/[^a-z]+/g, '-'),
      name: p.nazov,
      parentOrganization: { '@id': url + '#firma' },
      address: adresa(p),
      telephone: p.telefon,
      email: p.email,
      openingHoursSpecification: hodiny(p),
      areaServed: { '@type': 'City', name: p.mesto },
    })),
  };
}

/** Web ako taký. Dáva vyhľadávaču názov webu namiesto odhadu z domény. */
export function webLd(zaklad: string) {
  const url = new URL('/', zaklad).href;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': url + '#web',
    url,
    name: FIRMA.znacka,
    inLanguage: 'sk-SK',
    publisher: { '@id': url + '#firma' },
  };
}
