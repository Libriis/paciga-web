/* Video parte na sociálne siete: /admin/parte/video?id=…

   Video sa vyrába v prehliadači pracovníka, nie na serveri (rozhodnutie
   Tomáša 11. 11. 2026). Texty sa predvyplnia z parte a dajú sa prepísať.
   Nič sa neukladá do databázy, výsledok je súbor na stiahnutie.
   Vzhľad je schválená šablóna V7 „Svetlo“ (src/lib/parte-video/scena.js). */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bunka, HlavaPanelu, HlavaStranky, Hlaska, Nacitavam, OdkazTlacidlo, Pole, Postup, Ramec, Tlacidlo, Vstup,
} from './ui';
import { getClient } from '@/scripts/admin-core.js';
import {
  DLZKA, FPS, SIRKA, VYREZ_45, VYSKA, nacitajLogo, nacitajObrazok, nacitajPismo, vytvorScenu,
} from '@/lib/parte-video/scena.js';
import { textyZParte } from '@/lib/parte-video/udaje.js';
import { stiahni, vieVyrobitVideo, vyrobMp4, vyrobPng } from '@/lib/parte-video/export.js';

const ZOZNAM = '/admin/parte';

type Texty = ReturnType<typeof textyZParte>;

export function ParteVideo() {
  const [parte, setParte] = useState<any>(null);
  const [chybaNacitania, setChybaNacitania] = useState('');
  const [texty, setTexty] = useState<Texty | null>(null);
  const [fotoY, setFotoY] = useState(18);
  const [jas, setJas] = useState(94);
  const [zdroje, setZdroje] = useState<{ logo: HTMLImageElement; foto: HTMLImageElement | null } | null>(null);
  const [chybaFotky, setChybaFotky] = useState('');
  const [hra, setHra] = useState(true);
  const [vyrez, setVyrez] = useState(false);
  const [vyraba, setVyraba] = useState(false);
  const [priebeh, setPriebeh] = useState({ hotovo: 0, celkom: 0 });
  const [hlaska, setHlaska] = useState('');
  const [chyba, setChyba] = useState(false);
  const platnoRef = useRef<HTMLCanvasElement>(null);
  const scenaRef = useRef<ReturnType<typeof vytvorScenu> | null>(null);
  const hraRef = useRef(true);
  const zaciatokRef = useRef(0);

  /* parte + písmo + logo + fotka */
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { setChybaNacitania('Chýba parte. Otvor video zo zoznamu parte.'); return; }
    (async () => {
      const { data, error } = await getClient().from('parte').select('*').eq('id', id).maybeSingle();
      if (error || !data) { setChybaNacitania('Toto parte sa nepodarilo načítať. Možno ho medzitým niekto vymazal.'); return; }
      setParte(data);
      setTexty(textyZParte(data));
      const [, logo] = await Promise.all([nacitajPismo(), nacitajLogo()]);
      let foto: HTMLImageElement | null = null;
      if (data.foto_url) {
        try { foto = await nacitajObrazok(data.foto_url); }
        catch { setChybaFotky('Fotku sa nepodarilo načítať. Video bude mať iniciály.'); }
      }
      setZdroje({ logo, foto });
    })().catch(() => setChybaNacitania('Toto parte sa nepodarilo načítať.'));
  }, []);

  /* Scéna sa skladá znova po každej zmene. Posuvníky čakajú 150 ms,
     lebo šedá fotka sa pri každej zmene jasu prepočítava. */
  const [scena, setScena] = useState<ReturnType<typeof vytvorScenu> | null>(null);
  useEffect(() => {
    if (!texty || !zdroje) return;
    const casovac = setTimeout(() => {
      const s = vytvorScenu({
        lead: texty.lead, meno1: texty.meno1, meno2: texty.meno2, d1: texty.d1, d2: texty.d2,
        mikro: texty.mikro, den: texty.den, miesto: texty.miesto, cas: texty.cas,
        poPohrebe: texty.poPohrebeZobraz ? { text: texty.poPohrebeText, miesto: texty.poPohrebeMiesto } : null,
        foto: zdroje.foto, fotoY, jas: jas / 100, inicialy: texty.inicialy, logo: zdroje.logo,
      });
      scenaRef.current = s;
      setScena(s);
    }, 150);
    return () => clearTimeout(casovac);
  }, [texty, zdroje, fotoY, jas]);

  /* náhľad: prehráva sa dookola, po zastavení ukáže hotový záber */
  useEffect(() => {
    hraRef.current = hra;
    zaciatokRef.current = performance.now();
  }, [hra]);
  useEffect(() => {
    if (!scena) return;
    const ctx = platnoRef.current?.getContext('2d', { alpha: false });
    if (!ctx) return;
    let rid = 0;
    const krok = (teraz: number) => {
      const s = scenaRef.current;
      if (s) {
        const t = hraRef.current ? ((teraz - zaciatokRef.current) / 1000) % DLZKA : DLZKA - 1 / FPS;
        s.kresli(ctx, t);
      }
      rid = requestAnimationFrame(krok);
    };
    rid = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(rid);
  }, [scena]);

  const zmen = (pole: keyof Texty, hodnota: any) => setTexty((t) => (t ? { ...t, [pole]: hodnota } : t));
  const nazov = (pripona: string) => `paciga-parte-${parte?.slug || 'video'}-1080x1920.${pripona}`;

  const stiahniVideo = async () => {
    if (!scenaRef.current) return;
    setVyraba(true); setChyba(false); setHlaska('Vyrábam video. Nechaj túto stránku otvorenú.');
    try {
      const blob = await vyrobMp4(scenaRef.current, (hotovo, celkom) => setPriebeh({ hotovo, celkom }));
      stiahni(blob, nazov('mp4'));
      setHlaska(`Hotovo. Video ${(blob.size / 1e6).toFixed(1)} MB sa stiahlo do priečinka Stiahnuté súbory.`);
    } catch (e: any) {
      setChyba(true); setHlaska(e?.message || 'Video sa nepodarilo vyrobiť.');
    } finally {
      setVyraba(false); setPriebeh({ hotovo: 0, celkom: 0 });
    }
  };

  const stiahniObrazok = async () => {
    if (!scenaRef.current) return;
    setChyba(false);
    try {
      stiahni(await vyrobPng(scenaRef.current), nazov('png'));
      setHlaska('Obrázok sa stiahol do priečinka Stiahnuté súbory.');
    } catch (e: any) {
      setChyba(true); setHlaska(e?.message || 'Obrázok sa nepodarilo vyrobiť.');
    }
  };

  if (chybaNacitania) {
    return (
      <Ramec><Bunka>
        <HlavaPanelu nadpis="Parte sa nenašlo" popis={chybaNacitania} />
        <OdkazTlacidlo href={ZOZNAM}>Späť na zoznam parte</OdkazTlacidlo>
      </Bunka></Ramec>
    );
  }
  if (!parte || !texty) return <Ramec><Bunka><Nacitavam /></Bunka></Ramec>;

  const vieVideo = vieVyrobitVideo();

  return (
    <div className="flex flex-col gap-5">
      <HlavaStranky
        nadpis={`Video: ${parte.meno}`}
        popis="Video na Facebook a Instagram, 1080 × 1920, 10 sekúnd. Texty sa doplnili z parte. Pred stiahnutím ich skontroluj."
        akcie={<>
          <OdkazTlacidlo href={`/admin/parte/upravit?id=${parte.id}`}>Upraviť parte</OdkazTlacidlo>
          <OdkazTlacidlo href={ZOZNAM}>Späť na zoznam</OdkazTlacidlo>
        </>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Ramec>
          <Bunka>
            <div className="grid gap-4 md:grid-cols-2">
              <Pole popis="Meno, horný riadok">
                <Vstup value={texty.meno1} maxLength={60} onChange={(e) => zmen('meno1', e.target.value)} />
              </Pole>
              <Pole popis="Meno, dolný riadok">
                <Vstup value={texty.meno2} maxLength={60} onChange={(e) => zmen('meno2', e.target.value)} />
              </Pole>
              <Pole popis="Dátum narodenia">
                <Vstup value={texty.d1} maxLength={20} onChange={(e) => zmen('d1', e.target.value)} />
              </Pole>
              <Pole popis="Dátum úmrtia">
                <Vstup value={texty.d2} maxLength={20} onChange={(e) => zmen('d2', e.target.value)} />
              </Pole>
              <Pole popis="Riadok nad rozlúčkou" className="md:col-span-2">
                <Vstup value={texty.mikro} maxLength={70} onChange={(e) => zmen('mikro', e.target.value)} />
              </Pole>
              <Pole popis="Deň rozlúčky">
                <Vstup value={texty.den} maxLength={40} onChange={(e) => zmen('den', e.target.value)} />
              </Pole>
              <Pole popis="Čas rozlúčky">
                <Vstup value={texty.cas} maxLength={8} onChange={(e) => zmen('cas', e.target.value)} />
              </Pole>
              <Pole popis="Miesto rozlúčky" className="md:col-span-2">
                <Vstup value={texty.miesto} maxLength={120} onChange={(e) => zmen('miesto', e.target.value)} />
              </Pole>

              <div className="md:col-span-2 border-t border-border pt-4">
                <label className="flex cursor-pointer items-center gap-3 text-[14.5px]">
                  <input type="checkbox" className="size-4 accent-white"
                    checked={texty.poPohrebeZobraz} onChange={(e) => zmen('poPohrebeZobraz', e.target.checked)} />
                  Ukázať riadok o pohrebe
                </label>
                <span className="mt-1 block text-[12px] text-muted-foreground">
                  Len keď sa pochováva v inej obci ako rozlúčka. Inak ostane vypnutý.
                </span>
              </div>
              {texty.poPohrebeZobraz && <>
                <Pole popis="Text pred miestom">
                  <Vstup value={texty.poPohrebeText} maxLength={60} onChange={(e) => zmen('poPohrebeText', e.target.value)} />
                </Pole>
                <Pole popis="Miesto pohrebu (tučne)">
                  <Vstup value={texty.poPohrebeMiesto} maxLength={80} onChange={(e) => zmen('poPohrebeMiesto', e.target.value)} />
                </Pole>
              </>}

              <div className="md:col-span-2 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                {zdroje?.foto ? <>
                  <Pole popis={`Posun fotky: ${fotoY} %`}>
                    <input type="range" min={0} max={100} value={fotoY} className="mt-3 w-full accent-white"
                      onChange={(e) => setFotoY(Number(e.target.value))} />
                    <span className="mt-1 block text-[12px] text-muted-foreground">Menej = vyššie v kruhu je hlava.</span>
                  </Pole>
                  <Pole popis={`Jas fotky: ${jas} %`}>
                    <input type="range" min={70} max={140} value={jas} className="mt-3 w-full accent-white"
                      onChange={(e) => setJas(Number(e.target.value))} />
                    <span className="mt-1 block text-[12px] text-muted-foreground">Tmavú fotku zosvetli na 110 až 120 %.</span>
                  </Pole>
                </> : (
                  <p className="text-[13px] text-muted-foreground md:col-span-2">
                    {chybaFotky || 'Parte nemá fotku. Vo videu budú iniciály. Fotku pridáš v úprave parte.'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Tlacidlo type="button" onClick={() => setTexty(textyZParte(parte))}>Vrátiť texty z parte</Tlacidlo>
              </div>
            </div>
          </Bunka>
        </Ramec>

        <Ramec>
          <Bunka className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-[300px] overflow-hidden rounded-md">
              <canvas ref={platnoRef} width={SIRKA} height={VYSKA}
                className="block w-full rounded-md border border-border bg-[#0c0d0f]"
                style={{ aspectRatio: `${SIRKA} / ${VYSKA}` }} />
              {/* Len v náhľade, do videa sa nekreslí: čo uvidí človek v mriežke profilu (4:5). */}
              {vyrez && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-y-2 border-dashed border-[#e0b44a]"
                  style={{ top: `${(VYREZ_45.y / VYSKA) * 100}%`, height: `${(VYREZ_45.vyska / VYSKA) * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,.55)' }} />
              )}
            </div>
            {!scena && <Nacitavam text="Pripravujem náhľad…" />}
            <div className="flex flex-wrap justify-center gap-2">
              <Tlacidlo type="button" maly variant="ticho" onClick={() => setHra((h) => !h)}>
                {hra ? 'Zastaviť a ukázať koniec' : 'Prehrať znova'}
              </Tlacidlo>
              <Tlacidlo type="button" maly variant="ticho" aria-pressed={vyrez} onClick={() => setVyrez((v) => !v)}>
                {vyrez ? 'Skryť výrez 4:5' : 'Ukázať výrez 4:5'}
              </Tlacidlo>
            </div>
            {vyrez && (
              <p className="max-w-[300px] text-center text-[12px] text-muted-foreground">
                Svetlá časť sa ukáže v mriežke profilu a vo feede. Rámik vo videu nebude.
              </p>
            )}
            <div className="flex w-full flex-col gap-2">
              <Tlacidlo type="button" variant="plne" cakaj={vyraba} disabled={!scena || !vieVideo} onClick={stiahniVideo}>
                Stiahnuť video (MP4)
              </Tlacidlo>
              <Tlacidlo type="button" disabled={!scena || vyraba} onClick={stiahniObrazok}>
                Stiahnuť obrázok (PNG)
              </Tlacidlo>
              {vyraba && priebeh.celkom > 0 && <Postup hotovo={priebeh.hotovo} celkom={priebeh.celkom} />}
              {!vieVideo && (
                <p className="text-[12.5px] text-[#d18a8a]">Tento prehliadač video nevie vyrobiť. Otvor admin v Chrome alebo Edge.</p>
              )}
              <Hlaska text={hlaska} chyba={chyba} />
            </div>
          </Bunka>
        </Ramec>
      </div>
    </div>
  );
}

export default ParteVideo;
