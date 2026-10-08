/* Klient API Moderného pohrebníctva (MP). LEN pre server.

   Kľúč MP_API_KEY sa číta za behu (zaBehu), nikdy cez import.meta.env,
   aby ho Vite nevpísal do balíka. Prehliadač ho nikdy nedostane: admin
   volá /api/admin/moderne a ten sa pýta MP.

   API je len na čítanie. Dokumentácia a OpenAPI: h:/ws/paciga/API-moderne.
   Limit MP: 120 požiadaviek za minútu na integráciu.

   FOTKY Z MP SA NEŤAHAJÚ, a to zámerne. MP nemá portrét zosnulého.
   Overené 8. 10. 2026 na 40 pohreboch so skupinou photos:read: fotky majú
   ID decease_photo, grave_before_ceremony, grave_ceremony,
   grave_after_ceremony, grave_exterier_N, grave_damage_N, grave_hole_photo
   a hole_photo. decease_photo NIE JE portrét, je to fotka tela pri
   prevzatí. Na parte nesmie ísť nikdy, ani do skrytého konceptu. Fotku
   na parte pridáva obsluha ručne vo formulári, ako doteraz. */
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
      headers: { Authorization: `Bearer ${kluc}`, Accept: 'application/json' },
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

/** Detail pohrebu: polia parte (s pohlavím, ak ho MP pošle).
    Von odchádza LEN to, čo patrí na parte. Ak má kľúč personal:read,
    zvyšok (rodné čísla, adresy, objednávateľ) zostane v pamäti funkcie
    a zahodí sa. */
export async function detailPohrebu(id: string) {
  const r = await volaj(`/funerals/${id}`);
  const p = await r.json() as MpPohreb;
  return { id, snimka: mapujPohreb(p), pohlavieZMp: !!p.d_gender };
}
