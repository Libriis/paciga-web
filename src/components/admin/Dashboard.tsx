/* Prehľadová stránka administrácie.
   Mriežka podľa vzoru „Efferd Dashboard 2": jeden rám, bunky oddelené
   vlasovými linkami (gap-px na farbe rámu), žiadne guľaté karty vnútri.
   Riadok 1 = štyri čísla, riadok 2 = dva grafy, riadok 3 = tabuľka,
   stav webu a posledná aktivita. */
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2, TrendingDown, TrendingUp, Mail, MessageSquare, Inbox,
} from 'lucide-react';
import {
  getClient, fmtD, fmtEUR, STAVY, AKTIVNE_STAVY, POBOCKY, POBOCKY_FARBY, MESIACE_KRATKE,
} from '@/scripts/admin-core.js';

type Zakazka = Record<string, any>;

const TYP_LABEL: Record<string, string> = {
  termin_vyzdvihnutie: 'Vyzdvihnutie zosnulého',
  termin_rakva: 'Dovoz rakvy',
  termin_rozlucka: 'Posledná rozlúčka',
};

const dnes = new Date();
const dnesStr = dnes.toISOString().slice(0, 10);
const zajtraStr = new Date(dnes.getTime() + 864e5).toISOString().slice(0, 10);
const doTyzdnaStr = new Date(dnes.getTime() + 7 * 864e5).toISOString().slice(0, 10);
const mesiacKlic = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const tentoMesiac = mesiacKlic(dnes);
const minulyMesiac = mesiacKlic(new Date(dnes.getFullYear(), dnes.getMonth() - 1, 1));

/* ---------- malé stavebné diely mriežky ---------- */

function Bunka({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-background p-5 ${className}`}>{children}</div>;
}

function Kpi({ titulok, hodnota, delta, popisDelty }: {
  titulok: string; hodnota: string; delta?: number | null; popisDelty?: string;
}) {
  const rastie = (delta ?? 0) >= 0;
  return (
    <Bunka>
      <p className="text-[13px] text-muted-foreground">{titulok}</p>
      <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight tabular-nums">{hodnota}</p>
      <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
        {delta == null ? (
          <span>{popisDelty}</span>
        ) : (
          <>
            {rastie ? <TrendingUp className="size-3.5 text-[#6bbf8a]" /> : <TrendingDown className="size-3.5 text-[#d18a8a]" />}
            <span className={rastie ? 'font-semibold text-[#6bbf8a]' : 'font-semibold text-[#d18a8a]'}>
              {rastie ? '+' : ''}{delta.toFixed(1)} %
            </span>
            <span>{popisDelty}</span>
          </>
        )}
      </p>
    </Bunka>
  );
}

function Odznak({ hodnota }: { hodnota: number }) {
  const rastie = hodnota >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold ${
      rastie ? 'bg-[#6bbf8a]/12 text-[#6bbf8a]' : 'bg-[#d18a8a]/12 text-[#d18a8a]'}`}
    >
      {rastie ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {rastie ? '+' : ''}{hodnota.toFixed(1)} %
    </span>
  );
}

function HlavaPanelu({ nadpis, popis, odznak }: { nadpis: string; popis: string; odznak?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        <h2 className="text-[15px] font-semibold tracking-tight">{nadpis}</h2>
        {odznak}
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">{popis}</p>
    </div>
  );
}

/* ---------- stránka ---------- */

export function Dashboard() {
  const [zakazky, setZakazky] = useState<Zakazka[] | null>(null);
  const [dopyty, setDopyty] = useState<Zakazka[]>([]);
  const [kondolencie, setKondolencie] = useState<Zakazka[]>([]);
  const [pobocka, setPobocka] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('paciga-admin-pobocka') || null : null);

  useEffect(() => {
    const sb = getClient();
    (async () => {
      const [z, d, k] = await Promise.all([
        sb.from('zakazky').select('*'),
        sb.from('dopyty').select('*'),
        sb.from('kondolencie').select('*'),
      ]);
      setZakazky(z.data || []);
      setDopyty(d.data || []);
      setKondolencie(k.data || []);
    })().catch(() => setZakazky([]));
  }, []);

  const vyberPobocku = (p: string | null) => {
    setPobocka(p);
    if (p) localStorage.setItem('paciga-admin-pobocka', p);
    else localStorage.removeItem('paciga-admin-pobocka');
  };

  const data = useMemo(() => {
    const vsetky = zakazky || [];
    const zoznam = pobocka ? vsetky.filter((z) => z.pobocka === pobocka) : vsetky;

    const udalosti: { t: string; typ: string; z: Zakazka }[] = [];
    for (const z of zoznam) {
      if (!AKTIVNE_STAVY.includes(z.stav)) continue;
      for (const typ of Object.keys(TYP_LABEL)) {
        const t = z[typ];
        if (t && String(t).slice(0, 10) >= dnesStr) udalosti.push({ t: String(t), typ, z });
      }
    }
    udalosti.sort((a, b) => (a.t < b.t ? -1 : 1));

    const vMesiaci = (klic: string) => zoznam.filter((z) => String(z.datum_umrtia || '').startsWith(klic));
    const tento = vMesiaci(tentoMesiac);
    const minuly = vMesiaci(minulyMesiac);
    const trzbyTento = tento.reduce((s, z) => s + (Number(z.suma) || 0), 0);
    const trzbyMinuly = minuly.reduce((s, z) => s + (Number(z.suma) || 0), 0);
    const rozdiel = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);

    // posledných 7 mesiacov — sedem stĺpcov ako vo vzore
    const mesiace = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(dnes.getFullYear(), dnes.getMonth() - i, 1);
      const riadok: Record<string, any> = { klic: mesiacKlic(d), label: MESIACE_KRATKE[d.getMonth()], celkom: 0 };
      POBOCKY.forEach((x: string) => { riadok[x] = 0; });
      mesiace.push(riadok);
    }
    zoznam.forEach((z) => {
      const m = mesiace.find((x) => String(z.datum_umrtia || '').startsWith(x.klic));
      if (!m) return;
      m.celkom++;
      if (m[z.pobocka] !== undefined) m[z.pobocka]++;
    });

    const nevybaveneDopyty = dopyty.filter((d) => !d.precitane);
    const naSchvalenie = kondolencie.filter((k) => !k.schvalene);

    const aktivita = [
      ...nevybaveneDopyty.map((d) => ({
        typ: 'dopyt' as const, kedy: d.created_at, titulok: d.meno || 'Dopyt z webu', popis: d.sprava || d.email || '',
      })),
      ...naSchvalenie.map((k) => ({
        typ: 'kondolencia' as const, kedy: k.created_at, titulok: k.meno || 'Kondolencia', popis: k.text || '',
      })),
    ].sort((a, b) => String(b.kedy || '').localeCompare(String(a.kedy || ''))).slice(0, 5);

    return {
      zoznam,
      udalosti,
      aktivne: zoznam.filter((z) => AKTIVNE_STAVY.includes(z.stav)).length,
      dvaDni: udalosti.filter((u) => u.t.slice(0, 10) <= zajtraStr).length,
      pohrebyMesiac: tento.length,
      pohrebyDelta: rozdiel(tento.length, minuly.length),
      trzby: trzbyTento,
      trzbyDelta: rozdiel(trzbyTento, trzbyMinuly),
      mesiace,
      trendMesiacov: rozdiel(
        mesiace.slice(-3).reduce((s, m) => s + m.celkom, 0),
        mesiace.slice(0, 3).reduce((s, m) => s + m.celkom, 0)),
      nevybaveneDopyty,
      naSchvalenie,
      aktivita,
    };
  }, [zakazky, dopyty, kondolencie, pobocka]);

  const kedy = (t: string) => {
    const [d, cas] = t.split('T');
    const den = d === dnesStr ? 'Dnes' : d === zajtraStr ? 'Zajtra' : fmtD(d);
    return cas ? `${den} o ${cas}` : den;
  };

  const konfigStlpce = { celkom: { label: 'Pohreby', color: 'rgba(245,245,245,0.85)' } } satisfies ChartConfig;
  const konfigCiary = Object.fromEntries(
    POBOCKY.map((p: string) => [p, { label: p, color: POBOCKY_FARBY[p] }])) as ChartConfig;

  const pozdrav = dnes.getHours() < 10 ? 'Dobré ráno' : dnes.getHours() < 18 ? 'Dobrý deň' : 'Dobrý večer';
  const cakaSpolu = data.nevybaveneDopyty.length + data.naSchvalenie.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold leading-tight tracking-tight">{pozdrav}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Prehľad prevádzky k dnešnému dňu.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[null, ...POBOCKY].map((p) => (
            <button
              key={p ?? 'vsetky'}
              type="button"
              onClick={() => vyberPobocku(p as string | null)}
              className={`h-8 rounded-md border px-3 text-[13px] transition-colors ${
                pobocka === p
                  ? 'border-transparent bg-primary font-semibold text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              {p ?? 'Všetky pobočky'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
          <Kpi titulok="Aktívne zákazky" hodnota={String(data.aktivne)} popisDelty="v riešení práve teraz" />
          <Kpi titulok="Udalosti dnes a zajtra" hodnota={String(data.dvaDni)} popisDelty="termíny z aktívnych zákaziek" />
          <Kpi titulok="Pohreby tento mesiac" hodnota={String(data.pohrebyMesiac)} delta={data.pohrebyDelta} popisDelty="oproti minulému mesiacu" />
          <Kpi titulok="Tržby tento mesiac" hodnota={fmtEUR(data.trzby)} delta={data.trzbyDelta} popisDelty="oproti minulému mesiacu" />
        </div>

        <div className="grid grid-cols-1 gap-px border-t border-border bg-border lg:grid-cols-2">
          <Bunka>
            <HlavaPanelu
              nadpis="Pohreby po mesiacoch"
              popis="Počet zákaziek podľa dátumu úmrtia, posledných 7 mesiacov."
              odznak={data.trendMesiacov != null ? <Odznak hodnota={data.trendMesiacov} /> : undefined}
            />
            <ChartContainer config={konfigStlpce} className="h-[240px] w-full">
              <BarChart data={data.mesiace} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="pacigaStlpec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(245,245,245,0.78)" />
                    <stop offset="100%" stopColor="rgba(245,245,245,0.10)" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12}
                  tick={{ fill: 'rgba(245,245,245,0.5)', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="celkom" fill="url(#pacigaStlpec)" radius={[2, 2, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ChartContainer>
          </Bunka>

          <Bunka>
            <HlavaPanelu nadpis="Zákazky podľa pobočiek" popis="Vývoj za rovnaké obdobie, jedna čiara na pobočku." />
            <ChartContainer config={konfigCiary} className="h-[240px] w-full">
              <LineChart data={data.mesiace} margin={{ top: 10, right: 6, left: 6, bottom: 0 }}>
                <defs>
                  {/* jemná žiara pod čiarami, ako má vzor pri „Channel sales" */}
                  {POBOCKY.map((p: string) => (
                    <filter key={p} id={`ziara-${p.replace(/\s/g, '')}`} x="-20%" y="-40%" width="140%" height="180%">
                      <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={POBOCKY_FARBY[p]} floodOpacity="0.45" />
                    </filter>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12}
                  tick={{ fill: 'rgba(245,245,245,0.5)', fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {POBOCKY.map((p: string) => (
                  <Line key={p} type="stepAfter" dataKey={p} stroke={POBOCKY_FARBY[p]}
                    strokeWidth={2} dot={false} activeDot={{ r: 3 }}
                    filter={`url(#ziara-${p.replace(/\s/g, '')})`} />
                ))}
              </LineChart>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {POBOCKY.map((p: string) => (
                <span key={p} className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: POBOCKY_FARBY[p] }} />{p}
                </span>
              ))}
            </div>
          </Bunka>
        </div>

        <div className="grid grid-cols-1 gap-px border-t border-border bg-border lg:grid-cols-4">
          <Bunka className="lg:col-span-2">
            <HlavaPanelu nadpis="Najbližšie udalosti" popis="Termíny aktívnych zákaziek na najbližších 7 dní." />
            {data.udalosti.filter((u) => u.t.slice(0, 10) <= doTyzdnaStr).length === 0 ? (
              <p className="py-8 text-[14px] text-muted-foreground">
                {zakazky === null ? 'Načítavam…' : 'Najbližších 7 dní bez naplánovaných udalostí.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="h-9 px-0 text-[12px] font-semibold uppercase tracking-wide">Zosnulý</TableHead>
                    <TableHead className="h-9 text-[12px] font-semibold uppercase tracking-wide">Udalosť</TableHead>
                    <TableHead className="h-9 pr-0 text-right text-[12px] font-semibold uppercase tracking-wide">Kedy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.udalosti.filter((u) => u.t.slice(0, 10) <= doTyzdnaStr).slice(0, 8).map((u, i) => (
                    <TableRow key={`${u.z.id}-${u.typ}-${i}`} className="border-border">
                      <TableCell className="px-0 font-medium">
                        <a href={`/admin/zakazka?id=${u.z.id}`} className="hover:underline">
                          {u.z.zosnuly_meno || u.z.cislo || 'zákazka'}
                        </a>
                        {u.z.pobocka && <span className="block text-[12px] text-muted-foreground">{u.z.pobocka}</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{TYP_LABEL[u.typ]}</TableCell>
                      <TableCell className="pr-0 text-right tabular-nums">{kedy(u.t)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Bunka>

          <Bunka>
            <HlavaPanelu nadpis="Stav webu" popis={cakaSpolu ? 'Čaká na tvoje rozhodnutie.' : 'Nič urgentné nečaká.'} />
            {cakaSpolu === 0 ? (
              <div className="grid place-items-center py-8">
                <span className="grid size-11 place-items-center rounded-full border border-border">
                  <CheckCircle2 className="size-5 text-[#6bbf8a]" />
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <a href="/admin/web#dopyty" className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 transition-colors hover:border-foreground/25">
                  <span className="flex items-center gap-2 text-[14px]"><Mail className="size-4 text-muted-foreground" /> Nevybavené dopyty</span>
                  <b className="tabular-nums">{data.nevybaveneDopyty.length}</b>
                </a>
                <a href="/admin/web#kondolencie" className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 transition-colors hover:border-foreground/25">
                  <span className="flex items-center gap-2 text-[14px]"><MessageSquare className="size-4 text-muted-foreground" /> Kondolencie</span>
                  <b className="tabular-nums">{data.naSchvalenie.length}</b>
                </a>
              </div>
            )}
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Zákazky podľa stavu</p>
              <div className="mt-2 flex flex-col gap-1">
                {STAVY.map((s: { key: string; label: string }) => (
                  <div key={s.key} className="flex items-center justify-between text-[13.5px]">
                    <span className="text-muted-foreground">{s.label}</span>
                    <b className="tabular-nums">{data.zoznam.filter((z) => z.stav === s.key).length}</b>
                  </div>
                ))}
              </div>
            </div>
          </Bunka>

          <Bunka>
            <HlavaPanelu nadpis="Posledná aktivita" popis="Čo prišlo z webu." />
            {data.aktivita.length === 0 ? (
              <div className="flex items-center gap-2 py-6 text-[14px] text-muted-foreground">
                <Inbox className="size-4" /> Zatiaľ nič nové.
              </div>
            ) : (
              <ul className="-mx-5 divide-y divide-border border-y border-border">
                {data.aktivita.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 px-5 py-3">
                    {a.typ === 'dopyt'
                      ? <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      : <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">{a.titulok}</p>
                      <p className="truncate text-[12.5px] text-muted-foreground">{a.popis || '—'}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Bunka>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
