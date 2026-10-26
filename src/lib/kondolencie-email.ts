/* E-mail s kondolenciami pre pozostalých.

   Po pohrebe obsluha v admine pošle rodine všetky schválené kondolencie
   k parte (/admin/parte/kondolencie-pozostalym). Tu sa skladá samotný
   e-mail: HTML aj textová verzia pre klientov, ktoré HTML nezobrazia.

   E-mailové programy nepoznajú moderné CSS, preto tabuľky a štýly priamo
   v značkách. Písmo Georgia a Arial, lebo webové písma väčšina klientov
   nenačíta. Logo je PNG, nie WebP: Outlook vo Windows WebP nezobrazí.
   Fotka zosnulého ostáva WebP zo Supabase; kde sa nezobrazí, nechá
   prázdne miesto (alt je prázdny zámerne, meno stojí hneď pod ňou).

   E-mail vyká, ako formuláre na webe. Texty kondolencií sú od verejnosti,
   takže všetko ide cez esc(). Svetlá schéma je zámerná: čierny pás hore
   a dole drží značku aj v klientoch, ktoré farby otáčajú. */
import { FIRMA } from '../data/firma';

export type ParteEmail = {
  meno: string;
  slug: string;
  datum_narodenia: string | null;
  datum_umrtia: string;
  foto_url: string | null;
  published: boolean;
  sviecky: number;
};

export type KondolenciaEmail = { meno: string; odkaz: string; created_at: string };

const WEB = 'https://www.paciga.sk';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);

/** 'YYYY-MM-DD' → '12. 3. 1940'. Dátum bez času, takže žiadne pásma. */
const datum = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)}. ${Number(m)}. ${y}`;
};

/** Čas zápisu kondolencie podľa slovenských hodín, nie podľa servera. */
const den = (iso: string) =>
  new Intl.DateTimeFormat('sk-SK', {
    timeZone: 'Europe/Bratislava', day: 'numeric', month: 'numeric', year: 'numeric',
  }).format(new Date(iso));

/** '+421903596364' → '0903 596 364' */
const telefon = (t: string) => t.replace(/^\+421/, '0').replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');

/** Veta o počte kondolencií so správnym tvarom slovesa aj podstatného mena. */
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
  const predmet = `Kondolencie k parte: ${p.meno}`;
  const uvod = 'posielame vám kondolencie, ktoré ľudia napísali pri parte na webe paciga.sk. Sú to ich vlastné slová, bez úprav.';
  const pocet = [vetaPocet(kondolencie.length), vetaSviecky(p.sviecky)].filter(Boolean).join(' ');
  const datumy = [
    p.datum_narodenia ? `* ${datum(p.datum_narodenia)}` : '',
    `† ${datum(p.datum_umrtia)}`,
  ].filter(Boolean);
  const odkazParte = p.published ? `${WEB}/parte/${p.slug}` : '';
  const pata = 'Tento e-mail sme poslali na adresu, ktorú ste nám dali pri vybavovaní pohrebu. Ak vám prišiel omylom, napíšte nám.';
  const nonstop = telefon(FIRMA.telefon);

  /* ---------- text ---------- */

  const text = [
    'KONDOLENCIE',
    p.meno,
    datumy.join('   '),
    '',
    'Dobrý deň,',
    uvod,
    pocet,
    '',
    ...kondolencie.flatMap((k) => [
      '---',
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

  const sans = "Arial,'Helvetica Neue',Helvetica,sans-serif";
  const serif = "Georgia,'Times New Roman',serif";

  const fotka = p.foto_url && /^https:\/\//.test(p.foto_url)
    ? `<img src="${esc(p.foto_url)}" width="104" height="104" alt=""
         style="display:block;margin:0 auto 20px;width:104px;height:104px;border-radius:52px;object-fit:cover;border:0;">`
    : '';

  const karty = kondolencie.map((k) => `
        <tr><td style="padding:0 40px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="border-left:2px solid #c9c4bb;padding:2px 0 2px 18px;">
              <p style="margin:0 0 10px;font-family:${serif};font-size:17px;line-height:1.6;color:#1c1b19;">${esc(k.odkaz).replace(/\r?\n/g, '<br>')}</p>
              <p style="margin:0;font-family:${sans};font-size:13px;line-height:1.4;color:#77736c;"><strong style="color:#3a3834;">${esc(k.meno)}</strong> · ${esc(den(k.created_at))}</p>
            </td>
          </tr></table>
        </td></tr>`).join('');

  const tlacidlo = odkazParte ? `
        <tr><td style="padding:8px 40px 4px;font-family:${sans};font-size:15px;line-height:1.6;color:#3a3834;">
          Parte aj kondolencie zostávajú na webe.
        </td></tr>
        <tr><td style="padding:12px 40px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="border:1px solid #1c1b19;border-radius:4px;">
              <a href="${esc(odkazParte)}" style="display:inline-block;padding:11px 22px;font-family:${sans};font-size:14px;font-weight:bold;color:#1c1b19;text-decoration:none;">Otvoriť parte</a>
            </td>
          </tr></table>
        </td></tr>` : '';

  const html = `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(predmet)}</title>
</head>
<body style="margin:0;padding:0;background:#efede9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(uvod)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efede9;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;">
      <tr><td align="center" style="background:#0c0d0f;padding:26px 24px;">
        <img src="${WEB}/assets/logo-email.png" width="130" height="47" alt="Paciga" style="display:block;border:0;width:130px;height:47px;">
      </td></tr>

      <tr><td align="center" style="padding:40px 32px 8px;">
        <p style="margin:0 0 22px;font-family:${sans};font-size:11px;letter-spacing:0.18em;color:#77736c;">KONDOLENCIE</p>
        ${fotka}
        <h1 style="margin:0;font-family:${serif};font-size:28px;line-height:1.25;font-weight:normal;color:#111111;">${esc(p.meno)}</h1>
        <p style="margin:10px 0 0;font-family:${sans};font-size:14px;color:#5c5852;">${datumy.map(esc).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</p>
      </td></tr>

      <tr><td style="padding:32px 40px 26px;font-family:${sans};font-size:16px;line-height:1.65;color:#2a2826;">
        <p style="margin:0 0 12px;">Dobrý deň,</p>
        <p style="margin:0 0 12px;">${esc(uvod)}</p>
        <p style="margin:0;">${esc(pocet)}</p>
      </td></tr>
${karty}
${tlacidlo}
      <tr><td style="padding:26px 40px 40px;font-family:${sans};font-size:16px;line-height:1.65;color:#2a2826;">
        <p style="margin:0 0 4px;">Úprimnú sústrasť.</p>
        <p style="margin:0;font-weight:bold;color:#111111;">Pohrebné služby Paciga</p>
      </td></tr>

      <tr><td align="center" style="background:#0c0d0f;padding:24px 28px;font-family:${sans};font-size:12.5px;line-height:1.7;color:#a9a6a0;">
        <p style="margin:0 0 6px;color:#f5f5f5;">NONSTOP <a href="tel:${esc(FIRMA.telefon)}" style="color:#f5f5f5;text-decoration:none;">${esc(nonstop)}</a> · <a href="mailto:${esc(FIRMA.email)}" style="color:#f5f5f5;text-decoration:none;">${esc(FIRMA.email)}</a> · <a href="${WEB}" style="color:#f5f5f5;text-decoration:none;">www.paciga.sk</a></p>
        <p style="margin:0;">${esc(pata)}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { predmet, html, text };
}
