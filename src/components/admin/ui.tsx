/* Stavebné diely administrácie v jazyku vzoru „Efferd Dashboard 2".
   Pravidlá: jeden vonkajší rám, bunky oddelené vlasovou linkou (gap-px na
   farbe rámu), ostré rohy vnútri, nadpisy 15 px, popisy 13 px, žiadna zlatá.
   Všetko sem, nech sa stránky nemusia opakovať a nerozídu sa. */
import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, Search, X } from 'lucide-react';

/* ---------- mriežka ---------- */

/** Vonkajší rám okolo skupiny buniek. */
export function Ramec({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-lg border border-border ${className}`}>{children}</div>;
}

/** Riadok buniek. `stlpce` je Tailwind trieda mriežky. */
export function Mriezka({ stlpce = 'sm:grid-cols-2', horna = false, children }: {
  stlpce?: string; horna?: boolean; children: ReactNode;
}) {
  return (
    <div className={`grid grid-cols-1 gap-px bg-border ${stlpce} ${horna ? 'border-t border-border' : ''}`}>
      {children}
    </div>
  );
}

/** Jedna bunka mriežky. */
export function Bunka({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-background p-5 ${className}`}>{children}</div>;
}

/* ---------- hlavičky ---------- */

export function HlavaStranky({ nadpis, popis, akcie }: { nadpis: string; popis?: string; akcie?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold leading-tight tracking-tight">{nadpis}</h1>
        {popis && <p className="mt-1 text-[14px] text-muted-foreground">{popis}</p>}
      </div>
      {akcie && <div className="flex flex-wrap items-center gap-2">{akcie}</div>}
    </div>
  );
}

export function HlavaPanelu({ nadpis, popis, vpravo }: { nadpis: string; popis?: string; vpravo?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{nadpis}</h2>
        {popis && <p className="mt-1 text-[13px] text-muted-foreground">{popis}</p>}
      </div>
      {vpravo}
    </div>
  );
}

/* ---------- ovládanie ---------- */

type VariantTlacidla = 'plne' | 'obrys' | 'nebezpecne' | 'ticho';

const TRIEDY_TLACIDLA: Record<VariantTlacidla, string> = {
  plne: 'bg-primary text-primary-foreground hover:opacity-90',
  obrys: 'border border-border text-foreground hover:border-foreground/30',
  nebezpecne: 'border border-[#d18a8a]/35 text-[#d18a8a] hover:border-[#d18a8a]/60',
  ticho: 'text-muted-foreground hover:text-foreground',
};

export function Tlacidlo({ variant = 'obrys', maly = false, cakaj = false, className = '', children, ...zvysok }: {
  variant?: VariantTlacidla; maly?: boolean; cakaj?: boolean; className?: string; children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...zvysok}
      disabled={zvysok.disabled || cakaj}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
        maly ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-[13.5px]'} ${TRIEDY_TLACIDLA[variant]} ${className}`}
    >
      {cakaj && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}

/** Odkaz, ktorý vyzerá ako tlačidlo. */
export function OdkazTlacidlo({ variant = 'obrys', maly = false, className = '', children, ...zvysok }: {
  variant?: VariantTlacidla; maly?: boolean; className?: string; children: ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...zvysok}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition-colors ${
        maly ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-[13.5px]'} ${TRIEDY_TLACIDLA[variant]} ${className}`}
    >
      {children}
    </a>
  );
}

export type Chip = { key: string; label: string; farba?: string };

/** Riadok filtrov. Obdĺžnikové, nie pilulkové — vzor nemá guľaté filtre. */
export function Chipy({ polozky, vybrany, onVyber, className = '' }: {
  polozky: Chip[]; vybrany: string | null; onVyber: (key: string) => void; className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {polozky.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onVyber(c.key)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] transition-colors ${
            vybrany === c.key
              ? 'border-transparent bg-primary font-semibold text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'}`}
        >
          {c.farba && <span className="size-2 rounded-full" style={{ background: c.farba }} />}
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function Hladanie({ hodnota, onZmena, placeholder = 'Hľadať…' }: {
  hodnota: string; onZmena: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={hodnota}
        onChange={(e) => onZmena(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-9 text-[14px] outline-none placeholder:text-muted-foreground focus:border-foreground/30"
      />
      {hodnota && (
        <button type="button" onClick={() => onZmena('')} aria-label="Vymazať"
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/* ---------- stav a značky ---------- */

/** Farby stavov zákazky. Rovnaké odtiene ako mala pôvodná admin.css. */
export const FARBY_STAVOV: Record<string, string> = {
  novy: '#9ecbff',
  prevoz: '#ffd9a0',
  priprava: '#f5e6b8',
  obrad: '#ffffff',
  vybavene: '#b4e2c0',
  vyuctovane: 'rgba(245,245,245,0.45)',
};

export function StavZnacka({ stav, label }: { stav: string; label: string }) {
  const farba = FARBY_STAVOV[stav] || 'rgba(245,245,245,0.55)';
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]"
      style={{ color: farba, borderColor: `color-mix(in srgb, ${farba} 40%, transparent)` }}
    >
      {label}
    </span>
  );
}

type TonStitka = 'ticho' | 'hotovo' | 'ceka' | 'skryte';

const TRIEDY_STITKA: Record<TonStitka, string> = {
  ticho: 'border-border text-muted-foreground',
  hotovo: 'border-[#6bbf8a]/40 text-[#6bbf8a]',
  ceka: 'border-[#e0c07a]/40 text-[#e0c07a]',
  skryte: 'border-border text-muted-foreground/60',
};

/** Malý štítok pre stav položky (schválené, čaká, skryté…). */
export function Stitok({ ton = 'ticho', children }: { ton?: TonStitka; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold ${TRIEDY_STITKA[ton]}`}>
      {children}
    </span>
  );
}

/** Tenký ukazovateľ postupu s popisom vpravo. */
export function Postup({ hotovo, celkom }: { hotovo: number; celkom: number }) {
  const percent = celkom ? Math.round((hotovo / celkom) * 100) : 0;
  return (
    <div className="flex min-w-28 items-center gap-2">
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-border">
        <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${percent}%` }} />
      </span>
      <span className="whitespace-nowrap text-[12px] tabular-nums text-muted-foreground">{hotovo}/{celkom}</span>
    </div>
  );
}

export function Prazdno({ text, deti }: { text: string; deti?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-[14px] text-muted-foreground">{text}</p>
      {deti}
    </div>
  );
}

export function Nacitavam({ text = 'Načítavam…' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[14px] text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {text}
    </div>
  );
}

/** Hláška pod formulárom. */
export function Hlaska({ text, chyba = false }: { text: string; chyba?: boolean }) {
  if (!text) return null;
  return <p className={`mt-3 text-[13.5px] ${chyba ? 'text-[#d18a8a]' : 'text-muted-foreground'}`}>{text}</p>;
}

/* ---------- formulárové polia ---------- */

const TRIEDA_VSTUPU =
  'mt-1.5 block h-10 w-full rounded-md border border-border bg-background px-3 text-[14.5px] text-foreground outline-none [color-scheme:dark] focus:border-foreground/30';

export function Pole({ popis, children, className = '' }: { popis: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{popis}</span>
      {children}
    </label>
  );
}

export function Vstup(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${TRIEDA_VSTUPU} ${props.className || ''}`} />;
}

export function Vyber(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${TRIEDA_VSTUPU} ${props.className || ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2.5 text-[14.5px] text-foreground outline-none focus:border-foreground/30 ${props.className || ''}`}
    />
  );
}

/** Prepínač dvoch až troch možností v jednom rade. */
export function Prepinac({ moznosti, hodnota, onZmena }: {
  moznosti: { key: string; label: string }[]; hodnota: string; onZmena: (k: string) => void;
}) {
  return (
    <div className="mt-1.5 inline-flex rounded-md border border-border p-0.5">
      {moznosti.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onZmena(m.key)}
          className={`h-8 rounded-[5px] px-3 text-[13px] font-semibold transition-colors ${
            hodnota === m.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- pomôcky ---------- */

/** Pobočkový filter s pamäťou v prehliadači — rovnaký kľúč ako mal starý admin. */
export function usePobocka(): [string | null, (p: string | null) => void] {
  const [pobocka, setPobocka] = useState<string | null>(null);
  useEffect(() => { setPobocka(localStorage.getItem('paciga-admin-pobocka')); }, []);
  const nastav = (p: string | null) => {
    setPobocka(p);
    if (p) localStorage.setItem('paciga-admin-pobocka', p);
    else localStorage.removeItem('paciga-admin-pobocka');
  };
  return [pobocka, nastav];
}
