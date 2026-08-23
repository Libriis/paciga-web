/* Zoznam zákaziek + zakladanie novej.
   Vzhľad podľa vzoru: filtre nad rámom, tabuľka v ráme, formulár novej
   zákazky sa otvára ako panel nad zoznamom. */
import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Bunka, Chipy, HlavaPanelu, HlavaStranky, Hladanie, Hlaska, Mriezka, Nacitavam,
  Pole, Postup, Prazdno, Prepinac, Ramec, StavZnacka, Textarea, Tlacidlo, Vstup, Vyber, usePobocka,
} from './ui';
import {
  getClient, fmtD, fmtTermin, fmtEUR, STAVY, AKTIVNE_STAVY, POBOCKY, POBOCKY_FARBY,
  ZDROJE, TYPY_POHREBU, stavLabel, typLabel, vytvorZakazku, noveCisloZakazky, uuid,
} from '@/scripts/admin-core.js';

type Riadok = Record<string, any>;

const PRAZDNY_FORMULAR = {
  zosnuly_meno: '', zosnuly_pohlavie: 'zena', typ: 'pochovanie',
  datum_narodenia: '', datum_umrtia: '', miesto_umrtia: '',
  pobocka: '', zdroj: '', suma: '', vztah: '',
  objednavatel_id: '', kontakt_meno: '', kontakt_telefon: '', poznamka: '',
};

/** Najbližší budúci termín zákazky. */
function najblizsiTermin(z: Riadok): [string, string] | null {
  const teraz = new Date().toISOString().slice(0, 16);
  const terminy: [string, string][] = [
    [z.termin_vyzdvihnutie, 'vyzdvihnutie'],
    [z.termin_rakva, 'dovoz rakvy'],
    [z.termin_rozlucka, 'rozlúčka'],
  ];
  return terminy.filter(([t]) => t && t >= teraz).sort((a, b) => (a[0] < b[0] ? -1 : 1))[0] || null;
}

export function Zakazky() {
  const [zakazky, setZakazky] = useState<Riadok[] | null>(null);
  const [ukony, setUkony] = useState<Record<string, Riadok[]>>({});
  const [kontakty, setKontakty] = useState<Riadok[]>([]);
  const [pobocka, setPobocka] = usePobocka();
  const [filter, setFilter] = useState('aktivne');
  const [hladanie, setHladanie] = useState('');

  const [otvorenyFormular, setOtvorenyFormular] = useState(false);
  const [formular, setFormular] = useState({ ...PRAZDNY_FORMULAR });
  const [uklada, setUklada] = useState(false);
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);

  useEffect(() => {
    const sb = getClient();
    (async () => {
      const [z, u, k] = await Promise.all([
        sb.from('zakazky').select('*').order('created_at', { ascending: false }),
        sb.from('ukony').select('*'),
        sb.from('kontakty').select('*').order('meno'),
      ]);
      const podlaZakazky: Record<string, Riadok[]> = {};
      (u.data || []).forEach((r: Riadok) => { (podlaZakazky[r.zakazka_id] ||= []).push(r); });
      setZakazky(z.data || []);
      setUkony(podlaZakazky);
      setKontakty(k.data || []);
    })().catch(() => setZakazky([]));

    if (new URLSearchParams(location.search).has('nova')) setOtvorenyFormular(true);
  }, []);

  const kontaktyPodlaId = useMemo(
    () => Object.fromEntries(kontakty.map((k) => [k.id, k])), [kontakty]);

  const podlaPobocky = useMemo(
    () => (zakazky || []).filter((z) => !pobocka || z.pobocka === pobocka), [zakazky, pobocka]);

  const chipyStavov = useMemo(() => {
    const pocet = (f: (z: Riadok) => boolean) => podlaPobocky.filter(f).length;
    return [
      { key: 'aktivne', label: `Aktívne (${pocet((z) => AKTIVNE_STAVY.includes(z.stav))})` },
      ...STAVY.map((s: { key: string; label: string }) => ({
        key: s.key, label: `${s.label} (${pocet((z) => z.stav === s.key)})`, farba: undefined,
      })),
      { key: 'vsetky', label: `Všetky (${podlaPobocky.length})` },
    ];
  }, [podlaPobocky]);

  const riadky = useMemo(() => {
    let r = podlaPobocky;
    if (filter === 'aktivne') r = r.filter((z) => AKTIVNE_STAVY.includes(z.stav));
    else if (filter !== 'vsetky') r = r.filter((z) => z.stav === filter);
    const h = hladanie.toLowerCase().trim();
    if (h) {
      r = r.filter((z) => [z.zosnuly_meno, z.cislo, z.miesto_umrtia, z.miesto_rozlucky,
        kontaktyPodlaId[z.objednavatel_id]?.meno].filter(Boolean).join(' ').toLowerCase().includes(h));
    }
    return r;
  }, [podlaPobocky, filter, hladanie, kontaktyPodlaId]);

  const zmen = (pole: string, hodnota: string) => setFormular((f) => ({ ...f, [pole]: hodnota }));

  const zaloz = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getClient();
    setUklada(true);
    setChyba(false);
    setHlaska('Zakladám zákazku…');
    try {
      let objednavatelId: string | null = formular.objednavatel_id || null;
      if (!objednavatelId && formular.kontakt_meno.trim()) {
        objednavatelId = uuid();
        const { error } = await sb.from('kontakty').insert({
          id: objednavatelId,
          meno: formular.kontakt_meno.trim(),
          telefon: formular.kontakt_telefon.trim() || null,
        });
        if (error) throw new Error(error.message);
      }
      const id = await vytvorZakazku(sb, {
        cislo: await noveCisloZakazky(sb),
        pobocka: formular.pobocka || null,
        typ: formular.typ,
        zdroj: formular.zdroj || null,
        suma: formular.suma ? Number(formular.suma) : null,
        zosnuly_meno: formular.zosnuly_meno.trim(),
        zosnuly_pohlavie: formular.zosnuly_pohlavie,
        datum_narodenia: formular.datum_narodenia || null,
        datum_umrtia: formular.datum_umrtia || null,
        miesto_umrtia: formular.miesto_umrtia.trim() || null,
        objednavatel_id: objednavatelId,
        vztah: formular.vztah.trim() || null,
        poznamka: formular.poznamka.trim() || null,
      });
      location.href = `/admin/zakazka?id=${id}`;
    } catch (err: any) {
      setHlaska(err?.message || 'Nepodarilo sa založiť zákazku.');
      setChyba(true);
      setUklada(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis="Zákazky"
        popis="Evidencia pohrebov podľa zákona 131/2010."
        akcie={
          <Tlacidlo variant="plne" onClick={() => { setFormular({ ...PRAZDNY_FORMULAR }); setHlaska(''); setOtvorenyFormular(true); }}>
            <Plus className="size-4" /> Nová zákazka
          </Tlacidlo>
        }
      />

      {otvorenyFormular && (
        <Ramec>
          <Bunka>
            <form onSubmit={zaloz}>
              <HlavaPanelu
                nadpis="Nová zákazka"
                popis="Číslo zákazky sa doplní samo. Zvyšok sa dá dopísať v detaile."
                vpravo={
                  <button type="button" onClick={() => setOtvorenyFormular(false)} aria-label="Zavrieť"
                    className="grid size-8 place-items-center rounded-md text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                }
              />

              <div className="grid gap-4 md:grid-cols-3">
                <Pole popis="Meno a priezvisko zosnulého" className="md:col-span-2">
                  <Vstup required maxLength={120} placeholder="napr. Ján Novák"
                    value={formular.zosnuly_meno} onChange={(e) => zmen('zosnuly_meno', e.target.value)} />
                </Pole>
                <div className="flex flex-wrap items-end gap-4">
                  <Pole popis="Pohlavie">
                    <Prepinac
                      moznosti={[{ key: 'zena', label: 'žena' }, { key: 'muz', label: 'muž' }]}
                      hodnota={formular.zosnuly_pohlavie} onZmena={(k) => zmen('zosnuly_pohlavie', k)} />
                  </Pole>
                  <Pole popis="Typ">
                    <Prepinac
                      moznosti={TYPY_POHREBU.map((t: { key: string; label: string }) => ({ key: t.key, label: t.label.toLowerCase() }))}
                      hodnota={formular.typ} onZmena={(k) => zmen('typ', k)} />
                  </Pole>
                </div>

                <Pole popis="Dátum narodenia">
                  <Vstup type="date" value={formular.datum_narodenia} onChange={(e) => zmen('datum_narodenia', e.target.value)} />
                </Pole>
                <Pole popis="Dátum úmrtia">
                  <Vstup type="date" value={formular.datum_umrtia} onChange={(e) => zmen('datum_umrtia', e.target.value)} />
                </Pole>
                <Pole popis="Miesto úmrtia">
                  <Vstup maxLength={200} value={formular.miesto_umrtia} onChange={(e) => zmen('miesto_umrtia', e.target.value)} />
                </Pole>

                <Pole popis="Pobočka">
                  <Vyber value={formular.pobocka} onChange={(e) => zmen('pobocka', e.target.value)}>
                    <option value="">— vyber —</option>
                    {POBOCKY.map((p: string) => <option key={p} value={p}>{p}</option>)}
                  </Vyber>
                </Pole>
                <Pole popis="Zdroj zákazky">
                  <Vyber value={formular.zdroj} onChange={(e) => zmen('zdroj', e.target.value)}>
                    <option value="">— neuvedený —</option>
                    {ZDROJE.map((z: { key: string; label: string }) => <option key={z.key} value={z.key}>{z.label}</option>)}
                  </Vyber>
                </Pole>
                <Pole popis="Predbežná suma (€)">
                  <Vstup type="number" min={0} step={10} value={formular.suma} onChange={(e) => zmen('suma', e.target.value)} />
                </Pole>

                <Pole popis="Objednávateľ" className="md:col-span-2">
                  <Vyber value={formular.objednavatel_id} onChange={(e) => zmen('objednavatel_id', e.target.value)}>
                    <option value="">+ nový kontakt (vyplň nižšie)</option>
                    {kontakty.map((k) => (
                      <option key={k.id} value={k.id}>{k.meno}{k.telefon ? ` · ${k.telefon}` : ''}</option>
                    ))}
                  </Vyber>
                </Pole>
                <Pole popis="Vzťah k zosnulému">
                  <Vstup maxLength={60} placeholder="napr. dcéra" value={formular.vztah} onChange={(e) => zmen('vztah', e.target.value)} />
                </Pole>

                {!formular.objednavatel_id && (
                  <>
                    <Pole popis="Meno nového kontaktu">
                      <Vstup maxLength={120} value={formular.kontakt_meno} onChange={(e) => zmen('kontakt_meno', e.target.value)} />
                    </Pole>
                    <Pole popis="Telefón nového kontaktu">
                      <Vstup type="tel" maxLength={40} value={formular.kontakt_telefon} onChange={(e) => zmen('kontakt_telefon', e.target.value)} />
                    </Pole>
                    <div className="hidden md:block" />
                  </>
                )}

                <Pole popis="Poznámka" className="md:col-span-3">
                  <Textarea rows={2} maxLength={2000} value={formular.poznamka} onChange={(e) => zmen('poznamka', e.target.value)} />
                </Pole>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Tlacidlo type="submit" variant="plne" cakaj={uklada}>Založiť zákazku</Tlacidlo>
                <Tlacidlo type="button" onClick={() => setOtvorenyFormular(false)}>Zrušiť</Tlacidlo>
              </div>
              <Hlaska text={hlaska} chyba={chyba} />
            </form>
          </Bunka>
        </Ramec>
      )}

      <div className="flex flex-col gap-3">
        <Chipy
          polozky={[
            { key: 'vsetky-pobocky', label: 'Všetky pobočky' },
            ...POBOCKY.map((p: string) => ({ key: p, label: p, farba: POBOCKY_FARBY[p] })),
          ]}
          vybrany={pobocka ?? 'vsetky-pobocky'}
          onVyber={(k) => setPobocka(k === 'vsetky-pobocky' ? null : k)}
        />
        <Chipy polozky={chipyStavov} vybrany={filter} onVyber={setFilter} />
        <Hladanie hodnota={hladanie} onZmena={setHladanie} placeholder="Hľadať podľa mena zosnulého, čísla, miesta…" />
      </div>

      <Ramec>
        {zakazky === null ? (
          <Bunka><Nacitavam /></Bunka>
        ) : riadky.length === 0 ? (
          <Bunka><Prazdno text="Žiadne zákazky v tomto pohľade." /></Bunka>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Zosnulý</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Pobočka</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Najbližší termín</TableHead>
                  <TableHead className="text-right text-[12px] font-semibold uppercase tracking-wide">Suma</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Kroky</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Stav</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riadky.slice(0, 60).map((z) => {
                  const uk = ukony[z.id] || [];
                  const kontakt = kontaktyPodlaId[z.objednavatel_id];
                  const termin = najblizsiTermin(z);
                  return (
                    <TableRow
                      key={z.id}
                      className="cursor-pointer border-border"
                      onClick={() => { location.href = `/admin/zakazka?id=${z.id}`; }}
                    >
                      <TableCell>
                        <span className="font-medium">{z.zosnuly_meno || 'Bez mena'}</span>
                        <span className="block text-[12px] text-muted-foreground">
                          {[z.cislo, z.datum_umrtia ? `† ${fmtD(z.datum_umrtia)}` : null, typLabel(z.typ), kontakt?.meno]
                            .filter(Boolean).join(' · ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{z.pobocka || '—'}</TableCell>
                      <TableCell>
                        {termin ? (
                          <>
                            {termin[1]}
                            <span className="block text-[12px] text-muted-foreground">{fmtTermin(termin[0])}</span>
                          </>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{z.suma ? fmtEUR(z.suma) : '—'}</TableCell>
                      <TableCell><Postup hotovo={uk.filter((u) => u.hotovo).length} celkom={uk.length} /></TableCell>
                      <TableCell><StavZnacka stav={z.stav} label={stavLabel(z.stav)} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Ramec>

      {riadky.length > 60 && (
        <p className="text-[13px] text-muted-foreground">
          Zobrazených prvých 60 z {riadky.length}. Zúž výber filtrom alebo hľadaním.
        </p>
      )}
    </div>
  );
}

export default Zakazky;
