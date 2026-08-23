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

## Na poradí v poli `headers` záleží, a naopak, než by človek čakal

Keď na cestu sedí viac pravidiel, **vyhrá to neskoršie**. Nie to prvé
a nie to konkrétnejšie.

Overené na živom nasadení 22. 8. 2026: pravidlo `/assets/(.*).woff2`
s platnosťou rok bolo v poli PRED všeobecným `/assets/(.*)`, a písmo
`archivo-sk.woff2` aj tak dostalo 30 dní. Až po presunutí za všeobecné
pravidlo dostalo rok.

Preto sú výnimky zo všeobecného `/assets/*` zapísané POD ním, nie nad.
Keď budeš pridávať ďalšiu, drž sa toho istého poradia a over si to
na nasadení, nie lokálne. Lokálny build hlavičky nevyrába, píše ich
až Vercel.

Ak sa raz `styles.css` a `main.js` začnú hashovať pri builde, presuň ich
do režimu `immutable` a bude to najväčšia zvyšná výhra pre vracajúcich sa
návštevníkov.

## Administrácia sa nesmie cachovať a nesmie byť CORS-otvorená

Pravidlá pre `/admin` a `/admin/(.*)` sú **posledné v poli**, presne preto,
že vyhráva neskoršie. Prebíjajú všeobecné `/(.*)` a nastavujú:

- `Cache-Control: private, no-store` — bez toho `/admin` chodil s
  `public, max-age=0, must-revalidate`, čiže smel sedieť v zdieľanej
  medzipamäti na okraji siete. Zistené auditom ASVS 5.0 L2 (23. 8. 2026).
- `X-Robots-Tag: noindex, nofollow, noarchive` — druhá vrstva k robots.txt.
- `Access-Control-Allow-Origin: https://www.paciga.sk` — Vercel na tieto
  cesty sám dával `*`, takže skript na cudzej stránke vedel obsah admina
  prečítať cez `fetch`.

Dve pravidlá, nie jedno: `/admin/(.*)` nesadne na holé `/admin`.
Rovnaká pasca ako `Disallow: /admin/` v robots.txt.
