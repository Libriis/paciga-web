/* Formulár parte na vlastnej stránke: /admin/parte/upravit?id=…
   Bez `id` zakladá nové parte.

   Od 31. 8. 2026 to nie je panel nad zoznamom. Klient nahlásil, že pri
   úprave jedného parte vidí pod formulárom všetky ostatné a stráca sa
   v tom. Tu je na obrazovke len jeden záznam.

   Ukladá rovnako ako predtým a potom sa vracia na zoznam. */
import { useEffect, useRef, useState } from 'react';
import FotoPole from './FotoPole';
import {
  Bunka, HlavaPanelu, HlavaStranky, Hlaska, Nacitavam, Pole, PoleSamo, Prepinac,
  Ramec, Textarea, Tlacidlo, OdkazTlacidlo, Vstup,
} from './ui';
import { getClient, zmensiFotku } from '@/scripts/admin-core.js';

const ZOZNAM = '/admin/parte';

const PRAZDNE = {
  id: '', meno: '', pohlavie: 'zena', slug: '', datum_narodenia: '', datum_umrtia: '',
  vek: '' as string | number, rozlucka_datum: '', rozlucka_cas: '', rozlucka_miesto: '',
  miesto_pohrebu: '', odkaz_rodine: '', published: true, foto_url: null as string | null,
};

/* Slovenské ženské priezviská končia na dlhé á (Kičáková, Justová),
   mužské prakticky nikdy. Odhad z posledného slova mena šetrí klik
   a hlavne chráni pred parte v zlom rode: prvé ostré parte 31. 8. 2026
   vyšlo v ženskom rode len preto, že prepínač ostal na predvolenej žene. */
const odhadniPohlavie = (meno: string) => {
  const slova = meno.trim().split(/\s+/);
  return (slova[slova.length - 1] || '').toLowerCase().endsWith('á') ? 'zena' : 'muz';
};

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

function vypocitajVek(nar: string, umr: string) {
  if (!nar || !umr) return '';
  const n = new Date(nar), u = new Date(umr);
  let v = u.getFullYear() - n.getFullYear();
  if (u.getMonth() < n.getMonth() || (u.getMonth() === n.getMonth() && u.getDate() < n.getDate())) v--;
  return v >= 0 ? String(v) : '';
}

export function ParteFormular() {
  const [formular, setFormular] = useState<typeof PRAZDNE | null>(null);
  const [chybaNacitania, setChybaNacitania] = useState('');
  const [uklada, setUklada] = useState(false);
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  /* Vek a webová adresa sa dopĺňajú z iných polí. Kým sú zamknuté,
     prepisujú sa samy; po odomknutí sa ich už nedotýkame. */
  const [rucne, setRucne] = useState({ vek: false, slug: false });
  /* Kým sa prepínača nikto nedotkne, pohlavie sa odhaduje z priezviska. */
  const [pohlavieRucne, setPohlavieRucne] = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { setFormular({ ...PRAZDNE }); return; }
    (async () => {
      const { data, error } = await getClient().from('parte').select('*').eq('id', id).maybeSingle();
      if (error || !data) {
        setChybaNacitania('Toto parte sa nepodarilo načítať. Možno ho medzitým niekto vymazal.');
        return;
      }
      setFormular({
        id: data.id, meno: data.meno || '', pohlavie: data.pohlavie || 'zena', slug: data.slug || '',
        datum_narodenia: data.datum_narodenia || '', datum_umrtia: data.datum_umrtia || '',
        vek: data.vek ?? '', rozlucka_datum: data.rozlucka_datum || '', rozlucka_cas: data.rozlucka_cas || '',
        rozlucka_miesto: data.rozlucka_miesto || '', miesto_pohrebu: data.miesto_pohrebu || '',
        odkaz_rodine: data.odkaz_rodine || '',
        published: !!data.published, foto_url: data.foto_url ?? null,
      });
    })().catch(() => setChybaNacitania('Toto parte sa nepodarilo načítať.'));
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
      /* Východisko je hodnota z formulára: null, keď fotku krížikom
         odstránili. Nová vybraná fotka ju nižšie prepíše. */
      let foto_url: string | null = formular.foto_url;
      const vstup = formRef.current?.elements.namedItem('foto') as HTMLInputElement | null;
      const file = vstup?.files?.[0];
      if (file) {
        setHlaska('Nahrávam fotku…');
        const blob = await zmensiFotku(file, 900);
        const cesta = `${formular.slug}-${Date.now()}.webp`;
        const { error: upErr } = await sb.storage.from('parte-foto')
          .upload(cesta, blob, { contentType: 'image/webp' });
        if (upErr) throw new Error('Fotku sa nepodarilo nahrať: ' + upErr.message);
        foto_url = sb.storage.from('parte-foto').getPublicUrl(cesta).data.publicUrl;
      }

      const zaznam = {
        meno: formular.meno.trim(),
        pohlavie: formular.pohlavie,
        slug: formular.slug.trim(),
        datum_narodenia: formular.datum_narodenia || null,
        datum_umrtia: formular.datum_umrtia,
        vek: formular.vek ? Number(formular.vek) : null,
        rozlucka_datum: formular.rozlucka_datum || null,
        rozlucka_cas: formular.rozlucka_cas || null,
        rozlucka_miesto: formular.rozlucka_miesto.trim() || null,
        miesto_pohrebu: formular.miesto_pohrebu.trim() || null,
        odkaz_rodine: formular.odkaz_rodine.trim() || null,
        published: formular.published,
        /* Zapisuje sa vždy, aj null. Podmienené rozbalenie tu nechávalo
           v databáze starú fotku po jej odstránení (nahlásené 1. 9. 2026). */
        foto_url: foto_url ?? null,
      };

      setHlaska('Ukladám parte…');
      const res = formular.id
        ? await sb.from('parte').update(zaznam).eq('id', formular.id)
        : await sb.from('parte').insert(zaznam);
      if (res.error) {
        throw new Error((res.error as any).code === '23505'
          ? 'Parte s touto webovou adresou už existuje — uprav pole „Webová adresa".'
          : res.error.message);
      }
      // Odchádzame na zoznam. Hláška ostáva, nech je počas presmerovania
      // vidieť, že sa uložilo, a tlačidlo sa nedá stlačiť druhýkrát.
      setHlaska('Uložené. Vraciam sa na zoznam…');
      location.href = ZOZNAM;
    } catch (err: any) {
      setHlaska(err?.message || 'Nepodarilo sa uložiť.');
      setChyba(true);
      setUklada(false);
    }
  };

  if (chybaNacitania) {
    return (
      <Ramec><Bunka>
        <HlavaPanelu nadpis="Parte sa nenašlo" popis={chybaNacitania} />
        <OdkazTlacidlo href={ZOZNAM}>Späť na zoznam parte</OdkazTlacidlo>
      </Bunka></Ramec>
    );
  }

  if (!formular) return <Ramec><Bunka><Nacitavam /></Bunka></Ramec>;

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis={formular.id ? formular.meno || 'Úprava parte' : 'Nové parte'}
        popis={formular.id ? 'Úprava smútočného oznámenia.' : 'Údaje o zosnulom a termín rozlúčky.'}
        akcie={<OdkazTlacidlo href={ZOZNAM}>Späť na zoznam</OdkazTlacidlo>}
      />

      <Ramec>
        <Bunka>
          <form ref={formRef} onSubmit={uloz}>
            <div className="grid gap-4 md:grid-cols-3">
              <Pole popis="Meno a priezvisko zosnulého" className="md:col-span-2">
                <Vstup required maxLength={120} placeholder="napr. Anna Kičáková"
                  value={formular.meno}
                  onChange={(e) => setFormular({
                    ...formular,
                    meno: e.target.value,
                    // Pri úprave existujúceho parte sa adresa nemení nikdy,
                    // inak by prestali fungovať odkazy na už zverejnené parte.
                    slug: formular.id || rucne.slug ? formular.slug : slugify(e.target.value),
                    pohlavie: formular.id || pohlavieRucne ? formular.pohlavie : odhadniPohlavie(e.target.value),
                  })} />
              </Pole>
              <Pole popis="Pohlavie">
                <Prepinac moznosti={[{ key: 'zena', label: 'žena' }, { key: 'muz', label: 'muž' }]}
                  hodnota={formular.pohlavie}
                  onZmena={(k) => { setPohlavieRucne(true); zmen('pohlavie', k); }} />
                <span className="mt-1 block text-[12px] text-muted-foreground">
                  Nastaví sa podľa priezviska. Skontroluj a klikni, ak nesedí.
                </span>
              </Pole>

              <Pole popis="Dátum narodenia">
                <Vstup type="date" value={formular.datum_narodenia}
                  onChange={(e) => setFormular({
                    ...formular,
                    datum_narodenia: e.target.value,
                    vek: rucne.vek ? formular.vek : vypocitajVek(e.target.value, formular.datum_umrtia),
                  })} />
              </Pole>
              <Pole popis="Dátum úmrtia">
                <Vstup type="date" required value={formular.datum_umrtia}
                  onChange={(e) => setFormular({
                    ...formular,
                    datum_umrtia: e.target.value,
                    vek: rucne.vek ? formular.vek : vypocitajVek(formular.datum_narodenia, e.target.value),
                  })} />
              </Pole>
              <PoleSamo
                popis="Vek"
                napoveda="Vypočíta sa z dátumu narodenia a úmrtia."
                zamknute={!rucne.vek}
                onPrepni={() => setRucne((r) => ({ ...r, vek: !r.vek }))}
              >
                <Vstup type="number" min={0} max={130} value={formular.vek}
                  readOnly={!rucne.vek}
                  className={rucne.vek ? '' : 'border-dashed'}
                  onChange={(e) => zmen('vek', e.target.value)} />
              </PoleSamo>

              <Pole popis="Dátum rozlúčky">
                <Vstup type="date" value={formular.rozlucka_datum} onChange={(e) => zmen('rozlucka_datum', e.target.value)} />
              </Pole>
              <Pole popis="Čas rozlúčky">
                <Vstup type="time" value={formular.rozlucka_cas} onChange={(e) => zmen('rozlucka_cas', e.target.value)} />
              </Pole>
              <Pole popis="Miesto rozlúčky">
                <Vstup maxLength={200} placeholder="napr. Dom smútku v Poprade"
                  value={formular.rozlucka_miesto} onChange={(e) => zmen('rozlucka_miesto', e.target.value)} />
              </Pole>

              <Pole popis="Odkaz rodine (nepovinné)" className="md:col-span-2">
                <Textarea rows={3} maxLength={500} value={formular.odkaz_rodine}
                  onChange={(e) => zmen('odkaz_rodine', e.target.value)} />
                <span className="mt-1 block text-[12px] text-muted-foreground">
                  Zobrazí sa namiesto štandardného textu sústrasti.
                </span>
              </Pole>
              {/* V treťom stĺpci, priamo pod miestom rozlúčky — obe miesta
                  obradu sú tak pod sebou (požiadavka klienta 31. 8. 2026). */}
              <Pole popis="Miesto pohrebu (nepovinné)">
                <Vstup maxLength={200} placeholder="napr. cintorín vo Veľkej"
                  value={formular.miesto_pohrebu} onChange={(e) => zmen('miesto_pohrebu', e.target.value)} />
                <span className="mt-1 block text-[12px] text-muted-foreground">
                  Vyplň, len keď sa pochováva inde, než je rozlúčka. Inak nechaj prázdne.
                </span>
              </Pole>
              <PoleSamo
                popis="Webová adresa parte"
                napoveda={formular.id
                  ? 'Nemeň ju. Odkazy na už zverejnené parte by prestali fungovať.'
                  : 'Doplní sa sama z mena. Meň ju len pri dvoch rovnakých menách.'}
                zamknute={!rucne.slug}
                onPrepni={() => setRucne((r) => ({ ...r, slug: !r.slug }))}
              >
                <Vstup required pattern="[a-z0-9-]{1,80}" maxLength={80}
                  readOnly={!rucne.slug}
                  className={rucne.slug ? '' : 'border-dashed'}
                  value={formular.slug} onChange={(e) => zmen('slug', e.target.value)} />
              </PoleSamo>

              <div className="md:col-span-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Fotografia zosnulého
                </span>
                <FotoPole
                  name="foto"
                  tvar="portret"
                  hodnota={formular.foto_url}
                  popis="Nepovinná. Bez nej sa na webe zobrazia iniciálky."
                  onOdstranit={() => zmen('foto_url', null)}
                />
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-center gap-3 text-[14.5px]">
              <input type="checkbox" className="size-4 accent-white"
                checked={formular.published} onChange={(e) => zmen('published', e.target.checked)} />
              Zverejniť na webe
            </label>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
              <Tlacidlo type="submit" variant="plne" cakaj={uklada}>Uložiť parte</Tlacidlo>
              <OdkazTlacidlo href={ZOZNAM}>Zrušiť</OdkazTlacidlo>
            </div>
            <Hlaska text={hlaska} chyba={chyba} />
          </form>
        </Bunka>
      </Ramec>
    </div>
  );
}

export default ParteFormular;
