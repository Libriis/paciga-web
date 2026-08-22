# vercel.json: prečo je v ňom to, čo v ňom je

`vercel.json` je JSON a komentáre v ňom byť nemôžu. A nielen `//` riadky:
Vercel súbor overuje voči schéme a **odmietne aj kľúč navyše**. Pokus
zapísať vysvetlenie ako `"//redirects": "..."` zhodil nasadenie s hláškou
`should NOT have additional property //redirects` (22. 8. 2026, deploy
`dpl_GwRR24gc`). Preto je vysvetlenie tu.

Adaptér `@astrojs/vercel` si píše vlastný `.vercel/output/config.json`.
`vercel.json` mu smie dopĺňať `headers` a `redirects`. Nesmie tam pribudnúť
`routes`, `functions` ani `rewrites`, tie sa s adaptérom bijú.

## redirects

Tri hromadné pravidlá zo starého WordPressu: 391 parte, 81 kytíc,
4 kategórie, spolu 476 adries.

Sú tu, a nie v `astro.config.mjs`, lebo Astro dynamické presmerovanie
odmietne, keď cieľ nenesie tie isté parametre ako zdroj: `/old/[slug]`
musí ísť na niečo, čo tiež má `[slug]`. My chceme opak, zliať 476 adries
na tri prehľady. Staré slugy sa s novými nezhodujú (parte chodia zo
Supabase, kytice sú dnes katalóg vo vnútri kvetinárstva), takže jednotlivé
záznamy spárovať nejde. Prehľad je lepší než 476 hlásení o nenájdenej
stránke.

Jednotlivé stránky a články sú v `src/data/presmerovania.mjs`, tam
komentáre byť môžu.

## headers

### Bezpečnostné hlavičky na všetko

HSTS, nosniff, DENY vo frame, referrer policy, permissions policy a CSP
pre `frame-ancestors`. Nasadené 31. 7. 2026.

Pozor pri prepnutí domény: HSTS má `max-age` dva roky a `preload`.
Po prepnutí sa z HTTPS nedá cúvnuť.

### Cache-Control

Bez týchto pravidiel dával Vercel na všetko `max-age=0, must-revalidate`.
Prehliadač si pri každej návšteve pýtal 304 aj na súbory, ktoré sa nikdy
nemenia. Telo sa síce neposielalo, ale cesta tam a späť áno, a pri
15 súboroch a odozve 170 ms to bolo zbytočných pár stoviek milisekúnd.

| cesta | platnosť | prečo |
|---|---|---|
| `/_astro/*` | rok, `immutable` | Astro dáva do názvu obsahový hash (`Base.CJx6EJzW.css`). Zmena obsahu = nový názov, overovať netreba nikdy. |
| `/assets/*.woff2` | rok, `immutable` | písma sú verzované názvom (`archivo-sk`, nie `archivo`). Nová verzia = nový názov. |
| `/assets/ssr/*`, `/assets/vendor/*`, `/partneri/*`, `/clanky/*`, `/og/*`, zvyšok `/assets/*` | 30 dní + `stale-while-revalidate` | ručné súbory so stálym názvom, ktoré `scripts/staticke-obrazky.mjs` vie prekresliť. SWR znamená, že návštevník dostane starú verziu okamžite a novú si prehliadač stiahne na pozadí. |
| `/css/*`, `/js/*` | 0 + `must-revalidate` + krátke SWR | `styles.css` a `main.js` **nemajú hash v názve** a menia sa každým nasadením. Dlhá platnosť by znamenala, že oprava sa k vracajúcemu sa návštevníkovi nedostane. |

Poradie v poli `headers` je dôležité: `/assets/ssr/*` musí byť pred
všeobecným `/assets/*`, inak ho všeobecné pravidlo prekryje.

Ak sa raz `styles.css` a `main.js` začnú hashovať pri builde, presuň ich
do režimu `immutable` a bude to najväčšia zvyšná výhra pre vracajúcich sa
návštevníkov.
