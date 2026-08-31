/* Web a parte: parte, kondolencie a dopyty.
   Od 31. 8. 2026 to nie sú záložky v jednej stránke, ale tri samostatné
   stránky (/admin/parte, /admin/kondolencie, /admin/dopyty) s vlastnou
   položkou v menu. Klient chcel, aby ich obsluha videla oddelene.

   Zostal jeden komponent s prepínačom `zobraz`: tri sekcie zdieľajú
   pomocné funkcie (Karta, slugify, výpočet veku) a rozdelenie do troch
   súborov by ich buď duplikovalo, alebo si vypýtalo štvrtý súbor.

   Právomoc zostáva jedna: 'web'. Kľúč sedí s admini.pristupy a s RLS,
   takže rozbitie na tri kľúče by si vypýtalo migráciu údajov aj politík. */
import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import FotoPole from './FotoPole';
import {
  Bunka, HlavaPanelu, HlavaStranky, Hlaska, Nacitavam, Pole, Prazdno, Prepinac,
  Ramec, Stitok, Textarea, Tlacidlo, OdkazTlacidlo, Vstup,
} from './ui';
import {
  getClient, fmtD, fmtDT, zmensiFotku, vytvorZakazku, noveCisloZakazky, uuid, inicialky,
} from '@/scripts/admin-core.js';

type Riadok = Record<string, any>;

export type Sekcia = 'parte' | 'kondolencie' | 'dopyty';

const PRAZDNE_PARTE = {
  id: '', meno: '', pohlavie: 'zena', slug: '', datum_narodenia: '', datum_umrtia: '',
  vek: '', rozlucka_datum: '', rozlucka_cas: '', rozlucka_miesto: '', odkaz_rodine: '',
  published: true, foto_url: null as string | null,
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

const sviec = (n: number) => `${n} ${n === 1 ? 'sviečka' : n < 5 ? 'sviečky' : 'sviečok'}`;

/** Karta s citátom — spoločný tvar pre kondolenciu aj dopyt. */
function Karta({ nadpis, meta, akcie, citat, stlmene = false }: {
  nadpis: string; meta: React.ReactNode; akcie: React.ReactNode; citat: string; stlmene?: boolean;
}) {
  return (
    <div className={`bg-background p-5 ${stlmene ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14.5px] font-semibold">{nadpis}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">{meta}</p>
        </div>
        <div className="flex flex-wrap gap-2">{akcie}</div>
      </div>
      <blockquote className="mt-3 border-l-2 border-border pl-3 text-[14px] leading-relaxed text-muted-foreground">
        {citat}
      </blockquote>
    </div>
  );
}

export function Web({ zobraz }: { zobraz: Sekcia }) {
  const [parte, setParte] = useState<Riadok[] | null>(null);
  const [kondolencie, setKondolencie] = useState<Riadok[] | null>(null);
  const [dopyty, setDopyty] = useState<Riadok[] | null>(null);

  const [formular, setFormular] = useState<typeof PRAZDNE_PARTE | null>(null);
  const [uklada, setUklada] = useState(false);
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const nacitajParte = async () => {
    const { data, error } = await getClient().from('parte').select('*')
      .order('datum_umrtia', { ascending: false }).order('created_at', { ascending: false });
    setParte(error ? [] : data || []);
  };
  const nacitajKondolencie = async () => {
    const { data } = await getClient().from('kondolencie')
      .select('*, parte(meno)').order('created_at', { ascending: false });
    setKondolencie(data || []);
  };
  const nacitajDopyty = async () => {
    const { data } = await getClient().from('dopyty')
      .select('*').order('created_at', { ascending: false }).limit(200);
    setDopyty(data || []);
  };

  /* Každá stránka si sťahuje len svoju tabuľku. Predtým sa načítavali
     všetky tri naraz, lebo boli na jednej stránke a prepínali sa záložkou. */
  useEffect(() => {
    if (zobraz === 'parte') nacitajParte().catch(() => setParte([]));
    if (zobraz === 'kondolencie') nacitajKondolencie().catch(() => setKondolencie([]));
    if (zobraz === 'dopyty') nacitajDopyty().catch(() => setDopyty([]));
  }, [zobraz]);

  const zmen = (pole: string, hodnota: any) =>
    setFormular((f) => (f ? { ...f, [pole]: hodnota } : f));

  /* ---------- parte ---------- */

  const ulozParte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formular) return;
    const sb = getClient();
    setUklada(true);
    setChyba(false);
    setHlaska('Ukladám…');
    try {
      let foto_url: string | undefined;
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
        odkaz_rodine: formular.odkaz_rodine.trim() || null,
        published: formular.published,
        ...(foto_url ? { foto_url } : {}),
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
      setFormular(null);
      setHlaska('');
      await nacitajParte();
    } catch (err: any) {
      setHlaska(err?.message || 'Nepodarilo sa uložiť.');
      setChyba(true);
    } finally {
      setUklada(false);
    }
  };

  const prepniZverejnenie = async (p: Riadok) => {
    await getClient().from('parte').update({ published: !p.published }).eq('id', p.id);
    nacitajParte();
  };

  const vymazParte = async (p: Riadok) => {
    if (!confirm(`Naozaj vymazať parte „${p.meno}"? Vymažú sa aj kondolencie a sviečky.`)) return;
    await getClient().from('parte').delete().eq('id', p.id);
    nacitajParte();
  };

  /* ---------- kondolencie ---------- */

  const schval = async (id: string) => {
    await getClient().from('kondolencie').update({ schvalene: true }).eq('id', id);
    nacitajKondolencie();
  };
  const vymazKondolenciu = async (id: string) => {
    if (!confirm('Naozaj vymazať túto kondolenciu?')) return;
    await getClient().from('kondolencie').delete().eq('id', id);
    nacitajKondolencie();
  };

  /* ---------- dopyty ---------- */

  const oznacDopyt = async (d: Riadok, hodnota: boolean) => {
    await getClient().from('dopyty').update({ precitane: hodnota }).eq('id', d.id);
    nacitajDopyty();
  };

  const dopytNaZakazku = async (d: Riadok) => {
    const sb = getClient();
    try {
      const kontaktId = uuid();
      const { error: ke } = await sb.from('kontakty').insert({
        id: kontaktId,
        meno: d.meno,
        telefon: d.telefon || null,
        email: d.email || null,
        poznamka: 'Z dopytu na webe: ' + String(d.sprava || '').slice(0, 200),
      });
      if (ke) throw new Error(ke.message);
      const id = await vytvorZakazku(sb, {
        cislo: await noveCisloZakazky(sb),
        pobocka: null,
        zosnuly_meno: '',
        datum_umrtia: null,
        objednavatel_id: kontaktId,
        dopyt_id: d.id,
        poznamka: 'Vytvorené z dopytu: ' + d.sprava,
      });
      await sb.from('dopyty').update({ precitane: true }).eq('id', d.id);
      location.href = `/admin/zakazka?id=${id}`;
    } catch (err: any) {
      alert('Zákazku sa nepodarilo vytvoriť: ' + (err?.message || err));
    }
  };

  /* ---------- vykreslenie ---------- */

  return (
    <div className="flex flex-col gap-5">
      {zobraz === 'parte' && (
        <>
          <HlavaStranky
            nadpis="Smútočné oznámenia"
            popis="Parte na webe, ich fotky a termíny rozlúčky."
            akcie={
              <Tlacidlo variant="plne" onClick={() => { setFormular({ ...PRAZDNE_PARTE }); setHlaska(''); }}>
                <Plus className="size-4" /> Pridať parte
              </Tlacidlo>
            }
          />

          {formular && (
            <Ramec>
              <Bunka>
                <form ref={formRef} onSubmit={ulozParte}>
                  <HlavaPanelu
                    nadpis={formular.id ? `Upraviť: ${formular.meno}` : 'Nové parte'}
                    vpravo={
                      <button type="button" onClick={() => setFormular(null)} aria-label="Zavrieť"
                        className="grid size-8 place-items-center rounded-md text-muted-foreground hover:text-foreground">
                        <X className="size-4" />
                      </button>
                    }
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <Pole popis="Meno a priezvisko zosnulého" className="md:col-span-2">
                      <Vstup required maxLength={120} placeholder="napr. Anna Kičáková"
                        value={formular.meno}
                        onChange={(e) => setFormular({
                          ...formular,
                          meno: e.target.value,
                          slug: formular.id ? formular.slug : slugify(e.target.value),
                        })} />
                    </Pole>
                    <Pole popis="Pohlavie">
                      <Prepinac moznosti={[{ key: 'zena', label: 'žena' }, { key: 'muz', label: 'muž' }]}
                        hodnota={formular.pohlavie} onZmena={(k) => zmen('pohlavie', k)} />
                    </Pole>

                    <Pole popis="Dátum narodenia">
                      <Vstup type="date" value={formular.datum_narodenia}
                        onChange={(e) => setFormular({
                          ...formular,
                          datum_narodenia: e.target.value,
                          vek: vypocitajVek(e.target.value, formular.datum_umrtia),
                        })} />
                    </Pole>
                    <Pole popis="Dátum úmrtia">
                      <Vstup type="date" required value={formular.datum_umrtia}
                        onChange={(e) => setFormular({
                          ...formular,
                          datum_umrtia: e.target.value,
                          vek: vypocitajVek(formular.datum_narodenia, e.target.value),
                        })} />
                    </Pole>
                    <Pole popis="Vek (doplní sa sám)">
                      <Vstup type="number" min={0} max={130} value={formular.vek}
                        onChange={(e) => zmen('vek', e.target.value)} />
                    </Pole>

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
                    <Pole popis="Webová adresa parte">
                      <Vstup required pattern="[a-z0-9-]{1,80}" maxLength={80}
                        value={formular.slug} onChange={(e) => zmen('slug', e.target.value)} />
                      <span className="mt-1 block text-[12px] text-muted-foreground">Doplní sa sama z mena.</span>
                    </Pole>

                    <div className="md:col-span-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        Fotografia zosnulého
                      </span>
                      {/* key remountuje pole pri prepnutí záznamu, inak by
                          na ňom ostal náhľad z predchádzajúceho parte */}
                      <FotoPole
                        key={formular.id || 'nove'}
                        name="foto"
                        tvar="portret"
                        hodnota={formular.foto_url}
                        popis="Nepovinná. Bez nej sa na webe zobrazia iniciálky."
                      />
                    </div>
                  </div>

                  <label className="mt-5 flex cursor-pointer items-center gap-3 text-[14.5px]">
                    <input type="checkbox" className="size-4 accent-white"
                      checked={formular.published} onChange={(e) => zmen('published', e.target.checked)} />
                    Zverejniť na webe
                  </label>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Tlacidlo type="submit" variant="plne" cakaj={uklada}>Uložiť parte</Tlacidlo>
                    <Tlacidlo type="button" onClick={() => setFormular(null)}>Zrušiť</Tlacidlo>
                  </div>
                  <Hlaska text={hlaska} chyba={chyba} />
                </form>
              </Bunka>
            </Ramec>
          )}

          <Ramec>
            {parte === null ? (
              <Bunka><Nacitavam /></Bunka>
            ) : parte.length === 0 ? (
              <Bunka><Prazdno text="Zatiaľ žiadne parte." /></Bunka>
            ) : (
              <div className="grid grid-cols-1 gap-px bg-border">
                {parte.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-4 bg-background p-4">
                    {p.foto_url
                      ? <img src={p.foto_url} alt="" className="size-11 shrink-0 rounded-full border border-border object-cover" />
                      : <span className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-[13px] font-semibold text-muted-foreground">
                          {inicialky(p.meno)}
                        </span>}
                    <div className="min-w-40 flex-1">
                      <p className="text-[14.5px] font-semibold">{p.meno}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                        {!p.published && <Stitok ton="skryte">skryté</Stitok>}
                        <span>† {fmtD(p.datum_umrtia)}</span>
                        {p.rozlucka_datum && (
                          <span>rozlúčka {fmtD(p.rozlucka_datum)}{p.rozlucka_cas ? ` o ${p.rozlucka_cas}` : ''}</span>
                        )}
                        <span>{sviec(p.sviecky || 0)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <OdkazTlacidlo maly href={`/parte/${p.slug}`} target="_blank" rel="noopener">Zobraziť</OdkazTlacidlo>
                      <Tlacidlo maly onClick={() => { setHlaska(''); setFormular({
                        id: p.id, meno: p.meno || '', pohlavie: p.pohlavie || 'zena', slug: p.slug || '',
                        datum_narodenia: p.datum_narodenia || '', datum_umrtia: p.datum_umrtia || '',
                        vek: p.vek ?? '', rozlucka_datum: p.rozlucka_datum || '', rozlucka_cas: p.rozlucka_cas || '',
                        rozlucka_miesto: p.rozlucka_miesto || '', odkaz_rodine: p.odkaz_rodine || '',
                        published: !!p.published, foto_url: p.foto_url ?? null,
                      }); }}>Upraviť</Tlacidlo>
                      <Tlacidlo maly onClick={() => prepniZverejnenie(p)}>{p.published ? 'Skryť' : 'Zverejniť'}</Tlacidlo>
                      <Tlacidlo maly variant="nebezpecne" onClick={() => vymazParte(p)}>Vymazať</Tlacidlo>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Ramec>
        </>
      )}

      {zobraz === 'kondolencie' && (
        <>
          <HlavaStranky nadpis="Kondolencie" popis="Odkazy od návštevníkov. Na web idú až po schválení." />
          {[
            { nadpis: 'Čakajú na schválenie', zoznam: (kondolencie || []).filter((k) => !k.schvalene), prazdne: 'Žiadne čakajúce kondolencie.' },
            { nadpis: 'Schválené', zoznam: (kondolencie || []).filter((k) => k.schvalene), prazdne: 'Zatiaľ žiadne schválené kondolencie.' },
          ].map((skupina) => (
            <div key={skupina.nadpis} className="flex flex-col gap-2">
              <h2 className="text-[15px] font-semibold tracking-tight">{skupina.nadpis}</h2>
              <Ramec>
                {kondolencie === null ? (
                  <Bunka><Nacitavam /></Bunka>
                ) : skupina.zoznam.length === 0 ? (
                  <Bunka><Prazdno text={skupina.prazdne} /></Bunka>
                ) : (
                  <div className="grid grid-cols-1 gap-px bg-border">
                    {skupina.zoznam.map((k) => (
                      <Karta
                        key={k.id}
                        nadpis={k.meno}
                        citat={k.odkaz}
                        meta={<>
                          <Stitok ton={k.schvalene ? 'hotovo' : 'ceka'}>{k.schvalene ? 'na webe' : 'čaká'}</Stitok>
                          <span>k parte {k.parte?.meno ?? '?'}</span>
                          <span>{fmtDT(k.created_at)}</span>
                        </>}
                        akcie={<>
                          {!k.schvalene && <Tlacidlo maly variant="plne" onClick={() => schval(k.id)}>Schváliť a zverejniť</Tlacidlo>}
                          <Tlacidlo maly variant="nebezpecne" onClick={() => vymazKondolenciu(k.id)}>Vymazať</Tlacidlo>
                        </>}
                      />
                    ))}
                  </div>
                )}
              </Ramec>
            </div>
          ))}
        </>
      )}

      {zobraz === 'dopyty' && (
        <>
          <HlavaStranky nadpis="Dopyty z kontaktného formulára" popis="Z dopytu sa dá jedným klikom založiť zákazka." />
          <Ramec>
            {dopyty === null ? (
              <Bunka><Nacitavam /></Bunka>
            ) : dopyty.length === 0 ? (
              <Bunka><Prazdno text="Zatiaľ žiadne dopyty." /></Bunka>
            ) : (
              <div className="grid grid-cols-1 gap-px bg-border">
                {dopyty.map((d) => (
                  <Karta
                    key={d.id}
                    stlmene={!!d.precitane}
                    nadpis={d.meno}
                    citat={d.sprava}
                    meta={<>
                      <Stitok ton={d.precitane ? 'ticho' : 'ceka'}>{d.precitane ? 'vybavené' : 'nové'}</Stitok>
                      <span>{fmtDT(d.created_at)}</span>
                      {d.telefon && <a href={`tel:${d.telefon}`} className="hover:text-foreground">{d.telefon}</a>}
                      {d.email && <a href={`mailto:${d.email}`} className="hover:text-foreground">{d.email}</a>}
                    </>}
                    akcie={<>
                      <Tlacidlo maly variant="plne" onClick={() => dopytNaZakazku(d)}>Vytvoriť zákazku</Tlacidlo>
                      <Tlacidlo maly onClick={() => oznacDopyt(d, !d.precitane)}>
                        {d.precitane ? 'Vrátiť medzi nové' : 'Označiť vybavené'}
                      </Tlacidlo>
                    </>}
                  />
                ))}
              </div>
            )}
          </Ramec>
        </>
      )}
    </div>
  );
}

export default Web;
