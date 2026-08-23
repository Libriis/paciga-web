-- ============================================================
-- Sviečky: podpísaná požiadavka (HMAC)
-- ============================================================
-- Toto je ZDROJ PRAVDY pre funkciu zapal_sviecku. V schema.sql už nie je,
-- lebo tam bola nepodpísaná dvojparametrová verzia a jej opätovné spustenie
-- by ochranu zmazalo aj s grantom pre anon.
--
-- Poradie pri čistom nasadení: schema.sql, potom tento súbor.
--
-- ------------------------------------------------------------
-- NASADENÉ NA PRODUKCII 23. 8. 2026 21:10
-- migrácia: sviecka_bez_ticheho_prepadnutia
-- ------------------------------------------------------------
-- Predtým tu bežal variant, ktorý pri chýbajúcom riadku sviecka_hmac
-- prepadol a prijal každý podpis. `select ... into v_secret` bez zhody
-- nechá v_secret NULL, `extensions.hmac(text, NULL, 'sha256')` vráti NULL,
-- takže v_expected je NULL a `p_sig <> v_expected` sa vyhodnotí na NULL.
-- plpgsql berie NULL ako nepravdu, takže funkcia pokračovala ďalej.
--
-- Overené na živej databáze pred opravou, v bloku, ktorý sa sám zhodil,
-- takže sa nič neuložilo: s úmyselne zmazaným kľúčom vrátilo volanie
-- zapal_sviecku('anna-kicakova', 'proba-fail-open', '00') hodnotu 1.
-- Sviečka sa teda naozaj zapálila na vymyslený podpis.
--
-- Po oprave, tie isté testy:
--   chýbajúci kľúč   -> raise exception 'chyba riadok sviecka_hmac ...'
--   zlý podpis       -> null
--   správny podpis   -> 1 (funguje)
--   živý web         -> POST /api/sviecka vrátil {"sviecky":1} bez zápisu
--
-- Verzia spred opravy je uložená ako bod návratu:
-- zalohy/db-2026-08-23/11-zapal-sviecku-PRED-opravou.sql
-- ------------------------------------------------------------

-- ---------- súkromná schéma pre tajomstvá ----------
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.app_secret (
  kluc     text primary key,
  hodnota  text not null
);
revoke all on table private.app_secret from anon, authenticated;

-- Riadok 'sviecka_hmac' sa dopĺňa ručne a jeho hodnota sa musí PRESNE zhodovať
-- s premennou SVIECKA_RPC_SECRET vo Verceli. Do repozitára nikdy nepatrí:
--   insert into private.app_secret (kluc, hodnota) values ('sviecka_hmac', '<kľúč>')
--     on conflict (kluc) do update set hodnota = excluded.hodnota;
-- Rotuj vždy cez `on conflict do update`, nikdy nie delete + insert. Medzi
-- zmazaním a vložením by riadok chýbal.

-- ---------- funkcia: zapáliť sviečku ----------
-- security definer: anonymný návštevník nemá priamy prístup k sviecky_log
-- ani k update parte — smie len zavolať túto funkciu, a to iba s podpisom,
-- ktorý vie vyrobiť jedine server (Vercel env SVIECKA_RPC_SECRET).
create or replace function public.zapal_sviecku(p_slug text, p_ip_hash text, p_sig text)
returns int
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_secret text;
  v_expected text;
  v_id uuid;
  v_count int;
begin
  select hodnota into v_secret from private.app_secret where kluc = 'sviecka_hmac';

  -- Bez kľúča sa NESMIE pokračovať. Výnimka, nie `return null`: chýbajúci
  -- kľúč je porucha nasadenia, nie neplatný podpis, a má byť vidieť v logu.
  if v_secret is null or v_secret = '' then
    raise exception 'chyba riadok sviecka_hmac v private.app_secret';
  end if;

  v_expected := encode(extensions.hmac(p_slug || ':' || p_ip_hash, v_secret, 'sha256'), 'hex');

  -- `is distinct from`, nie `<>`: NULL-bezpečné porovnanie. Pri `<>` by NULL
  -- na ktorejkoľvek strane dal NULL a podmienka by neplatila.
  if p_sig is null or p_sig is distinct from v_expected then
    return null;
  end if;

  select id into v_id from parte where slug = p_slug and published;
  if v_id is null then
    return null;
  end if;

  begin
    insert into sviecky_log (parte_id, ip_hash) values (v_id, p_ip_hash);
  exception when unique_violation then
    -- dnes už z tejto IP sviečka horí — vráť aktuálny počet bez navýšenia
    select sviecky into v_count from parte where id = v_id;
    return v_count;
  end;

  update parte set sviecky = sviecky + 1 where id = v_id returning sviecky into v_count;
  return v_count;
end $$;

revoke all on function public.zapal_sviecku(text, text, text) from public;
grant execute on function public.zapal_sviecku(text, text, text) to anon, authenticated;

-- Nepodpísaná dvojparametrová verzia už na produkcii nie je. Keby ju niekde
-- oživila stará schéma, zmaž ju — bez podpisu sa dá počítadlo nafúkať.
drop function if exists public.zapal_sviecku(text, text);

-- ------------------------------------------------------------
-- ZOSTÁVA DOROBIŤ (vyžaduje zosúladenú zmenu kódu aj databázy)
-- ------------------------------------------------------------
-- 1. Podpis viazať na deň alebo na krátke okno platnosti. Teraz sa podpisuje
--    len (slug, ip_hash), zatiaľ čo sviecky_log rozlišuje (parte_id, ip_hash,
--    den). Jeden odchytený podpis sa tak dá prehrať raz denne navždy, mimo
--    dosahu limitu v API vrstve. Oprava sa musí nasadiť súčasne s
--    src/pages/api/sviecka.ts, inak sviečky prestanú fungovať: server by
--    podpisoval iný reťazec, než aký databáza očakáva.
-- 2. Porovnanie v konštantnom čase. `is distinct from` nad textom skončí na
--    prvom odlišnom bajte. Nález #34 auditu, úroveň info — cez sieť je ten
--    rozdiel prakticky nemerateľný, ale keď sa bude prepisovať bod 1,
--    prejdi rovno na porovnanie bytea pevnej dĺžky.
