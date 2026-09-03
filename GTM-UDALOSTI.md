# Udalosti pre Google Tag Manager (GTM-K6GK3MN5)

Web paciga.sk posiela do `window.dataLayer` tieto udalosti. Kód: `public/js/konverzie.js`, `public/js/forms.js`, `public/js/candles.js`. Súhlas s cookies rieši `src/layouts/Base.astro`: bez súhlasu sa gtm.js nenačíta a nič neodíde.

## Udalosti

| event (Custom Event trigger) | Kedy | Parametre v dataLayer |
| --- | --- | --- |
| `telefon_klik` | klik na odkaz `tel:` kdekoľvek na webe | `cislo` (napr. 0903596364), `miesto` (id alebo trieda odkazu: nav-cta, callpill, footer-phone, btn-gold, branch-tel, step-tel, cp-num, callbar-tel, phone-primary...), `stranka` |
| `email_klik` | klik na odkaz `mailto:` | `miesto`, `stranka` |
| `dopyt_odoslany` | kontaktný formulár na /kontakt prešiel serverom (odpoveď 2xx) | `stranka` |
| `kondolencia_odoslana` | kondolencia pri parte prešla serverom | `slug` (slug parte), `stranka` |
| `sviecka_zapalena` | server zarátal zapálenú sviečku | `slug`, `stranka` |
| `zdielanie_klik` | klik na zdieľanie parte alebo článku | `kanal` (systemova-ponuka, facebook, whatsapp, sms, email, kopirovanie), `stranka` |

`stranka` je vždy cesta bez query a hashu, napr. `/parte/jan-novak`.

## Odporúčané nastavenie

Google Ads konverzie (primárne, optimalizuje sa na ne):

1. `telefon_klik` – hovor z webu. Najdôležitejšia konverzia pre pohrebnú službu.
2. `dopyt_odoslany` – správa cez formulár.

Google Analytics 4 udalosti (sekundárne, len na sledovanie):

3. `kondolencia_odoslana`, `sviecka_zapalena`, `zdielanie_klik` – aktivita pri parte. Nie sú to obchodné konverzie, do Ads ich nedávať.

## Postup v GTM

1. Premenné: Data Layer Variable pre `cislo`, `miesto`, `slug`, `kanal`, `stranka`.
2. Trigger: Custom Event, názov presne podľa tabuľky.
3. Tag GA4 Event: názov udalosti rovnaký, parametre z premenných.
4. Tag Google Ads Conversion Tracking pre `telefon_klik` a `dopyt_odoslany`. K nemu tag Conversion Linker (trigger All Pages).
5. Test: GTM Preview, na webe kliknúť Súhlasím, potom kliknúť na telefón. V Preview sa má objaviť `telefon_klik`.

Poznámka: udalosti sa pushujú aj pred súhlasom. GTM ich spracuje až keď návštevník klikne Súhlasím a gtm.js sa načíta. Bez súhlasu neodíde nič.
