-- Prepojenie parte s Moderným pohrebníctvom (8. 10. 2026).
-- Spustiť PO schema-pristupy.sql (potrebuje funkciu ma_pristup).
--
-- Zamestnanec vyplní pohreb v Modernom pohrebníctve (MP) a v admine na
-- /admin/parte/synchronizovat si vyberie, z ktorých pohrebov vznikne parte.
-- Parte vzniká vždy SKRYTÉ (published = false). Zverejní ho človek ručne,
-- lebo niektoré rodiny parte na webe nechcú.
--
-- Prečo samostatná tabuľka a nie stĺpec v parte:
--   1. Parte číta aj anon (verejný web). Stĺpec by ukázal ID záznamu z MP
--      každému, kto pošle select=* na REST API. Táto tabuľka je len pre adminov.
--   2. snimka drží údaje z MP v tvare, v akom sa naposledy natiahli. Pri ďalšej
--      synchronizácii sa pole v parte prepíše len vtedy, keď sa v MP zmenilo
--      A ZÁROVEŇ ho v parte nikto ručne neupravil (parte = stará snímka).
--      Ručná oprava v koncepte tak synchronizáciu prežije.
--
-- Zmazanie parte zmaže aj prepojenie (cascade). Pohreb sa potom v zozname
-- synchronizácie ukáže znova ako nový.

create table if not exists public.parte_moderne (
  parte_id uuid primary key references public.parte (id) on delete cascade,
  mp_id text not null unique check (mp_id ~ '^[a-f0-9]{24}$'),
  snimka jsonb not null default '{}'::jsonb,
  synchronizovane_at timestamptz not null default now()
);

alter table public.parte_moderne enable row level security;

-- Anon tu nemá čo hľadať ani cez default privileges projektu.
revoke all on public.parte_moderne from anon;
grant select, insert, update, delete on public.parte_moderne to authenticated;

-- Rovnaká právomoc ako parte samotné: sekcia 'web'.
drop policy if exists parte_moderne_admin_all on public.parte_moderne;
create policy parte_moderne_admin_all on public.parte_moderne
  for all to authenticated using (public.ma_pristup('web')) with check (public.ma_pristup('web'));
