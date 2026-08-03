/*
  Katalóg kvetinárstva. Fotky a kódy pochádzajú z pôvodného webu paciga.sk,
  preto kód drží tvar <cena>-<poradie> (napr. 24-07 = umelý veniec za 24 €).

  Cenu a rozmer má len skupina 'umele-vence' — pri živých kvetoch cena
  závisí od sezóny a dostupnosti, tam ju preto neuvádzame. Nedopĺňaj ju
  odhadom z kódu, hoci prefix 130 a 140 na cenu vyzerá.

  Fotky ležia v src/assets/katalog/kvety/<kod>.jpg a načítava ich
  import.meta.glob v KatalogKvetov.astro.
*/

export type SkupinaKvetov = 'zive-kytice' | 'zive-vence' | 'umele-vence';

export interface PolozkaKvety {
  /** kód z katalógu, zároveň názov súboru fotky */
  kod: string;
  skupina: SkupinaKvetov;
  /** cena v eurách, len pri umelých vencoch */
  cena?: number;
  /** priemer venca v cm, len pri umelých vencoch */
  rozmer?: number;
}

export const SKUPINY_KVETOV: { kluc: SkupinaKvetov; nazov: string; popis: string }[] = [
  {
    kluc: 'zive-kytice',
    nazov: 'Rakvové kytice zo živých kvetov',
    popis: 'Kytica na rakvu, viazaná z čerstvých kvetov v deň obradu.',
  },
  {
    kluc: 'zive-vence',
    nazov: 'Smútočné vence zo živých kvetov',
    popis: 'Vence z čerstvých kvetov. Vôňa a farba, ktorá vydrží obrad.',
  },
  {
    kluc: 'umele-vence',
    nazov: 'Smútočné vence umelé',
    popis: 'Vydržia mráz aj dážď. V zime ich odporúčame namiesto živých.',
  },
];

export const KATALOG_KVETOV: PolozkaKvety[] = [
  { kod: "140-01", skupina: "zive-kytice" },
  { kod: "140-02", skupina: "zive-kytice" },
  { kod: "140-03", skupina: "zive-kytice" },
  { kod: "140-04", skupina: "zive-kytice" },
  { kod: "140-05", skupina: "zive-kytice" },
  { kod: "140-06", skupina: "zive-kytice" },
  { kod: "140-07", skupina: "zive-kytice" },
  { kod: "140-08", skupina: "zive-kytice" },
  { kod: "140-09", skupina: "zive-kytice" },
  { kod: "140-10", skupina: "zive-kytice" },
  { kod: "140-11", skupina: "zive-kytice" },
  { kod: "140-12", skupina: "zive-kytice" },
  { kod: "140-13", skupina: "zive-kytice" },
  { kod: "140-14", skupina: "zive-kytice" },
  { kod: "140-15", skupina: "zive-kytice" },
  { kod: "140-16", skupina: "zive-kytice" },
  { kod: "140-17", skupina: "zive-kytice" },
  { kod: "140-18", skupina: "zive-kytice" },
  { kod: "140-19", skupina: "zive-kytice" },
  { kod: "140-20", skupina: "zive-kytice" },
  { kod: "140-21", skupina: "zive-kytice" },
  { kod: "140-22", skupina: "zive-kytice" },
  { kod: "130-01", skupina: "zive-vence" },
  { kod: "130-02", skupina: "zive-vence" },
  { kod: "130-03", skupina: "zive-vence" },
  { kod: "130-04", skupina: "zive-vence" },
  { kod: "130-05", skupina: "zive-vence" },
  { kod: "130-06", skupina: "zive-vence" },
  { kod: "130-07", skupina: "zive-vence" },
  { kod: "130-08", skupina: "zive-vence" },
  { kod: "18-01", skupina: "umele-vence", cena: 18, rozmer: 55 },
  { kod: "18-02", skupina: "umele-vence", cena: 18, rozmer: 55 },
  { kod: "18-03", skupina: "umele-vence", cena: 18, rozmer: 55 },
  { kod: "18-04", skupina: "umele-vence", cena: 18, rozmer: 55 },
  { kod: "18-05", skupina: "umele-vence", cena: 18, rozmer: 55 },
  { kod: "18-06", skupina: "umele-vence", cena: 18, rozmer: 55 },
  { kod: "18-07", skupina: "umele-vence", cena: 18, rozmer: 55 },
  { kod: "18-08", skupina: "umele-vence", cena: 18, rozmer: 55 },
  { kod: "18-09", skupina: "umele-vence", cena: 18, rozmer: 55 },
  { kod: "24-01", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-02", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-03", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-04", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-05", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-06", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-07", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-08", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-09", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-10", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-11", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-12", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-13", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "24-14", skupina: "umele-vence", cena: 24, rozmer: 65 },
  { kod: "36-01", skupina: "umele-vence", cena: 36, rozmer: 80 },
  { kod: "36-02", skupina: "umele-vence", cena: 36, rozmer: 80 },
  { kod: "36-03", skupina: "umele-vence", cena: 36, rozmer: 80 },
  { kod: "36-04", skupina: "umele-vence", cena: 36, rozmer: 80 },
  { kod: "36-05", skupina: "umele-vence", cena: 36, rozmer: 80 },
  { kod: "36-06", skupina: "umele-vence", cena: 36, rozmer: 80 },
  { kod: "48-01", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-02", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-03", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-04", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-05", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-06", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-07", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-08", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-09", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-10", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-11", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-12", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-13", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-14", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-15", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-16", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "48-17", skupina: "umele-vence", cena: 48, rozmer: 90 },
  { kod: "72-01", skupina: "umele-vence", cena: 72, rozmer: 90 },
  { kod: "72-02", skupina: "umele-vence", cena: 72, rozmer: 90 },
  { kod: "96-01", skupina: "umele-vence", cena: 96, rozmer: 110 },
  { kod: "96-02", skupina: "umele-vence", cena: 96, rozmer: 110 },
  { kod: "MegaSrdce", skupina: "umele-vence", cena: 120, rozmer: 120 },
];
