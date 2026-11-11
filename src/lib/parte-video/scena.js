/* Parte na sociálne siete: kreslenie videa do canvasu (1080x1920, 30 fps, 10 s).

   Kópia schválenej šablóny V7 „Svetlo“ (Tomáš 10. 11. 2026):
   h:/ws/paciga/video/animate/11-parte-social/navrh-a/index.html.
   Šablóna je HTML s GSAP. Tu je tá istá scéna nakreslená po snímkach,
   aby sa video dalo vyrobiť priamo v prehliadači v admine, bez servera.
   Rozmery a časy sú odmerané z DOM šablóny (headless Edge, 11. 11. 2026).

   Všetko je čistá funkcia času t. Žiadne hodiny, žiadny Math.random.
   Rovnaké t dá vždy rovnakú snímku, preto náhľad aj export sedia. */

export const SIRKA = 1080;
export const VYSKA = 1920;
export const FPS = 30;
export const DLZKA = 10;

const ZAKLAD = '/parte-video';

/* Výrez 4:5 (1080x1350 na stred). Tak sa reel ukáže v mriežke profilu a vo feede,
   keď ho človek neotvorí. Fotka, meno, dátumy a karta musia byť celé v ňom
   (Tomáš 11. 11. 2026). Logo hore a sviečka dole ostávajú mimo, len ako ozdoba. */
export const VYREZ_45 = { y: (VYSKA - (SIRKA * 5) / 4) / 2, vyska: (SIRKA * 5) / 4 };

/* Blok od fotky po kartu je oproti šablóne V7 posunutý o 90 px nižšie,
   aby sedel na stred výrezu 4:5 (prstenec od 336, karta do 1560 px).
   Sviečka ide o rovnakých 90 px nižšie, aby sa karty nedotkla. */
const POSUN_Y = 90;
const PORTRET_Y = 526 + POSUN_Y;

/* ---------- písmo ---------- */

/* Archivo s plnými osami. Pre každú šírku písma vlastná rodina: deskriptor
   font-stretch s jednou hodnotou prehliadač pri variabilnom písme použije
   ako os wdth. Canvas inak pozná len kľúčové slová (semi-expanded = 112,5 %). */
const RODINY = { 100: 'PvArchivo100', 110: 'PvArchivo110', 125: 'PvArchivo125' };
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

let pismoSlub = null;
export function nacitajPismo(zaklad = ZAKLAD) {
  if (pismoSlub) return pismoSlub;
  const ff = [];
  for (const [st, rodina] of Object.entries(RODINY)) {
    ff.push(new FontFace(rodina, `url(${zaklad}/archivo-full-latinext.woff2)`, { weight: '100 900', stretch: st + '%', unicodeRange: LATIN_EXT }));
    ff.push(new FontFace(rodina, `url(${zaklad}/archivo-full-latin.woff2)`, { weight: '100 900', stretch: st + '%', unicodeRange: LATIN }));
  }
  pismoSlub = Promise.all(ff.map((f) => f.load())).then((nacitane) => {
    nacitane.forEach((f) => document.fonts.add(f));
  });
  return pismoSlub;
}

export function nacitajObrazok(src) {
  return new Promise((ok, chyba) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => ok(img);
    img.onerror = () => chyba(new Error('Obrázok sa nepodarilo načítať: ' + src));
    img.src = src;
  });
}

export const nacitajLogo = (zaklad = ZAKLAD) => nacitajObrazok(`${zaklad}/logo-white.png`);

/* ---------- pomocníci ---------- */

function prng(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sineOut = (p) => Math.sin((p * Math.PI) / 2);
const sineInOut = (p) => -(Math.cos(Math.PI * p) - 1) / 2;
const expoOut = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));

/** Hodnota tweenu v čase t (fromTo: pred začiatkom platí počiatočná hodnota). */
function tw(t, start, dur, ease, od, k) {
  const p = Math.min(1, Math.max(0, (t - start) / dur));
  return od + (k - od) * ease(p);
}

function platno(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const ink = (a) => `rgba(245,245,245,${a})`;

/* ---------- predpočítané vrstvy ---------- */

function zrnoVrstva() {
  const c = platno(SIRKA, VYSKA), x = c.getContext('2d');
  const img = x.createImageData(SIRKA, VYSKA), d = img.data, r = prng(7);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 245; d[i + 1] = 245; d[i + 2] = 245;
    d[i + 3] = Math.floor(r() * r() * 0.05 * 255);
  }
  x.putImageData(img, 0, 0);
  return c;
}

/* Prach a bokeh (port 21st.dev Sparkles cez parte-kit.js). Poradie volaní r() je zhodné so šablónou. */
function prach(seed, n, o) {
  const r = prng(seed), m = [];
  for (let i = 0; i < n; i++) {
    m.push({ x: r() * SIRKA, y: r() * VYSKA, s: 0.8 + r() * o.size, v: o.rise * (0.35 + r()),
      sw: 8 + r() * 26, sp: 0.15 + r() * 0.35, ph: r() * 6.283, tw: 0.4 + r() * 0.9, a: 0.25 + r() * 0.75 });
  }
  return function (c, t, alfa) {
    for (const p of m) {
      const y = (((p.y - p.v * t) % VYSKA) + VYSKA) % VYSKA;
      const x = p.x + Math.sin(t * p.sp + p.ph) * p.sw;
      const okraj = Math.min(1, y / 160, (VYSKA - y) / 160);
      const a = o.alpha * p.a * (0.45 + 0.55 * Math.sin(t * p.tw + p.ph * 2)) * Math.max(0, okraj) * alfa;
      if (a <= 0.004 * alfa) continue;
      if (o.soft) {
        const R = p.s * o.soft, g = c.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, ink(a.toFixed(3))); g.addColorStop(1, ink(0));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, 6.283); c.fill();
      } else {
        c.fillStyle = ink(a.toFixed(3));
        c.beginPath(); c.arc(x, y, p.s, 0, 6.283); c.fill();
      }
    }
  };
}

/* Svetelné škvrny (port 21st.dev SpotlightBackground). */
const SKVRNY = [
  { w: 1300, h: 900, st: [[0, 0.115], [0.55, 0.04], [1, 0]], x: -110, y: 90, ax: 150, ay: 90, r: 0, ar: 12, p: 12, ph: 0 },
  { w: 900, h: 1400, st: [[0, 0.07], [0.6, 0.02], [1, 0]], x: 380, y: 420, ax: 130, ay: 160, r: -18, ar: 16, p: 15, ph: 1.9 },
  { w: 1100, h: 800, st: [[0, 0.06], [1, 0]], x: -260, y: 1000, ax: 190, ay: 110, r: 10, ar: 14, p: 18, ph: 3.4 },
];

/** Šedá fotka podľa CSS filtra grayscale(1) contrast(k) brightness(j). */
function sedaFotka(img, jas, kontrast) {
  const max = 1000, s = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const w = Math.round((img.naturalWidth || img.width) * s), h = Math.round((img.naturalHeight || img.height) * s);
  const c = platno(w, h), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, w, h);
  const data = x.getImageData(0, 0, w, h), d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    let v = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    v = (v - 0.5) * kontrast + 0.5;
    v = Math.min(1, Math.max(0, v)) * jas;
    const b = Math.round(Math.min(1, v) * 255);
    d[i] = d[i + 1] = d[i + 2] = b;
  }
  x.putImageData(data, 0, 0);
  return c;
}

/** Prstenec s conic-gradientom (orbit pri fotke). Stredy farieb v stupňoch od vrchu. */
function conic(c, cx, cy, zastavky) {
  const g = c.createConicGradient(-Math.PI / 2, cx, cy);
  for (const [deg, a] of zastavky) g.addColorStop(deg / 360, ink(a));
  return g;
}

const ORBIT = [[0, 1], [16, 0.4], [52, 0], [308, 0], [344, 0.4], [360, 1]];
const LUC = [[0, 0.85], [30, 0.3], [62, 0], [298, 0], [330, 0.3], [360, 0.85]];

function orbitZiara() {
  /* #orbitglow: prstenec 286/276 px, rozmazaný 9 px. Je statický, kreslí sa raz. */
  const S = 640, c = platno(S, S), x = c.getContext('2d'), st = S / 2;
  if ('filter' in x) x.filter = 'blur(9px)';
  x.fillStyle = conic(x, st, st, ORBIT);
  x.beginPath(); x.arc(st, st, 286, 0, Math.PI * 2); x.arc(st, st, 276, 0, Math.PI * 2, true); x.fill();
  return c;
}

function telSviecky() {
  /* #cbody: 38 x 300, vodorovný gradient, maska zhora nadol. */
  const c = platno(38, 300), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 38, 0);
  g.addColorStop(0, ink(0.62)); g.addColorStop(0.38, ink(1)); g.addColorStop(0.62, ink(0.9)); g.addColorStop(1, ink(0.5));
  x.fillStyle = g;
  x.beginPath(); x.roundRect(0, 0, 38, 300, [12, 12, 0, 0]); x.fill();
  x.globalCompositeOperation = 'destination-in';
  const m = x.createLinearGradient(0, 0, 0, 300);
  m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.45, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,.35)');
  x.fillStyle = m; x.fillRect(0, 0, 38, 300);
  return c;
}

function plamenSviecky() {
  /* #cflame: vajce 46 x 84 (rohy 50 % / 68 % hore, 32 % dole), radiálny gradient
     50 % x 62 % so stredom v 68 % výšky. Kreslí sa v dvojnásobnom rozlíšení. */
  const K = 4, c = platno(46 * K, 84 * K), x = c.getContext('2d');
  x.scale(K, K);
  x.beginPath();
  x.roundRect(0, 0, 46, 84, [{ x: 23, y: 57.12 }, { x: 23, y: 57.12 }, { x: 23, y: 26.88 }, { x: 23, y: 26.88 }]);
  x.clip();
  x.translate(23, 57.12); x.scale(23, 52.08);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, ink(1)); g.addColorStop(0.42, ink(0.9)); g.addColorStop(0.78, ink(0));
  x.fillStyle = g; x.fillRect(-2, -2, 4, 4);
  return c;
}

/* ---------- text ---------- */

/** Nastaví písmo. ls = letter-spacing v px. */
function pismo(c, vel, vaha, sirka = 100, ls = 0) {
  c.font = `${vaha} ${vel}px ${RODINY[sirka]}, system-ui, sans-serif`;
  if ('letterSpacing' in c) c.letterSpacing = ls ? `${ls}px` : '0px';
}

/** Účiaria podľa CSS: vrch riadku + (výška riadku − (A + D)) / 2 + A, A a D zaokrúhlené ako v prehliadači. */
function uciarie(vrch, vyskaRiadku, vel) {
  const A = Math.round(vel * 0.8788), D = Math.round(vel * 0.2121);
  return vrch + (vyskaRiadku - (A + D)) / 2 + A;
}
const normalnaVyska = (vel) => Math.round(vel * 0.8788) + Math.round(vel * 0.2121);

/* ---------- rozloženie ---------- */

const MENO_VEL = 132, MENO_MAX = 960, MIESTO_VEL = 28, MIESTO_MIN = 21;

/** Spočíta rozloženie podľa textov. Zavolaj po načítaní písma. */
function rozloz(c, d) {
  const L = {};
  /* meno: dva riadky, dlhé meno sa zmenší, oba riadky rovnako */
  pismo(c, MENO_VEL, 660, 110, -0.015 * MENO_VEL);
  const riadky = [d.meno1 || '', d.meno2 || ''];
  const najsirsi = Math.max(...riadky.map((s) => c.measureText(s).width), 1);
  L.menoVel = Math.min(MENO_VEL, Math.floor((MENO_VEL * MENO_MAX) / najsirsi));

  /* dátumy: d1, krížik, d2 na stred, medzera 34 */
  pismo(c, 38, 540, 110);
  L.w1 = d.d1 ? c.measureText(d.d1).width : 0;
  L.w2 = d.d2 ? c.measureText(d.d2).width : 0;
  const spolu = (d.d1 ? L.w1 + 34 : 0) + 30 + (d.d2 ? 34 + L.w2 : 0);
  L.datumyX = (SIRKA - spolu) / 2;

  /* karta */
  pismo(c, 88, 680, 125, -0.88);
  L.casW = c.measureText(d.cas || '').width;
  const vnutro = 822;
  /* v šablóne je medzi textom, oddeľovačom a časom asi 16 px (Mária: 15,6) */
  const volne = vnutro - (d.cas ? L.casW + 1 + 2 * 14 : 0);
  pismo(c, 38, 640, 110, -0.38);
  const denW = c.measureText(d.den || '').width;
  L.denVel = denW > volne ? Math.max(28, Math.floor((38 * volne) / denW)) : 38;

  /* miesto: najprv zmenšiť do 21 px, potom zalomiť na dva riadky */
  L.miestoRiadky = [d.miesto || ''];
  L.miestoVel = MIESTO_VEL;
  pismo(c, MIESTO_VEL, 440);
  const mW = c.measureText(d.miesto || '').width;
  if (mW > volne) {
    const vel = Math.floor((MIESTO_VEL * volne) / mW);
    if (vel >= MIESTO_MIN) {
      L.miestoVel = vel;
    } else {
      L.miestoVel = 24;
      pismo(c, 24, 440);
      const slova = (d.miesto || '').split(/\s+/);
      let prvy = '';
      for (let i = 0; i < slova.length; i++) {
        const skuska = prvy ? prvy + ' ' + slova[i] : slova[i];
        if (c.measureText(skuska).width > volne && prvy) {
          L.miestoRiadky = [prvy, slova.slice(i).join(' ')];
          break;
        }
        prvy = skuska;
      }
      const sirsi = Math.max(...L.miestoRiadky.map((s) => c.measureText(s).width));
      if (sirsi > volne) L.miestoVel = Math.max(16, Math.floor((24 * volne) / sirsi));
    }
  }
  L.miestoRiadokV = normalnaVyska(L.miestoVel);
  const lavaV = 41.8 * (L.denVel / 38) + 6 + L.miestoRiadokV * L.miestoRiadky.length;
  L.riadokV = Math.max(96, lavaV + 8);
  L.lavaV = lavaV;
  pismo(c, L.denVel, 640, 110, -0.01 * L.denVel);
  const denW2 = c.measureText(d.den || '').width;
  pismo(c, L.miestoVel, 440);
  const miestoW = Math.max(...L.miestoRiadky.map((s) => c.measureText(s).width));
  L.lavaW = Math.max(denW2, miestoW);
  /* oddeľovač v strede medzery medzi ľavým stĺpcom a časom (justify space-between) */
  const casX = 129 + vnutro - L.casW;
  L.casX = casX;
  L.sepX = d.cas ? 129 + L.lavaW + (casX - (129 + L.lavaW) - 1) / 2 : -1;

  /* riadok o pohrebe */
  L.poPohrebe = !!(d.poPohrebe && (d.poPohrebe.text || d.poPohrebe.miesto));
  if (L.poPohrebe) {
    pismo(c, 26, 440);
    L.poW = c.measureText(d.poPohrebe.text || '').width;
    pismo(c, 26, 640, 110);
    L.poBW = c.measureText(d.poPohrebe.miesto || '').width;
    const sp = d.poPohrebe.text && d.poPohrebe.miesto ? 7.8 : 0;
    const celk = L.poW + sp + L.poBW;
    L.poVel = celk > vnutro ? Math.max(18, Math.floor((26 * vnutro) / celk)) : 26;
    L.poMedzera = sp * (L.poVel / 26);
  }
  L.kartaY = L.poPohrebe ? 1236 + POSUN_Y : 1250 + POSUN_Y;
  const zaRiadkom = L.poPohrebe ? 14 + 1 + 66 : 19;
  L.kartaV = 2 + 22 + 21 + 12 + L.riadokV + zaRiadkom;
  return L;
}

/* ---------- scéna ---------- */

/**
 * Vytvorí scénu. Údaje:
 *   lead, meno1, meno2, d1, d2, mikro, den, miesto, cas,
 *   poPohrebe: { text, miesto } alebo null,
 *   foto: HTMLImageElement alebo null, fotoY (0–100, posun fotky), jas (napr. 0.94),
 *   inicialy (keď nie je fotka), logo: HTMLImageElement.
 * Vráti { kresli(ctx, t) }. Písmo musí byť načítané (nacitajPismo).
 */
export function vytvorScenu(d) {
  const meraj = platno(4, 4).getContext('2d');
  const L = rozloz(meraj, d);
  const zrno = zrnoVrstva();
  const kresliPrach = prach(21, 90, { alpha: 0.55, rise: 16, size: 2.0 });
  const kresliBokeh = prach(58, 16, { alpha: 0.16, rise: 7, size: 3.2, soft: 16 });
  const ziara = orbitZiara();
  const sviecka = telSviecky();
  const plamen = plamenSviecky();
  const foto = d.foto ? sedaFotka(d.foto, d.jas ?? 0.94, d.kontrast ?? 1.04) : null;
  const fotoY = (d.fotoY ?? 18) / 100;
  const logoV = d.logo ? (440 * d.logo.naturalHeight) / d.logo.naturalWidth : 0;

  function kresli(c, t) {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = '#0c0d0f';
    c.fillRect(0, 0, SIRKA, VYSKA);

    /* svetlo */
    const svetlo = tw(t, 0, 1.0, sineOut, 0.5, 1);
    for (const k of SKVRNY) {
      const x = k.x + k.ax * Math.sin((6.283 * t) / k.p + k.ph);
      const y = k.y + k.ay * Math.sin((6.283 * t) / (k.p * 1.3) + k.ph * 1.7);
      const rot = k.r + k.ar * Math.sin((6.283 * t) / (k.p * 0.9) + k.ph);
      c.save();
      c.globalAlpha = svetlo;
      c.translate(x + k.w / 2, y + k.h / 2);
      c.rotate((rot * Math.PI) / 180);
      c.scale(k.w / 2, k.h / 2);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      for (const [o, a] of k.st) g.addColorStop(o, ink(a));
      c.fillStyle = g;
      c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    c.drawImage(zrno, 0, 0);
    kresliBokeh(c, t, tw(t, 0, 1.2, sineOut, 0, 1));
    kresliPrach(c, t, tw(t, 0, 1.2, sineOut, 0, 1));

    /* vineta: lineárny gradient pod, eliptický nad */
    const lg = c.createLinearGradient(0, 0, 0, VYSKA);
    lg.addColorStop(0, 'rgba(12,13,15,.5)'); lg.addColorStop(0.12, 'rgba(12,13,15,0)');
    lg.addColorStop(0.72, 'rgba(12,13,15,0)'); lg.addColorStop(1, 'rgba(12,13,15,.85)');
    c.fillStyle = lg; c.fillRect(0, 0, SIRKA, VYSKA);
    c.save();
    c.translate(540, 576 + POSUN_Y); c.scale(1026, 1190.4);
    const rg = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    rg.addColorStop(0.45, 'rgba(12,13,15,0)'); rg.addColorStop(1, 'rgba(12,13,15,.72)');
    c.fillStyle = rg; c.fillRect(-2, -2, 4, 4);
    c.restore();

    /* logo hore */
    if (d.logo) {
      c.globalAlpha = tw(t, 0, 0.6, sineOut, 0.4, 1);
      c.drawImage(d.logo, 320, 48, 440, logoV);
      c.globalAlpha = 1;
    }

    /* portrét: stred 540, PORTRET_Y (616) */
    const fl = Math.sin(t * 2.3) * 0.5 + Math.sin(t * 6.1 + 0.7) * 0.3 + Math.sin(t * 11.3 + 2.1) * 0.2;
    {
      const op = tw(t, 0, 1.0, sineOut, 0.3, 1), sc = tw(t, 0, 1.0, sineOut, 0.9, 1);
      const dych = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.9) * Math.sin(t * 0.83 + 1.1));
      c.save();
      c.translate(540, PORTRET_Y); c.scale(sc, sc);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 530);
      g.addColorStop(0, ink(0.14)); g.addColorStop(0.5, ink(0.04)); g.addColorStop(1, ink(0));
      c.fillStyle = g;
      c.globalAlpha = op;
      c.beginPath(); c.arc(0, 0, 530, 0, Math.PI * 2); c.fill();
      c.globalAlpha = op * dych;
      c.fill();
      c.restore();
    }
    {
      const op = tw(t, 0, 0.6, expoOut, 0.35, 1), sc = tw(t, 0, 0.6, expoOut, 0.975, 1);
      c.save();
      c.globalAlpha = op;
      c.translate(540, PORTRET_Y); c.scale(sc, sc); c.translate(-250, -250);
      c.beginPath(); c.arc(250, 250, 250, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#131418'; c.fillRect(0, 0, 500, 500);
      if (foto) {
        const ps = tw(t, 0, 8.0, sineOut, 1.08, 1);
        const k = Math.max(500 / foto.width, 500 / foto.height);
        const dw = foto.width * k, dh = foto.height * k;
        c.save();
        c.translate(250, 175); c.scale(ps, ps); c.translate(-250, -175);
        c.drawImage(foto, (500 - dw) * 0.5, (500 - dh) * fotoY, dw, dh);
        c.restore();
      } else if (d.inicialy) {
        pismo(c, 150, 600, 110, 2);
        c.fillStyle = ink(0.5);
        const w = c.measureText(d.inicialy).width;
        c.fillText(d.inicialy, 250 - w / 2, 250 + 52);
      }
      /* #discshade: tenká linka dnu a tieň dole */
      const sg = c.createLinearGradient(0, 380, 0, 500);
      sg.addColorStop(0, 'rgba(12,13,15,0)'); sg.addColorStop(1, 'rgba(12,13,15,.42)');
      c.fillStyle = sg; c.fillRect(0, 380, 500, 120);
      c.strokeStyle = 'rgba(255,255,255,.10)'; c.lineWidth = 2;
      c.beginPath(); c.arc(250, 250, 250, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    /* kruh sa dokreslí od vrchu v smere hodín */
    {
      const p = tw(t, 0.1, 1.2, sineInOut, 0, 1);
      if (p > 0) {
        c.strokeStyle = ink(0.32); c.lineWidth = 1.5;
        c.beginPath(); c.arc(540, PORTRET_Y, 278.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); c.stroke();
      }
    }
    {
      const og = tw(t, 0.9, 1.2, sineOut, 0, 0.6);
      if (og > 0) { c.globalAlpha = og * 0.75; c.drawImage(ziara, 540 - 320, PORTRET_Y - 320); }
      const o = tw(t, 0.9, 1.2, sineOut, 0, 0.85);
      if (o > 0) {
        c.globalAlpha = o;
        c.fillStyle = conic(c, 540, PORTRET_Y, ORBIT);
        c.beginPath(); c.arc(540, PORTRET_Y, 280, 0, Math.PI * 2); c.arc(540, PORTRET_Y, 276, 0, Math.PI * 2, true); c.fill();
      }
      c.globalAlpha = 1;
    }

    /* Odpočívaj v pokoji */
    {
      c.globalAlpha = tw(t, 0.1, 0.6, expoOut, 0, 1);
      const y = tw(t, 0.1, 0.6, expoOut, 10, 0);
      pismo(c, 36, 440);
      c.fillStyle = ink(0.6);
      const w = c.measureText(d.lead || '').width;
      c.fillText(d.lead || '', (SIRKA - w) / 2, uciarie(820 + POSUN_Y, 40, 36) + y);
      c.globalAlpha = 1;
    }

    /* meno: dva riadky, každý vychádza zo svojej masky */
    {
      const vel = L.menoVel, lh = vel * 1.03, kp = vel / MENO_VEL;
      /* zmenšené meno ostáva na strede pôvodného bloku (856 až 1146,38) */
      const blokTop = 1001.19 + POSUN_Y - (154.42 * kp + lh) / 2;
      const tops = [blokTop, blokTop + 154.42 * kp];
      pismo(c, vel, 660, 110, -0.015 * vel);
      c.fillStyle = ink(1);
      [d.meno1, d.meno2].forEach((s, i) => {
        if (!s) return;
        const posun = tw(t, 0.05 + 0.08 * i, 0.7, expoOut, 0.6, 0) * lh;
        c.save();
        c.beginPath(); c.rect(0, tops[i] - 0.22 * vel, SIRKA, lh + 0.36 * vel); c.clip();
        const w = c.measureText(s).width;
        c.fillText(s, (SIRKA - w) / 2, uciarie(tops[i], lh, vel) + posun);
        c.restore();
      });
    }

    /* dátumy s krížikom */
    {
      pismo(c, 38, 540, 110);
      c.fillStyle = ink(1);
      let x = L.datumyX;
      const bl = uciarie(1171.5 + POSUN_Y, 41, 38);
      if (d.d1) {
        c.globalAlpha = tw(t, 0.6, 0.6, expoOut, 0, 1);
        c.fillText(d.d1, x + tw(t, 0.6, 0.6, expoOut, 14, 0), bl);
        x += L.w1 + 34;
      }
      const ko = tw(t, 0.55, 0.6, expoOut, 0, 1), ks = tw(t, 0.55, 0.6, expoOut, 0, 1);
      if (ks > 0) {
        c.globalAlpha = ko;
        c.save();
        c.translate(x, 1168 + POSUN_Y + 48); c.scale(1, ks); c.translate(0, -48);
        c.fillRect(14, 0, 2, 48);
        c.fillRect(0, 13.8, 30, 2);
        c.restore();
      }
      x += 30 + 34;
      if (d.d2) {
        c.globalAlpha = tw(t, 0.6, 0.6, expoOut, 0, 1);
        c.fillText(d.d2, x + tw(t, 0.6, 0.6, expoOut, -14, 0), bl);
      }
      c.globalAlpha = 1;
    }

    /* karta s rozlúčkou */
    {
      const ka = tw(t, 0.8, 0.6, expoOut, 0, 1);
      if (ka > 0) {
        const ky = L.kartaY + tw(t, 0.8, 0.6, expoOut, 20, 0), kv = L.kartaV;
        c.save();
        c.globalAlpha = ka;
        /* tieň 0 30px 60px -30px */
        c.save();
        c.shadowColor = 'rgba(5,6,7,.9)'; c.shadowBlur = 60; c.shadowOffsetY = 30;
        c.fillStyle = '#16181c';
        c.beginPath(); c.roundRect(84 + 30, ky + 30, 912 - 60, kv - 60, 20); c.fill();
        c.restore();
        c.fillStyle = '#16181c';
        c.beginPath(); c.roundRect(84, ky, 912, kv, 20); c.fill();
        c.save();
        c.clip();
        c.fillStyle = ink(0.07); c.fillRect(84, ky + 1, 912, 1);
        c.restore();
        c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1;
        c.beginPath(); c.roundRect(84.5, ky + 0.5, 911, kv - 1, 19.5); c.stroke();

        /* svetlo na hornej hrane (statické od V7) */
        const lo = tw(t, 1.4, 0.8, sineOut, 0, 1);
        if (lo > 0) {
          c.save();
          c.globalAlpha = ka * lo;
          c.fillStyle = conic(c, 540, ky + kv / 2, LUC);
          c.beginPath();
          c.roundRect(83, ky - 1, 914, kv + 2, 20);
          c.roundRect(85, ky + 1, 910, kv - 2, 18);
          c.fill('evenodd');
          c.restore();
        }

        const ci = (i) => [tw(t, 1.0 + 0.08 * i, 0.6, expoOut, 0, 1), tw(t, 1.0 + 0.08 * i, 0.6, expoOut, 10, 0)];
        /* mikro riadok */
        {
          const [a, y] = ci(0);
          c.globalAlpha = ka * a;
          pismo(c, 19, 600, 100, 3.8);
          c.fillStyle = ink(0.55);
          c.fillText((d.mikro || '').toLocaleUpperCase('sk'), 129, uciarie(ky + 23, 21, 19) + y);
        }
        const rTop = ky + 56;
        const lTop = rTop + (L.riadokV - L.lavaV) / 2;
        {
          const [a, y] = ci(1);
          c.globalAlpha = ka * a;
          pismo(c, L.denVel, 640, 110, -0.01 * L.denVel);
          c.fillStyle = ink(1);
          const lh = 41.8 * (L.denVel / 38);
          c.fillText(d.den || '', 129, uciarie(lTop, lh, L.denVel) + y);
        }
        {
          const [a, y] = ci(2);
          c.globalAlpha = ka * a;
          pismo(c, L.miestoVel, 440);
          c.fillStyle = ink(0.6);
          const top = lTop + 41.8 * (L.denVel / 38) + 6;
          L.miestoRiadky.forEach((s, i) => {
            c.fillText(s, 129, uciarie(top + i * L.miestoRiadokV, L.miestoRiadokV, L.miestoVel) + y);
          });
        }
        if (d.cas) {
          /* oddeľovač rastie zhora */
          const ss = tw(t, 1.1, 0.7, expoOut, 0, 1);
          c.globalAlpha = ka;
          c.fillStyle = 'rgba(255,255,255,.10)';
          const sepV = 84 * (L.riadokV / 96);
          c.fillRect(L.sepX, rTop + (L.riadokV - sepV) / 2, 1, sepV * ss);
          /* čas vyjde zdola zo svojej masky */
          const casTop = rTop + (L.riadokV - 90) / 2;
          c.save();
          c.beginPath(); c.rect(L.casX - 20, casTop, L.casW + 40, 90); c.clip();
          pismo(c, 88, 680, 125, -0.88);
          c.fillStyle = ink(1);
          c.fillText(d.cas, L.casX, uciarie(casTop, 90, 88) + tw(t, 1.15, 0.8, expoOut, 94.5, 0));
          c.restore();
        }
        if (L.poPohrebe) {
          const lineY = rTop + L.riadokV + 14;
          c.globalAlpha = ka;
          c.fillStyle = 'rgba(255,255,255,.08)';
          c.fillRect(85, lineY, 910 * tw(t, 1.2, 0.9, expoOut, 0, 1), 1);
          const [a, y] = ci(3);
          c.globalAlpha = ka * a;
          const vel = L.poVel, nv = normalnaVyska(vel);
          const bl = uciarie(lineY + 1 + (66 - nv) / 2, nv, vel) + y;
          let x = 129;
          if (d.poPohrebe.text) {
            pismo(c, vel, 440);
            c.fillStyle = ink(0.6);
            c.fillText(d.poPohrebe.text, x, bl);
            x += c.measureText(d.poPohrebe.text).width + L.poMedzera;
          }
          if (d.poPohrebe.miesto) {
            pismo(c, vel, 640, 110);
            c.fillStyle = ink(1);
            c.fillText(d.poPohrebe.miesto, x, bl);
          }
        }
        c.restore();
      }
    }

    /* sviečka */
    {
      const ha = tw(t, 1.7, 1.2, sineOut, 0, 1);
      if (ha > 0) {
        const hs = 1 + fl * 0.035;
        c.save();
        c.globalAlpha = ha;
        c.translate(540, 1600 + POSUN_Y); c.scale(hs, hs);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, 466.69);
        g.addColorStop(0, ink(0.3)); g.addColorStop(0.34, ink(0.1)); g.addColorStop(0.68, ink(0));
        c.fillStyle = g;
        c.beginPath(); c.arc(0, 0, 330, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      const ba = tw(t, 1.2, 0.7, expoOut, 0, 1), by = tw(t, 1.2, 0.7, expoOut, 30, 0);
      if (ba > 0) {
        c.globalAlpha = ba;
        c.drawImage(sviecka, 521, 1654 + POSUN_Y + by);
        c.fillStyle = ink(0.5);
        c.beginPath(); c.roundRect(538, 1630 + POSUN_Y + by, 4, 26, 2); c.fill();
        c.globalAlpha = 1;
      }
      const fa = tw(t, 1.7, 0.7, sineOut, 0, 1);
      if (fa > 0) {
        const rot = Math.sin(t * 1.7 + 0.4) * 2.4 + Math.sin(t * 5.3) * 1.1;
        const sx = 1 - fl * 0.035, sy = 1 + fl * 0.085;
        c.save();
        c.globalAlpha = fa;
        c.translate(540, 1638 + POSUN_Y); c.rotate((rot * Math.PI) / 180); c.scale(sx, sy);
        /* žiara plameňa (drop-shadow 22 a 60 px): obrázok mimo plátna, kreslí sa len jeho tieň */
        const POSUN = 4000;
        /* tretí, širší tieň napodobní reťazenie dvoch drop-shadow v CSS */
        for (const [blur, a] of [[90, 0.22], [60, 0.35], [22, 0.65]]) {
          c.save();
          const m = c.getTransform();
          c.shadowColor = ink(a); c.shadowBlur = blur;
          c.shadowOffsetX = POSUN * m.a; c.shadowOffsetY = POSUN * m.b;
          c.drawImage(plamen, -23 - POSUN, -84, 46, 84);
          c.restore();
        }
        c.drawImage(plamen, -23, -84, 46, 84);
        c.restore();
      }
    }

    c.restore();
  }

  return { kresli, rozlozenie: L };
}
