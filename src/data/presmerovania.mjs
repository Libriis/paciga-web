/**
 * Presmerovania zo starého WordPressu na nový web.
 *
 * Prečo: starý paciga.sk má v mape stránok 529 adries, ktoré Google pozná
 * (391 parte, 81 kytíc, 29 stránok, 24 článkov, 4 kategórie — overené
 * 22. 8. 2026 zo sitemap_index.xml). Nový web má iné cesty. Bez presmerovania
 * by sa v deň prepnutia domény zmenilo všetkých 529 na 404 a rebríčky
 * by spadli.
 *
 * Sú zapnuté už teraz, hoci web ešte beží na staging adrese. Nič tým
 * nepokazia (na staging adrese na tie cesty nikto nechodí) a v deň prepnutia
 * je hotovo. Astro ich pri builde zapíše do výstupu pre Vercel, rovnako
 * ako doterajšie /lab-klasik.
 *
 * Status 301 = trvalé. Google tým prenesie hodnotu starej adresy na novú.
 * Pri 302 by si starú adresu držal a nič by sa neprenieslo.
 *
 * OTVORENÉ, čaká na rozhodnutie (pozri komentáre nižšie):
 *   - šesť stránok pobočiek: zatiaľ vedú na /kontakt, kde sú všetky tri
 *     pobočky. Ak vzniknú samostatné stránky, prepíš cieľ.
 *   - /ochrana-sukromia/: nový web takú stránku nemá, texty nedodal klient.
 *     Zatiaľ vedie na /kontakt. Doplň, keď stránka vznikne.
 *   - jednotlivé parte a kytice: staré slugy sa s novými nezhodujú, preto
 *     idú na prehľad, nie na konkrétny záznam.
 */

const trvale = (cesta) => ({ status: 301, destination: cesta });

export const PRESMEROVANIA = {
  /* ---- lab náhľad, ktorý šiel klientovi odkazom (15. 8. 2026) ---- */
  '/lab-klasik': trvale('/'),

  /* ---- služby: zo starých samostatných stránok pod /pohrebne-sluzby ---- */
  '/rakvy': trvale('/pohrebne-sluzby/rakvy'),
  '/kremacia-s-obradom-alebo-bez': trvale('/pohrebne-sluzby/kremacia'),
  '/rozlucka-a-pochovanie-na-cintorine': trvale('/pohrebne-sluzby/rozlucka-a-pochovanie'),
  '/kvetinarstvo': trvale('/pohrebne-sluzby/kvetinarstvo'),
  '/oblecenie-pre-zosnuleho': trvale('/pohrebne-sluzby/oblecenie-pre-zosnuleho'),
  '/spomienkove-karty': trvale('/pohrebne-sluzby/spomienkove-karty'),
  '/prevoz-zosnulych-z-bytov-a-nemocnic': trvale('/pohrebne-sluzby/prevoz-zosnulych'),
  '/medzinarodny-prevoz': trvale('/pohrebne-sluzby/medzinarodny-prevoz'),
  '/pohrebna-limuzina': trvale('/pohrebne-sluzby/pohrebna-limuzina'),
  '/prenosne-chladenie': trvale('/pohrebne-sluzby/prenosne-chladenie'),
  '/smutkove-poradenstvo': trvale('/pohrebne-sluzby/smutkove-poradenstvo'),
  '/predpriprava-pohrebu': trvale('/pohrebne-sluzby/predpriprava-pohrebu'),
  '/spomienkove-sperky-s-odtlackom': trvale('/sperky'),
  '/3d-vizualizacia-pomnika': trvale('/kamenarstvo'),

  /* ---- články: staré slugy boli dlhšie a opisnejšie ---- */
  '/ako-postupovat-pri-umrti-blizkeho-cloveka': trvale('/aktuality/ako-postupovat-pri-umrti-blizkeho-cloveka'),
  '/digitalna-pomoc-po-pohrebe-spolupracujeme-s-platformou-potom-sk': trvale('/aktuality/digitalna-pomoc-po-pohrebe-potom-sk'),
  '/druh-pohrebneho-obradu': trvale('/aktuality/druh-pohrebneho-obradu'),
  '/kvetinova-vyzdoba-na-pohrebe': trvale('/aktuality/kvetinova-vyzdoba-na-pohrebe'),
  '/najkrajsie-pohrebne-vozidlo-na-slovensku': trvale('/aktuality/najkrajsie-pohrebne-vozidlo-na-slovensku'),
  '/netradicne-ulozenie-urny': trvale('/aktuality/netradicne-ulozenie-urny'),
  '/novy-obetny-stol-a-kazatelnica': trvale('/aktuality/novy-obetny-stol-a-kazatelnica'),
  '/od-prezidenta-az-po-obycajnych-ludi-dostojne-pohrebne-rozlucky-pod-tatrami': trvale('/aktuality/od-prezidenta-az-po-obycajnych-ludi'),
  '/odtlacok-prsta-zosnuleho-na-pamiatku': trvale('/aktuality/odtlacok-prsta-zosnuleho-na-pamiatku'),
  '/pohreb-nie-je-vzdy-iba-o-ciernej-farbe': trvale('/aktuality/pohreb-nie-je-vzdy-iba-o-ciernej-farbe'),
  '/riesenie-pozostalosti-po-pohrebe': trvale('/aktuality/riesenie-pozostalosti-po-pohrebe'),
  '/smutocne-oznamenie-a-smutocna-hudba': trvale('/aktuality/smutocne-oznamenia-fotografia-a-hudba'),
  '/spolupraca-so-spominam-sk': trvale('/aktuality/spolupraca-so-spominam-sk'),
  '/sposoby-pochovavania': trvale('/aktuality/sposoby-pochovavania'),
  '/umrtie-v-zahranici': trvale('/aktuality/umrtie-v-zahranici'),
  '/viac-nez-pohrebna-sluzba-kompletne-riesenie-pre-pozostalych': trvale('/aktuality/viac-nez-pohrebna-sluzba'),
  '/vyber-pohrebnej-sluzby-a-organizacia-pohrebu': trvale('/aktuality/vyber-pohrebnej-sluzby-a-organizacia-pohrebu'),
  '/xxi-konferencia-hca-slovakia': trvale('/aktuality/xxi-konferencia-hca-slovakia'),
  '/zucastnili-sme-sa-odborneho-skolenia': trvale('/aktuality/absolvovali-sme-odborne-skolenie'),
  /* Dva ročníky tej istej konferencie. Starší je bez prípony, novší má -2. */
  '/zucastnili-sme-sa-medzinarodnej-konferencie-pohrebnych-sluzieb-na-slovensku': trvale('/aktuality/medzinarodna-konferencia-pohrebnych-sluzieb-2025'),
  '/zucastnili-sme-sa-medzinarodnej-konferencie-pohrebnych-sluzieb-na-slovensku-2': trvale('/aktuality/medzinarodna-konferencia-pohrebnych-sluzieb-2026'),

  /* ---- stránky bez priameho náprotivku ---- */
  /* Staré „úmrtie blízkeho človeka“ bol rozcestník. Tú úlohu má teraz
     stránka pre pozostalých, nie článok. */
  '/umrtie-blizkeho-cloveka': trvale('/informacie-pre-pozostalych'),
  /* Recenzie sú dnes časťou stránky O nás. */
  '/co-o-nas-pisu-ini': trvale('/o-nas'),
  /* Sezónna stránka k Pamiatke zosnulých. Najbližšie jej obsahom je
     spomienkový zoznam. */
  '/pamiatka-zosnulych': trvale('/opustili-nas'),

  /* ---- POBOČKY ----
     Starý web mal na každé mesto dve stránky a práve tie ho držali na
     frázach typu „pohrebné služby Poprad“. Kratšie adresy (/poprad,
     /spisska-bela, /liptovsky-mikulas) sú teraz skutočné stránky
     v src/pages/[pobocka].astro, preto tu NIE SÚ: presmerovanie by ich
     zatienilo a Astro by ich vôbec nevygeneroval (overené buildom
     22. 8. 2026, stránky sa nevytvorili a v logu bolo „response body
     was empty“).

     Sem patria len dlhšie varianty, ktoré vedú na tie kratšie. Jeden
     skok navyše je v poriadku, dôležité je, aby ani jedna z pôvodných
     šiestich adries nekončila na 404. */
  '/pohrebne-sluzby-poprad': trvale('/poprad'),
  '/pohrebne-sluzby-spisska-bela': trvale('/spisska-bela'),
  '/pohrebne-sluzby-liptovsky-mikulas': trvale('/liptovsky-mikulas'),

  /* ---- OCHRANA SÚKROMIA: čaká na texty od klienta ----
     Stará stránka je v indexe, nová neexistuje. Odkaz na ňu je zatiaľ
     zakomentovaný v pätičke (Base.astro). Keď texty prídu, sprav stránku
     /ochrana-osobnych-udajov a prepíš cieľ. */
  '/ochrana-sukromia': trvale('/kontakt'),

  /* ---- hromadné (391 parte, 81 kytíc, 4 kategórie) ----
     TIETO TU NIE SÚ, sú vo vercel.json. Astro dynamické presmerovanie
     odmietne, ak cieľ nenesie tie isté parametre ako zdroj: „/old/[slug]“
     musí ísť na niečo, čo tiež má [slug]. My chceme opak, zliať 476 adries
     na tri prehľady, lebo staré slugy sa s novými nezhodujú (parte chodia
     zo Supabase, kytice sú dnes katalóg vo vnútri kvetinárstva).
     To vie Vercel cez `:path*`, pozri redirects vo vercel.json.
     Vysvetlenie k celému vercel.json je vo VERCEL.md: samotný súbor
     komentáre niesť nemôže, Vercel odmietne aj kľúč navyše. */
};
