# Prepnutie paciga.sk na Vercel

Plán na 30. 8. 2026 okolo 21:00. Starý WordPress na Webhouse ostáva ako záloha.

## Čo je hotové (30. 8. 2026 večer)

- Vercel projekt `paciga-web` má pridané domény `paciga.sk` aj `www.paciga.sk`.
- Kód je na doménu pripravený: `site` v astro.config = `https://www.paciga.sk`,
  canonical, OG, sitemap, robots.txt aj CSRF brána (`src/lib/povod.ts`) sa
  riadia hostom. Na `*.vercel.app` ostáva noindex, na `www.paciga.sk` ide index.
- Všetkých 529 starých WordPress adries má cieľ (42 v `presmerovania.mjs`,
  476 cez `vercel.json`, 11 existuje ako stránka).
- `lighthouserc.json` už meria `www.paciga.sk`.

## Dnešné DNS (zmerané 30. 8. 2026, TTL 600 s)

| záznam | dnes | po prepnutí |
|---|---|---|
| `A @` (paciga.sk) | `93.184.77.195` | `76.76.21.21` |
| `CNAME www` | `web195.webhouse.sk` | `cname.vercel-dns.com` |
| `MX` (6x mx*.webhouse.sk) | ostáva | ostáva |
| `TXT` SPF | ostáva | ostáva |
| `CNAME mail, webmail, ftp, autodiscover` | ostáva | ostáva |
| `CNAME _dmarc` | ostáva | ostáva |
| `NS` (ns1-3.webhouse.sk) | ostáva | ostáva |

Mail @paciga.sk beží na Webhouse. Menia sa LEN dva riadky. NS servery
nemeniť, inak padne mail aj všetko ostatné.

## Postup o 21:00

### 1. Webhouse: DNS zóna (setup.sk → Domény → paciga.sk → DNS zóna)

1. `A` záznam pre `paciga.sk` (koreň, `@`): zmeň `93.184.77.195` na `76.76.21.21`.
2. `CNAME` záznam pre `www`: zmeň `web195.webhouse.sk` na `cname.vercel-dns.com`.
3. Nič iné nechytaj. Ulož.

### 2. Vercel: presmerovanie koreňa na www

vercel.com → projekt `paciga-web` → Settings → Domains → `paciga.sk` → Edit
→ „Redirect to" = `www.paciga.sk`, kód 308 → Save.

Dôvod: canonical, sitemap aj robots hovoria `www.paciga.sk`. Bez tohto by
`paciga.sk` a `www.paciga.sk` boli dva weby s rovnakým obsahom.

### 3. Supabase: adresa webu (voliteľné, 1 minúta)

supabase.com → projekt `oichfrunhfcnnzvwnxtx` → Authentication → URL
Configuration → Site URL = `https://www.paciga.sk`.

Admin sa prihlasuje heslom, redirecty sa nepoužívajú. Je to poriadok, nie
podmienka.

### 4. Počkaj 10 minút (TTL 600 s)

Vercel po prvom správnom DNS dotaze sám vystaví certifikát. Trvá to 1 až
5 minút. Dovtedy môže prehliadač hlásiť chybu certifikátu. To je normálne.

### 5. Kontrola

```
node scripts/kontrola-domeny.mjs
```

Skript vypíše stav každej adresy. Očakávané:

- `https://paciga.sk/` → 308 na `https://www.paciga.sk/`
- `https://www.paciga.sk/` → 200, canonical `https://www.paciga.sk/`
- `https://www.paciga.sk/robots.txt` → `Allow: /` (nie `Disallow: /`)
- `https://www.paciga.sk/sitemap-index.xml` → 200
- `https://www.paciga.sk/admin` → 200 s `X-Robots-Tag: noindex`
- staré adresy → 301/308 na nové
- `https://paciga-web.vercel.app/robots.txt` → `Disallow: /` (staging ostáva zavretý)

Ručne: otvor `https://www.paciga.sk/admin`, prihlás sa, zapáľ sviečku
na jednom parte, pošli testovací kontaktný formulár.

### 6. Search Console (do 24 h po prepnutí)

1. search.google.com/search-console → Pridať vlastníctvo → typ „Doména" → `paciga.sk`.
2. Google dá `TXT` záznam `google-site-verification=...`.
3. Webhouse DNS zóna → pridaj `TXT` pre `@` s tou hodnotou. Ulož.
4. Po 10 minútach v Search Console klikni Overiť.
5. Sitemaps → pridaj `https://www.paciga.sk/sitemap-index.xml`.

## Návrat späť (rollback)

Starý hosting sa nevypína. Stačí vrátiť dva riadky vo Webhouse:

- `A @` → `93.184.77.195`
- `CNAME www` → `web195.webhouse.sk`

Do 10 minút beží starý web. Vo Verceli netreba nič.

Pozor: `vercel.json` posiela HSTS s `preload` na dva roky. Po prepnutí
musí aj starý web bežať na HTTPS (dnes beží, Webhouse má certifikát).

## Kedy vypnúť starý hosting

Nie skôr než 14 dní po prepnutí, a až keď Search Console ukáže nový web
bez chýb. Pred vypnutím stiahnuť zálohu WordPressu (Webhouse → Obnova a
zálohy).
