/* E-mail s kondolenciami pre pozostalých.

   Po pohrebe obsluha v admine pošle rodine všetky schválené kondolencie
   k parte (/admin/parte/kondolencie-pozostalym). Tu sa skladá samotný
   e-mail: HTML aj textová verzia pre klientov, ktoré HTML nezobrazia.

   Vizuál (27. 10. 2026) podľa 21st.dev: Efferd mriežka (jeden rám, bunky
   oddelené vlasovou linkou, ostré rohy, ako admin), redakčný index
   kondolencií a pokojný citát. Komponenty 21st sú React pre web, e-mail
   ich nespustí, preto je to prepísané do tabuliek a štýlov v značkách.

   Písma Archivo a Playfair Display ťahá z webu (fonty majú
   Access-Control-Allow-Origin: *). Apple Mail a iPhone ich ukážu, Gmail
   a Outlook spadnú na Arial a Georgiu. Playfair len na citáty, ako na webe.
   Logo je PNG, nie WebP: Outlook vo Windows WebP nezobrazí. Fotka zosnulého
   má len šírku, nie výšku, aby ju klienti bez object-fit nedeformovali.

   E-mail vyká, ako formuláre na webe. Texty kondolencií sú od verejnosti,
   takže všetko ide cez esc(). */
import { FIRMA } from '../data/firma';

export type ParteEmail = {
  meno: string;
  slug: string;
  pohlavie: 'zena' | 'muz' | string;
  datum_narodenia: string | null;
  datum_umrtia: string;
  vek: number | null;
  foto_url: string | null;
  published: boolean;
  sviecky: number;
};

export type KondolenciaEmail = { meno: string; odkaz: string; created_at: string };

const WEB = 'https://www.paciga.sk';

/* Farby webu (#0c0d0f, biela ako akcent), ako parte, ktoré rodina pozná.
   27. 10. 2026 vybraná tmavá pred svetlou papierovou verziou.
   Linka je vlasová: biela s 8 % na tmavej, prepočítaná na plnú farbu,
   lebo Outlook priehľadnosť v rámikoch nepozná. */
const t = {
  pozadie: '#08090a', panel: '#0c0d0f', bunka: '#111214', linka: '#24262a',
  text: '#f5f5f5', mekky: '#b9b7b2', tichy: '#7f7d79', index: '#5c5d60',
  tlacidlo: '#f5f5f5', tlacidloText: '#0d0b07',
  logo: `${WEB}/assets/logo-email.png`,
};

const MESIACE = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
  'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);

/** 'YYYY-MM-DD' → '24. júla 1975', ako na parte. Dátum bez času, žiadne pásma. */
const datumDlhy = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)}. ${MESIACE[Number(m) - 1]} ${y}`;
};

/** Čas zápisu kondolencie podľa slovenských hodín, nie podľa servera. */
const den = (iso: string) =>
  new Intl.DateTimeFormat('sk-SK', {
    timeZone: 'Europe/Bratislava', day: 'numeric', month: 'numeric', year: 'numeric',
  }).format(new Date(iso));

/** '+421903596364' → '0903 596 364' */
const telefon = (t: string) => t.replace(/^\+421/, '0').replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');

const dvaCisla = (n: number) => String(n).padStart(2, '0');

/** Tvar podstatného mena podľa počtu: [1, 2 až 4, 5 a viac]. */
const tvar = (n: number, [jeden, par, vela]: [string, string, string]) =>
  n === 1 ? jeden : n < 5 ? par : vela;

function vetaPocet(n: number) {
  if (n === 1) return 'Je to jedna kondolencia.';
  if (n < 5) return `Sú to ${n} kondolencie.`;
  return `Je to ${n} kondolencií.`;
}

function vetaSviecky(n: number) {
  if (n <= 0) return '';
  const co = n === 1 ? 'jednu spomienkovú sviečku'
    : n < 5 ? `${n} spomienkové sviečky`
    : `${n} spomienkových sviečok`;
  return `Pri parte k tomu zapálili ${co}.`;
}

export function zostavEmail(p: ParteEmail, kondolencie: KondolenciaEmail[]) {
  const muz = p.pohlavie === 'muz';
  const predmet = `Kondolencie k parte: ${p.meno}`;
  const uvod = 'posielame vám kondolencie, ktoré ľudia napísali pri parte na webe paciga.sk. Sú to ich vlastné slová, bez úprav.';
  /* Len do textovej verzie. V HTML sú počty v riadku s číslami. */
  const pocet = [vetaPocet(kondolencie.length), vetaSviecky(p.sviecky)].filter(Boolean).join(' ');
  const udaje: [string, string][] = [
    ...(p.datum_narodenia ? [[muz ? 'Narodil sa' : 'Narodila sa', datumDlhy(p.datum_narodenia)] as [string, string]] : []),
    [muz ? 'Zomrel' : 'Zomrela', datumDlhy(p.datum_umrtia)],
    ...(p.vek != null ? [['Vo veku', `${p.vek} ${p.vek === 1 ? 'roka' : 'rokov'}`] as [string, string]] : []),
  ];
  const odkazParte = p.published ? `${WEB}/parte/${p.slug}` : '';
  const pata = 'Tento e-mail sme poslali na adresu, ktorú ste nám dali pri vybavovaní pohrebu. Ak vám prišiel omylom, napíšte nám.';
  const nonstop = telefon(FIRMA.telefon);

  /* ---------- text ---------- */

  const text = [
    'KONDOLENCIE',
    p.meno,
    ...udaje.map(([k, v]) => `${k}: ${v}`),
    '',
    'Dobrý deň,',
    uvod,
    pocet,
    '',
    ...kondolencie.flatMap((k, i) => [
      `--- ${dvaCisla(i + 1)} / ${dvaCisla(kondolencie.length)}`,
      k.odkaz,
      `${k.meno}, ${den(k.created_at)}`,
      '',
    ]),
    '---',
    '',
    ...(odkazParte ? ['Parte aj kondolencie zostávajú na webe:', odkazParte, ''] : []),
    'Úprimnú sústrasť.',
    'Pohrebné služby Paciga',
    '',
    `NONSTOP ${nonstop} · ${FIRMA.email} · www.paciga.sk`,
    pata,
  ].join('\n');

  /* ---------- HTML ---------- */

  const sans = "'Archivo','Helvetica Neue',Helvetica,Arial,sans-serif";
  const serif = "'Playfair Display',Georgia,'Times New Roman',serif";
  /** Malý verzálkový štítok, rovnaký ako na webe (NARODIL SA, POSLEDNÁ ROZLÚČKA). */
  const stitok = `font-family:${sans};font-size:11px;line-height:1.4;letter-spacing:0.2em;text-transform:uppercase;color:${t.tichy};`;
  const linka = `1px solid ${t.linka}`;

  const fotka = p.foto_url && /^https:\/\//.test(p.foto_url) ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 28px;">
                <tr><td style="border:${linka};padding:6px;" bgcolor="${t.bunka}">
                  <img src="${esc(p.foto_url)}" width="168" alt="" style="display:block;width:168px;height:auto;border:0;">
                </td></tr>
              </table>` : '';

  const riadkyUdajov = udaje.map(([k, v], i) => `
                <tr>
                  <td style="${stitok}padding:11px 16px 11px 0;${i ? `border-top:${linka};` : ''}">${esc(k)}</td>
                  <td align="right" style="font-family:${sans};font-size:14px;color:${t.text};padding:11px 0;${i ? `border-top:${linka};` : ''}">${esc(v)}</td>
                </tr>`).join('');

  const statBunka = (cislo: number, popis: string, prva: boolean) => `
              <td width="50%" align="center" valign="top" class="stat" style="padding:26px 12px;${prva ? '' : `border-left:${linka};`}">
                <p style="margin:0;font-family:${sans};font-size:34px;line-height:1;font-weight:500;color:${t.text};">${cislo}</p>
                <p style="margin:10px 0 0;${stitok}">${esc(popis)}</p>
              </td>`;

  const statistika = `
          <tr><td style="border-top:${linka};border-bottom:${linka};padding:0;" bgcolor="${t.bunka}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              ${statBunka(kondolencie.length, tvar(kondolencie.length, ['kondolencia', 'kondolencie', 'kondolencií']), true)}
              ${p.sviecky > 0 ? statBunka(p.sviecky, tvar(p.sviecky, ['zapálená sviečka', 'zapálené sviečky', 'zapálených sviečok']), false) : ''}
            </tr></table>
          </td></tr>`;

  const karty = kondolencie.map((k, i) => `
          <tr><td class="px" style="padding:30px 48px;${i ? `border-top:${linka};` : ''}">
            <p style="margin:0 0 14px;font-family:${sans};font-size:11px;letter-spacing:0.2em;color:${t.index};">${dvaCisla(i + 1)} / ${dvaCisla(kondolencie.length)}</p>
            <p style="margin:0;font-family:${serif};font-size:18px;line-height:1.65;color:${t.text};">${esc(k.odkaz).replace(/\r?\n/g, '<br>')}</p>
            <p style="margin:16px 0 0;font-family:${sans};font-size:13px;line-height:1.4;color:${t.tichy};"><span style="color:${t.mekky};font-weight:600;">${esc(k.meno)}</span>&nbsp;&nbsp;·&nbsp;&nbsp;${esc(den(k.created_at))}</p>
          </td></tr>`).join('');

  const tlacidlo = odkazParte ? `
          <tr><td class="px" align="center" style="border-top:${linka};padding:36px 48px;">
            <p style="margin:0 0 18px;font-family:${sans};font-size:15px;line-height:1.6;color:${t.mekky};">Parte aj kondolencie zostávajú na webe.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
              <td bgcolor="${t.tlacidlo}" style="border-radius:6px;">
                <a href="${esc(odkazParte)}" style="display:inline-block;padding:13px 28px;font-family:${sans};font-size:14px;font-weight:600;letter-spacing:0.02em;color:${t.tlacidloText};text-decoration:none;">Otvoriť parte</a>
              </td>
            </tr></table>
          </td></tr>` : '';

  const html = `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(predmet)}</title>
<style>
@font-face{font-family:'Archivo';font-style:normal;font-weight:400 700;src:url(${WEB}/assets/archivo-sk.woff2) format('woff2');}
@font-face{font-family:'Playfair Display';font-style:normal;font-weight:400 500;src:url(${WEB}/assets/playfair-sk.woff2) format('woff2');}
@media (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .hlava{padding:40px 24px 32px !important;}
  .meno{font-size:28px !important;}
  .stat{padding:22px 8px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:${t.pozadie};" bgcolor="${t.pozadie}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(uvod)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.pozadie}" style="background:${t.pozadie};">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.panel}" style="max-width:600px;background:${t.panel};border:${linka};">

      <tr><td align="center" style="padding:30px 24px;border-bottom:${linka};">
        <img src="${t.logo}" width="112" height="40" alt="Paciga" style="display:block;border:0;width:112px;height:40px;">
      </td></tr>

      <tr><td align="center" class="hlava" style="padding:48px 48px 40px;">
        <p style="margin:0 0 28px;${stitok}">Kondolencie</p>
        ${fotka}
        <h1 class="meno" style="margin:0;font-family:${sans};font-size:34px;line-height:1.15;font-weight:500;letter-spacing:-0.01em;color:${t.text};">${esc(p.meno)}</h1>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto 0;width:100%;max-width:320px;">
          ${riadkyUdajov}
        </table>
      </td></tr>
${statistika}
      <tr><td class="px" style="padding:36px 48px 34px;font-family:${sans};font-size:16px;line-height:1.7;color:${t.mekky};">
        <p style="margin:0 0 12px;color:${t.text};">Dobrý deň,</p>
        <p style="margin:0;">${esc(uvod)}</p>
      </td></tr>

      <tr><td class="px" style="padding:0 48px 14px;"><p style="margin:0;${stitok}">Slová od blízkych a známych</p></td></tr>
      <tr><td style="padding:0;border-top:${linka};" bgcolor="${t.bunka}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${karty}
        </table>
      </td></tr>
${tlacidlo}
      <tr><td class="px" align="center" style="border-top:${linka};padding:36px 48px 40px;">
        <p style="margin:0 0 6px;font-family:${serif};font-size:20px;line-height:1.4;color:${t.text};">Úprimnú sústrasť.</p>
        <p style="margin:0;${stitok}">Pohrebné služby Paciga</p>
      </td></tr>

      <tr><td class="px" align="center" style="border-top:${linka};padding:26px 48px 30px;font-family:${sans};font-size:12.5px;line-height:1.75;color:${t.tichy};">
        <p style="margin:0 0 8px;color:${t.mekky};">NONSTOP <a href="tel:${esc(FIRMA.telefon)}" style="color:${t.text};text-decoration:none;">${esc(nonstop)}</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:${esc(FIRMA.email)}" style="color:${t.text};text-decoration:none;">${esc(FIRMA.email)}</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${WEB}" style="color:${t.text};text-decoration:none;">www.paciga.sk</a></p>
        <p style="margin:0;">${esc(pata)}</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { predmet, html, text };
}
