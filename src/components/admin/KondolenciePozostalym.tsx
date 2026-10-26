/* Kondolencie pozostalým: /admin/parte/kondolencie-pozostalym?id=…

   Klient 22. 10. 2026: po pohrebe chce rodine poslať e-mailom všetky
   kondolencie, ktoré ľudia napísali pri parte. Obsluha tu zadá adresy
   pozostalých, pozrie si náhľad a odošle.

   E-mail skladá aj posiela server (/api/admin/kondolencie-pozostalym),
   lebo Resend kľúč do prehliadača nepatrí. Do e-mailu idú len schválené
   kondolencie. Každý adresát dostane vlastný e-mail.

   História odoslaní je tu preto, aby rodina nedostala to isté dvakrát:
   pred druhým odoslaním sa stránka spýta. */
import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  Bunka, HlavaPanelu, HlavaStranky, Hlaska, Nacitavam, OdkazTlacidlo, Prazdno, Ramec, Tlacidlo, Vstup,
} from './ui';
import { getClient, fmtDT } from '@/scripts/admin-core.js';

const ZOZNAM = '/admin/parte';
const API = '/api/admin/kondolencie-pozostalym';
/** Rovnaký strop ako na serveri a v databáze. */
const MAX_ADRIES = 10;

type Odoslanie = { created_at: string; komu: string[]; pocet: number; odoslal_email: string | null };
type Nahlad = {
  parte: { meno: string; slug: string; published: boolean };
  pocet: number;
  cakaju: number;
  od: string;
  predmet: string | null;
  html: string | null;
  odoslania: Odoslanie[] | null;
};

/** Tvar podstatného mena podľa počtu: [1, 2 až 4, 5 a viac]. */
const tvar = (n: number, [jeden, par, vela]: [string, string, string]) =>
  `${n} ${n === 1 ? jeden : n < 5 ? par : vela}`;

const naLogin = (email: string | null) => String(email ?? '').replace(/@paciga\.sk$/, '') || 'niekto';

async function api(init?: RequestInit, parametre = ''): Promise<any> {
  const { data: { session } } = await getClient().auth.getSession();
  if (!session) throw new Error('Prihlásenie vypršalo. Obnov stránku.');
  const r = await fetch(`${API}${parametre}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${session.access_token}` },
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error || 'Server neodpovedá. Skús to o chvíľu.');
  return j;
}

export function KondolenciePozostalym() {
  const [id, setId] = useState('');
  const [nahlad, setNahlad] = useState<Nahlad | null>(null);
  const [chybaNacitania, setChybaNacitania] = useState('');
  const [adresy, setAdresy] = useState<string[]>(['']);
  const [odosiela, setOdosiela] = useState(false);
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);
  const ramik = useRef<HTMLIFrameElement>(null);

  const nacitaj = async (parteId: string) => {
    try {
      setNahlad(await api(undefined, `?parte=${encodeURIComponent(parteId)}`));
    } catch (e: any) {
      setChybaNacitania(e?.message || 'Parte sa nepodarilo načítať.');
    }
  };

  useEffect(() => {
    const parteId = new URLSearchParams(location.search).get('id') || '';
    setId(parteId);
    if (!parteId) { setChybaNacitania('Chýba, ku ktorému parte kondolencie patria.'); return; }
    nacitaj(parteId);
  }, []);

  /** Rámik s náhľadom narastie na výšku e-mailu, nech sa neroluje dvakrát. */
  const prisposobVysku = () => {
    const dok = ramik.current?.contentDocument;
    if (ramik.current && dok?.body) ramik.current.style.height = `${dok.body.scrollHeight + 2}px`;
  };

  const odosli = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nahlad) return;
    const komu = [...new Set(adresy.map((a) => a.trim().toLowerCase()).filter(Boolean))];
    if (!komu.length) { setChyba(true); setHlaska('Zadaj aspoň jednu e-mailovú adresu.'); return; }

    const posledne = nahlad.odoslania?.[0];
    const otazka = `Poslať ${tvar(nahlad.pocet, ['kondolenciu', 'kondolencie', 'kondolencií'])} `
      + `na ${tvar(komu.length, ['adresu', 'adresy', 'adries'])}?\n\n${komu.join('\n')}`
      + (posledne ? `\n\nPozor: kondolencie k tomuto parte už raz odišli ${fmtDT(posledne.created_at)} na ${posledne.komu.join(', ')}.` : '');
    if (!confirm(otazka)) return;

    setOdosiela(true); setHlaska(''); setChyba(false);
    try {
      const v = await api({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parte: id, emaily: komu }),
      });
      setAdresy(['']);
      setChyba(!!v.varovanie);
      setHlaska(`Odoslané na ${tvar(v.odoslane, ['adresu', 'adresy', 'adries'])}.${v.varovanie ? ` ${v.varovanie}` : ''}`);
      await nacitaj(id);
    } catch (err: any) {
      setChyba(true);
      setHlaska(err?.message || 'Kondolencie sa nepodarilo odoslať.');
    } finally {
      setOdosiela(false);
    }
  };

  if (chybaNacitania) {
    return (
      <Ramec><Bunka>
        <HlavaPanelu nadpis="Kondolencie sa nedajú poslať" popis={chybaNacitania} />
        <OdkazTlacidlo href={ZOZNAM}>Späť na zoznam parte</OdkazTlacidlo>
      </Bunka></Ramec>
    );
  }

  if (!nahlad) return <Ramec><Bunka><Nacitavam /></Bunka></Ramec>;

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis="Kondolencie pozostalým"
        popis={`Pošli rodine e-mailom kondolencie k parte ${nahlad.parte.meno}.`}
        akcie={<OdkazTlacidlo href={ZOZNAM}>Späť na zoznam</OdkazTlacidlo>}
      />

      {nahlad.cakaju > 0 && (
        <Ramec><Bunka className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-[#e0c07a]">
            Na schválenie čaká: {nahlad.cakaju}. Do e-mailu idú len schválené kondolencie.
          </p>
          <OdkazTlacidlo maly href="/admin/kondolencie">Schváliť kondolencie</OdkazTlacidlo>
        </Bunka></Ramec>
      )}

      {nahlad.pocet === 0 ? (
        <Ramec><Bunka>
          <Prazdno text="Pri tomto parte zatiaľ nie je žiadna schválená kondolencia." />
        </Bunka></Ramec>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          {/* Náhľad dlhého e-mailu sa roluje. Formulár s tlačidlom ostáva vedľa neho. */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-16">
            <Ramec><Bunka>
              <HlavaPanelu
                nadpis="Komu poslať"
                popis="Každý dostane vlastný e-mail. Adresy ostatných neuvidí."
              />
              <form onSubmit={odosli}>
                <div className="flex flex-col gap-2">
                  {adresy.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Vstup
                        type="email" required={i === 0} maxLength={254} autoComplete="off"
                        placeholder="napr. meno@gmail.com" aria-label={`E-mail ${i + 1}`}
                        value={a}
                        onChange={(e) => setAdresy(adresy.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                      {adresy.length > 1 && (
                        <button type="button" aria-label="Odobrať adresu"
                          onClick={() => setAdresy(adresy.filter((_, j) => j !== i))}
                          className="mt-1.5 grid size-10 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-foreground">
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {adresy.length < MAX_ADRIES && (
                  <Tlacidlo type="button" maly variant="ticho" className="mt-2 -ml-3"
                    onClick={() => setAdresy([...adresy, ''])}>
                    <Plus className="size-4" /> Pridať ďalšiu adresu
                  </Tlacidlo>
                )}

                <p className="mt-4 text-[13.5px] text-muted-foreground">
                  Schválené kondolencie: {nahlad.pocet}. Rodina ich dostane v takom poradí, ako ich ľudia písali.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                  <Tlacidlo type="submit" variant="plne" cakaj={odosiela}>Odoslať kondolencie</Tlacidlo>
                </div>
                <Hlaska text={hlaska} chyba={chyba} />
              </form>
            </Bunka></Ramec>

            <Ramec><Bunka>
              <HlavaPanelu nadpis="Už odoslané" />
              {nahlad.odoslania === null ? (
                <p className="text-[13.5px] text-muted-foreground">Záznamy o odoslaní sa nepodarilo načítať.</p>
              ) : nahlad.odoslania.length === 0 ? (
                <p className="text-[13.5px] text-muted-foreground">Kondolencie k tomuto parte zatiaľ neodišli.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {nahlad.odoslania.map((o) => (
                    <li key={o.created_at} className="text-[13.5px]">
                      <p className="font-semibold">{o.komu.join(', ')}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {fmtDT(o.created_at)} · {tvar(o.pocet, ['kondolencia', 'kondolencie', 'kondolencií'])} · poslal {naLogin(o.odoslal_email)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Bunka></Ramec>
          </div>

          <Ramec>
            <Bunka className="py-4 text-[13px] text-muted-foreground">
              <p><span className="font-semibold text-foreground">Od:</span> {nahlad.od}</p>
              <p className="mt-1"><span className="font-semibold text-foreground">Predmet:</span> {nahlad.predmet}</p>
            </Bunka>
            {/* Bez skriptov (sandbox), ale s rovnakým pôvodom, aby sa dala
                odmerať výška e-mailu. Texty kondolencií sú už ošetrené. */}
            <iframe
              ref={ramik}
              title="Náhľad e-mailu"
              sandbox="allow-same-origin"
              srcDoc={nahlad.html ?? ''}
              onLoad={prisposobVysku}
              className="block h-[720px] w-full border-t border-border bg-white"
            />
          </Ramec>
        </div>
      )}
    </div>
  );
}

export default KondolenciePozostalym;
