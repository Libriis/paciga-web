/* Výroba MP4 priamo v prehliadači: canvas → WebCodecs (H.264) → mp4-muxer.
   Snímky sa kreslia po jednej, nie v reálnom čase, preto je video plynulé
   aj na slabšom počítači. 300 snímok trvá zvyčajne 10 až 30 sekúnd. */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { SIRKA, VYSKA, FPS, DLZKA } from './scena.js';

/* High, Main, Baseline. Úroveň 4.0 (0x28) stačí na 1080 x 1920 pri 30 fps. */
const KODEKY = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640032', 'avc1.4d0032'];

export function vieVyrobitVideo() {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;
}

async function vyberKodek() {
  for (const codec of KODEKY) {
    const cfg = { codec, width: SIRKA, height: VYSKA, bitrate: 10_000_000, framerate: FPS };
    try {
      const { supported } = await VideoEncoder.isConfigSupported(cfg);
      if (supported) return cfg;
    } catch { /* skúsi ďalší */ }
  }
  return null;
}

/**
 * Vyrobí MP4 a vráti Blob. scena = výsledok vytvorScenu.
 * priebeh(hotovo, celkom) sa volá po každej snímke.
 */
export async function vyrobMp4(scena, priebeh = () => {}) {
  if (!vieVyrobitVideo()) throw new Error('Tento prehliadač nevie vyrobiť video. Otvor admin v Chrome alebo Edge.');
  const cfg = await vyberKodek();
  if (!cfg) throw new Error('Prehliadač nemá kodek H.264. Otvor admin v Chrome alebo Edge.');

  const platno = document.createElement('canvas');
  platno.width = SIRKA; platno.height = VYSKA;
  /* CPU kreslenie: pri rýchlom kreslení veľa snímok GPU canvas občas padal (poznatok z 19. 7. 2026) */
  const ctx = platno.getContext('2d', { willReadFrequently: true, alpha: false });

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: SIRKA, height: VYSKA, frameRate: FPS },
    fastStart: 'in-memory',
  });
  let chyba = null;
  const enc = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { chyba = e; },
  });
  enc.configure(cfg);

  const celkom = Math.round(DLZKA * FPS);
  const trvanie = Math.round(1e6 / FPS);
  for (let i = 0; i < celkom; i++) {
    if (chyba) throw chyba;
    scena.kresli(ctx, i / FPS);
    const snimka = new VideoFrame(platno, { timestamp: i * trvanie, duration: trvanie });
    enc.encode(snimka, { keyFrame: i % (FPS * 2) === 0 });
    snimka.close();
    /* nech sa fronta kodéra nezahltí a stránka ostane živá */
    while (enc.encodeQueueSize > 8) await new Promise((ok) => setTimeout(ok, 5));
    if (i % 5 === 4) await new Promise((ok) => setTimeout(ok, 0));
    priebeh(i + 1, celkom);
  }
  await enc.flush();
  if (chyba) throw chyba;
  enc.close();
  muxer.finalize();
  return new Blob([muxer.target.buffer], { type: 'video/mp4' });
}

/** Posledná snímka ako PNG (na príspevok s obrázkom). */
export async function vyrobPng(scena) {
  const platno = document.createElement('canvas');
  platno.width = SIRKA; platno.height = VYSKA;
  scena.kresli(platno.getContext('2d', { alpha: false }), DLZKA - 1 / FPS);
  return new Promise((ok, zle) => platno.toBlob((b) => (b ? ok(b) : zle(new Error('Obrázok sa nepodarilo vyrobiť.'))), 'image/png'));
}

export function stiahni(blob, nazov) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nazov;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
