# Paciga web — backend + CRM (Astro + Supabase + Vercel)

Web je Astro projekt: statické stránky sa predgenerujú, dynamické časti
(parte, sviečky, kondolencie, kontaktný formulár) bežia ako Vercel funkcie
nad Supabase databázou. Administrácia a CRM sú na `/admin`.

## CRM (Fáza 1)

Interný systém pre pohrebníctvo, prihlásenie cez Supabase Auth:

| Stránka | Čo robí |
|---|---|
| `/admin` | dashboard — aktívne zákazky, najbližšie udalosti, dopyty, kondolencie, pohreby po mesiacoch |
| `/admin/zakazky` | zoznam zákaziek s filtrami podľa stavu + založenie novej |
| `/admin/zakazka?id=…` | detail: checklist 15 krokov podľa zákona 131/2010, termíny, objednávateľ, dokumenty (foto/scan do privátneho úložiska), vytvorenie parte, poznámka |
| `/admin/kontakty` | pozostalí a objednávatelia, vyhľadávanie, história zákaziek |
| `/admin/statistiky` | vyhodnotenia: KPI, pohreby a tržby po mesiacoch, porovnanie pobočiek, podiel kremácií, zdroje zákaziek, top miesta rozlúčok, web a spomienky. Filtre obdobie + pobočka. |
| `/admin/web` | správa webu — parte, kondolencie, dopyty (dopyt → zákazka jedným klikom) |

Všade funguje pobočkový filter (Poprad / Spišská Belá / Liptovský Mikuláš,
farby pobočiek sú konzistentné naprieč grafmi). Zákazky nesú typ
(pochovanie/kremácia), sumu a zdroj (telefonát/osobne/odporúčanie/web) —
z toho sa počítajú tržby a vyhodnotenia.

Bez env premenných beží celý admin v **DEMO režime** (ukážkové dáta v
prehliadači) — dá sa ladiť a predviesť klientovi bez databázy.

## Čo backend robí

| Funkcia | Kde | Ako |
|---|---|---|
| Správa parte | `/admin` → Parte | pridanie, úprava, fotka, skrytie, vymazanie |
| Zoznam Opustili nás | `/opustili-nas` + homepage | číta sa z DB, cache 2–5 min |
| Parte stránky | `/parte/[slug]` | server render, OG tagy pre Facebook, JSON-LD |
| Sviečky | tlačidlo na kartách a parte | `/api/sviecka`, 1 sviečka / IP / deň |
| Kondolencie | formulár na parte | `/api/kondolencia` → čaká na schválenie v admine |
| Kontaktný formulár | `/kontakt` | `/api/kontakt` → uloží do DB + e-mail cez Resend |

Bez nastavených env premenných web funguje ďalej — parte sa berú zo
`src/data/parte-seed.json`, formuláre vrátia zdvorilú chybu.

## Prvé spustenie (raz)

### 1. Supabase (databáza, fotky, prihlásenie) — zadarmo

1. [supabase.com](https://supabase.com) → New project (región EU — Frankfurt).
2. **SQL Editor → New query** → spusti schémy **v tomto poradí**:
   `supabase/schema.sql` (tabuľky, politiky, bucket, 12 parte),
   `supabase/schema-sviecka-podpis.sql` (súkromná schéma, `app_secret`
   a podpísaná funkcia `zapal_sviecku` — od 23. 8. 2026 už nie je
   v `schema.sql`, lebo tam bola nepodpísaná verzia a jej spustenie by
   ochranu sviečok zmazalo aj s grantom pre `anon`),
   `supabase/schema-crm.sql` (zákazky, kontakty, checklist, dokumenty),
   `supabase/schema-vitals.sql` (Core Web Vitals z terénu),
   `supabase/schema-admin.sql` (admin identita — prepisuje admin politiky
   z predchádzajúcich troch, preto musí ísť po nich),
   `supabase/schema-clanky.sql` (aktuality; potrebuje `je_admin()` zo štvorky),
   `supabase/schema-pristupy.sql` (právomoci používateľov — **posledná**,
   prepisuje politiky všetkých predchádzajúcich).
3. **Authentication → Users → Add user** → e-mail + heslo pre klienta.
   Adresa sa musí zhodovať s riadkom v tabuľke `admini`, inak sa prihlásenie
   podarí, ale admin neuvidí nič. Predvyplnená je `paciga@paciga.sk`.
4. **Authentication → Sign In / Up** → vypni "Allow new users to sign up".
   Bez toho si účet vytvorí ktokoľvek. Sám o sebe ho `schema-admin.sql`
   do dát nepustí, ale platí to len dovtedy, kým niekto ten prepínač
   nezapne späť.
5. Po prvom prihlásení admina prišpendli prístup na jeho `user_id`,
   nech nevisí na e-mailovej adrese:
   ```sql
   update public.admini a set user_id = u.id
   from auth.users u where lower(u.email) = lower(a.email);
   ```
6. **Settings → API** → skopíruj `Project URL` a `anon public` kľúč.

### 2. Resend (e-maily) — zadarmo, nepovinné

1. [resend.com](https://resend.com) → API Keys → Create.
2. Domains → pridaj `paciga.sk` a nastav DNS záznamy (inak sa dá dočasne
   odosielať z `onboarding@resend.dev`, ale len na e-mail majiteľa účtu).
3. Bez Resendu sa dopyty aj tak ukladajú do DB a vidno ich v admine.

### 3. Vercel

1. Project → **Settings → General → Framework Preset** prepni na **Astro**
   (projekt bol doteraz nasadený ako statický web).
2. **Settings → Environment Variables** — pridaj hodnoty podľa `.env.example`:
   `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`,
   `RESEND_API_KEY`, `RESEND_FROM`, `KONTAKT_EMAIL`, `SVIECKA_SALT`.
3. Push do repa → deploy.

### 4. Lokálny vývoj

```bash
cp .env.example .env   # doplň hodnoty
npm install
npm run dev            # http://localhost:4321
npm run build          # produkčný build
```

> **Pozor — lokálny `npm run build` na tomto počítači spadne bez chybovej
> hlášky.** Je to bug Node.js na Windows: `fs.cpSync` s file URL zabije proces,
> keď cesta obsahuje diakritiku („Paciga - pohrebníctvo"). Na Verceli (Linux)
> build funguje normálne, `npm run dev` funguje aj lokálne. Ak treba build
> overiť lokálne, skopíruj projekt do cesty bez diakritiky
> (napr. `h:\tmp\paciga-build-test`) a spusti ho tam.

## Bezpečnostný model

- Na klienta ide len **anon** kľúč — všetko stráži Row Level Security:
  verejnosť číta iba publikované parte a schválené kondolencie, vkladať smie
  iba neschválené kondolencie a dopyty.
- Admin operácie vyžadujú prihláseného používateľa, ktorý je **navyše
  uvedený v tabuľke `admini`**. Samotné prihlásenie nestačí.
- Každý používateľ má v `admini.pristupy` zoznam sekcií, ku ktorým sa
  dostane. Vynucuje ich `public.ma_pristup()` priamo v RLS na tabuľkách,
  nie skrytím položky v menu. Kto pozná adresu, otvorí ju priamo, ale
  z databázy nedostane ani riadok. Menu z tých istých hodnôt len vychádza.
- Zoznam používateľov číta a mení iba **hlavný správca**
  (`admini.hlavny`), stráži to `public.je_hlavny_admin()`. Bežný redaktor
  si právomoci pridať nevie a zoznam ostatných ani neuvidí. Vlastné
  prístupy si prečíta funkciou `public.moje_pristupy()`, ktorá vracia
  výhradne jeho riadok.
- Sviečky: unikát (parte, hash IP, deň) — IP sa ukladá len ako solený hash.
- Formuláre majú honeypot pole proti botom; kondolencie sa zverejňujú až po
  schválení v admine.
- Service role kľúč sa nepoužíva nikde.

## Štruktúra

```
src/layouts/Base.astro     spoločná hlavička/pätička/skripty
src/pages/*.astro          stránky (index a opustili-nas čítajú DB)
src/pages/parte/[slug]     dynamické parte (SSR + OG tagy)
src/pages/api/*            sviecka, kondolencia, kontakt
src/pages/admin/           administrácia (client-side, Supabase Auth)
src/lib/                   supabase klient, parte helpery, e-mail
src/data/parte-seed.json   fallback dáta bez DB
public/                    css, js, assets (1:1 pôvodný dizajn)
supabase/schema.sql        web: parte, kondolencie, dopyty, sviečky + seed
supabase/schema-crm.sql    CRM: zákazky, kontakty, úkony, dokumenty
supabase/schema-vitals.sql Core Web Vitals z terénu + prehľad percentilov
supabase/schema-admin.sql  admin identita — spúšťať po prvých troch
supabase/schema-clanky.sql aktuality ako redakčný obsah
supabase/schema-pristupy.sql právomoci používateľov — spúšťať poslednú
```

## Redakčný systém

Obsah webu sa spravuje v `/admin` bez zásahu do kódu:

- **Parte** (`/admin/web`) — všetky údaje zosnulého, termín a miesto rozlúčky,
  odkaz rodine, fotka s automatickým zmenšením, koncept alebo zverejnené.
- **Kondolencie** (`/admin/web`) — chodia neschválené, na web sa dostanú až
  po schválení.
- **Aktuality** (`/admin/clanky`) — titulok, perex, kategória, dátum, titulná
  fotka, text a výzva na konci. Text sa píše po odstavcoch oddelených prázdnym
  riadkom, tlačidlá Nadpis a Odrážka menia typ riadku pod kurzorom a náhľad
  ukazuje výsledok. Koncept sa na webe nezobrazí.

Prehľad aktualít aj detail článku bežia ako SSR, takže nový článok je na webe
hneď po uložení, bez nasadzovania. Kým je tabuľka `clanky` prázdna, web
zobrazuje pôvodných 21 článkov zo `src/data/aktuality.ts`; v `/admin/clanky`
je na ich jednorazový presun do databázy tlačidlo.

Staré adresy `*.html` (zdieľané na Facebooku) presmeruje middleware 301
na čisté URL (`/parte/meno-priezvisko`).

## Právomoci používateľov

Hlavný správca nastavuje v `/admin/pouzivatelia`, kto ktorú sekciu vidí:
dashboard, zákazky, kontakty, štatistiky, web a parte, aktuality, rýchlosť webu.

Samotné účty sa zakladajú v Supabase (Authentication → Users → Add user,
zapnúť Auto Confirm User), lebo vytvorenie používateľa vyžaduje servisný
kľúč a ten do prehliadača nepatrí. Prihlasovacie meno `peter` znamená
adresu `peter@paciga.sk`; riadok v `admini` a účet v Supabase sa musia
zhodovať, inak sa človek prihlási, ale neuvidí nič.

Kto nemá pridelenú ani jednu sekciu, skončí na `/admin/bez-pristupu`.
