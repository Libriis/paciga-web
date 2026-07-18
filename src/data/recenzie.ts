/**
 * Recenzie klientov — jediný zdroj pravdy pre celý web.
 *
 * Zdroj: Google profil Paciga (prepis zo sekcie Recenzie zákazníkov
 * na paciga.sk). Texty sú doslovné, opravené sú len preklepy
 * a interpunkcia. Krátenie sa vyznačuje znakom … vo výňatkoch nižšie.
 * Nikdy nepridávaj recenziu, ktorá reálne neexistuje.
 */

export interface Recenzia {
  meno: string;
  /** plné znenie po korektúre preklepov */
  text: string;
}

/** Odkaz na recenzie na Google profile.
 *  TODO: nahradiť priamym odkazom na Google Business profil (tlačidlo
 *  „Napísať recenziu"), keď ho klient dodá. */
export const GOOGLE_PROFIL =
  'https://www.google.com/maps/search/?api=1&query=Paciga+pohrebn%C3%A9+slu%C5%BEby+Poprad';

export const RECENZIE = {
  fontani: {
    meno: 'Michaela Fontani',
    text: 'Veľká vďaka pohrebníctvu Paciga za ich citlivý, profesionálny a ľudský prístup. V ťažkých chvíľach nám boli oporou, všetko vybavili spoľahlivo a s úctou. Krásna výzdoba, dôstojný priebeh rozlúčky a ochotný personál. Služby môžem len odporučiť.',
  },
  harbin: {
    meno: 'Jela Harbin',
    text: 'Ďakujem spoločnosti a chlapcom za poslednú rozlúčku s mojím otcom. Bola krásna a slávnostná. Rozumejú svojej práci a majú vlastnú filozofiu toho, ako aj smutné chvíle urobiť krásne. Boli našej rodine veľmi nápomocní.',
  },
  gardosova: {
    meno: 'Mária Gardošová',
    text: 'Ďakujeme veľmi pekne za profesionálny a ľudský prístup. Odporúčame každému, kto hľadá spoľahlivé pohrebníctvo.',
  },
  gallikova: {
    meno: 'Adriana Gallikova',
    text: 'Maximálna profesionálna úroveň. V tento ťažký emocionálny moment sme vôbec nevedeli, koho si vybrať, a som veľmi rada, že som si vybrala práve ich. Vďaka týmto službám, ktoré nám naozaj všetko zabezpečili a poradili, sme sa mohli dôstojne rozlúčiť a neriešiť žiadne ďalšie starosti.',
  },
  branislav: {
    meno: 'Branislav',
    text: 'Ďakujeme veľmi pekne za zorganizovanie poslednej cesty nášho zosnulého. Prístup váš bol nanajvýš profesionálny a zdvorilý a so všetkými službami sme boli nadmieru spokojní. Altánok a ozvučenie pri mieste posledného odpočinku boli veľmi pekné, ešte sme to na iných smútočných zhromaždeniach nevideli.',
  },
  hegli: {
    meno: 'Dominik Hegli',
    text: 'Spoľahlivé a ústretové služby. Ďakujem a odporúčam, boli sme veľmi spokojní.',
  },
} as const satisfies Record<string, Recenzia>;

export type RecenziaId = keyof typeof RECENZIE;

/** Pomenované výňatky pre konkrétne miesta na webe.
 *  Vypustený text vyznačuje …, znenie sa inak nemení. */
export const VYBER = {
  /** homepage — quote sekcia */
  fontaniOpora: 'V ťažkých chvíľach nám boli oporou, všetko vybavili spoľahlivo a s úctou.',
  /** o nás — quote sekcia */
  harbinFilozofia: 'Rozumejú svojej práci a majú vlastnú filozofiu toho, ako aj smutné chvíle urobiť krásne.',
  /** homepage — grid */
  harbinRozlucka: 'Ďakujem spoločnosti a chlapcom za poslednú rozlúčku s mojím otcom. Bola krásna a slávnostná.',
  /** homepage — grid */
  branislavKratky: 'Ďakujeme veľmi pekne za zorganizovanie poslednej cesty nášho zosnulého… Prístup váš bol nanajvýš profesionálny a zdvorilý.',
  /** pohrebné služby — pri skupine Rozlúčka a obrad */
  branislavAltanok: '…so všetkými službami sme boli nadmieru spokojní. Altánok a ozvučenie pri mieste posledného odpočinku boli veľmi pekné, ešte sme to na iných smútočných zhromaždeniach nevideli.',
  /** o nás — karta */
  fontaniVdaka: 'Veľká vďaka pohrebníctvu Paciga za ich citlivý, profesionálny a ľudský prístup.',
  /** o nás — karta */
  gallikovaUroven: 'Maximálna profesionálna úroveň. V tento ťažký emocionálny moment sme vôbec nevedeli, koho si vybrať.',
} as const;
