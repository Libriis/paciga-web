# Paciga CRM + Dashboard — plán

Cieľ: vlastný interný systém pre Paciga na princípe modernepohrebnictvo.sk,
ale integrovaný s webom (parte, dopyty) a bez mesačných poplatkov tretej strane.

## Referencia: modernepohrebnictvo.sk

Webová aplikácia pre pohrebné služby. Funkcie z ich prezentácie:

- vedenie pohrebu krok za krokom podľa zákona č. 131/2010 Z. z. o pohrebníctve
- automatické generovanie splnomocnenia + digitálny podpis
- evidencia zosnulých, spomienková stránka
- digitálny archív dokumentov: List o obhliadke mŕtveho, Úmrtný list,
  Pas pre mŕtvolu, Povolenie na pochovanie, fotka zosnulého, fotka výkopu
- ranný e-mail s najbližšími udalosťami (vyzdvihnutie, dovoz rakvy, pohreb)
- konfigurovateľný cenník služieb a produktov

## Čo už máme (základ z backendu webu)

- Astro 5 + Supabase + Vercel, admin `/admin` (Supabase Auth, RLS)
- parte s publikovaním na web, kondolencie s moderáciou, sviečky
- dopyty z kontaktného formulára (= prví leadi do CRM)
- Resend na e-maily
- demo režim adminu (ladenie bez databázy)

## Navrhované moduly

### 1. Zákazky (srdce systému)
Jedna zákazka = jeden pohreb. Obsahuje:
- zosnulý (údaje, dátumy, miesto), objednávateľ (pozostalý → kontakt v CRM)
- **stavový workflow**: nový → prevoz → príprava → obrad → vybavené → vyúčtované
- **checklist krokov podľa zákona 131/2010** (obhliadka, matrika, povolenia…)
  s dátumami a zodpovednosťou — nič sa nezabudne
- termíny: vyzdvihnutie, dovoz rakvy, rozlúčka (→ kalendár + notifikácie)
- pobočka (Poprad / Spišská Belá / Liptovský Mikuláš)
- prepojenie: jedným klikom vytvorí parte na webe; dopyt z webu sa dá
  konvertovať na zákazku

### 2. Kontakty (CRM)
Pozostalí a objednávatelia: meno, telefón, e-mail, adresa, poznámky,
história zákaziek a dopytov. Vyhľadávanie.

### 3. Dokumenty
Foto/scan dokladov priamo z mobilu k zákazke (privátny Supabase Storage,
podpísané URL — nie verejný bucket). Kategórie podľa zákona. Generovanie
splnomocnenia ako PDF z údajov zákazky, podpis prstom na displeji.

### 4. Kalendár, úlohy a notifikácie
Prehľad najbližších udalostí zo všetkých zákaziek. Ranný e-mail digest
(Vercel Cron + Resend): „Dnes: rozlúčka Poprad 13:00 · Zajtra: vyzdvihnutie…"

### 5. Cenník a kalkulácia
Katalóg služieb a produktov s cenami (rakvy, vence, prevoz, kamenárstvo…).
Na zákazke sa poskladajú položky → suma → podklad pre faktúru (export/tlač).
Fakturáciu samotnú nechať na účtovný systém, my dáme podklady.

### 6. Dashboard
- aktívne zákazky podľa stavu a pobočky
- najbližšie udalosti (dnes/zajtra/týždeň)
- nové dopyty z webu, kondolencie na schválenie
- mesačné čísla: počet pohrebov, tržby z kalkulácií, trend
- aktivita webu: sviečky, návštevy parte

## Architektúra

Rovnaký stack, žiadna nová platforma:
- **Databáza:** Supabase — nové tabuľky (zakazky, kontakty, dokumenty,
  ukony/checklist, cennik, polozky_zakazky), RLS + roly (majiteľ/zamestnanec)
- **Aplikácia:** rozšírenie `/admin` v existujúcom Astro projekte na
  viacstránkový systém so spoločným admin layoutom:
  `/admin` (dashboard), `/admin/zakazky`, `/admin/zakazky/[id]`,
  `/admin/kontakty`, `/admin/cennik`, `/admin/dokumenty`, `/admin/parte`…
- **Notifikácie:** Vercel Cron endpoint → Resend digest
- **PDF:** generovanie splnomocnenia serverless funkciou
- **Citlivé dáta (GDPR):** EU región Supabase, privátne buckety, prístup len
  pre prihlásených, log prístupov k dokumentom
- Demo režim zachovať — celé CRM sa dá ladiť bez ostrej databázy

## Fázy

| Fáza | Obsah | Výstup |
|---|---|---|
| **1 — MVP ✅ HOTOVÁ (12. 7. 2026)** | Zákazky + checklist + kontakty + admin layout + dashboard v1 + dokumenty (foto/scan) + konverzia dopyt→zákazka, zákazka→parte. Celé funguje aj v demo režime, overené E2E testami. | klient vie viesť pohreby v systéme |
| **1b — Analytika ✅ HOTOVÁ (12. 7. 2026)** | Pobočky ako plnohodnotná dimenzia (filter všade, validované farby), zákazky s typom/sumou/zdrojom, `/admin/statistiky` (KPI, grafy po mesiacoch, porovnanie pobočiek, kremácie, zdroje, top miesta, web), dashboard v2, demo generátor ~135 zákaziek za 14 mesiacov so sezónnosťou. 26/26 E2E testov. | majiteľ vidí čísla a trendy podľa pobočiek |
| **2 — Notifikácie a PDF** | splnomocnenie PDF + podpis prstom, ranný e-mail digest (Vercel Cron + Resend), kalendárový pohľad | papierovačky v mobile, nič sa nezabudne |
| **3 — Peniaze a prehľady** | cenník, kalkulácie, podklady pre faktúry, dashboard v2 (tržby, trendy), roly používateľov | čísla pre majiteľa |

## Otvorené otázky

- koľko používateľov a aké roly (Marek + ?)
- fakturácia: stačí podklad/export, alebo napojenie na konkrétny systém?
- checklist krokov: overiť s klientom reálny postup (zákon 131/2010 ako kostra)
- doména: admin na paciga.sk/admin alebo samostatná subdoména (crm.paciga.sk)?
