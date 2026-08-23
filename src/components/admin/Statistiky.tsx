/* Štatistiky a vyhodnotenia.
   Filtre obdobia a pobočky, KPI, mesačné grafy, porovnanie pobočiek,
   zdroje zákaziek, miesta rozlúčok a čísla z webu. */
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Bunka, Chipy, HlavaPanelu, HlavaStranky, Mriezka, Nacitavam, Ramec, usePobocka,
} from './ui';
import {
  getClient, fmtEUR, POBOCKY, POBOCKY_FARBY, MESIACE_KRATKE, ZDROJE,
} from '@/scripts/admin-core.js';

type Riadok = Record<string, any>;

const dnes = new Date();

const OBDOBIA = [
  { key: '12m', label: 'Posledných 12 mesiacov' },
  { key: 'rok', label: `Rok ${dnes.getFullYear()}` },
  { key: 'vlani', label: `Rok ${dnes.getFullYear() - 1}` },
  { key: 'vsetko', label: 'Celá história' },
];

/** Vodorovný pruh s popisom a číslom. Používa sa pri zdrojoch aj miestach. */
function PruhovyRiadok({ popis, hodnota, podiel, farba = 'rgba(245,245,245,0.75)' }: {
  popis: React.ReactNode; hodnota: string; podiel: number; farba?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-[13.5px]">{popis}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <span className="block h-full rounded-full" style={{ width: `${podiel}%`, background: farba }} />
      </span>
      <span className="w-20 shrink-0 text-right text-[12.5px] tabular-nums text-muted-foreground">{hodnota}</span>
    </div>
  );
}

function KpiBunka({ titulok, hodnota, poznamka }: { titulok: string; hodnota: string; poznamka?: string }) {
  return (
    <Bunka>
      <p className="text-[13px] text-muted-foreground">{titulok}</p>
      <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight tabular-nums">{hodnota}</p>
      <p className="mt-3 min-h-4 text-[12.5px] text-muted-foreground">{poznamka || ''}</p>
    </Bunka>
  );
}

export function Statistiky() {
  const [zakazky, setZakazky] = useState<Riadok[] | null>(null);
  const [dopyty, setDopyty] = useState<Riadok[]>([]);
  const [kondolencie, setKondolencie] = useState<Riadok[]>([]);
  const [parte, setParte] = useState<Riadok[]>([]);
  const [obdobie, setObdobie] = useState('12m');
  const [pobocka, setPobocka] = usePobocka();

  useEffect(() => {
    const sb = getClient();
    (async () => {
      const [z, d, k, p] = await Promise.all([
        sb.from('zakazky').select('*'),
        sb.from('dopyty').select('*'),
        sb.from('kondolencie').select('*'),
        sb.from('parte').select('*'),
      ]);
      setZakazky(z.data || []);
      setDopyty(d.data || []);
      setKondolencie(k.data || []);
      setParte(p.data || []);
    })().catch(() => setZakazky([]));
  }, []);

  /** Mesiace zvoleného obdobia ako {klic, label}. */
  const mesiace = useMemo(() => {
    const out: { klic: string; label: string }[] = [];
    const push = (rok: number, m: number) => out.push({
      klic: `${rok}-${String(m + 1).padStart(2, '0')}`,
      label: `${MESIACE_KRATKE[m]}${m === 0 || out.length === 0 ? ' ' + String(rok).slice(2) : ''}`,
    });
    if (obdobie === '12m') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(dnes.getFullYear(), dnes.getMonth() - i, 1);
        push(d.getFullYear(), d.getMonth());
      }
    } else if (obdobie === 'rok') {
      for (let m = 0; m <= dnes.getMonth(); m++) push(dnes.getFullYear(), m);
    } else if (obdobie === 'vlani') {
      for (let m = 0; m < 12; m++) push(dnes.getFullYear() - 1, m);
    } else {
      const daty = (zakazky || []).map((z) => z.datum_umrtia).filter(Boolean).sort();
      if (!daty.length) return out;
      let d = new Date(String(daty[0]).slice(0, 7) + '-01T12:00');
      const koniec = new Date(dnes.getFullYear(), dnes.getMonth(), 1);
      while (d <= koniec && out.length < 36) {
        push(d.getFullYear(), d.getMonth());
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
    }
    return out;
  }, [obdobie, zakazky]);

  const data = useMemo(() => {
    const vsetky = zakazky || [];
    const klice = new Set(mesiace.map((m) => m.klic));
    const vybrane = vsetky.filter((z) =>
      z.datum_umrtia && klice.has(String(z.datum_umrtia).slice(0, 7)) && (!pobocka || z.pobocka === pobocka));

    const trzby = vybrane.reduce((s, z) => s + (Number(z.suma) || 0), 0);
    const soSumou = vybrane.filter((z) => z.suma);
    const kremacie = vybrane.filter((z) => z.typ === 'kremacia').length;

    const poMesiacoch = mesiace.map((m) => {
      const riadok: Record<string, any> = { ...m, celkom: 0, trzby: 0, kremacie: 0, kremaciePct: 0 };
      POBOCKY.forEach((p: string) => { riadok[p] = 0; });
      return riadok;
    });
    vybrane.forEach((z) => {
      const m = poMesiacoch.find((x) => String(z.datum_umrtia).startsWith(x.klic));
      if (!m) return;
      m.celkom++;
      m.trzby += Number(z.suma) || 0;
      if (z.typ === 'kremacia') m.kremacie++;
      if (m[z.pobocka] !== undefined) m[z.pobocka]++;
    });
    poMesiacoch.forEach((m) => {
      m.kremaciePct = m.celkom ? Math.round((m.kremacie / m.celkom) * 100) : null;
    });

    const porovnanie = POBOCKY.map((pob: string) => {
      const zak = vsetky.filter((z) => z.pobocka === pob && z.datum_umrtia && klice.has(String(z.datum_umrtia).slice(0, 7)));
      const t = zak.reduce((s, z) => s + (Number(z.suma) || 0), 0);
      const sSumou = zak.filter((z) => z.suma).length;
      const krem = zak.filter((z) => z.typ === 'kremacia').length;
      const dni = zak
        .filter((z) => z.termin_rozlucka && z.datum_umrtia)
        .map((z) => (+new Date(String(z.termin_rozlucka).slice(0, 10)) - +new Date(z.datum_umrtia)) / 864e5)
        .filter((d) => d >= 0 && d < 30);
      return {
        pob,
        pocet: zak.length,
        trzby: t,
        priemer: sSumou ? t / sSumou : null,
        kremPct: zak.length ? Math.round((krem / zak.length) * 100) : null,
        dni: dni.length ? (dni.reduce((a, b) => a + b, 0) / dni.length).toFixed(1) : null,
      };
    });

    const miesta = Object.entries(
      vybrane.reduce((acc: Record<string, number>, z) => {
        if (z.miesto_rozlucky) acc[z.miesto_rozlucky] = (acc[z.miesto_rozlucky] || 0) + 1;
        return acc;
      }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);

    return {
      vybrane, trzby, kremacie,
      priemer: soSumou.length ? trzby / soSumou.length : null,
      poMesiacoch, porovnanie, miesta,
    };
  }, [zakazky, mesiace, pobocka]);

  const konfigPobocky = Object.fromEntries(
    POBOCKY.map((p: string) => [p, { label: p, color: POBOCKY_FARBY[p] }])) as ChartConfig;
  const konfigTrzby = { trzby: { label: 'Tržby', color: 'rgba(245,245,245,0.8)' } } satisfies ChartConfig;
  const konfigKremacie = { kremaciePct: { label: 'Kremácie %', color: '#f5f5f5' } } satisfies ChartConfig;

  if (zakazky === null) {
    return (
      <div className="flex flex-col gap-5">
        <HlavaStranky nadpis="Štatistiky a vyhodnotenia" />
        <Ramec><Bunka><Nacitavam /></Bunka></Ramec>
      </div>
    );
  }

  const maxPocet = Math.max(1, ...data.porovnanie.map((r) => r.pocet));
  const maxZdroj = Math.max(1, ...ZDROJE.map((zd: { key: string }) => data.vybrane.filter((z) => z.zdroj === zd.key).length));
  const maxMiesto = Math.max(1, ...data.miesta.map(([, n]) => n));
  const sviecky = parte.reduce((s, x) => s + (x.sviecky || 0), 0);
  const zakazkyZDopytu = (zakazky || []).filter((z) => z.dopyt_id).length;
  const topParte = [...parte].sort((a, b) => (b.sviecky || 0) - (a.sviecky || 0)).slice(0, 5);
  const maxSviecok = Math.max(1, ...topParte.map((x) => x.sviecky || 0));

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky nadpis="Štatistiky a vyhodnotenia" popis="Čísla za zvolené obdobie a pobočku." />

      <div className="flex flex-col gap-3">
        <Chipy polozky={OBDOBIA} vybrany={obdobie} onVyber={setObdobie} />
        <Chipy
          polozky={[
            { key: 'vsetky-pobocky', label: 'Všetky pobočky' },
            ...POBOCKY.map((p: string) => ({ key: p, label: p, farba: POBOCKY_FARBY[p] })),
          ]}
          vybrany={pobocka ?? 'vsetky-pobocky'}
          onVyber={(k) => setPobocka(k === 'vsetky-pobocky' ? null : k)}
        />
      </div>

      <Ramec>
        <Mriezka stlpce="sm:grid-cols-2 xl:grid-cols-4">
          <KpiBunka titulok="Pohrebov za obdobie" hodnota={String(data.vybrane.length)}
            poznamka={data.vybrane.length ? `Ø ${(data.vybrane.length / Math.max(1, mesiace.length)).toFixed(1)} mesačne` : ''} />
          <KpiBunka titulok="Tržby za obdobie" hodnota={fmtEUR(data.trzby)}
            poznamka={data.trzby ? `Ø ${fmtEUR(data.trzby / Math.max(1, mesiace.length))} mesačne` : ''} />
          <KpiBunka titulok="Priemerná hodnota zákazky" hodnota={data.priemer ? fmtEUR(data.priemer) : '—'} />
          <KpiBunka titulok="Podiel kremácií"
            hodnota={data.vybrane.length ? Math.round((data.kremacie / data.vybrane.length) * 100) + ' %' : '—'}
            poznamka={data.vybrane.length ? `${data.kremacie} z ${data.vybrane.length}` : ''} />
        </Mriezka>

        <Mriezka stlpce="lg:grid-cols-2" horna>
          <Bunka>
            <HlavaPanelu nadpis="Pohreby po mesiacoch" popis="Stĺpce sú poskladané podľa pobočiek." />
            <ChartContainer config={konfigPobocky} className="h-[240px] w-full">
              <BarChart data={data.poMesiacoch} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12}
                  tick={{ fill: 'rgba(245,245,245,0.5)', fontSize: 11 }} interval="preserveStartEnd" />
                <ChartTooltip content={<ChartTooltipContent />} />
                {(pobocka ? [pobocka] : POBOCKY).map((p: string) => (
                  <Bar isAnimationActive={false} key={p} dataKey={p} stackId="pobocky" fill={POBOCKY_FARBY[p]} maxBarSize={40} />
                ))}
              </BarChart>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {(pobocka ? [pobocka] : POBOCKY).map((p: string) => (
                <span key={p} className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: POBOCKY_FARBY[p] }} />{p}
                </span>
              ))}
            </div>
          </Bunka>

          <Bunka>
            <HlavaPanelu nadpis="Tržby po mesiacoch" popis="Súčet súm zákaziek podľa dátumu úmrtia." />
            <ChartContainer config={konfigTrzby} className="h-[240px] w-full">
              <BarChart data={data.poMesiacoch} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="statTrzby" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(245,245,245,0.78)" />
                    <stop offset="100%" stopColor="rgba(245,245,245,0.10)" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12}
                  tick={{ fill: 'rgba(245,245,245,0.5)', fontSize: 11 }} interval="preserveStartEnd" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar isAnimationActive={false} dataKey="trzby" fill="url(#statTrzby)" radius={[2, 2, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ChartContainer>
          </Bunka>
        </Mriezka>

        <Mriezka stlpce="lg:grid-cols-2" horna>
          <Bunka>
            <HlavaPanelu nadpis="Porovnanie pobočiek" popis="Za zvolené obdobie, bez ohľadu na filter pobočky." />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Pobočka</TableHead>
                    <TableHead className="text-right text-[12px] font-semibold uppercase tracking-wide">Pohreby</TableHead>
                    <TableHead className="text-right text-[12px] font-semibold uppercase tracking-wide">Tržby</TableHead>
                    <TableHead className="text-right text-[12px] font-semibold uppercase tracking-wide">Ø zákazka</TableHead>
                    <TableHead className="text-right text-[12px] font-semibold uppercase tracking-wide">Kremácie</TableHead>
                    <TableHead className="text-right text-[12px] font-semibold uppercase tracking-wide">Ø dní</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.porovnanie.map((r) => (
                    <TableRow key={r.pob} className="border-border">
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ background: POBOCKY_FARBY[r.pob] }} />
                          {r.pob}
                        </span>
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-secondary">
                          <span className="block h-full rounded-full"
                            style={{ width: `${Math.round((r.pocet / maxPocet) * 100)}%`, background: POBOCKY_FARBY[r.pob] }} />
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{r.pocet}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtEUR(r.trzby)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.priemer ? fmtEUR(r.priemer) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.kremPct === null ? '—' : r.kremPct + ' %'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.dni ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Bunka>

          <Bunka>
            <HlavaPanelu nadpis="Podiel kremácií v čase" popis="Percento kremácií z pohrebov daného mesiaca." />
            <ChartContainer config={konfigKremacie} className="h-[240px] w-full">
              <LineChart data={data.poMesiacoch} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={12}
                  tick={{ fill: 'rgba(245,245,245,0.5)', fontSize: 11 }} interval="preserveStartEnd" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line isAnimationActive={false} type="monotone" dataKey="kremaciePct" stroke="#f5f5f5" strokeWidth={2}
                  dot={{ r: 3, fill: '#16181c', stroke: '#f5f5f5', strokeWidth: 2 }} connectNulls />
              </LineChart>
            </ChartContainer>
          </Bunka>
        </Mriezka>

        <Mriezka stlpce="lg:grid-cols-2" horna>
          <Bunka>
            <HlavaPanelu nadpis="Zdroje zákaziek"
              popis="Odkiaľ prišla objednávka pohrebu. Pomáha rozhodnúť, kam dávať energiu v marketingu." />
            <div className="flex flex-col gap-2.5">
              {ZDROJE.map((zd: { key: string; label: string }) => {
                const n = data.vybrane.filter((z) => z.zdroj === zd.key).length;
                const pct = data.vybrane.length ? Math.round((n / data.vybrane.length) * 100) : 0;
                return (
                  <PruhovyRiadok key={zd.key} popis={zd.label} hodnota={`${n} · ${pct} %`}
                    podiel={Math.round((n / maxZdroj) * 100)} />
                );
              })}
            </div>
          </Bunka>

          <Bunka>
            <HlavaPanelu nadpis="Najčastejšie miesta rozlúčok" popis="Šesť najvyťaženejších miest za obdobie." />
            {data.miesta.length === 0 ? (
              <p className="py-6 text-[14px] text-muted-foreground">Žiadne dáta za zvolené obdobie.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {data.miesta.map(([miesto, n]) => (
                  <PruhovyRiadok key={miesto} popis={miesto} hodnota={String(n)}
                    podiel={Math.round((n / maxMiesto) * 100)} />
                ))}
              </div>
            )}
          </Bunka>
        </Mriezka>
      </Ramec>

      <Ramec>
        <Mriezka stlpce="sm:grid-cols-2 xl:grid-cols-4">
          <KpiBunka titulok="Zapálených sviečok spolu" hodnota={String(sviecky)} />
          <KpiBunka titulok="Zverejnených kondolencií" hodnota={String(kondolencie.filter((k) => k.schvalene).length)} />
          <KpiBunka titulok="Dopytov z formulára" hodnota={String(dopyty.length)} />
          <KpiBunka titulok="Dopyty premenené na zákazky"
            hodnota={dopyty.length ? Math.round((zakazkyZDopytu / dopyty.length) * 100) + ' %' : '—'} />
        </Mriezka>
        <Mriezka stlpce="grid-cols-1" horna>
          <Bunka>
            <HlavaPanelu nadpis="Parte s najväčším ohlasom" popis="Podľa počtu zapálených sviečok." />
            {topParte.length === 0 ? (
              <p className="py-6 text-[14px] text-muted-foreground">Zatiaľ žiadne parte.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {topParte.map((x) => (
                  <PruhovyRiadok
                    key={x.id}
                    popis={<a href={`/parte/${x.slug}`} target="_blank" rel="noopener" className="hover:underline">{x.meno}</a>}
                    hodnota={String(x.sviecky || 0)}
                    podiel={Math.round(((x.sviecky || 0) / maxSviecok) * 100)}
                  />
                ))}
              </div>
            )}
          </Bunka>
        </Mriezka>
      </Ramec>
    </div>
  );
}

export default Statistiky;
