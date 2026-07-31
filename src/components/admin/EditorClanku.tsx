/*
  Editor tela článku: písanie vľavo, hotový článok vpravo.

  Vzor je Formatting Toolbar z 21st.dev (@cnippet.dev): panel tlačidiel nad
  textom a živý náhľad. Zápis ostáva ten istý, aký web už vie zobraziť
  ('## nadpis', '→ odrážka'), takže sa medzi editorom a stránkou nič
  neprekladá. Práve preklad je miesto, kde sa články ticho rozsypú.

  Komponent renderuje skutočný <textarea name="...">, takže vanilla JS
  v admin stránke číta hodnotu ako doteraz (f.telo.value). Textarea je
  neriadená (defaultValue + ref) zámerne: admin ju pri načítaní iného
  článku napĺňa priamo cez .value a vyšle 'input', čo tu zachytíme.
*/
import { useEffect, useRef, useState } from 'react';

interface Props {
  name: string;
  hodnota?: string;
  riadky?: number;
}

type Blok =
  | { typ: 'h'; text: string }
  | { typ: 'p'; text: string }
  | { typ: 'ul'; polozky: string[] };

/* Rovnaké pravidlá ako bloky() v src/data/aktuality.ts. Zámerne
   duplikované: ten súbor je serverový modul a náhľad musí bežať v
   prehliadači bez importu celej knižnice článkov. */
function naBloky(text: string): Blok[] {
  const out: Blok[] = [];
  for (const r of text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)) {
    if (r.startsWith('## ')) out.push({ typ: 'h', text: r.slice(3) });
    else if (r.startsWith('→ ')) {
      const p = out[out.length - 1];
      if (p && p.typ === 'ul') p.polozky.push(r.slice(2));
      else out.push({ typ: 'ul', polozky: [r.slice(2)] });
    } else out.push({ typ: 'p', text: r });
  }
  return out;
}

const NASTROJE = [
  { typ: 'h', popis: 'Nadpis', klavesa: '## ', znak: 'H' },
  { typ: 'p', popis: 'Odstavec', klavesa: '', znak: '¶' },
  { typ: 'ul', popis: 'Odrážka', klavesa: '→ ', znak: '•' },
] as const;

export default function EditorClanku({ name, hodnota = '', riadky = 18 }: Props) {
  const [text, setText] = useState(hodnota);
  const ta = useRef<HTMLTextAreaElement>(null);

  /* Admin stránka napĺňa textarea priamo cez .value a vyšle 'input'.
     Bez tohto poslucháča by náhľad po prepnutí článku ukazoval starý text. */
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    const h = () => setText(el.value);
    el.addEventListener('input', h);
    return () => el.removeEventListener('input', h);
  }, []);

  /** Prepíše riadok pod kurzorom na zvolený typ bloku. */
  function prepni(prefix: string) {
    const el = ta.current;
    if (!el) return;
    const zaciatok = el.value.lastIndexOf('\n', el.selectionStart - 1) + 1;
    const koniecRel = el.value.slice(zaciatok).indexOf('\n');
    const koniec = koniecRel === -1 ? el.value.length : zaciatok + koniecRel;

    const holy = el.value.slice(zaciatok, koniec).replace(/^(## |→ )/, '');
    const novy = prefix + holy;

    el.value = el.value.slice(0, zaciatok) + novy + el.value.slice(koniec);
    el.focus();
    el.selectionStart = el.selectionEnd = zaciatok + novy.length;
    setText(el.value);
  }

  const bloky = naBloky(text);
  const slov = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minut = Math.max(1, Math.round(slov / 200));

  return (
    <div className="ed">
      <div className="ed-panel">
        {NASTROJE.map((n) => (
          <button
            key={n.typ}
            type="button"
            className="ed-nastroj"
            onClick={() => prepni(n.klavesa)}
            title={`${n.popis} — zmení riadok, na ktorom stojí kurzor`}
          >
            <span className="ed-znak" aria-hidden="true">{n.znak}</span>
            {n.popis}
          </button>
        ))}
        <span className="ed-pocty">
          {bloky.length} {bloky.length === 1 ? 'blok' : bloky.length < 5 ? 'bloky' : 'blokov'}
          <span className="ed-bodka" aria-hidden="true">·</span>
          {slov} {slov === 1 ? 'slovo' : slov < 5 ? 'slová' : 'slov'}
          <span className="ed-bodka" aria-hidden="true">·</span>
          čítanie {minut} min
        </span>
      </div>

      <div className="ed-stlpce">
        <div className="ed-pisanie">
          <textarea
            ref={ta}
            name={name}
            rows={riadky}
            defaultValue={hodnota}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Odstavce oddeľ prázdnym riadkom.\n\n## Takto vyzerá medzinadpis\n\n→ Takto odrážka'}
            spellCheck
          />
        </div>

        <div className="ed-nahlad" aria-live="polite">
          <div className="ed-nahlad-hlava">Takto to uvidí čitateľ</div>
          <div className="ed-nahlad-telo">
            {bloky.length === 0 ? (
              <p className="ed-prazdno">Zatiaľ prázdne. Začni písať vľavo.</p>
            ) : (
              bloky.map((b, i) =>
                b.typ === 'h' ? <h3 key={i}>{b.text}</h3>
                : b.typ === 'ul' ? <ul key={i}>{b.polozky.map((x, j) => <li key={j}>{x}</li>)}</ul>
                : <p key={i}>{b.text}</p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
