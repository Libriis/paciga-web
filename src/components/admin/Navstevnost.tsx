/* Návštevnosť webu z vlastného počítadla.
   Súhrn s porovnaním voči predchádzajúcemu obdobiu, denný priebeh,
   najnavštevovanejšie stránky, zdroje návštev a krajiny. */
import { useEffect, useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, XAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Bunka, Chipy, HlavaPanelu, HlavaStranky, Mriezka, Nacitavam, Prazdno, Ramec,
} from './ui';
import { getClient, DEMO } from '@/scripts/admin-core.js';

type Denny = { den: string; zobrazenia: number; navstevy: number; mobil: number; desktop: number };
type Stranka = { cesta: string; zobrazenia: number; navstevy: number };
type Zdroj = { zdroj: string; navstevy: number; zobrazenia: number };
type Krajina = { krajina: string; navstevy: number };
type Suhrn = {
  zobrazenia: number; navstevy: number; mobil: number; desktop: number;
  stranok: number; zobrazenia_pred: number; navstevy_pred: number;
};
type Data = { denne: Denny[]; stranky: Stranka[]; zdroje: Zdroj[]; krajiny: Krajina[]; suhrn: Suhrn | null };

const OBDOBIA = [
  { key: '7', label: 'Posledných 7 dní' },
  { key: '28', label: 'Posledných 28 dní' },
  { key: '90', label: 'Posledných 90 dní' },
  { key: '365', label: 'Posledný rok' },
];

const ZDROJE: Record<string, string> = {
  priamo: 'Priamo (adresa alebo záložka)',
  google: 'Google',
  seznam: 'Seznam',
  bing: 'Bing a iné vyhľadávače',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  email: 'E-mail',
  ine: 'Iné stránky',
};

const KRAJINY: Record<string, string> = {
  SK: 'Slovensko', CZ: 'Česko', AT: 'Rakúsko', DE: 'Nemecko', HU: 'Maďarsko',
  PL: 'Poľsko', GB: 'Veľká Británia', IE: 'Írsko', US: 'USA', UA: 'Ukrajina',
  IT: 'Taliansko', CH: 'Švajčiarsko', '??': 'Neznáma',
};

const cislo = (n: number) => Number(n || 0).toLocaleString('sk-SK');

/* Zmena oproti rovnako dlhému obdobiu pred týmto. Jedno číslo bez
   porovnania nič nepovie: 400 návštev je veľa alebo málo? */
function Zmena({ teraz, pred }: { teraz: number; pred: number }) {
  if (!pred) return <>bez porovnania</>;
  const pct = Math.round(((teraz - pred) / pred) * 100);
  const farba = pct > 0 ? '#2f9e77' : pct < 0 ? '#c0504d' : undefined;
  return (
    <span style={{ color: farba }}>
      {pct > 0 ? '+' : ''}{pct} % oproti minulému obdobiu
    </span>
  );
}

function KpiBunka({ titulok, hodnota, poznamka }: {
  titulok: string; hodnota: string; poznamka?: React.ReactNode;
}) {
  return (
    <Bunka>
      <p className="text-[13px] text-muted-foreground">{titulok}</p>
      <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight tabular-nums">{hodnota}</p>
      <p className="mt-3 min-h-4 text-[12.5px] text-muted-foreground">{poznamka || ''}</p>
    </Bunka>
  );
}

function PruhovyRiadok({ popis, hodnota, podiel }: { popis: string; hodnota: string; podiel: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-[13.5px]">{popis}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <span className="block h-full rounded-full"
          style={{ width: `${podiel}%`, background: 'rgba(245,245,245,0.75)' }} />
      </span>
      <span className="w-24 shrink-0 text-right text-[12.5px] tabular-nums text-muted-foreground">{hodnota}</span>
    </div>
  );
}

const konfigGraf = {
  zobrazenia: { label: 'Zobrazenia', color: 'rgba(245,245,245,0.5)' },
  navstevy: { label: 'Návštevy', color: '#f5f5f5' },
} satisfies ChartConfig;

export function Navstevnost() {
  const [obdobie, setObdobie] = useState('28');
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (DEMO) return;
    let zivy = true;
    setData(null);
    (async () => {
      const sb = getClient();
      const dni = Number(obdobie);
      /* Agregáciu robí databáza, nie prehliadač. Sťahovať desaťtisíce
         riadkov len na to, aby sme z nich zrátali graf, nemá zmysel. */
      const [denne, stranky, zdroje, krajiny, suhrn] = await Promise.all([
        sb.rpc('navstevnost_denne', { dni }),
        sb.rpc('navstevnost_stranky', { dni, pocet: 30 }),
        sb.rpc('navstevnost_zdroje', { dni }),
        sb.rpc('navstevnost_krajiny', { dni }),
        sb.rpc('navstevnost_suhrn', { dni }),
      ]);
      if (!zivy) return;
      const s = Array.isArray(suhrn.data) ? suhrn.data[0] : suhrn.data;
      setData({
        denne: (denne.data as Denny[]) || [],
        stranky: (stranky.data as Stranka[]) || [],
        zdroje: (zdroje.data as Zdroj[]) || [],
        krajiny: (krajiny.data as Krajina[]) || [],
        suhrn: (s as Suhrn) || null,
      });
    })().catch(() => {
      if (zivy) setData({ denne: [], stranky: [], zdroje: [], krajiny: [], suhrn: null });
    });
    return () => { zivy = false; };
  }, [obdobie]);

  const graf = useMemo(() => (data?.denne || []).map((d) => ({
    ...d,
    label: new Date(d.den + 'T00:00:00').toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' }),
  })), [data]);

  if (DEMO) {
    return (
      <div className="flex flex-col gap-5">
        <HlavaStranky nadpis="Návštevnosť" popis="Kto chodí na web, odkiaľ prišiel a čo si pozrel." />
        <Ramec>
          <Bunka>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">Počítadlo beží len na ostrých dátach.</strong>{' '}
              Návštevy zbiera nasadený web od skutočných ľudí, takže v demo režime
              nie je čo ukázať. Vymyslené čísla by tu boli horšie než prázdna stránka.
            </p>
          </Bunka>
        </Ramec>
      </div>
    );
  }

  const s = data?.suhrn;
  const naNavstevu = s && s.navstevy ? (s.zobrazenia / s.navstevy).toFixed(1) : '–';
  const mobilPct = s && (s.mobil + s.desktop) ? Math.round((100 * s.mobil) / (s.mobil + s.desktop)) : null;
  const maxStranka = Math.max(1, ...(data?.stranky || []).map((r) => r.zobrazenia));
  const maxZdroj = Math.max(1, ...(data?.zdroje || []).map((r) => r.navstevy));
  const maxKrajina = Math.max(1, ...(data?.krajiny || []).map((r) => r.navstevy));
  const spoluZdroje = (data?.zdroje || []).reduce((a, r) => a + Number(r.navstevy || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis="Návštevnosť"
        popis="Vlastné počítadlo, nie cudzí dashboard. Nepoužíva cookie ani IP adresu, preto web nepotrebuje súhlas navyše. Návšteva je jeden príchod na web, zobrazenie je jedna otvorená stránka."
      />

      <Chipy polozky={OBDOBIA} vybrany={obdobie} onVyber={setObdobie} />

      {data === null ? (
        <Ramec><Bunka><Nacitavam /></Bunka></Ramec>
      ) : !s || !Number(s.zobrazenia) ? (
        <Ramec>
          <Bunka>
            <Prazdno text="Za zvolené obdobie zatiaľ žiadne návštevy. Počítadlo zbiera dáta až odvtedy, čo je na webe nasadené." />
          </Bunka>
        </Ramec>
      ) : (
        <>
          <Ramec>
            <Mriezka stlpce="sm:grid-cols-2 xl:grid-cols-4">
              <KpiBunka titulok="Návštevy" hodnota={cislo(s.navstevy)}
                poznamka={<Zmena teraz={Number(s.navstevy)} pred={Number(s.navstevy_pred)} />} />
              <KpiBunka titulok="Zobrazenia stránok" hodnota={cislo(s.zobrazenia)}
                poznamka={<Zmena teraz={Number(s.zobrazenia)} pred={Number(s.zobrazenia_pred)} />} />
              <KpiBunka titulok="Stránok na návštevu" hodnota={naNavstevu}
                poznamka={`Videných ${cislo(s.stranok)} rôznych stránok`} />
              <KpiBunka titulok="Z mobilu" hodnota={mobilPct === null ? '–' : mobilPct + ' %'}
                poznamka={`${cislo(s.mobil)} mobil · ${cislo(s.desktop)} počítač`} />
            </Mriezka>

            <Mriezka stlpce="" horna>
              <Bunka>
                <HlavaPanelu nadpis="Denný priebeh"
                  popis="Stĺpce sú zobrazenia stránok, čiara sú samotné návštevy." />
                <ChartContainer config={konfigGraf} className="h-[260px] w-full">
                  <ComposedChart data={graf} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                    <defs>
                      <linearGradient id="navZobrazenia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(245,245,245,0.55)" />
                        <stop offset="100%" stopColor="rgba(245,245,245,0.08)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12}
                      tick={{ fill: 'rgba(245,245,245,0.5)', fontSize: 11 }} interval="preserveStartEnd" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar isAnimationActive={false} dataKey="zobrazenia" fill="url(#navZobrazenia)"
                      radius={[2, 2, 0, 0]} maxBarSize={26} />
                    <Line isAnimationActive={false} type="monotone" dataKey="navstevy" stroke="#f5f5f5"
                      strokeWidth={2} dot={false} connectNulls />
                  </ComposedChart>
                </ChartContainer>
              </Bunka>
            </Mriezka>

            <Mriezka stlpce="lg:grid-cols-3" horna>
              <Bunka className="lg:col-span-2">
                <HlavaPanelu nadpis="Najnavštevovanejšie stránky"
                  popis="Zoradené podľa zobrazení. Tu vidno, čo ľudí na webe naozaj zaujíma." />
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Stránka</TableHead>
                        <TableHead className="text-right text-[12px] font-semibold uppercase tracking-wide">Zobrazenia</TableHead>
                        <TableHead className="text-right text-[12px] font-semibold uppercase tracking-wide">Návštevy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.stranky.map((r) => (
                        <TableRow key={r.cesta} className="border-border">
                          <TableCell>
                            <a href={r.cesta} target="_blank" rel="noopener" className="hover:underline">{r.cesta}</a>
                            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-secondary">
                              <span className="block h-full rounded-full"
                                style={{
                                  width: `${Math.round((Number(r.zobrazenia) / maxStranka) * 100)}%`,
                                  background: 'rgba(245,245,245,0.6)',
                                }} />
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{cislo(r.zobrazenia)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{cislo(r.navstevy)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Bunka>

              <div className="flex flex-col gap-px bg-border">
                <Bunka>
                  <HlavaPanelu nadpis="Odkiaľ prišli"
                    popis="Počíta sa na návštevy, nie na prekliky v rámci webu." />
                  <div className="flex flex-col gap-2.5">
                    {data.zdroje.map((r) => (
                      <PruhovyRiadok key={r.zdroj} popis={ZDROJE[r.zdroj] || r.zdroj}
                        hodnota={`${cislo(r.navstevy)} · ${spoluZdroje ? Math.round((100 * Number(r.navstevy)) / spoluZdroje) : 0} %`}
                        podiel={Math.round((Number(r.navstevy) / maxZdroj) * 100)} />
                    ))}
                  </div>
                </Bunka>

                <Bunka>
                  <HlavaPanelu nadpis="Krajiny" popis="Domáca prevádzka verzus cudzí šum." />
                  <div className="flex flex-col gap-2.5">
                    {data.krajiny.map((r) => (
                      <PruhovyRiadok key={r.krajina} popis={KRAJINY[r.krajina] || r.krajina}
                        hodnota={cislo(r.navstevy)}
                        podiel={Math.round((Number(r.navstevy) / maxKrajina) * 100)} />
                    ))}
                  </div>
                </Bunka>
              </div>
            </Mriezka>
          </Ramec>

          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Čísla sú z vlastného počítadla na webe. Návštevníci s blokovačom reklám sa
            do nich nedostanú, skutočnosť je teda o niečo vyššia. Administrácia, roboty
            a lokálny vývoj sa nepočítajú.
          </p>
        </>
      )}
    </div>
  );
}

export default Navstevnost;
