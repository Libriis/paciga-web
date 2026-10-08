/* Synchronizácia parte z Moderného pohrebníctva (MP): /admin/parte/synchronizovat

   Obsluha vyplní pohreb v MP, tu ho zaškrtne a klikne „Natiahnuť vybrané".
   Z každého vybraného pohrebu vznikne parte VŽDY SKRYTÉ. Zverejní ho
   človek ručne v zozname parte, lebo niektoré rodiny parte na webe nechcú.

   Pravidlá (dohodnuté 8. 10. 2026):
   - Obsluha vyberá, nič sa nenaťahuje samo.
   - Skrytý koncept sa pri ďalšej synchronizácii aktualizuje, ale len v
     poliach, ktoré nikto ručne neopravil (zlucZmeny). Zverejnené parte
     sa už nemení nikdy.
   - Parte, ktoré už niekto pridal ručne (rovnaké meno a deň úmrtia),
     sa nezakladá druhýkrát.

   Do databázy zapisuje prehliadač pod prihlásením obsluhy, ako zvyšok
   adminu. Server (/api/admin/moderne) len drží kľúč k MP a prekladá. */
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Bunka, HlavaStranky, Hlaska, Nacitavam, OdkazTlacidlo, Prazdno, Ramec, Stitok, Tlacidlo,
} from './ui';
import { getClient, fmtD } from '@/scripts/admin-core.js';
import {
  menoNaPorovnanie, slugify, zlucZmeny, zmenenyVMp, type Snimka,
} from '@/lib/moderne-mapa';

const ZOZNAM = '/admin/parte';
const FORMULAR = '/admin/parte/upravit';
/** MP pustí 120 požiadaviek za minútu. Jeden pohreb ich stojí do štyroch. */
const MAX_NARAZ = 20;

type Polozka = { id: string; snimka: Snimka; variant: string | null };
type Prepojenie = {
  mp_id: string; parte_id: string; snimka: Partial<Snimka>;
  parte: { id: string; published: boolean } | null;
};
type Stav =
  | { druh: 'nove' }
  | { druh: 'koncept'; parteId: string; zmenene: boolean }
  | { druh: 'zverejnene'; parteId: string }
  | { druh: 'rucne'; parteId: string }
  | { druh: 'bez-umrtia' };
type Vysledok = { chyba: boolean; text: string; parteId?: string };

const NAZVY_POLI: Record<string, string> = {
  meno: 'meno', pohlavie: 'pohlavie', datum_narodenia: 'narodenie', datum_umrtia: 'úmrtie',
  vek: 'vek', rozlucka_datum: 'deň rozlúčky', rozlucka_cas: 'čas rozlúčky',
  rozlucka_miesto: 'miesto rozlúčky', miesto_pohrebu: 'miesto pohrebu', foto_url: 'fotka',
};

async function api(parametre: string): Promise<Response> {
  const { data: { session } } = await getClient().auth.getSession();
  if (!session) throw new Error('Prihlásenie vypršalo. Obnov stránku.');
  return fetch(`/api/admin/moderne${parametre}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
}

async function apiJson<T>(parametre: string): Promise<T> {
  const r = await api(parametre);
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error || 'Moderné pohrebníctvo neodpovedá.');
  return j as T;
}

/** Voľná webová adresa: meno, potom meno-rok úmrtia, potom meno-2, -3… */
async function volnySlug(meno: string, datumUmrtia: string) {
  const zaklad = slugify(meno).slice(0, 70);
  if (!zaklad) throw new Error('Pohreb nemá meno, z ktorého by vznikla webová adresa.');
  const { data, error } = await getClient().from('parte').select('slug').like('slug', `${zaklad}%`);
  if (error) throw new Error(error.message);
  const obsadene = new Set((data || []).map((r: { slug: string }) => r.slug));
  const kandidati = [zaklad, `${zaklad}-${datumUmrtia.slice(0, 4)}`];
  for (let i = 2; i < 50; i++) kandidati.push(`${zaklad}-${i}`);
  const volny = kandidati.find((s) => !obsadene.has(s));
  if (!volny) throw new Error('Nenašla sa voľná webová adresa.');
  return volny;
}

/** Stiahne portrét cez náš server a nahrá ho do úložiska parte. */
async function nahrajPortret(mpId: string, fotoId: string, slug: string) {
  const r = await api(`?id=${mpId}&foto=${encodeURIComponent(fotoId)}`);
  if (!r.ok) {
    const j = await r.json().catch(() => null);
    throw new Error(j?.error || 'Fotku sa nepodarilo stiahnuť.');
  }
  const blob = await r.blob();
  const sb = getClient();
  const cesta = `${slug}-${Date.now()}.webp`;
  const { error } = await sb.storage.from('parte-foto').upload(cesta, blob, { contentType: 'image/webp' });
  if (error) throw new Error('Fotku sa nepodarilo nahrať: ' + error.message);
  return sb.storage.from('parte-foto').getPublicUrl(cesta).data.publicUrl as string;
}

type Detail = {
  snimka: Snimka; foto: 'ok' | 'bez-opravnenia' | 'nenajdena'; fotoId: string | null;
};

const POZNAMKA_FOTKY: Record<Detail['foto'], string> = {
  ok: '',
  'bez-opravnenia': ' Fotka nie: kľúč k MP nemá oprávnenie na fotky.',
  nenajdena: ' Fotka nie: v MP nie je portrét.',
};

/** Spracuje jeden pohreb: založí nové skryté parte alebo aktualizuje koncept. */
async function spracuj(mpId: string): Promise<Vysledok> {
  const sb = getClient();
  const detail = await apiJson<Detail>(`?id=${mpId}`);
  const nova = detail.snimka;
  if (!nova.datum_umrtia) return { chyba: true, text: 'V MP chýba dátum úmrtia. Doplň ho tam.' };

  // Čerstvý stav z databázy. Zoznam na obrazovke mohol medzitým zostarnúť.
  const { data: link, error: le } = await sb.from('parte_moderne')
    .select('parte_id, snimka').eq('mp_id', mpId).maybeSingle();
  if (le) throw new Error(le.message);

  if (link) {
    const { data: parte, error: pe } = await sb.from('parte').select('*').eq('id', link.parte_id).maybeSingle();
    if (pe || !parte) throw new Error(pe?.message || 'Prepojené parte sa nenašlo.');
    if (parte.published) {
      return { chyba: false, text: 'Parte je zverejnené, nemením ho.', parteId: parte.id };
    }
    const zmeny: Record<string, unknown> = zlucZmeny(parte, link.snimka || {}, nova);
    let poznamka = '';
    if (!parte.foto_url && detail.foto === 'ok' && detail.fotoId) {
      zmeny.foto_url = await nahrajPortret(mpId, detail.fotoId, parte.slug);
    } else if (!parte.foto_url) {
      poznamka = POZNAMKA_FOTKY[detail.foto];
    }
    if (Object.keys(zmeny).length) {
      const { error } = await sb.from('parte').update(zmeny).eq('id', parte.id);
      if (error) throw new Error(error.message);
    }
    const { error: se } = await sb.from('parte_moderne')
      .update({ snimka: nova, synchronizovane_at: new Date().toISOString() }).eq('mp_id', mpId);
    if (se) throw new Error(se.message);
    const polia = Object.keys(zmeny).map((k) => NAZVY_POLI[k] || k);
    return {
      chyba: false,
      parteId: parte.id,
      text: (polia.length ? `Aktualizované: ${polia.join(', ')}.` : 'Bez zmien.') + poznamka,
    };
  }

  // Nové parte. Najprv adresa a fotka, potom záznam, nakoniec prepojenie.
  const slug = await volnySlug(nova.meno, nova.datum_umrtia);
  let foto_url: string | null = null;
  if (detail.foto === 'ok' && detail.fotoId) foto_url = await nahrajPortret(mpId, detail.fotoId, slug);

  const { data: nove, error: ie } = await sb.from('parte').insert({
    ...nova,
    slug,
    foto_url,
    odkaz_rodine: null,
    // Nikdy nie true. Zverejnenie je ručné rozhodnutie obsluhy.
    published: false,
  }).select('id').single();
  if (ie || !nove) throw new Error(ie?.code === '23505' ? 'Webová adresa je obsadená, skús znova.' : ie?.message || 'Parte sa nepodarilo založiť.');

  const { error: pe } = await sb.from('parte_moderne').insert({ parte_id: nove.id, mp_id: mpId, snimka: nova });
  if (pe) {
    // Bez prepojenia by ďalšia synchronizácia založila duplikát. Radšej späť.
    await sb.from('parte').delete().eq('id', nove.id);
    throw new Error(pe.code === '23505'
      ? 'Tento pohreb medzitým natiahol niekto iný.'
      : 'Parte sa nepodarilo prepojiť s MP: ' + pe.message);
  }
  return {
    chyba: false,
    parteId: nove.id,
    text: 'Vytvorené ako skryté.' + (foto_url ? ' S fotkou.' : POZNAMKA_FOTKY[detail.foto]),
  };
}

export function ParteSync() {
  const [polozky, setPolozky] = useState<Polozka[] | null>(null);
  const [dalsi, setDalsi] = useState<string | null>(null);
  const [stavy, setStavy] = useState<Record<string, Stav>>({});
  const [vybrane, setVybrane] = useState<Set<string>>(new Set());
  const [vysledky, setVysledky] = useState<Record<string, Vysledok>>({});
  const [chybaNacitania, setChybaNacitania] = useState('');
  const [nacitavaDalsie, setNacitavaDalsie] = useState(false);
  const [bezi, setBezi] = useState(false);
  const [hlaska, setHlaska] = useState('');

  /** Stav každého pohrebu podľa databázy webu. */
  const zistiStavy = async (zoznam: Polozka[]) => {
    const sb = getClient();
    const ids = zoznam.map((p) => p.id);
    const datumy = [...new Set(zoznam.map((p) => p.snimka.datum_umrtia).filter(Boolean))];
    const [{ data: linky, error: le }, { data: parte, error: pe }] = await Promise.all([
      sb.from('parte_moderne').select('mp_id, parte_id, snimka, parte(id, published)').in('mp_id', ids),
      sb.from('parte').select('id, meno, datum_umrtia').in('datum_umrtia', datumy),
    ]);
    if (le || pe) throw new Error((le || pe)!.message);

    const podlaMp = new Map((linky as Prepojenie[] || []).map((l) => [l.mp_id, l]));
    const prepojeneParte = new Set((linky as Prepojenie[] || []).map((l) => l.parte_id));
    const s: Record<string, Stav> = {};
    for (const p of zoznam) {
      const l = podlaMp.get(p.id);
      if (l?.parte) {
        s[p.id] = l.parte.published
          ? { druh: 'zverejnene', parteId: l.parte_id }
          : { druh: 'koncept', parteId: l.parte_id, zmenene: zmenenyVMp(l.snimka, p.snimka) };
        continue;
      }
      if (!p.snimka.datum_umrtia) { s[p.id] = { druh: 'bez-umrtia' }; continue; }
      const rucne = (parte || []).find((r: { id: string; meno: string; datum_umrtia: string }) =>
        !prepojeneParte.has(r.id)
        && r.datum_umrtia === p.snimka.datum_umrtia
        && menoNaPorovnanie(r.meno) === menoNaPorovnanie(p.snimka.meno));
      s[p.id] = rucne ? { druh: 'rucne', parteId: rucne.id } : { druh: 'nove' };
    }
    return s;
  };

  const nacitaj = async (kurzor: string | null) => {
    const q = kurzor ? `?cursor=${encodeURIComponent(kurzor)}` : '';
    const j = await apiJson<{ polozky: Polozka[]; dalsi: string | null }>(q);
    const noveStavy = await zistiStavy(j.polozky);
    setPolozky((p) => [...(kurzor ? p || [] : []), ...j.polozky]);
    setStavy((s) => ({ ...(kurzor ? s : {}), ...noveStavy }));
    setDalsi(j.dalsi);
    // Koncepty, ktoré sa v MP zmenili, predvyberieme. Nové nie: vyberá človek.
    setVybrane((v) => {
      const n = new Set(kurzor ? v : []);
      for (const [id, st] of Object.entries(noveStavy)) if (st.druh === 'koncept' && st.zmenene) n.add(id);
      return n;
    });
  };

  useEffect(() => {
    nacitaj(null).catch((e) => setChybaNacitania(e?.message || 'Zoznam sa nepodarilo načítať.'));
  }, []);

  const nacitajStarsie = async () => {
    setNacitavaDalsie(true);
    try { await nacitaj(dalsi); } catch (e: any) { setHlaska(e?.message || 'Nepodarilo sa načítať.'); }
    setNacitavaDalsie(false);
  };

  const prepni = (id: string) => setVybrane((v) => {
    const n = new Set(v);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const natiahni = async () => {
    const zoznam = (polozky || []).filter((p) => vybrane.has(p.id));
    if (!zoznam.length) return;
    setBezi(true);
    let ok = 0;
    for (const [i, p] of zoznam.entries()) {
      setHlaska(`Spracúvam ${i + 1} z ${zoznam.length}: ${p.snimka.meno}…`);
      let v: Vysledok;
      try { v = await spracuj(p.id); } catch (e: any) { v = { chyba: true, text: e?.message || 'Nepodarilo sa.' }; }
      if (!v.chyba) ok++;
      setVysledky((r) => ({ ...r, [p.id]: v }));
    }
    // Stav len spracovaných: celý zoznam po „Načítať staršie" by bol pre URL priveľký.
    try {
      const noveStavy = await zistiStavy(zoznam);
      setStavy((s) => ({ ...s, ...noveStavy }));
    } catch { /* stavy ostanú staré, výsledok je pri riadku */ }
    setVybrane(new Set());
    setHlaska(`Hotovo: ${ok} z ${zoznam.length}. Nové parte sú skryté. Skontroluj ich a zverejni v zozname parte.`);
    setBezi(false);
  };

  const pocet = vybrane.size;
  const privela = pocet > MAX_NARAZ;

  const stitok = (st: Stav | undefined) => {
    if (!st) return null;
    switch (st.druh) {
      case 'nove': return <Stitok ton="ceka">nové</Stitok>;
      case 'koncept': return <Stitok ton={st.zmenene ? 'ceka' : 'skryte'}>{st.zmenene ? 'koncept, zmenené v MP' : 'koncept na webe'}</Stitok>;
      case 'zverejnene': return <Stitok ton="hotovo">zverejnené</Stitok>;
      case 'rucne': return <Stitok>už na webe, pridané ručne</Stitok>;
      case 'bez-umrtia': return <Stitok>v MP chýba dátum úmrtia</Stitok>;
    }
  };

  const daSaVybrat = (st: Stav | undefined) => st?.druh === 'nove' || st?.druh === 'koncept';

  const akcia = (
    <Tlacidlo variant="plne" onClick={natiahni} cakaj={bezi} disabled={!pocet || privela}>
      <RefreshCw className="size-4" /> Natiahnuť vybrané{pocet ? ` (${pocet})` : ''}
    </Tlacidlo>
  );

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis="Synchronizácia z Moderného pohrebníctva"
        popis="Vyber pohreby, z ktorých má vzniknúť parte. Parte vznikne skryté. Zverejníš ho v zozname parte."
        akcie={<OdkazTlacidlo href={ZOZNAM}>Späť na zoznam parte</OdkazTlacidlo>}
      />

      <Ramec>
        {chybaNacitania ? (
          <Bunka><Prazdno text={chybaNacitania} /></Bunka>
        ) : polozky === null ? (
          <Bunka><Nacitavam text="Načítavam pohreby z Moderného pohrebníctva…" /></Bunka>
        ) : polozky.length === 0 ? (
          <Bunka><Prazdno text="V Modernom pohrebníctve nie je žiadny aktívny pohreb." /></Bunka>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-border">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-background p-4">
              <p className="text-[13px] text-muted-foreground">
                Najnovšie pohreby sú hore. {privela && `Naraz najviac ${MAX_NARAZ}, odznač ${pocet - MAX_NARAZ}.`}
              </p>
              {akcia}
            </div>
            {polozky.map((p) => {
              const st = stavy[p.id];
              const s = p.snimka;
              const v = vysledky[p.id];
              const parteId = v?.parteId || (st && 'parteId' in st ? st.parteId : undefined);
              return (
                <label key={p.id}
                  className={`flex flex-wrap items-center gap-4 bg-background p-4 ${daSaVybrat(st) ? 'cursor-pointer' : 'opacity-60'}`}>
                  <input type="checkbox" className="size-4 shrink-0 accent-white"
                    disabled={!daSaVybrat(st) || bezi}
                    checked={vybrane.has(p.id)} onChange={() => prepni(p.id)} />
                  <div className="min-w-40 flex-1">
                    <p className="text-[14.5px] font-semibold">{s.meno || 'Bez mena'}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                      {stitok(st)}
                      {s.datum_umrtia && <span>† {fmtD(s.datum_umrtia)}</span>}
                      {s.rozlucka_datum
                        ? <span>rozlúčka {fmtD(s.rozlucka_datum)}{s.rozlucka_cas ? ` o ${s.rozlucka_cas}` : ''}{s.rozlucka_miesto ? `, ${s.rozlucka_miesto}` : ''}</span>
                        : <span>rozlúčka zatiaľ bez termínu</span>}
                    </p>
                    {v && (
                      <p className={`mt-1.5 text-[13px] ${v.chyba ? 'text-[#d18a8a]' : 'text-[#6bbf8a]'}`}>{v.text}</p>
                    )}
                  </div>
                  {parteId && (
                    <OdkazTlacidlo maly href={`${FORMULAR}?id=${parteId}`}>Otvoriť parte</OdkazTlacidlo>
                  )}
                </label>
              );
            })}
            {dalsi && (
              <div className="bg-background p-4 text-center">
                <Tlacidlo onClick={nacitajStarsie} cakaj={nacitavaDalsie}>Načítať staršie pohreby</Tlacidlo>
              </div>
            )}
          </div>
        )}
      </Ramec>
      <Hlaska text={hlaska} />
    </div>
  );
}

export default ParteSync;
