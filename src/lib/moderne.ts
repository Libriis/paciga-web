/* Klient API Moderného pohrebníctva (MP). LEN pre server.

   Kľúč MP_API_KEY sa číta za behu (zaBehu), nikdy cez import.meta.env,
   aby ho Vite nevpísal do balíka. Prehliadač ho nikdy nedostane: admin
   volá /api/admin/moderne a ten sa pýta MP.

   API je len na čítanie. Dokumentácia a OpenAPI: h:/ws/paciga/API-moderne.
   Limity MP: 120 požiadaviek za minútu na integráciu, z toho 30 stiahnutí. */
import sharp from 'sharp';
import { zaBehu } from './env';
import { ID_MP, mapujPohreb, type MpPohreb, type Snimka } from './moderne-mapa';

const BASE = 'https://modernepohrebnictvo.sk/api/v1';

/** Chyba s hláškou, ktorú môžeme ukázať obsluhe v admine. */
export class ChybaMp extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) {
    super(message);
  }
}

function hlaska(status: number, kod: string, retryAfter?: number): string {
  if (status === 400) return 'Moderné pohrebníctvo požiadavku odmietlo. Obnov stránku a skús znova.';
  if (status === 401) return 'Kľúč k Modernému pohrebníctvu neplatí alebo vypršal. Majiteľ v MP vydá nový v časti Organizácia → API prístupy.';
  if (status === 403) return `Kľúču chýba oprávnenie v Modernom pohrebníctve (${kod}).`;
  if (status === 404) return 'Tento pohreb v Modernom pohrebníctve už nie je.';
  if (status === 429) return `Moderné pohrebníctvo hlási priveľa požiadaviek. Skús to o ${retryAfter ?? 60} s.`;
  if (status === 503) return 'API Moderného pohrebníctva je teraz vypnuté.';
  return 'Moderné pohrebníctvo neodpovedá. Skús to o chvíľu.';
}

async function volaj(cesta: string): Promise<Response> {
  const kluc = zaBehu('MP_API_KEY');
  if (!kluc) throw new ChybaMp(503, 'Na serveri chýba kľúč MP_API_KEY.');
  let r: Response;
  try {
    r = await fetch(BASE + cesta, {
      headers: { Authorization: `Bearer ${kluc}`, Accept: 'application/json, image/*' },
      // Presmerovanie by mohlo odniesť kľúč inam. MP žiadne nerobí.
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ChybaMp(502, hlaska(502, 'SIET'));
  }
  if (r.ok) return r;
  const telo = await r.json().catch(() => null) as { error?: { code?: string } } | null;
  const retry = Number(r.headers.get('retry-after')) || undefined;
  throw new ChybaMp(r.status, hlaska(r.status, telo?.error?.code ?? `HTTP_${r.status}`, retry), retry);
}

export type PolozkaZoznamu = { id: string; snimka: Snimka; variant: string | null };

/** Jedna stránka zoznamu, najnovšie založené pohreby prvé. */
export async function zoznamPohrebov(kurzor: string | null, limit = 50) {
  const q = new URLSearchParams({ limit: String(limit) });
  if (kurzor) q.set('cursor', kurzor);
  const r = await volaj(`/funerals?${q}`);
  const j = await r.json() as { items: MpPohreb[]; nextCursor: string | null };
  const polozky: PolozkaZoznamu[] = j.items
    .filter((p) => ID_MP.test(p.id))
    .map((p) => ({ id: p.id, snimka: mapujPohreb(p), variant: p.funeral_variant || null }));
  return { polozky, dalsi: j.nextCursor };
}

/* Ktorá fotka z MP je portrét zosnulého. MP nepublikuje zoznam ID fotiek,
   v dokumentácii je len príklad grave_before_ceremony (hrob pred obradom).
   Kľúč zatiaľ nemá photos:read, takže skutočné ID portrétu nevieme overiť.
   Keď oprávnenie pribudne, over to a prípadne uprav tento vzor. */
const PORTRET = /portr|deceased|zosnul|profil/i;

export type StavFotky = 'ok' | 'bez-opravnenia' | 'nenajdena';

async function najdiPortret(id: string): Promise<{ stav: StavFotky; fotoId: string | null; ine: string[] }> {
  try {
    const r = await volaj(`/funerals/${id}/files`);
    const j = await r.json() as { items: { id: string; category: string }[] };
    const fotky = j.items.filter((f) => f.category === 'photo');
    const portret = fotky.find((f) => PORTRET.test(f.id));
    return portret
      ? { stav: 'ok', fotoId: portret.id, ine: [] }
      : { stav: 'nenajdena', fotoId: null, ine: fotky.map((f) => f.id).slice(0, 20) };
  } catch (e) {
    if (e instanceof ChybaMp && e.status === 403) return { stav: 'bez-opravnenia', fotoId: null, ine: [] };
    throw e;
  }
}

/** Detail pohrebu: polia parte (s pohlavím, ak ho MP pošle) a stav portrétu.
    Z detailu odchádza von LEN to, čo patrí na parte. Zvyšok (rodné čísla,
    adresy, objednávateľ) zostane v pamäti funkcie a zahodí sa. */
export async function detailPohrebu(id: string) {
  const r = await volaj(`/funerals/${id}`);
  const p = await r.json() as MpPohreb;
  const foto = await najdiPortret(id);
  return {
    id,
    snimka: mapujPohreb(p),
    pohlavieZMp: !!p.d_gender,
    foto: foto.stav,
    fotoId: foto.fotoId,
    ineFotky: foto.ine,
  };
}

const MAX_FOTKA = 25 * 1024 * 1024;
const RASTRE = new Set(['jpeg', 'png', 'webp', 'gif', 'tiff', 'heif']);

/** Stiahne portrét a zmenší ho na 900 px WebP, ako to robí formulár.
    Server vracia malý súbor: Vercel funkcia nepustí odpoveď nad 4,5 MB,
    fotka z mobilu ju ľahko prekročí. */
export async function portretWebp(id: string, fotoId: string): Promise<Uint8Array> {
  // Len fotka, ktorú MP sám uvádza ako portrét. Nič iné sa cez nás stiahnuť nedá.
  const portret = await najdiPortret(id);
  if (portret.stav !== 'ok' || portret.fotoId !== fotoId) throw new ChybaMp(404, 'Portrét sa nenašiel.');

  const r = await volaj(`/funerals/${id}/files/${encodeURIComponent(fotoId)}`);
  const data = new Uint8Array(await r.arrayBuffer());
  if (data.byteLength > MAX_FOTKA) throw new ChybaMp(413, 'Fotka v Modernom pohrebníctve je príliš veľká.');

  try {
    const obraz = sharp(data, { failOn: 'error' });
    const { format } = await obraz.metadata();
    // SVG a iné vektory nie: môžu niesť skript a sharp by ich renderoval.
    if (!format || !RASTRE.has(format)) throw new Error('nie je raster');
    const vystup = await obraz
      .rotate()
      .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return new Uint8Array(vystup);
  } catch {
    throw new ChybaMp(422, 'Fotku z Moderného pohrebníctva sa nepodarilo spracovať.');
  }
}
