/* Detail zákazky: checklist podľa zákona 131/2010, údaje o zosnulom,
   objednávateľ, parametre, termíny, dokumenty v súkromnom úložisku,
   parte na web a poznámka. Každý panel sa ukladá samostatne. */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import FotoPole from './FotoPole';
import {
  Bunka, HlavaPanelu, Hlaska, Mriezka, Nacitavam, Pole, Prepinac, Ramec,
  Textarea, Tlacidlo, OdkazTlacidlo, Vstup, Vyber,
} from './ui';
import {
  getClient, fmtD, fmtDT, STAVY, POBOCKY, ZDROJE, TYPY_POHREBU,
  DOKUMENT_TYPY, dokumentTypLabel, zmensiFotku, dokumentUrl, uuid,
} from '@/scripts/admin-core.js';

type Riadok = Record<string, any>;

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

/** Panel, ktorý si drží vlastný stav ukladania a hlášku. */
function PanelFormular({ nadpis, popis, onUloz, children, tlacidlo = 'Uložiť' }: {
  nadpis: string; popis?: string; onUloz: () => Promise<string | null>;
  children: React.ReactNode; tlacidlo?: string;
}) {
  const [uklada, setUklada] = useState(false);
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    setUklada(true);
    setChyba(false);
    setHlaska('Ukladám…');
    const chybaText = await onUloz();
    setUklada(false);
    if (chybaText) { setHlaska(chybaText); setChyba(true); return; }
    setHlaska('Uložené.');
    setTimeout(() => setHlaska((h) => (h === 'Uložené.' ? '' : h)), 2500);
  };

  return (
    <Bunka>
      <form onSubmit={odosli}>
        <HlavaPanelu nadpis={nadpis} popis={popis} />
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        <div className="mt-5">
          <Tlacidlo type="submit" maly variant="plne" cakaj={uklada}>{tlacidlo}</Tlacidlo>
        </div>
        <Hlaska text={hlaska} chyba={chyba} />
      </form>
    </Bunka>
  );
}

export function Zakazka() {
  const [z, setZ] = useState<Riadok | null>(null);
  const [chybaNacitania, setChybaNacitania] = useState(false);
  const [kontakty, setKontakty] = useState<Riadok[]>([]);
  const [ukony, setUkony] = useState<Riadok[]>([]);
  const [dokumenty, setDokumenty] = useState<{ zaznam: Riadok; url: string }[]>([]);
  const [parte, setParte] = useState<Riadok | null>(null);
  const [parteHlaska, setParteHlaska] = useState('');
  const [dokTyp, setDokTyp] = useState<string>(DOKUMENT_TYPY[0]?.[0] ?? '');
  const [dokStav, setDokStav] = useState('');
  const [dokChyba, setDokChyba] = useState(false);
  const [dokKluc, setDokKluc] = useState(0);
  const dokFormRef = useRef<HTMLFormElement>(null);

  // rozpracované hodnoty formulárov
  const [zosnuly, setZosnuly] = useState({ zosnuly_meno: '', zosnuly_pohlavie: 'zena', datum_narodenia: '', datum_umrtia: '', miesto_umrtia: '' });
  const [objednavatel, setObjednavatel] = useState({ objednavatel_id: '', vztah: '' });
  const [parametre, setParametre] = useState({ typ: 'pochovanie', zdroj: '', suma: '' });
  const [terminy, setTerminy] = useState({ termin_vyzdvihnutie: '', termin_rakva: '', termin_rozlucka: '', miesto_rozlucky: '', pobocka: '' });
  const [poznamka, setPoznamka] = useState('');

  const nacitajDokumenty = async (zakazkaId: string) => {
    const sb = getClient();
    const { data } = await sb.from('dokumenty').select('*')
      .eq('zakazka_id', zakazkaId).order('created_at', { ascending: false });
    const zoznam = data || [];
    const urls = await Promise.all(zoznam.map((d: Riadok) => dokumentUrl(sb, d.storage_path)));
    setDokumenty(zoznam.map((zaznam: Riadok, i: number) => ({ zaznam, url: urls[i] })));
  };

  const nacitajParte = async (zakazka: Riadok) => {
    if (!zakazka.parte_id) { setParte(null); return; }
    const { data } = await getClient().from('parte').select('*').eq('id', zakazka.parte_id).maybeSingle();
    setParte(data || null);
  };

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { setChybaNacitania(true); return; }
    const sb = getClient();
    (async () => {
      const { data } = await sb.from('zakazky').select('*').eq('id', id).maybeSingle();
      if (!data) { setChybaNacitania(true); return; }
      setZ(data);
      setZosnuly({
        zosnuly_meno: data.zosnuly_meno || '',
        zosnuly_pohlavie: data.zosnuly_pohlavie || 'zena',
        datum_narodenia: data.datum_narodenia || '',
        datum_umrtia: data.datum_umrtia || '',
        miesto_umrtia: data.miesto_umrtia || '',
      });
      setObjednavatel({ objednavatel_id: data.objednavatel_id || '', vztah: data.vztah || '' });
      setParametre({ typ: data.typ || 'pochovanie', zdroj: data.zdroj || '', suma: data.suma ?? '' });
      setTerminy({
        termin_vyzdvihnutie: data.termin_vyzdvihnutie || '',
        termin_rakva: data.termin_rakva || '',
        termin_rozlucka: data.termin_rozlucka || '',
        miesto_rozlucky: data.miesto_rozlucky || '',
        pobocka: data.pobocka || '',
      });
      setPoznamka(data.poznamka || '');

      const [k, u] = await Promise.all([
        sb.from('kontakty').select('*').order('meno'),
        sb.from('ukony').select('*').eq('zakazka_id', data.id).order('poradie'),
      ]);
      setKontakty(k.data || []);
      setUkony(u.data || []);
      await nacitajDokumenty(data.id);
      await nacitajParte(data);
    })().catch(() => setChybaNacitania(true));
  }, []);

  /** Uloží stĺpce do zákazky a premietne ich do lokálneho stavu. */
  const uloz = async (zmeny: Riadok): Promise<string | null> => {
    if (!z) return 'Zákazka nie je načítaná.';
    const { error } = await getClient().from('zakazky').update(zmeny).eq('id', z.id);
    if (error) return 'Chyba: ' + error.message;
    setZ({ ...z, ...zmeny });
    return null;
  };

  const prepniUkon = async (u: Riadok) => {
    const hotovo = !u.hotovo;
    setUkony((zoznam) => zoznam.map((x) => (x.id === u.id ? { ...x, hotovo } : x)));
    await getClient().from('ukony').update({ hotovo }).eq('id', u.id);
  };

  const nahrajDokument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!z) return;
    const vstup = dokFormRef.current?.elements.namedItem('subor') as HTMLInputElement | null;
    const file = vstup?.files?.[0];
    if (!file) { setDokStav('Najprv vyber fotku alebo scan.'); setDokChyba(true); return; }
    setDokChyba(false);
    setDokStav('Nahrávam…');
    try {
      const sb = getClient();
      const blob = await zmensiFotku(file, 1400);
      const cesta = `${z.id}/${Date.now()}.webp`;
      const { error: upErr } = await sb.storage.from('dokumenty').upload(cesta, blob, { contentType: 'image/webp' });
      if (upErr) throw new Error(upErr.message);
      const { error } = await sb.from('dokumenty').insert({
        id: uuid(),
        zakazka_id: z.id,
        typ: dokTyp,
        nazov: `${dokumentTypLabel(dokTyp)} — ${z.zosnuly_meno || z.cislo}`,
        storage_path: cesta,
      });
      if (error) throw new Error(error.message);
      setDokStav('');
      setDokKluc((k) => k + 1); // remount poľa na doklad, nech zabudne náhľad
      await nacitajDokumenty(z.id);
    } catch (err: any) {
      setDokStav('Nepodarilo sa nahrať: ' + (err?.message || err));
      setDokChyba(true);
    }
  };

  const vymazDokument = async (zaznam: Riadok) => {
    if (!confirm('Naozaj vymazať tento dokument?')) return;
    const sb = getClient();
    await sb.storage.from('dokumenty').remove([zaznam.storage_path]);
    await sb.from('dokumenty').delete().eq('id', zaznam.id);
    if (z) await nacitajDokumenty(z.id);
  };

  const vytvorParte = async () => {
    if (!z) return;
    const sb = getClient();
    setParteHlaska('Vytváram parte…');
    try {
      let slug = slugify(z.zosnuly_meno);
      for (let i = 2; i < 20; i++) {
        const { data: exist } = await sb.from('parte').select('id').eq('slug', slug).maybeSingle();
        if (!exist) break;
        slug = `${slugify(z.zosnuly_meno)}-${i}`;
      }
      let vek: number | null = null;
      if (z.datum_narodenia && z.datum_umrtia) {
        const n = new Date(z.datum_narodenia), u = new Date(z.datum_umrtia);
        vek = u.getFullYear() - n.getFullYear();
        if (u.getMonth() < n.getMonth() || (u.getMonth() === n.getMonth() && u.getDate() < n.getDate())) vek--;
      }
      const parteId = uuid();
      const [rd, rc] = String(z.termin_rozlucka || 'T').split('T');
      const { error } = await sb.from('parte').insert({
        id: parteId, slug,
        meno: z.zosnuly_meno,
        pohlavie: z.zosnuly_pohlavie || 'zena',
        datum_narodenia: z.datum_narodenia,
        datum_umrtia: z.datum_umrtia,
        vek,
        rozlucka_datum: rd || null,
        rozlucka_cas: rc || null,
        rozlucka_miesto: z.miesto_rozlucky || null,
        published: false,
      });
      if (error) throw new Error(error.message);
      await sb.from('zakazky').update({ parte_id: parteId }).eq('id', z.id);
      const nova = { ...z, parte_id: parteId };
      setZ(nova);
      setParteHlaska('');
      await nacitajParte(nova);
    } catch (err: any) {
      setParteHlaska('Nepodarilo sa vytvoriť parte: ' + (err?.message || err));
    }
  };

  const vymazZakazku = async () => {
    if (!z) return;
    const otazka = `Naozaj vymazať zákazku ${z.cislo || ''} (${z.zosnuly_meno || 'bez mena'})? ` +
      'Vymaže sa aj checklist a dokumenty. Parte na webe ostane.';
    if (!confirm(otazka)) return;
    await getClient().from('zakazky').delete().eq('id', z.id);
    location.href = '/admin/zakazky';
  };

  if (chybaNacitania) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold tracking-tight">Zákazka sa nenašla</h1>
        <div><OdkazTlacidlo href="/admin/zakazky"><ArrowLeft className="size-4" /> Späť na zákazky</OdkazTlacidlo></div>
      </div>
    );
  }
  if (!z) return <Ramec><Bunka><Nacitavam /></Bunka></Ramec>;

  const hotovo = ukony.filter((u) => u.hotovo).length;
  const kontakt = kontakty.find((k) => k.id === objednavatel.objednavatel_id);
  const chybaKParte = [
    !z.zosnuly_meno ? 'meno zosnulého' : null,
    !z.datum_umrtia ? 'dátum úmrtia' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-5">
      <a href="/admin/zakazky" className="flex w-fit items-center gap-1.5 text-[13.5px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Všetky zákazky
      </a>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold leading-tight tracking-tight">{z.zosnuly_meno || 'Bez mena'}</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {[z.cislo, z.datum_umrtia ? `† ${fmtD(z.datum_umrtia)}` : null, z.pobocka,
              `založená ${fmtDT(z.created_at)}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
          Stav
          <select
            value={z.stav}
            onChange={async (e) => {
              const stav = e.target.value;
              setZ({ ...z, stav });
              await getClient().from('zakazky').update({ stav }).eq('id', z.id);
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-[13.5px] font-semibold text-foreground outline-none [color-scheme:dark] focus:border-foreground/30"
          >
            {STAVY.map((s: { key: string; label: string }) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <Ramec>
        <Bunka>
          <HlavaPanelu nadpis="Postup vybavenia" popis={`${hotovo} z ${ukony.length} krokov hotových`} />
          <span className="block h-1 overflow-hidden rounded-full bg-border">
            <span className="block h-full rounded-full bg-foreground/75"
              style={{ width: ukony.length ? `${Math.round((hotovo / ukony.length) * 100)}%` : '0%' }} />
          </span>
          <ul className="mt-4 divide-y divide-border">
            {ukony.map((u) => (
              <li key={u.id}>
                <label className="flex cursor-pointer items-center gap-3 py-2.5 text-[14.5px]">
                  <input type="checkbox" className="size-4 shrink-0 accent-white"
                    checked={!!u.hotovo} onChange={() => prepniUkon(u)} />
                  <span className={u.hotovo ? 'text-muted-foreground line-through' : ''}>{u.nazov}</span>
                </label>
              </li>
            ))}
          </ul>
        </Bunka>
      </Ramec>

      <Ramec>
        <Mriezka stlpce="lg:grid-cols-2">
          <PanelFormular
            nadpis="Zosnulý"
            onUloz={() => uloz({
              zosnuly_meno: zosnuly.zosnuly_meno.trim(),
              zosnuly_pohlavie: zosnuly.zosnuly_pohlavie,
              datum_narodenia: zosnuly.datum_narodenia || null,
              datum_umrtia: zosnuly.datum_umrtia || null,
              miesto_umrtia: zosnuly.miesto_umrtia.trim() || null,
            })}
          >
            <Pole popis="Meno a priezvisko" className="sm:col-span-2">
              <Vstup required maxLength={120} value={zosnuly.zosnuly_meno}
                onChange={(e) => setZosnuly({ ...zosnuly, zosnuly_meno: e.target.value })} />
            </Pole>
            <Pole popis="Pohlavie" className="sm:col-span-2">
              <Prepinac moznosti={[{ key: 'zena', label: 'žena' }, { key: 'muz', label: 'muž' }]}
                hodnota={zosnuly.zosnuly_pohlavie}
                onZmena={(k) => setZosnuly({ ...zosnuly, zosnuly_pohlavie: k })} />
            </Pole>
            <Pole popis="Dátum narodenia">
              <Vstup type="date" value={zosnuly.datum_narodenia}
                onChange={(e) => setZosnuly({ ...zosnuly, datum_narodenia: e.target.value })} />
            </Pole>
            <Pole popis="Dátum úmrtia">
              <Vstup type="date" value={zosnuly.datum_umrtia}
                onChange={(e) => setZosnuly({ ...zosnuly, datum_umrtia: e.target.value })} />
            </Pole>
            <Pole popis="Miesto úmrtia" className="sm:col-span-2">
              <Vstup maxLength={200} value={zosnuly.miesto_umrtia}
                onChange={(e) => setZosnuly({ ...zosnuly, miesto_umrtia: e.target.value })} />
            </Pole>
          </PanelFormular>

          <PanelFormular
            nadpis="Objednávateľ"
            onUloz={() => uloz({
              objednavatel_id: objednavatel.objednavatel_id || null,
              vztah: objednavatel.vztah.trim() || null,
            })}
          >
            <Pole popis="Kontakt" className="sm:col-span-2">
              <Vyber value={objednavatel.objednavatel_id}
                onChange={(e) => setObjednavatel({ ...objednavatel, objednavatel_id: e.target.value })}>
                <option value="">— nevybraný —</option>
                {kontakty.map((k) => (
                  <option key={k.id} value={k.id}>{k.meno}{k.telefon ? ` · ${k.telefon}` : ''}</option>
                ))}
              </Vyber>
            </Pole>
            {kontakt && (
              <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground sm:col-span-2">
                {kontakt.telefon && <a href={`tel:${kontakt.telefon}`} className="hover:text-foreground">{kontakt.telefon}</a>}
                {kontakt.email && <span>{kontakt.email}</span>}
                <a href={`/admin/kontakty?id=${kontakt.id}`} className="hover:text-foreground">detail kontaktu →</a>
              </p>
            )}
            <Pole popis="Vzťah k zosnulému" className="sm:col-span-2">
              <Vstup maxLength={60} placeholder="napr. dcéra" value={objednavatel.vztah}
                onChange={(e) => setObjednavatel({ ...objednavatel, vztah: e.target.value })} />
            </Pole>
          </PanelFormular>
        </Mriezka>

        <Mriezka stlpce="lg:grid-cols-2" horna>
          <PanelFormular
            nadpis="Parametre zákazky"
            onUloz={() => uloz({
              typ: parametre.typ,
              zdroj: parametre.zdroj || null,
              suma: parametre.suma ? Number(parametre.suma) : null,
            })}
          >
            <Pole popis="Typ pohrebu" className="sm:col-span-2">
              <Prepinac moznosti={TYPY_POHREBU.map((t: { key: string; label: string }) => ({ key: t.key, label: t.label.toLowerCase() }))}
                hodnota={parametre.typ} onZmena={(k) => setParametre({ ...parametre, typ: k })} />
            </Pole>
            <Pole popis="Zdroj zákazky">
              <Vyber value={parametre.zdroj} onChange={(e) => setParametre({ ...parametre, zdroj: e.target.value })}>
                <option value="">— neuvedený —</option>
                {ZDROJE.map((zd: { key: string; label: string }) => <option key={zd.key} value={zd.key}>{zd.label}</option>)}
              </Vyber>
            </Pole>
            <Pole popis="Suma zákazky (€)">
              <Vstup type="number" min={0} step={10} value={parametre.suma}
                onChange={(e) => setParametre({ ...parametre, suma: e.target.value })} />
            </Pole>
          </PanelFormular>

          <PanelFormular
            nadpis="Termíny"
            tlacidlo="Uložiť termíny"
            onUloz={() => uloz({
              termin_vyzdvihnutie: terminy.termin_vyzdvihnutie || null,
              termin_rakva: terminy.termin_rakva || null,
              termin_rozlucka: terminy.termin_rozlucka || null,
              miesto_rozlucky: terminy.miesto_rozlucky.trim() || null,
              pobocka: terminy.pobocka || null,
            })}
          >
            <Pole popis="Vyzdvihnutie zosnulého">
              <Vstup type="datetime-local" value={terminy.termin_vyzdvihnutie}
                onChange={(e) => setTerminy({ ...terminy, termin_vyzdvihnutie: e.target.value })} />
            </Pole>
            <Pole popis="Dovoz rakvy">
              <Vstup type="datetime-local" value={terminy.termin_rakva}
                onChange={(e) => setTerminy({ ...terminy, termin_rakva: e.target.value })} />
            </Pole>
            <Pole popis="Posledná rozlúčka">
              <Vstup type="datetime-local" value={terminy.termin_rozlucka}
                onChange={(e) => setTerminy({ ...terminy, termin_rozlucka: e.target.value })} />
            </Pole>
            <Pole popis="Pobočka">
              <Vyber value={terminy.pobocka} onChange={(e) => setTerminy({ ...terminy, pobocka: e.target.value })}>
                <option value="">— vyber —</option>
                {POBOCKY.map((p: string) => <option key={p} value={p}>{p}</option>)}
              </Vyber>
            </Pole>
            <Pole popis="Miesto rozlúčky" className="sm:col-span-2">
              <Vstup maxLength={200} placeholder="napr. Dom smútku v Poprade" value={terminy.miesto_rozlucky}
                onChange={(e) => setTerminy({ ...terminy, miesto_rozlucky: e.target.value })} />
            </Pole>
          </PanelFormular>
        </Mriezka>
      </Ramec>

      <Ramec>
        <Bunka>
          <HlavaPanelu nadpis="Dokumenty"
            popis="Odfoť alebo naskenuj doklady — uložia sa do súkromného úložiska k zákazke." />
          <form ref={dokFormRef} onSubmit={nahrajDokument}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Pole popis="Typ dokladu">
                <Vyber value={dokTyp} onChange={(e) => setDokTyp(e.target.value)}>
                  {DOKUMENT_TYPY.map(([key, label]: [string, string]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </Vyber>
              </Pole>
              <div className="flex items-end">
                <Tlacidlo type="submit" variant="plne">Nahrať dokument</Tlacidlo>
              </div>
            </div>
            <div className="mt-4">
              <FotoPole key={dokKluc} name="subor" popis="Odfoť alebo naskenuj doklad. Zmenší sa sám." />
            </div>
          </form>
          <Hlaska text={dokStav} chyba={dokChyba} />

          {dokumenty.length === 0 ? (
            <p className="mt-4 text-[14px] text-muted-foreground">Zatiaľ žiadne dokumenty.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {dokumenty.map(({ zaznam, url }) => (
                <div key={zaznam.id} className="overflow-hidden rounded-md border border-border">
                  <a href={url} target="_blank" rel="noopener" className="block aspect-[3/4] bg-secondary">
                    <img src={url} alt="" loading="lazy" className="size-full object-cover" />
                  </a>
                  <div className="p-2.5">
                    <p className="text-[12.5px] font-semibold">{dokumentTypLabel(zaznam.typ)}</p>
                    <p className="text-[11.5px] text-muted-foreground">{fmtDT(zaznam.created_at)}</p>
                    <Tlacidlo maly variant="nebezpecne" className="mt-2 w-full"
                      onClick={() => vymazDokument(zaznam)}>Vymazať</Tlacidlo>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Bunka>
      </Ramec>

      <Ramec>
        <Bunka>
          <HlavaPanelu nadpis="Parte na webe" />
          {parte ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[14.5px] font-semibold">
                  {parte.meno}
                  {!parte.published && <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">skryté</span>}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {parte.published ? 'Zverejnené na webe.' : 'Zatiaľ skryté — zverejniť ho vieš v sekcii Parte a dopyty.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <OdkazTlacidlo maly href={`/parte/${parte.slug}`} target="_blank" rel="noopener">Zobraziť parte</OdkazTlacidlo>
                <OdkazTlacidlo maly href="/admin/web">Upraviť v správe webu</OdkazTlacidlo>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-3 text-[13.5px] text-muted-foreground">
                {chybaKParte.length
                  ? `Na vytvorenie parte doplň: ${chybaKParte.join(', ')}.`
                  : 'Z údajov zákazky sa vytvorí parte. Zverejníš ho potom v sekcii Parte a dopyty.'}
              </p>
              <Tlacidlo variant="plne" maly disabled={chybaKParte.length > 0} onClick={vytvorParte}>
                Vytvoriť parte z tejto zákazky
              </Tlacidlo>
              <Hlaska text={parteHlaska} chyba={parteHlaska.startsWith('Nepodarilo')} />
            </>
          )}
        </Bunka>
      </Ramec>

      <Ramec>
        <PanelFormular
          nadpis="Poznámka"
          tlacidlo="Uložiť poznámku"
          onUloz={() => uloz({ poznamka: poznamka.trim() || null })}
        >
          <div className="sm:col-span-2">
            <Textarea rows={3} maxLength={4000} value={poznamka} onChange={(e) => setPoznamka(e.target.value)} />
          </div>
        </PanelFormular>
      </Ramec>

      <div className="pt-2">
        <Tlacidlo variant="nebezpecne" onClick={vymazZakazku}>Vymazať zákazku</Tlacidlo>
      </div>
    </div>
  );
}

export default Zakazka;
