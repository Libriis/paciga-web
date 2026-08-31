-- ============================================================
-- Paciga web — návštevnosť (vlastné počítadlo)
-- Spusti v Supabase: SQL Editor → New query → Run.
-- Poradie: PO schema-pristupy.sql, lebo politiky volajú ma_pristup().
--
-- Načo to je: klient chce vidieť návštevnosť priamo v admin centre, nie
-- na cudzom dashboarde. Vzor je rovnaký ako pri web_vitals: verejný
-- beacon vkladá, číta iba admin so sekciou 'navstevnost'.
--
-- Čo sa NEUKLADÁ: IP adresa, cookie, žiadny identifikátor návštevníka.
-- Preto to nie je osobný údaj a nepotrebuje cookie lištu. Rozlíšenie
-- „nová návšteva" drží sessionStorage v prehliadači, na server ide len
-- áno/nie, nikdy žiadne ID.
-- ============================================================

create table if not exists public.navstevy (
  -- identity namiesto uuid: tabuľka rastie s každým zobrazením stránky
  id bigint generated always as identity primary key,
  cesta text not null check (char_length(cesta) between 1 and 200),
  -- odkiaľ návštevník prišiel, už zatriedené (surová doména je v `odkazovac`)
  zdroj text not null default 'priamo'
    check (zdroj in ('priamo', 'google', 'seznam', 'bing', 'facebook', 'instagram',
                     'youtube', 'email', 'ine')),
  -- iba doména odkazujúcej stránky, nikdy celá adresa s parametrami
  odkazovac text check (char_length(odkazovac) <= 100),
  zariadenie text not null default 'unknown'
    check (zariadenie in ('mobile', 'desktop', 'unknown')),
  -- true pri prvom zobrazení v danej relácii prehliadača = jedna návšteva
  nova boolean not null default false,
  -- dvojpísmenový kód z hlavičky Vercelu. Ukazuje podiel cudzej prevádzky.
  krajina text check (char_length(krajina) = 2),
  created_at timestamptz not null default now()
);

create index if not exists navstevy_cas_idx on public.navstevy (created_at desc);
create index if not exists navstevy_cesta_idx on public.navstevy (cesta, created_at desc);

alter table public.navstevy enable row level security;

-- Server (/api/navsteva) chodí na Supabase s anon kľúčom, presne ako
-- /api/vitals, takže RLS platí aj naňho. Verejnosť smie iba vkladať.
drop policy if exists navstevy_public_insert on public.navstevy;
create policy navstevy_public_insert on public.navstevy
  for insert to anon with check (true);

-- Čítať smie len prihlásený so sekciou 'navstevnost'. Hlavný správca
-- prejde vždy, ma_pristup() ho púšťa všade.
drop policy if exists navstevy_admin_read on public.navstevy;
create policy navstevy_admin_read on public.navstevy
  for all to authenticated
  using (public.ma_pristup('navstevnost'))
  with check (public.ma_pristup('navstevnost'));

comment on column public.admini.pristupy is
  'Sekcie administrácie: dashboard, zakazky, kontakty, statistiky, web, clanky, vitals, navstevnost. Hodnota * znamená všetko.';

-- ============================================================
-- Agregácie
-- Prehliadač nemá sťahovať desaťtisíce riadkov, aby z nich zrátal graf.
-- Tieto funkcie sú zámerne BEZ security definer, takže bežia s právami
-- volajúceho a RLS vyššie na ne platí. Anonym z nich nedostane nič.
--
-- `greatest(1, least(coalesce(dni, 28), 400))` je strop dní. Chráni pred
-- volaním typu navstevnost_denne(999999). Je vpísaný priamo do každého
-- dotazu, nie v pomocnej funkcii: funkcia so `set search_path` sa nedá
-- inlinovať a linter 0011 by ju bez neho hlásil ako riziko.
-- ============================================================

/* Denný priebeh pre graf. Dátum sa počíta v našom čase, nie v UTC,
   inak by sa večerné návštevy hádzali do nasledujúceho dňa. */
create or replace function public.navstevnost_denne(dni int default 28)
returns table (den date, zobrazenia bigint, navstevy bigint, mobil bigint, desktop bigint)
language sql stable
set search_path = public
as $$
  select
    (created_at at time zone 'Europe/Bratislava')::date as den,
    count(*) as zobrazenia,
    count(*) filter (where nova) as navstevy,
    count(*) filter (where zariadenie = 'mobile') as mobil,
    count(*) filter (where zariadenie = 'desktop') as desktop
  from public.navstevy
  where created_at > now() - make_interval(days => greatest(1, least(coalesce(dni, 28), 400)))
  group by 1
  order by 1
$$;

/* Najnavštevovanejšie stránky. */
create or replace function public.navstevnost_stranky(dni int default 28, pocet int default 30)
returns table (cesta text, zobrazenia bigint, navstevy bigint)
language sql stable
set search_path = public
as $$
  select
    cesta,
    count(*) as zobrazenia,
    count(*) filter (where nova) as navstevy
  from public.navstevy
  where created_at > now() - make_interval(days => greatest(1, least(coalesce(dni, 28), 400)))
  group by cesta
  order by zobrazenia desc
  limit greatest(1, least(coalesce(pocet, 30), 200))
$$;

/* Odkiaľ ľudia prišli. Počíta sa na návštevy, nie na zobrazenia:
   zdroj má zmysel pri vstupe na web, nie pri každom prekliku. */
create or replace function public.navstevnost_zdroje(dni int default 28)
returns table (zdroj text, navstevy bigint, zobrazenia bigint)
language sql stable
set search_path = public
as $$
  select
    zdroj,
    count(*) filter (where nova) as navstevy,
    count(*) as zobrazenia
  from public.navstevy
  where created_at > now() - make_interval(days => greatest(1, least(coalesce(dni, 28), 400)))
  group by zdroj
  order by 2 desc, 3 desc
$$;

/* Krajiny. Ukáže, koľko prevádzky je naozaj domácej a koľko je cudzí
   šum. Kód dodáva Vercel v hlavičke, nie je to poloha návštevníka. */
create or replace function public.navstevnost_krajiny(dni int default 28)
returns table (krajina text, navstevy bigint)
language sql stable
set search_path = public
as $$
  select
    coalesce(krajina, '??') as krajina,
    count(*) filter (where nova) as navstevy
  from public.navstevy
  where created_at > now() - make_interval(days => greatest(1, least(coalesce(dni, 28), 400)))
  group by 1
  having count(*) filter (where nova) > 0
  order by 2 desc
  limit 8
$$;

/* Súhrn za obdobie aj za rovnako dlhé obdobie pred ním.
   Bez porovnania je jedno číslo nemé: 400 návštev je veľa alebo málo? */
create or replace function public.navstevnost_suhrn(dni int default 28)
returns table (
  zobrazenia bigint, navstevy bigint, mobil bigint, desktop bigint,
  stranok bigint, zobrazenia_pred bigint, navstevy_pred bigint
)
language sql stable
set search_path = public
as $$
  with obdobie as (
    select make_interval(days => greatest(1, least(coalesce(dni, 28), 400))) as trvanie
  ),
  teraz as (
    select n.* from public.navstevy n, obdobie o
    where n.created_at > now() - o.trvanie
  ),
  predtym as (
    select n.* from public.navstevy n, obdobie o
    where n.created_at > now() - o.trvanie - o.trvanie
      and n.created_at <= now() - o.trvanie
  )
  select
    (select count(*) from teraz),
    (select count(*) filter (where nova) from teraz),
    (select count(*) filter (where zariadenie = 'mobile') from teraz),
    (select count(*) filter (where zariadenie = 'desktop') from teraz),
    (select count(distinct cesta) from teraz),
    (select count(*) from predtym),
    (select count(*) filter (where nova) from predtym)
$$;

revoke all on function public.navstevnost_denne(int) from public, anon;
revoke all on function public.navstevnost_stranky(int, int) from public, anon;
revoke all on function public.navstevnost_zdroje(int) from public, anon;
revoke all on function public.navstevnost_krajiny(int) from public, anon;
revoke all on function public.navstevnost_suhrn(int) from public, anon;

grant execute on function public.navstevnost_denne(int) to authenticated;
grant execute on function public.navstevnost_stranky(int, int) to authenticated;
grant execute on function public.navstevnost_zdroje(int) to authenticated;
grant execute on function public.navstevnost_krajiny(int) to authenticated;
grant execute on function public.navstevnost_suhrn(int) to authenticated;

-- Upratovanie. Rok dozadu na medziročné porovnanie stačí.
--   delete from public.navstevy where created_at < now() - interval '400 days';
