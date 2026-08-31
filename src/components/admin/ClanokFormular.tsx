/* Formulár článku na vlastnej stránke: /admin/clanky/upravit?id=…
   Bez `id` zakladá nový článok.

   Od 31. 8. 2026 to nie je panel nad zoznamom. Klient nahlásil, že pri
   úprave jedného článku vidí pod formulárom všetky ostatné. Tu je na
   obrazovke len jeden záznam.

   Telo článku a titulná fotka sú neriadené ostrovy (EditorClanku,
   FotoPole); ich hodnoty sa čítajú z formulára až pri ukladaní. */
import { useEffect, useRef, useState } from 'react';
import FotoPole from './FotoPole';
import EditorClanku from './EditorClanku';
import {
  Bunka, HlavaPanelu, HlavaStranky, Hlaska, Nacitavam, Pole, PoleSamo,
  Ramec, Textarea, Tlacidlo, OdkazTlacidlo, Vstup, Vyber,
} from './ui';
import { getClient, zmensiFotku, DEMO } from '@/scripts/admin-core.js';

const ZOZNAM = '/admin/clanky';

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

/* Textarea drží odstavce oddelené prázdnym riadkom, databáza pole reťazcov. */
const naPole = (t: string) => t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
const zPola = (p: unknown) => (Array.isArray(p) ? p : []).join('\n\n');

export function ClanokFormular() {
  const [formular, setFormular] = useState<typeof PRAZDNY | null>(null);
  const [chybaNacitania, setChybaNacitania] = useState('');
  const [uklada, setUklada] = useState(false);
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  /* Adresa clanku sa doplna z titulku. Kym je zamknuta, prepisuje sa sama;
     po odomknuti sa jej uz nedotykame. */
  const [rucneSlug, setRucneSlug] = useState(false);

  useEffect(() => {
    if (DEMO) { setFormular({ ...PRAZDNY, datum: new Date().toISOString().slice(0, 10) }); return; }
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { setFormular({ ...PRAZDNY, datum: new Date().toISOString().slice(0, 10) }); return; }
    (async () => {
      const { data, error } = await getClient().from('clanky').select('*').eq('id', id).maybeSingle();
      if (error || !data) {
        setChybaNacitania('Tento článok sa nepodarilo načítať. Možno ho medzitým niekto zmazal.');
        return;
      }
      setFormular({
        id: data.id, titulok: data.titulok || '', slug: data.slug || '',
        kategoria: data.kategoria || 'prve-kroky',
        datum: data.datum ? String(data.datum).slice(0, 10) : '',
        published: String(data.published ?? true),
        perex: data.perex || '', foto_alt: data.foto_alt || '', telo: zPola(data.telo),
        foto_url: data.foto_url ?? null,
        cta_nadpis: data.cta_nadpis || '', cta_text: data.cta_text || '',
        cta_odkaz: data.cta_odkaz || '', cta_odkaz_text: data.cta_odkaz_text || '',
      });
    })().catch(() => setChybaNacitania('Tento článok sa nepodarilo načítať.'));
  }, []);

  const zmen = (pole: string, hodnota: any) =>
    setFormular((f) => (f ? { ...f, [pole]: hodnota } : f));

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

      setHlaska('Uložené. Vraciam sa na zoznam…');
      location.href = ZOZNAM;
    } catch (err: any) {
      setHlaska(err?.message || 'Uloženie zlyhalo.');
      setChyba(true);
      setUklada(false);
    }
  };

  if (DEMO) {
    return (
      <Ramec><Bunka>
        <HlavaPanelu nadpis="Demo režim" popis="Bez pripojenej databázy sa články neukladajú." />
        <OdkazTlacidlo href={ZOZNAM}>Späť na zoznam</OdkazTlacidlo>
      </Bunka></Ramec>
    );
  }

  if (chybaNacitania) {
    return (
      <Ramec><Bunka>
        <HlavaPanelu nadpis="Článok sa nenašiel" popis={chybaNacitania} />
        <OdkazTlacidlo href={ZOZNAM}>Späť na zoznam článkov</OdkazTlacidlo>
      </Bunka></Ramec>
    );
  }

  if (!formular) return <Ramec><Bunka><Nacitavam /></Bunka></Ramec>;

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis={formular.id ? formular.titulok || 'Úprava článku' : 'Nový článok'}
        popis={formular.id ? 'Úprava článku v aktualitách.' : 'Nový článok do aktualít.'}
        akcie={<OdkazTlacidlo href={ZOZNAM}>Späť na zoznam</OdkazTlacidlo>}
      />

      <Ramec>
        <Bunka>
          <form ref={formRef} onSubmit={uloz}>
            <div className="grid gap-4 md:grid-cols-3">
              <Pole popis="Titulok" className="md:col-span-2">
                <Vstup required maxLength={200} placeholder="napr. Kvetinová výzdoba na pohrebe"
                  value={formular.titulok}
                  onChange={(e) => setFormular({
                    ...formular,
                    titulok: e.target.value,
                    // Pri uprave uz zverejneneho clanku sa adresa nemeni nikdy.
                    slug: formular.id || rucneSlug ? formular.slug : naSlug(e.target.value),
                  })} />
              </Pole>
              <PoleSamo
                popis="Adresa článku"
                napoveda={formular.id
                  ? 'Nemeň ju. Staré odkazy na článok by prestali fungovať.'
                  : 'Doplní sa sama z titulku.'}
                zamknute={!rucneSlug}
                onPrepni={() => setRucneSlug((r) => !r)}
              >
                <Vstup required maxLength={120} pattern="[a-z0-9-]+" placeholder="kvetinova-vyzdoba-na-pohrebe"
                  readOnly={!rucneSlug}
                  className={rucneSlug ? '' : 'border-dashed'}
                  value={formular.slug} onChange={(e) => zmen('slug', e.target.value)} />
              </PoleSamo>

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
                <FotoPole name="foto" hodnota={formular.foto_url}
                  onOdstranit={() => zmen('foto_url', null)} />
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
              <EditorClanku name="telo" hodnota={formular.telo} />
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
              <OdkazTlacidlo href={ZOZNAM}>Zrušiť</OdkazTlacidlo>
            </div>
            <Hlaska text={hlaska} chyba={chyba} />
          </form>
        </Bunka>
      </Ramec>
    </div>
  );
}

export default ClanokFormular;
