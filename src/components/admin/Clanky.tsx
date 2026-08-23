/* Aktuality: zoznam článkov a ich editor.
   Telo článku a titulná fotka sú samostatné ostrovy (EditorClanku, FotoPole).
   Oba sú neriadené, preto ich pri prepnutí článku remountujeme cez `key`. */
import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import FotoPole from './FotoPole';
import EditorClanku from './EditorClanku';
import {
  Bunka, HlavaPanelu, HlavaStranky, Hlaska, Nacitavam, Pole, Prazdno,
  Ramec, Stitok, Textarea, Tlacidlo, OdkazTlacidlo, Vstup, Vyber,
} from './ui';
import { getClient, zmensiFotku, DEMO } from '@/scripts/admin-core.js';
import { CLANKY as STARE } from '@/data/aktuality';
import staticke from '@/data/staticke-obrazky.json';

type Clanok = Record<string, any>;

const KATEGORIE: Record<string, string> = {
  'prve-kroky': 'Prvé kroky',
  'smutok': 'Smútok a spomínanie',
  'planovanie': 'Plánovanie vopred',
  'sperky': 'Spomienkové šperky',
  'zo-zivota': 'Zo života Paciga',
};

const PRAZDNY = {
  id: '', titulok: '', slug: '', kategoria: 'prve-kroky', datum: '', published: 'true',
  perex: '', foto_alt: '', telo: '', foto_url: null as string | null,
  cta_nadpis: '', cta_text: '', cta_odkaz: '', cta_odkaz_text: '',
};

/** Titulok na adresu článku: bez diakritiky, malé písmená, spojovníky. */
const naSlug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

const fmtDatum = (iso: string) => {
  const M = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const [r, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return r ? `${d}. ${M[m - 1]} ${r}` : '—';
};

/* Textarea drží odstavce oddelené prázdnym riadkom, databáza pole reťazcov. */
const naPole = (t: string) => t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
const zPola = (p: unknown) => (Array.isArray(p) ? p : []).join('\n\n');

/* Importované články majú foto_url na '/assets/nieco.jpg'. Tá cesta od
   presunu fotiek do src/assets vracia 404, web si ju prekladá cez mapu.
   Bez toho istého prekladu by boli náhľady v zozname prázdne štvorčeky. */
function naNahlad(url: string | null) {
  if (!url) return null;
  const z = (staticke as Record<string, { zaklad: string; sirky: number[] }>)[url];
  if (!z) return url;
  const w = z.sirky.includes(480) ? 480 : z.sirky[0];
  return `/clanky/${z.zaklad}-${w}.webp`;
}

export function Clanky() {
  const [clanky, setClanky] = useState<Clanok[] | null>(DEMO ? [] : null);
  const [formular, setFormular] = useState<typeof PRAZDNY | null>(null);
  const [uklada, setUklada] = useState(false);
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);
  const [importuje, setImportuje] = useState(false);
  const [importHlaska, setImportHlaska] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const nacitaj = async () => {
    const { data, error } = await getClient().from('clanky').select('*').order('datum', { ascending: false });
    if (error) {
      setHlaska('Články sa nepodarilo načítať: ' + error.message);
      setChyba(true);
      setClanky([]);
      return;
    }
    setClanky(data || []);
  };

  useEffect(() => { if (!DEMO) nacitaj().catch(() => setClanky([])); }, []);

  const zmen = (pole: string, hodnota: any) =>
    setFormular((f) => (f ? { ...f, [pole]: hodnota } : f));

  const otvor = (c?: Clanok) => {
    setHlaska('');
    setChyba(false);
    setFormular(c
      ? {
          id: c.id, titulok: c.titulok || '', slug: c.slug || '',
          kategoria: c.kategoria || 'prve-kroky',
          datum: c.datum ? String(c.datum).slice(0, 10) : '',
          published: String(c.published ?? true),
          perex: c.perex || '', foto_alt: c.foto_alt || '', telo: zPola(c.telo),
          foto_url: c.foto_url ?? null,
          cta_nadpis: c.cta_nadpis || '', cta_text: c.cta_text || '',
          cta_odkaz: c.cta_odkaz || '', cta_odkaz_text: c.cta_odkaz_text || '',
        }
      : { ...PRAZDNY, datum: new Date().toISOString().slice(0, 10) });
  };

  const uloz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formular) return;
    const sb = getClient();
    setUklada(true);
    setChyba(false);
    setHlaska('Ukladám…');
    try {
      let foto_url = formular.foto_url;
      const vstup = formRef.current?.elements.namedItem('foto') as HTMLInputElement | null;
      const file = vstup?.files?.[0];
      if (file) {
        setHlaska('Nahrávam fotku…');
        const blob = await zmensiFotku(file, 1600);
        const cesta = `${formular.slug}-${Date.now()}.webp`;
        const { error: upErr } = await sb.storage.from('clanky-foto')
          .upload(cesta, blob, { contentType: 'image/webp' });
        if (upErr) throw new Error('Fotku sa nepodarilo nahrať: ' + upErr.message);
        foto_url = sb.storage.from('clanky-foto').getPublicUrl(cesta).data.publicUrl;
      }

      // Telo je neriadená textarea vnútri editora, čítame ho z formulára.
      const telo = (formRef.current?.elements.namedItem('telo') as HTMLTextAreaElement | null)?.value ?? formular.telo;

      const zaznam = {
        slug: formular.slug.trim(),
        titulok: formular.titulok.trim(),
        perex: formular.perex.trim(),
        kategoria: formular.kategoria,
        datum: formular.datum,
        foto_url: foto_url ?? null,
        foto_alt: formular.foto_alt.trim() || null,
        telo: naPole(telo),
        cta_nadpis: formular.cta_nadpis.trim() || null,
        cta_text: formular.cta_text.trim() || null,
        cta_odkaz: formular.cta_odkaz.trim() || null,
        cta_odkaz_text: formular.cta_odkaz_text.trim() || null,
        published: formular.published === 'true',
      };

      const { error } = formular.id
        ? await sb.from('clanky').update(zaznam).eq('id', formular.id)
        : await sb.from('clanky').insert(zaznam);
      if (error) throw error;

      setFormular(null);
      setHlaska('');
      await nacitaj();
    } catch (err: any) {
      setHlaska(err?.message || 'Uloženie zlyhalo.');
      setChyba(true);
    } finally {
      setUklada(false);
    }
  };

  const zmaz = async (c: Clanok) => {
    if (!confirm(`Naozaj zmazať článok „${c.titulok}"? Táto akcia sa nedá vrátiť.`)) return;
    const { error } = await getClient().from('clanky').delete().eq('id', c.id);
    if (error) { alert('Mazanie zlyhalo: ' + error.message); return; }
    await nacitaj();
  };

  /* Jednorazový presun článkov z kódu do databázy. */
  const importuj = async () => {
    setImportuje(true);
    setImportHlaska('Presúvam…');
    const zaznamy = STARE.map((c: any) => ({
      slug: c.slug, titulok: c.titulok, perex: c.text, kategoria: c.t, datum: c.datumIso,
      foto_url: c.foto || null, foto_alt: c.fotoAlt || null, telo: c.telo || [],
      odkaz: c.link || null, odkaz_text: c.linkText || null,
      cta_nadpis: c.cta?.nadpis || null, cta_text: c.cta?.text || null,
      cta_odkaz: c.cta?.odkaz || null, cta_odkaz_text: c.cta?.odkazText || null,
      published: true,
    }));
    const { error } = await getClient().from('clanky').insert(zaznamy);
    setImportuje(false);
    if (error) { setImportHlaska('Presun zlyhal: ' + error.message); return; }
    setImportHlaska(`Hotovo, presunutých ${zaznamy.length}.`);
    await nacitaj();
  };

  if (DEMO) {
    return (
      <div className="flex flex-col gap-5">
        <HlavaStranky nadpis="Aktuality" popis="Články na webe." />
        <Ramec><Bunka>
          <p className="text-[14px] text-muted-foreground">
            V demo režime sa články neukladajú. Po pripojení Supabase sa systém prepne na ostré dáta sám.
          </p>
        </Bunka></Ramec>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis="Aktuality"
        popis="Články na webe, ich fotky a výzvy na konci."
        akcie={
          <Tlacidlo variant="plne" onClick={() => otvor()}>
            <Plus className="size-4" /> Nový článok
          </Tlacidlo>
        }
      />

      {formular && (
        <Ramec>
          <Bunka>
            <form ref={formRef} onSubmit={uloz}>
              <HlavaPanelu
                nadpis={formular.id ? 'Úprava článku' : 'Nový článok'}
                vpravo={
                  <button type="button" onClick={() => setFormular(null)} aria-label="Zavrieť"
                    className="grid size-8 place-items-center rounded-md text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                }
              />

              <div className="grid gap-4 md:grid-cols-3">
                <Pole popis="Titulok" className="md:col-span-2">
                  <Vstup required maxLength={200} placeholder="napr. Kvetinová výzdoba na pohrebe"
                    value={formular.titulok}
                    onChange={(e) => setFormular({
                      ...formular,
                      titulok: e.target.value,
                      slug: formular.id ? formular.slug : naSlug(e.target.value),
                    })} />
                </Pole>
                <Pole popis="Adresa článku">
                  <Vstup required maxLength={120} pattern="[a-z0-9-]+" placeholder="kvetinova-vyzdoba-na-pohrebe"
                    value={formular.slug} onChange={(e) => zmen('slug', e.target.value)} />
                  <span className="mt-1 block text-[12px] text-muted-foreground">
                    Po zverejnení ju už nemeň, staré odkazy by prestali fungovať.
                  </span>
                </Pole>

                <Pole popis="Kategória">
                  <Vyber value={formular.kategoria} onChange={(e) => zmen('kategoria', e.target.value)}>
                    {Object.entries(KATEGORIE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Vyber>
                </Pole>
                <Pole popis="Dátum">
                  <Vstup type="date" required value={formular.datum} onChange={(e) => zmen('datum', e.target.value)} />
                </Pole>
                <Pole popis="Stav">
                  <Vyber value={formular.published} onChange={(e) => zmen('published', e.target.value)}>
                    <option value="true">Zverejnený</option>
                    <option value="false">Koncept</option>
                  </Vyber>
                </Pole>

                <Pole popis="Perex" className="md:col-span-3">
                  <Textarea rows={3} required maxLength={600}
                    placeholder="Dve až tri vety, ktoré uvidí čitateľ na karte v prehľade."
                    value={formular.perex} onChange={(e) => zmen('perex', e.target.value)} />
                  <span className="mt-1 block text-[12px] text-muted-foreground">
                    {formular.perex.length} / 600 znakov
                  </span>
                </Pole>

                <div className="md:col-span-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Titulná fotka
                  </span>
                  <FotoPole key={`foto-${formular.id || 'novy'}`} name="foto" hodnota={formular.foto_url} />
                </div>
                <Pole popis="Popis fotky">
                  <Vstup maxLength={200} placeholder="Čo je na fotke"
                    value={formular.foto_alt} onChange={(e) => zmen('foto_alt', e.target.value)} />
                  <span className="mt-1 block text-[12px] text-muted-foreground">
                    Prečítajú ho čítačky obrazovky a vyhľadávače.
                  </span>
                </Pole>
              </div>

              <div className="mt-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Text článku
                </span>
                <EditorClanku key={`telo-${formular.id || 'novy'}`} name="telo" hodnota={formular.telo} />
              </div>

              <details className="mt-5">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Výzva na konci článku
                </summary>
                <p className="mb-3 mt-2 text-[12.5px] text-muted-foreground">
                  Keď necháš prázdne, článok skončí bez výzvy.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Pole popis="Nadpis výzvy" className="md:col-span-2">
                    <Vstup maxLength={200} placeholder="Napíš nám. Radi ti poradíme."
                      value={formular.cta_nadpis} onChange={(e) => zmen('cta_nadpis', e.target.value)} />
                  </Pole>
                  <Pole popis="Text výzvy" className="md:col-span-2">
                    <Textarea rows={2} maxLength={400} value={formular.cta_text}
                      onChange={(e) => zmen('cta_text', e.target.value)} />
                  </Pole>
                  <Pole popis="Odkaz">
                    <Vstup maxLength={200} placeholder="/kontakt"
                      value={formular.cta_odkaz} onChange={(e) => zmen('cta_odkaz', e.target.value)} />
                  </Pole>
                  <Pole popis="Text odkazu">
                    <Vstup maxLength={120} placeholder="Kontakt a pobočky"
                      value={formular.cta_odkaz_text} onChange={(e) => zmen('cta_odkaz_text', e.target.value)} />
                  </Pole>
                </div>
              </details>

              <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
                <Tlacidlo type="submit" variant="plne" cakaj={uklada}>Uložiť</Tlacidlo>
                <Tlacidlo type="button" onClick={() => setFormular(null)}>Zrušiť</Tlacidlo>
              </div>
              <Hlaska text={hlaska} chyba={chyba} />
            </form>
          </Bunka>
        </Ramec>
      )}

      <Ramec>
        {clanky === null ? (
          <Bunka><Nacitavam /></Bunka>
        ) : clanky.length === 0 ? (
          <Bunka><Prazdno text="Zatiaľ žiadny článok." /></Bunka>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-border">
            {clanky.map((c) => {
              const blokov = (c.telo || []).length;
              const nahlad = naNahlad(c.foto_url);
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-4 bg-background p-4">
                  {nahlad
                    ? <img src={nahlad} alt="" loading="lazy" className="h-12 w-20 shrink-0 rounded border border-border object-cover" />
                    : <span className="h-12 w-20 shrink-0 rounded border border-border bg-secondary" />}
                  <div className="min-w-40 flex-1">
                    <p className="text-[14.5px] font-semibold">{c.titulok}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                      <Stitok>{KATEGORIE[c.kategoria] || c.kategoria}</Stitok>
                      {!c.published && <Stitok ton="ceka">koncept</Stitok>}
                      <span>{fmtDatum(c.datum)}</span>
                      <span>{blokov} {blokov === 1 ? 'blok' : blokov < 5 ? 'bloky' : 'blokov'}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <OdkazTlacidlo maly href={`/aktuality/${c.slug}`} target="_blank" rel="noopener">Zobraziť</OdkazTlacidlo>
                    <Tlacidlo maly onClick={() => otvor(c)}>Upraviť</Tlacidlo>
                    <Tlacidlo maly variant="nebezpecne" onClick={() => zmaz(c)}>Zmazať</Tlacidlo>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Ramec>

      {clanky !== null && clanky.length === 0 && (
        <Ramec>
          <Bunka>
            <HlavaPanelu
              nadpis="Staré články ešte nie sú v systéme"
              popis={`V databáze zatiaľ nie je ani jeden článok, takže web zobrazuje pôvodných ${STARE.length} článkov priamo z kódu. Presuň ich sem, aby sa dali upravovať. Spúšťa sa raz, existujúce články neprepíše.`}
            />
            <Tlacidlo variant="plne" cakaj={importuje} onClick={importuj}>
              Presunúť staré články do systému
            </Tlacidlo>
            <Hlaska text={importHlaska} chyba={importHlaska.startsWith('Presun zlyhal')} />
          </Bunka>
        </Ramec>
      )}
    </div>
  );
}

export default Clanky;
