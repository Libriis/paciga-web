/* Klient API Moderného pohrebníctva (MP). LEN pre server.

   Kľúč MP_API_KEY sa číta za behu (zaBehu), nikdy cez import.meta.env,
   aby ho Vite nevpísal do balíka. Prehliadač ho nikdy nedostane: admin
   volá /api/admin/moderne a ten sa pýta MP.

   API je len na čítanie. Dokumentácia a OpenAPI: h:/ws/paciga/API-moderne.
   Limit MP: 120 požiadaviek za minútu na integráciu.

   PORTRÉT: MP má naň miesto decease_photo v skupine photos:read („Portrét,
   hrob a obrad"). Fotky tela majú v MP vlastné miesta v citlivej skupine
   (death_photo, take_remains_photo, deceased_takeover_photo_N…) a k tým
   kľúč prístup mať nemá. Overené 8. 10. 2026 na 400 pohreboch.
   POZOR: v ten istý deň bola na mieste portrétu jedného pohrebu fotka
   tela, obsluha ju tam nahrala omylom. Preto sa portrét NIKDY nepreberá
   sám. Admin ho ukáže ako náhľad a použije ho, len keď ho človek
   zaškrtne (ParteSync). */
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

const PORTRET = 'decease_photo';
/** Vercel funkcia nepustí odpoveď nad 4,5 MB. Väčšiu fotku pridá obsluha ručne. */
const MAX_FOTKA = 4_000_000;

/** Typ obrázka podľa prvých bajtov. Hlavičke z MP neveríme a SVG nechceme,
    lebo môže niesť skript. */
function typObrazka(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  const ascii = (od: number, n: number) => String.fromCharCode(...b.subarray(od, od + n));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  return null;
}

/** Portrét zosnulého z MP, len ten. Iné fotky (hrob, obrad) cez nás nejdú.
    Zmenšuje ho až prehliadač, rovnako ako fotku vo formulári parte. */
export async function portret(id: string): Promise<{ data: Uint8Array; typ: string }> {
  const zoznam = await volaj(`/funerals/${id}/files`);
  const j = await zoznam.json() as { items: { id: string; category: string }[] };
  if (!j.items.some((f) => f.id === PORTRET && f.category === 'photo')) {
    throw new ChybaMp(404, 'V Modernom pohrebníctve nie je portrét.');
  }
  const r = await volaj(`/funerals/${id}/files/${PORTRET}`);
  const prilis = 'Portrét v Modernom pohrebníctve je priveľký. Pridaj fotku ručne.';
  if (Number(r.headers.get('content-length')) > MAX_FOTKA) throw new ChybaMp(413, prilis);
  const data = new Uint8Array(await r.arrayBuffer());
  if (data.byteLength > MAX_FOTKA) throw new ChybaMp(413, prilis);
  const typ = typObrazka(data);
  if (!typ) throw new ChybaMp(422, 'Portrét v Modernom pohrebníctve nie je obrázok.');
  return { data, typ };
}

/** Detail pohrebu: polia parte (s pohlavím, ak ho MP pošle).
    Von odchádza LEN to, čo patrí na parte. Ak má kľúč personal:read,
    zvyšok (rodné čísla, adresy, objednávateľ) zostane v pamäti funkcie
    a zahodí sa. */
export async function detailPohrebu(id: string) {
  const r = await volaj(`/funerals/${id}`);
  const p = await r.json() as MpPohreb;
  return { id, snimka: mapujPohreb(p), pohlavieZMp: !!p.d_gender };
}
