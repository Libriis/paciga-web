/* Kontakty: pozostalí a objednávatelia.
   Tabuľka v ráme, editačný panel nad ňou. Zoznam zákaziek pri kontakte
   odkazuje priamo na detail. */
import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Bunka, HlavaPanelu, HlavaStranky, Hladanie, Hlaska, Nacitavam, Pole, Prazdno,
  Ramec, Textarea, Tlacidlo, Vstup,
} from './ui';
import { getClient, stavLabel, uuid } from '@/scripts/admin-core.js';

type Riadok = Record<string, any>;

const PRAZDNY = { id: '', meno: '', telefon: '', email: '', adresa: '', poznamka: '' };

export function Kontakty() {
  const [kontakty, setKontakty] = useState<Riadok[] | null>(null);
  const [zakazky, setZakazky] = useState<Riadok[]>([]);
  const [hladanie, setHladanie] = useState('');
  const [formular, setFormular] = useState<typeof PRAZDNY | null>(null);
  const [uklada, setUklada] = useState(false);
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);
  const [oznaceny, setOznaceny] = useState<string | null>(null);

  const nacitaj = async () => {
    const sb = getClient();
    const [k, z] = await Promise.all([
      sb.from('kontakty').select('*').order('meno'),
      sb.from('zakazky').select('*'),
    ]);
    setKontakty(k.data || []);
    setZakazky(z.data || []);
  };

  useEffect(() => {
    setOznaceny(new URLSearchParams(location.search).get('id'));
    nacitaj().catch(() => setKontakty([]));
  }, []);

  const zakazkyPodlaKontaktu = useMemo(() => {
    const mapa: Record<string, Riadok[]> = {};
    zakazky.forEach((z) => { if (z.objednavatel_id) (mapa[z.objednavatel_id] ||= []).push(z); });
    return mapa;
  }, [zakazky]);

  const riadky = useMemo(() => {
    const h = hladanie.toLowerCase().trim();
    if (!h) return kontakty || [];
    return (kontakty || []).filter((k) =>
      [k.meno, k.telefon, k.email, k.adresa, k.poznamka].filter(Boolean).join(' ').toLowerCase().includes(h));
  }, [kontakty, hladanie]);

  const zmen = (pole: string, hodnota: string) =>
    setFormular((f) => (f ? { ...f, [pole]: hodnota } : f));

  const uloz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formular) return;
    const sb = getClient();
    setUklada(true);
    setChyba(false);
    setHlaska('Ukladám…');
    const zaznam = {
      meno: formular.meno.trim(),
      telefon: formular.telefon.trim() || null,
      email: formular.email.trim() || null,
      adresa: formular.adresa.trim() || null,
      poznamka: formular.poznamka.trim() || null,
    };
    const res = formular.id
      ? await sb.from('kontakty').update(zaznam).eq('id', formular.id)
      : await sb.from('kontakty').insert({ id: uuid(), ...zaznam });
    setUklada(false);
    if (res.error) {
      setHlaska('Chyba: ' + res.error.message);
      setChyba(true);
      return;
    }
    setHlaska('');
    setFormular(null);
    nacitaj();
  };

  const vymaz = async (k: Riadok) => {
    const pocet = (zakazkyPodlaKontaktu[k.id] || []).length;
    const otazka = `Naozaj vymazať kontakt „${k.meno}"?` +
      (pocet ? ` Je objednávateľom ${pocet} zákaziek — tie ostanú bez kontaktu.` : '');
    if (!confirm(otazka)) return;
    await getClient().from('kontakty').delete().eq('id', k.id);
    nacitaj();
  };

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis="Kontakty"
        popis="Pozostalí a objednávatelia so zoznamom ich zákaziek."
        akcie={
          <Tlacidlo variant="plne" onClick={() => { setFormular({ ...PRAZDNY }); setHlaska(''); }}>
            <Plus className="size-4" /> Nový kontakt
          </Tlacidlo>
        }
      />

      {formular && (
        <Ramec>
          <Bunka>
            <form onSubmit={uloz}>
              <HlavaPanelu
                nadpis={formular.id ? `Upraviť: ${formular.meno}` : 'Nový kontakt'}
                vpravo={
                  <button type="button" onClick={() => setFormular(null)} aria-label="Zavrieť"
                    className="grid size-8 place-items-center rounded-md text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                }
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Pole popis="Meno a priezvisko" className="md:col-span-2">
                  <Vstup required maxLength={120} value={formular.meno} onChange={(e) => zmen('meno', e.target.value)} />
                </Pole>
                <Pole popis="Telefón">
                  <Vstup type="tel" maxLength={40} value={formular.telefon} onChange={(e) => zmen('telefon', e.target.value)} />
                </Pole>
                <Pole popis="E-mail">
                  <Vstup type="email" maxLength={200} value={formular.email} onChange={(e) => zmen('email', e.target.value)} />
                </Pole>
                <Pole popis="Adresa" className="md:col-span-2">
                  <Vstup maxLength={300} value={formular.adresa} onChange={(e) => zmen('adresa', e.target.value)} />
                </Pole>
                <Pole popis="Poznámka" className="md:col-span-2">
                  <Textarea rows={2} maxLength={2000} value={formular.poznamka} onChange={(e) => zmen('poznamka', e.target.value)} />
                </Pole>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Tlacidlo type="submit" variant="plne" cakaj={uklada}>Uložiť kontakt</Tlacidlo>
                <Tlacidlo type="button" onClick={() => setFormular(null)}>Zrušiť</Tlacidlo>
              </div>
              <Hlaska text={hlaska} chyba={chyba} />
            </form>
          </Bunka>
        </Ramec>
      )}

      <Hladanie hodnota={hladanie} onZmena={setHladanie} placeholder="Hľadať podľa mena, telefónu, e-mailu…" />

      <Ramec>
        {kontakty === null ? (
          <Bunka><Nacitavam /></Bunka>
        ) : riadky.length === 0 ? (
          <Bunka><Prazdno text="Žiadne kontakty." /></Bunka>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Meno</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Telefón</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wide">E-mail</TableHead>
                  <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Zákazky</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {riadky.map((k) => (
                  <TableRow key={k.id} className={`border-border ${k.id === oznaceny ? 'bg-secondary' : ''}`}>
                    <TableCell>
                      <span className="font-medium">{k.meno}</span>
                      {k.adresa && <span className="block text-[12px] text-muted-foreground">{k.adresa}</span>}
                      {k.poznamka && <span className="block text-[12px] text-muted-foreground">{k.poznamka}</span>}
                    </TableCell>
                    <TableCell>
                      {k.telefon ? <a href={`tel:${k.telefon}`} className="hover:underline">{k.telefon}</a> : '—'}
                    </TableCell>
                    <TableCell>
                      {k.email ? <a href={`mailto:${k.email}`} className="hover:underline">{k.email}</a> : '—'}
                    </TableCell>
                    <TableCell>
                      {(zakazkyPodlaKontaktu[k.id] || []).length === 0 ? '—' : (
                        <span className="flex flex-col gap-0.5">
                          {(zakazkyPodlaKontaktu[k.id] || []).map((z) => (
                            <a key={z.id} href={`/admin/zakazka?id=${z.id}`} className="text-[13px] text-muted-foreground hover:text-foreground">
                              {z.cislo || 'zákazka'} · {z.zosnuly_meno || 'bez mena'} ({stavLabel(z.stav)})
                            </a>
                          ))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex justify-end gap-2">
                        <Tlacidlo maly onClick={() => { setFormular({
                          id: k.id, meno: k.meno || '', telefon: k.telefon || '', email: k.email || '',
                          adresa: k.adresa || '', poznamka: k.poznamka || '',
                        }); setHlaska(''); }}>Upraviť</Tlacidlo>
                        <Tlacidlo maly variant="nebezpecne" onClick={() => vymaz(k)}>Vymazať</Tlacidlo>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Ramec>
    </div>
  );
}

export default Kontakty;
