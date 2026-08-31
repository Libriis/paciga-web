/* Web a parte: zoznam parte, kondolencie a dopyty.
   Od 31. 8. 2026 to nie sú záložky v jednej stránke, ale tri samostatné
   stránky (/admin/parte, /admin/kondolencie, /admin/dopyty) s vlastnou
   položkou v menu. Klient chcel, aby ich obsluha videla oddelene.

   Zakladanie a úprava parte má tiež vlastnú stránku
   (/admin/parte/upravit, komponent ParteFormular). Tu je len zoznam,
   tlačidlá z neho odkazujú von.

   Zostal jeden komponent s prepínačom `zobraz`: tri sekcie zdieľajú
   pomocný tvar karty a rozdelenie do troch súborov by ho duplikovalo.

   Právomoc zostáva jedna: 'web'. Kľúč sedí s admini.pristupy a s RLS,
   takže rozbitie na tri kľúče by si vypýtalo migráciu údajov aj politík. */
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Bunka, HlavaStranky, Nacitavam, Prazdno, Ramec, Stitok, Tlacidlo, OdkazTlacidlo,
} from './ui';
import {
  getClient, fmtD, fmtDT, vytvorZakazku, noveCisloZakazky, uuid, inicialky,
} from '@/scripts/admin-core.js';

type Riadok = Record<string, any>;

export type Sekcia = 'parte' | 'kondolencie' | 'dopyty';

/** Stránka, na ktorej sa parte zakladá a upravuje. */
const FORMULAR_PARTE = '/admin/parte/upravit';

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

  /* ---------- parte ---------- */

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
              <OdkazTlacidlo variant="plne" href={FORMULAR_PARTE}>
                <Plus className="size-4" /> Pridať parte
              </OdkazTlacidlo>
            }
          />

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
                      <OdkazTlacidlo maly href={`${FORMULAR_PARTE}?id=${p.id}`}>Upraviť</OdkazTlacidlo>
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
