/*
  Pole na titulnú fotku: pretiahnutie súboru, náhľad, odstránenie.

  Vzor je File Dropzone z 21st.dev (@joyco), prepísaný na brand Paciga
  a bez Tailwindu. Admin beží na vlastnom admin.css a ťahať doňho tw.css
  kvôli jednému ostrovu by riskovalo kolíziu resetov s existujúcimi
  stránkami zákaziek a štatistík.

  Komponent renderuje skutočný <input type="file" name="...">, takže
  formulár okolo neho ostáva obyčajný HTML formulár a vanilla JS v
  admin stránke číta súbor tak ako doteraz (f.foto.files[0]).
*/
import { useEffect, useRef, useState } from 'react';

interface Props {
  name: string;
  /** URL už uloženej fotky pri úprave záznamu */
  hodnota?: string | null;
  popis?: string;
  maxMB?: number;
  /** vlastný event, ktorým admin stránka oznámi načítanie iného záznamu */
  obnovitEvent?: string;
}

const kB = (b: number) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} kB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export default function FotoPole({
  name,
  hodnota = null,
  popis = 'Na šírku, aspoň 1200 px. Zmenší sa sama.',
  maxMB = 12,
  obnovitEvent,
}: Props) {
  const [nahlad, setNahlad] = useState<string | null>(hodnota);
  const [subor, setSubor] = useState<File | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [tiahne, setTiahne] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Náhľad z vybraného súboru drží objektovú URL, ktorú treba uvoľniť.
  const objektUrl = useRef<string | null>(null);

  /* Admin stránka po načítaní iného článku vyšle event s novou fotkou.
     Bez toho by pri prepnutí záznamu ostal na obrazovke starý náhľad. */
  useEffect(() => {
    if (!obnovitEvent) return;
    const h = (e: Event) => {
      const url = (e as CustomEvent<{ foto: string | null }>).detail?.foto ?? null;
      uvolni();
      setSubor(null);
      setChyba(null);
      setNahlad(url);
      if (input.current) input.current.value = '';
    };
    window.addEventListener(obnovitEvent, h);
    return () => window.removeEventListener(obnovitEvent, h);
  }, [obnovitEvent]);

  useEffect(() => uvolni, []);

  function uvolni() {
    if (objektUrl.current) {
      URL.revokeObjectURL(objektUrl.current);
      objektUrl.current = null;
    }
  }

  function prijmi(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setChyba('Toto nie je obrázok. Vlož JPG, PNG alebo WebP.');
      return;
    }
    if (f.size > maxMB * 1024 * 1024) {
      setChyba(`Fotka má ${kB(f.size)}, maximum je ${maxMB} MB.`);
      return;
    }
    uvolni();
    objektUrl.current = URL.createObjectURL(f);
    setChyba(null);
    setSubor(f);
    setNahlad(objektUrl.current);
  }

  /* Súbor treba dostať do <input>, inak by ho formulár pri odoslaní nevidel.
     DataTransfer je jediná cesta, ako FileList naplniť programovo. */
  function doInputu(f: File) {
    if (!input.current) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    input.current.files = dt.files;
  }

  return (
    <div className="fp">
      <div
        className={`fp-zona${tiahne ? ' je-tiahnute' : ''}${nahlad ? ' ma-fotku' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); setTiahne(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { e.preventDefault(); setTiahne(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setTiahne(false);
          const f = e.dataTransfer.files?.[0];
          if (f) { prijmi(f); doInputu(f); }
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
        aria-label="Vybrať titulnú fotku"
      >
        {nahlad ? (
          <>
            <img src={nahlad} alt="" className="fp-nahlad" />
            <div className="fp-prekryv">
              <span>{subor ? `${subor.name} · ${kB(subor.size)}` : 'Uložená fotka'}</span>
              <span className="fp-vymen">Kliknutím vymeníš</span>
            </div>
          </>
        ) : (
          <div className="fp-vyzva">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <strong>Pretiahni sem fotku</strong>
            <span>alebo klikni a vyber zo súborov</span>
            <span className="fp-popis">{popis}</span>
          </div>
        )}
      </div>

      {nahlad && (
        <button
          type="button"
          className="fp-zmazat"
          onClick={(e) => {
            e.stopPropagation();
            uvolni();
            setSubor(null);
            setNahlad(null);
            setChyba(null);
            if (input.current) input.current.value = '';
          }}
          aria-label="Odstrániť fotku"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      <input
        ref={input}
        type="file"
        name={name}
        accept="image/*"
        className="fp-input"
        onChange={(e) => prijmi(e.target.files?.[0])}
      />

      {chyba && <p className="fp-chyba" role="alert">{chyba}</p>}
    </div>
  );
}
