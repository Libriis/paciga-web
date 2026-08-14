-- ============================================================
-- Migrácia kategórií aktualít (14. 8. 2026)
-- rada / novinka / spolupraca  →  päť kategórií podľa obsahových
-- pilierov značky (prirucka/obsahove-piliere-paciga.md):
--   prve-kroky   Prvé kroky (akútna fáza po úmrtí)
--   smutok       Smútok a spomínanie
--   planovanie   Plánovanie vopred (predplánovanie, mýty)
--   sperky       Spomienkové šperky
--   zo-zivota    Zo života Paciga (novinky, spolupráce, zákulisie)
--
-- POZOR NA PORADIE: spustiť až PO nasadení kódu s novými kategóriami.
-- Nový kód má prechodový alias starých kľúčov (lib/clanky.ts), takže
-- poradie nasadenie → migrácia nič nerozbije. Opačné poradie áno:
-- starý kód nové kľúče nepozná a filter na /aktuality by stratil články.
-- ============================================================

alter table public.clanky drop constraint if exists clanky_kategoria_check;
alter table public.clanky alter column kategoria set default 'prve-kroky';

-- Články, kde plošné pravidlo nesedí: šperky a plánovanie boli dovtedy „rada".
update public.clanky set kategoria = 'sperky'
  where slug = 'odtlacok-prsta-zosnuleho-na-pamiatku';
update public.clanky set kategoria = 'planovanie'
  where slug in ('viac-nez-pohrebna-sluzba', 'sposoby-pochovavania');

-- Zvyšok plošne: rady sú prvé kroky, novinky a spolupráce život firmy.
update public.clanky set kategoria = 'prve-kroky' where kategoria = 'rada';
update public.clanky set kategoria = 'zo-zivota' where kategoria in ('novinka', 'spolupraca');

alter table public.clanky add constraint clanky_kategoria_check
  check (kategoria in ('prve-kroky', 'smutok', 'planovanie', 'sperky', 'zo-zivota'));
