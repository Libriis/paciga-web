-- ============================================================
-- Pritvrdenie anonymných zápisov
-- ============================================================
-- Nález #3 auditu ASVS 5.0 Level 2 (23. 8. 2026), prvá fáza.
-- NASADENÉ NA PRODUKCII 23. 8. 2026 21:20, migrácia `anon_zapisy_pritvrdene`.
--
-- Spúšťaj až po schema.sql, schema-crm.sql a schema-vitals.sql (potrebuje
-- tabuľky) a po schema-pristupy.sql (tá prepisuje politiky). Prakticky:
-- ako posledný.
--
-- ------------------------------------------------------------
-- PROBLÉM
-- ------------------------------------------------------------
-- Anon kľúč je verejný, je v každej stránke. Kto ho má, vie volať
-- /rest/v1/<tabulka> priamo a obísť tým celú aplikačnú vrstvu: honeypot,
-- limit 5 za hodinu, kontrolu polí aj vyhľadanie publikovaného parte.
--
-- Overené auditom: POST /rest/v1/dopyty s telom {"precitane":false} prešiel
-- cez RLS a zastavilo ho až NOT NULL na stĺpci meno. Čiže politika sama
-- o sebe nebránila ničomu okrem príznaku.
--
-- Úplne to zavrie až presun verejných zápisov na SECURITY DEFINER RPC, tak
-- ako to už má zapal_sviecku. To je druhá fáza a je to väčší zásah, lebo
-- mení kontaktný formulár, kondolencie aj telemetriu naraz.
--
-- Táto fáza robí niečo lacnejšie a bez rizika: databáza si vynúti presne tie
-- pravidlá, ktoré aplikácia už dnes dodržiava. Preto sa nemohlo nič pokaziť.
--
-- ------------------------------------------------------------
-- KTO KAM ZAPISUJE (zistené prehľadaním celého src/)
-- ------------------------------------------------------------
-- anon (čiže aj náš server, lib/supabase.ts používa anon kľúč) robí IBA
-- insert, a len do troch tabuliek:
--   dopyty        <- src/pages/api/kontakt.ts
--   kondolencie   <- src/pages/api/kondolencia.ts
--   web_vitals    <- src/pages/api/vitals.ts
-- Všetky update a delete robí prihlásený admin, čiže rola authenticated.
-- Preto sa dá anonovi odobrať update, delete aj truncate bez následkov.
-- ============================================================

-- ---------- 1. dopyty: telefón ALEBO e-mail je povinný ----------
-- kontakt.ts:32 to vyžaduje, databáza doteraz nie. Bez toho sa dá priamym
-- volaním uložiť dopyt, na ktorý sa nedá odpovedať.
alter table public.dopyty
  drop constraint if exists dopyty_kontakt_chk;
alter table public.dopyty
  add constraint dopyty_kontakt_chk
  check (coalesce(telefon, '') <> '' or coalesce(email, '') <> '');

-- ---------- 2. kondolencie: len k publikovanému parte ----------
-- Pôvodná politika nemala žiadny predikát na parte_id, takže sa kondolencia
-- dala pripnúť na akékoľvek parte vrátane nepublikovaného konceptu.
-- kondolencia.ts:40 hľadá parte s published = true.
drop policy if exists kondolencie_public_insert on public.kondolencie;
create policy kondolencie_public_insert on public.kondolencie
  as permissive for insert to anon
  with check (
    schvalene = false
    and exists (select 1 from public.parte p where p.id = parte_id and p.published)
  );

-- ---------- 3. web_vitals: dĺžky a tvar cesty ----------
-- Politika mala with check (true). Dĺžky polí a tvar cesty držala len
-- aplikácia (vitals.ts:39-45). Overené pred nasadením: všetkých 6906
-- vtedajších riadkov novým obmedzeniam vyhovovalo.
alter table public.web_vitals drop constraint if exists web_vitals_siet_chk;
alter table public.web_vitals
  add constraint web_vitals_siet_chk
  check (siet is null or char_length(siet) <= 20);

alter table public.web_vitals drop constraint if exists web_vitals_navigacia_chk;
alter table public.web_vitals
  add constraint web_vitals_navigacia_chk
  check (navigacia is null or char_length(navigacia) <= 20);

alter table public.web_vitals drop constraint if exists web_vitals_cesta_tvar_chk;
alter table public.web_vitals
  add constraint web_vitals_cesta_tvar_chk
  check (cesta ~ '^/[\w\-/]{0,199}$');

-- ---------- 4. anon nesmie určovať id ani created_at ----------
-- Tabuľkový GRANT INSERT platí na všetky stĺpce a jeden sa z neho odobrať
-- nedá. Treba odobrať celý a dať späť menovitý zoznam.
--
-- Bez toho si volajúci volí vlastné id aj čas vzniku. Spätné datovanie
-- ovplyvní poradie v administrácii aj retenciu, a zhodné id sa dá použiť
-- na kolízie kľúča.
--
-- Zoznam sedí presne s tým, čo posiela server. Keď doň niekedy pribudne
-- stĺpec, doplň ho aj sem, inak zápis skončí na 42501.
revoke insert on public.dopyty from anon;
grant insert (meno, telefon, email, sprava, precitane) on public.dopyty to anon;

revoke insert on public.kondolencie from anon;
grant insert (parte_id, meno, odkaz, schvalene) on public.kondolencie to anon;

revoke insert on public.web_vitals from anon;
grant insert (metrika, hodnota, rating, cesta, zariadenie, siet, navigacia) on public.web_vitals to anon;

-- ---------- 5. anon nemá čo meniť ani mazať ----------
-- RLS to už blokuje, žiadna politika to anonovi nepovoľuje. Toto je druhá
-- vrstva pre prípad, že by niekto RLS vypol alebo pridal širokú politiku.
revoke update, delete, truncate on public.dopyty from anon;
revoke update, delete, truncate on public.kondolencie from anon;
revoke update, delete, truncate on public.web_vitals from anon;

-- ============================================================
-- OVERENIE PO NASADENÍ
-- ============================================================
-- Deväť testov, všetky v bloku, ktorý sa sám zhodil, takže sa nič neuložilo:
--
--   dopyt bez telefónu aj e-mailu        zamietnutý  23514
--   dopyt s vlastným id                  zamietnutý  42501
--   dopyt tak, ako ho posiela server     PREŠIEL
--   vitals so spätným dátumom            zamietnutý  42501
--   vitals s cestou mimo vzoru           zamietnutý  23514
--   vitals tak, ako ich posiela server   PREŠIEL
--   kondolencia na publikované parte     PREŠLA
--   kondolencia na nepublikované parte   zamietnutá  42501
--   kondolencia so schvalene = true      zamietnutá  42501
--
-- Živá prevádzka po nasadení: 37 nových riadkov web_vitals za 10 minút,
-- najnovší 58 sekúnd pred kontrolou. Telemetria teda zapisuje ďalej.
--
-- ============================================================
-- ZOSTÁVA (druhá fáza)
-- ============================================================
-- Presunúť verejné zápisy na SECURITY DEFINER RPC, ktoré si samy overia
-- honeypot, limit a publikované parte, a potom anonovi odobrať insert úplne.
-- Až tým sa zavrie obchádzanie limitu 5 za hodinu — dnes ho priame volanie
-- REST stále obíde, lebo limit žije v aplikačnej vrstve.
