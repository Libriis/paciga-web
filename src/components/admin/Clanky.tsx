/* Aktuality: zoznam článkov.
   Od 31. 8. 2026 sa článok zakladá a upravuje na vlastnej stránke
   (/admin/clanky/upravit, komponent ClanokFormular). Tu je len zoznam,
   tlačidlá z neho odkazujú von. Predtým sa editor otváral nad zoznamom
   a pod formulárom bolo vidieť všetky ostatné články. */
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Bunka, HlavaPanelu, HlavaStranky, Hlaska, Nacitavam, Prazdno,
  Ramec, Stitok, Tlacidlo, OdkazTlacidlo,
} from './ui';
import { getClient, DEMO } from '@/scripts/admin-core.js';
import { CLANKY as STARE } from '@/data/aktuality';
import staticke from '@/data/staticke-obrazky.json';

type Clanok = Record<string, any>;

/** Stránka, na ktorej sa článok zakladá a upravuje. */
const FORMULAR = '/admin/clanky/upravit';

const KATEGORIE: Record<string, string> = {
  'prve-kroky': 'Prvé kroky',
  'smutok': 'Smútok a spomínanie',
  'planovanie': 'Plánovanie vopred',
  'sperky': 'Spomienkové šperky',
  'zo-zivota': 'Zo života Paciga',
};

const fmtDatum = (iso: string) => {
  const M = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const [r, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return r ? `${d}. ${M[m - 1]} ${r}` : '—';
};

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
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);
  const [importuje, setImportuje] = useState(false);
  const [importHlaska, setImportHlaska] = useState('');

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
          <OdkazTlacidlo variant="plne" href={FORMULAR}>
            <Plus className="size-4" /> Nový článok
          </OdkazTlacidlo>
        }
      />

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
                    <OdkazTlacidlo maly href={`${FORMULAR}?id=${c.id}`}>Upraviť</OdkazTlacidlo>
                    <Tlacidlo maly variant="nebezpecne" onClick={() => zmaz(c)}>Zmazať</Tlacidlo>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Ramec>

      <Hlaska text={hlaska} chyba={chyba} />

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
