/* Aktivita administrátorov: kto sa prihlásil a čo zmenil.
   Vidí ju iba hlavný správca — skutočnú hranicu drží RLS na tabuľke
   aktivita (politika aktivita_hlavny_select), takže ostatným sa zoznam
   jednoducho nenačíta a komponent to povie.

   Riadky píše databázový zapisovač (supabase/schema-aktivita.sql):
   trigger na tabuľkách, ktoré admini upravujú, plus RPC zapis_prihlasenie
   volané po prihlásení. Anonymné zápisy z webu sa nelogujú. */
import { useEffect, useMemo, useState } from 'react';
import { Bunka, Chipy, HlavaStranky, Nacitavam, Prazdno, Ramec, Stitok } from './ui';
import { getClient, fmtDT } from '@/scripts/admin-core.js';

type Riadok = Record<string, any>;

/* Popisy do vety „Marcel upravil parte Ján Halčin". */
const CO: Record<string, string> = {
  parte: 'parte',
  clanky: 'článok',
  kondolencie: 'kondolenciu',
  dopyty: 'dopyt',
  kontakty: 'kontakt',
  zakazky: 'zákazku',
  admini: 'používateľa',
};

const TON: Record<string, 'hotovo' | 'ticho' | 'ceka' | 'skryte'> = {
  'vytvoril': 'hotovo',
  'upravil': 'ticho',
  'zmazal': 'skryte',
  'prihlásil sa': 'ceka',
};

const naLogin = (email: string | null) => String(email ?? '').replace(/@paciga\.sk$/, '');

export function Aktivita() {
  const [riadky, setRiadky] = useState<Riadok[] | null>(null);
  const [mena, setMena] = useState<Record<string, string>>({});
  const [chyba, setChyba] = useState('');
  const [filter, setFilter] = useState('vsetko');

  useEffect(() => {
    (async () => {
      const sb = getClient();
      const { data, error } = await sb.from('aktivita')
        .select('*').order('cas', { ascending: false }).limit(400);
      if (error) {
        setChyba('Aktivitu vidí len hlavný správca.');
        setRiadky([]);
        return;
      }
      setRiadky(data || []);
      // Mená k e-mailom; hlavný správca admini vidí. Keď sa nepodarí,
      // zoznam beží ďalej s e-mailami.
      const { data: ludia } = await sb.from('admini').select('email, meno');
      const mapa: Record<string, string> = {};
      for (const l of ludia || []) if (l.meno) mapa[String(l.email).toLowerCase()] = l.meno;
      setMena(mapa);
    })().catch(() => { setChyba('Aktivitu sa nepodarilo načítať.'); setRiadky([]); });
  }, []);

  const osoby = useMemo(() => {
    const e = [...new Set((riadky || []).map((r) => String(r.email || '')).filter(Boolean))];
    return e.sort();
  }, [riadky]);

  const meno = (email: string | null) =>
    mena[String(email || '').toLowerCase()] || naLogin(email) || 'niekto';

  const zobrazene = (riadky || []).filter((r) => filter === 'vsetko' || r.email === filter);

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis="Aktivita"
        popis="Prihlásenia a zmeny administrátorov, najnovšie hore. Zbiera sa od 1. septembra 2026."
      />

      {osoby.length > 1 && (
        <Chipy
          polozky={[{ key: 'vsetko', label: 'Všetko' }, ...osoby.map((e) => ({ key: e, label: meno(e) }))]}
          vybrany={filter}
          onVyber={setFilter}
        />
      )}

      <Ramec>
        {riadky === null ? (
          <Bunka><Nacitavam /></Bunka>
        ) : chyba ? (
          <Bunka><Prazdno text={chyba} /></Bunka>
        ) : zobrazene.length === 0 ? (
          <Bunka><Prazdno text="Zatiaľ žiadna aktivita." /></Bunka>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-border">
            {zobrazene.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 bg-background px-4 py-3">
                <Stitok ton={TON[r.akcia] || 'ticho'}>{r.akcia === 'prihlásil sa' ? 'prihlásenie' : r.akcia}</Stitok>
                <p className="min-w-40 flex-1 text-[14px]">
                  <b className="font-semibold">{meno(r.email)}</b>
                  {' '}{r.akcia}
                  {r.tabulka && <> {CO[r.tabulka] || r.tabulka}</>}
                  {r.popis && <> <span className="text-muted-foreground">„{r.popis}"</span></>}
                </p>
                <span className="text-[12.5px] tabular-nums text-muted-foreground">{fmtDT(r.cas)}</span>
              </div>
            ))}
          </div>
        )}
      </Ramec>
    </div>
  );
}

export default Aktivita;
