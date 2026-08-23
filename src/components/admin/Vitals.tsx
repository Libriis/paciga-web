/* Core Web Vitals namerané skutočnými návštevníkmi.
   Mriežka p75 za metriku, tabuľka podľa stránok, rozdelenie hodnotení. */
import { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Bunka, Chipy, HlavaPanelu, HlavaStranky, Mriezka, Nacitavam, Prazdno, Ramec,
} from './ui';
import { getClient, DEMO } from '@/scripts/admin-core.js';

type Meranie = { metrika: string; hodnota: number; cesta: string; zariadenie: string; rating: string };

/* Prahy Core Web Vitals. `good` je hranica dobrého, `poor` hranica zlého;
   medzi nimi je needs-improvement. Merané vždy na 75. percentile. */
const METRIKY = [
  { key: 'LCP', popis: 'Najväčší prvok vykreslený', good: 2500, poor: 4000 },
  { key: 'INP', popis: 'Odozva na interakciu', good: 200, poor: 500 },
  { key: 'CLS', popis: 'Poskakovanie rozloženia', good: 0.1, poor: 0.25 },
  { key: 'FCP', popis: 'Prvé vykreslenie obsahu', good: 1800, poor: 3000 },
  { key: 'TTFB', popis: 'Odpoveď servera', good: 800, poor: 1800 },
];

const OBDOBIA = [
  { key: '7', label: 'Posledných 7 dní' },
  { key: '28', label: 'Posledných 28 dní' },
  { key: '90', label: 'Posledných 90 dní' },
];
const ZARIADENIA = [
  { key: '', label: 'Všetky zariadenia' },
  { key: 'mobile', label: 'Mobil' },
  { key: 'desktop', label: 'Desktop' },
];

const STITOK: Record<string, string> = { good: 'dobré', ni: 'treba zlepšiť', poor: 'zlé', ziadne: '—' };
const FARBA: Record<string, string> = {
  good: '#2f9e77', ni: '#bf7c2c', poor: '#c0504d', ziadne: 'rgba(245,245,245,0.45)',
};

/* p75 je hodnota, na ktorej stoja prahy Core Web Vitals: 3 zo 4 návštevníkov
   to majú rovnako dobré alebo lepšie. Priemer by tu klamal, pomalý chvost
   zážitok kazí a priemer ho rozriedi. */
function percentil(hodnoty: number[], p: number): number | null {
  if (!hodnoty.length) return null;
  const z = [...hodnoty].sort((a, b) => a - b);
  const idx = (z.length - 1) * p;
  const dolu = Math.floor(idx);
  const hore = Math.ceil(idx);
  return dolu === hore ? z[dolu] : z[dolu] + (z[hore] - z[dolu]) * (idx - dolu);
}

const hodnotenie = (m: typeof METRIKY[number], v: number | null) =>
  v === null ? 'ziadne' : v <= m.good ? 'good' : v <= m.poor ? 'ni' : 'poor';

const fmt = (m: typeof METRIKY[number], v: number | null) =>
  v === null ? '–' : m.key === 'CLS' ? v.toFixed(3) : Math.round(v).toLocaleString('sk-SK') + ' ms';

export function Vitals() {
  const [obdobie, setObdobie] = useState('28');
  const [zariadenie, setZariadenie] = useState('');
  const [data, setData] = useState<Meranie[] | null>(DEMO ? [] : null);

  useEffect(() => {
    if (DEMO) return;
    let zivy = true;
    setData(null);
    (async () => {
      const od = new Date(Date.now() - Number(obdobie) * 86400000).toISOString();
      let q = getClient().from('web_vitals').select('*')
        .gte('created_at', od).order('created_at', { ascending: false }).limit(20000);
      if (zariadenie) q = q.eq('zariadenie', zariadenie);
      const { data: d } = await q;
      if (zivy) setData((d as Meranie[]) || []);
    })().catch(() => zivy && setData([]));
    return () => { zivy = false; };
  }, [obdobie, zariadenie]);

  const cesty = useMemo(() => {
    const riadky = data || [];
    return [...new Set(riadky.map((r) => r.cesta))].map((cesta) => {
      const zaCestu = riadky.filter((r) => r.cesta === cesta);
      const zaMetriku: Record<string, number | null> = {};
      METRIKY.forEach((m) => {
        zaMetriku[m.key] = percentil(zaCestu.filter((r) => r.metrika === m.key).map((r) => r.hodnota), 0.75);
      });
      return { cesta, vzoriek: zaCestu.length, ...zaMetriku };
    }).sort((a, b) => ((b.LCP ?? -1) as number) - ((a.LCP ?? -1) as number));
  }, [data]);

  if (DEMO) {
    return (
      <div className="flex flex-col gap-5">
        <HlavaStranky nadpis="Rýchlosť webu" popis="Core Web Vitals z terénu, nie z laboratória." />
        <Ramec>
          <Bunka>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">Telemetria beží len na ostrých dátach.</strong>{' '}
              Merania zbiera nasadený web od skutočných návštevníkov, takže v demo režime
              nie je čo ukázať. Vymyslené čísla by tu boli horšie než prázdna stránka.
            </p>
          </Bunka>
        </Ramec>
      </div>
    );
  }

  const riadky = data || [];
  const zariadenia = [...new Set(riadky.map((r) => r.zariadenie))];
  const maloVzoriek = METRIKY.some((m) => {
    const n = riadky.filter((r) => r.metrika === m.key).length;
    return n > 0 && n < 100;
  });

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis="Rýchlosť webu"
        popis="Core Web Vitals namerané skutočným návštevníkom na skutočnej sieti. Nie sú to laboratórne testy z Lighthouse. CrUX o tejto doméne dáta nemá, takže toto je jediný zdroj, ktorý povie, čo ľudia naozaj zažívajú."
      />

      <div className="flex flex-col gap-3">
        <Chipy polozky={OBDOBIA} vybrany={obdobie} onVyber={setObdobie} />
        <Chipy polozky={ZARIADENIA.map((z) => ({ key: z.key || 'vsetky', label: z.label }))}
          vybrany={zariadenie || 'vsetky'} onVyber={(k) => setZariadenie(k === 'vsetky' ? '' : k)} />
      </div>

      {data === null ? (
        <Ramec><Bunka><Nacitavam /></Bunka></Ramec>
      ) : riadky.length === 0 ? (
        <Ramec><Bunka><Prazdno text="Zatiaľ žiadne merania za zvolené obdobie." /></Bunka></Ramec>
      ) : (
        <>
          <Ramec>
            <Mriezka stlpce="sm:grid-cols-2 xl:grid-cols-5">
              {METRIKY.map((m) => {
                const hodnoty = riadky.filter((r) => r.metrika === m.key).map((r) => r.hodnota);
                const p75 = percentil(hodnoty, 0.75);
                const h = hodnotenie(m, p75);
                return (
                  <Bunka key={m.key}>
                    <p className="text-[13px] text-muted-foreground">
                      {m.key} <span className="text-muted-foreground/70">p75</span>
                    </p>
                    <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums"
                      style={{ color: FARBA[h] }}>{fmt(m, p75)}</p>
                    <p className="mt-3 text-[12.5px] leading-snug text-muted-foreground">
                      {m.popis}<br />{STITOK[h]} · {hodnoty.length} vzoriek
                    </p>
                  </Bunka>
                );
              })}
            </Mriezka>

            <Mriezka stlpce="lg:grid-cols-3" horna>
              <Bunka className="lg:col-span-2">
                <HlavaPanelu nadpis="Podľa stránky"
                  popis="Zoradené od najpomalšieho LCP. Tu sa hľadá stránka, ktorá ťahá web dole." />
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-[12px] font-semibold uppercase tracking-wide">Stránka</TableHead>
                        <TableHead className="text-right text-[12px] font-semibold uppercase tracking-wide">Vzoriek</TableHead>
                        {METRIKY.map((m) => (
                          <TableHead key={m.key} className="text-right text-[12px] font-semibold uppercase tracking-wide">
                            {m.key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cesty.map((c) => (
                        <TableRow key={c.cesta} className="border-border">
                          <TableCell>
                            <a href={c.cesta} target="_blank" rel="noopener" className="hover:underline">{c.cesta}</a>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{c.vzoriek}</TableCell>
                          {METRIKY.map((m) => (
                            <TableCell key={m.key} className="text-right tabular-nums"
                              style={{ color: FARBA[hodnotenie(m, (c as any)[m.key])] }}>
                              {fmt(m, (c as any)[m.key])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Bunka>

              <Bunka>
                <HlavaPanelu nadpis="Rozdelenie hodnotení" popis="Ako to označil samotný prehliadač." />
                <div className="flex flex-col gap-3">
                  {METRIKY.map((m) => {
                    const zaMetriku = riadky.filter((r) => r.metrika === m.key);
                    if (!zaMetriku.length) return null;
                    const pocet = (r: string) => zaMetriku.filter((x) => x.rating === r).length;
                    const g = pocet('good'), n = pocet('needs-improvement'), p = pocet('poor');
                    const pct = (x: number) => (100 * x / zaMetriku.length).toFixed(0);
                    return (
                      <div key={m.key}>
                        <div className="mb-1 flex justify-between text-[13.5px]">
                          <strong className="font-semibold">{m.key}</strong>
                          <span className="text-muted-foreground">{pct(g)} % dobrých z {zaMetriku.length}</span>
                        </div>
                        <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
                          <span style={{ width: `${pct(g)}%`, background: FARBA.good }} title={`dobré: ${g}`} />
                          <span style={{ width: `${pct(n)}%`, background: FARBA.ni }} title={`treba zlepšiť: ${n}`} />
                          <span style={{ width: `${pct(p)}%`, background: FARBA.poor }} title={`zlé: ${p}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Bunka>
            </Mriezka>
          </Ramec>

          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {riadky.length} meraní za {obdobie} dní, zariadenia: {zariadenia.join(', ') || '—'}.
            {maloVzoriek && (
              <> <strong className="font-semibold text-foreground">Vzorka je malá.</strong>{' '}
                Pri menej než sto meraniach na metriku vie p75 skákať o stovky milisekúnd medzi
                dvomi návštevami. Na rozhodnutia počkaj, kým sa čísla ustália.</>
            )}
          </p>
        </>
      )}
    </div>
  );
}

export default Vitals;
