/*
  Katalóg rakiev. Fotky sú zo showroomu, prevzaté z pôvodného webu
  paciga.sk — tam mali len poradové čísla 2 až 40, žiadne názvy ani ceny.

  Preto tu nie sú ani ceny, ani druhy dreva: z fotky sa nedá spoľahlivo
  určiť ani jedno a vymyslený údaj by zákazníka poslal do showroomu
  s nesprávnym očakávaním. Filtrovať sa dá len podľa odtieňa, ktorý je
  na fotke naozaj vidieť. Ceny a materiály doplň až od klienta.

  Fotky ležia v src/assets/katalog/rakvy/rakva-NN.jpg a načítava ich
  import.meta.glob v KatalogRakiev.astro.
*/

export type OdtienRakvy = 'svetly' | 'medovy' | 'mahagon';

export interface PolozkaRakva {
  /** poradové číslo, zároveň názov súboru fotky (rakva-01.jpg) */
  kod: string;
  odtien: OdtienRakvy;
  /** rakva je na fotke otvorená aj s výstelkou */
  vystelka?: boolean;
}

export const ODTIENE_RAKIEV: { kluc: OdtienRakvy; nazov: string }[] = [
  { kluc: 'svetly', nazov: 'Svetlý odtieň' },
  { kluc: 'medovy', nazov: 'Medový odtieň' },
  { kluc: 'mahagon', nazov: 'Mahagónový odtieň' },
];

export const KATALOG_RAKIEV: PolozkaRakva[] = [
  { kod: '01', odtien: 'mahagon' },
  { kod: '02', odtien: 'svetly' },
  { kod: '03', odtien: 'svetly' },
  { kod: '04', odtien: 'svetly' },
  { kod: '05', odtien: 'medovy', vystelka: true },
  { kod: '06', odtien: 'svetly' },
  { kod: '07', odtien: 'medovy' },
  { kod: '08', odtien: 'medovy', vystelka: true },
  { kod: '09', odtien: 'svetly' },
  { kod: '10', odtien: 'svetly' },
  { kod: '11', odtien: 'svetly' },
  { kod: '12', odtien: 'svetly' },
  { kod: '13', odtien: 'medovy' },
  { kod: '14', odtien: 'medovy', vystelka: true },
  { kod: '15', odtien: 'svetly' },
  { kod: '16', odtien: 'medovy' },
  { kod: '17', odtien: 'mahagon' },
  { kod: '18', odtien: 'medovy' },
  { kod: '19', odtien: 'medovy', vystelka: true },
  { kod: '20', odtien: 'svetly' },
];
