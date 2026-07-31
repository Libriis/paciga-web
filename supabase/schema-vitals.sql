-- ============================================================
-- Paciga web — Core Web Vitals z terénu (RUM)
-- Spusti v Supabase: SQL Editor → New query → Run.
--
-- Načo to je: CrUX o tejto doméne nemá dáta, každý trace hlásil
-- „no data for this page in CrUX". Laboratórne merania nás počas
-- ladenia LCP trikrát zviedli na nesprávnu príčinu. Toto je jediný
-- zdroj, ktorý povie, čo vidia skutoční ľudia na skutočných sieťach.
-- ============================================================

create table if not exists public.web_vitals (
  id uuid primary key default gen_random_uuid(),
  metrika text not null check (metrika in ('LCP', 'CLS', 'INP', 'FCP', 'TTFB')),
  hodnota double precision not null check (hodnota >= 0),
  rating text not null check (rating in ('good', 'needs-improvement', 'poor')),
  cesta text not null check (char_length(cesta) between 1 and 200),
  -- 'mobile' | 'desktop', odvodené z navigator.userAgentData alebo šírky okna
  zariadenie text not null default 'unknown' check (zariadenie in ('mobile', 'desktop', 'unknown')),
  -- effectiveType z Network Information API: '4g', '3g', 'slow-2g'…
  siet text,
  navigacia text,
  created_at timestamptz not null default now()
);

create index if not exists web_vitals_metrika_idx on public.web_vitals (metrika, created_at desc);
create index if not exists web_vitals_cesta_idx on public.web_vitals (cesta, metrika);

alter table public.web_vitals enable row level security;

-- Server (/api/vitals) chodí na Supabase s anon kľúčom, presne ako zvyšok
-- webu, takže RLS platí aj naňho. Bez politiky by insert padol a endpoint
-- by to zhltol, lebo pri chybe zámerne vracia 204. Preto rovnaký vzor ako
-- dopyty: verejnosť smie len vkladať, čítať smie iba admin.
drop policy if exists web_vitals_public_insert on public.web_vitals;
create policy web_vitals_public_insert on public.web_vitals
  for insert to anon with check (true);

drop policy if exists web_vitals_admin_read on public.web_vitals;
create policy web_vitals_admin_read on public.web_vitals
  for all to authenticated using (true) with check (true);

-- ---------- prehľad: percentily za posledných 28 dní ----------
-- p75 je hodnota, na ktorej stoja prahy Core Web Vitals.
create or replace view public.web_vitals_prehlad as
select
  metrika,
  zariadenie,
  count(*) as vzoriek,
  round(percentile_cont(0.50) within group (order by hodnota)::numeric, 1) as p50,
  round(percentile_cont(0.75) within group (order by hodnota)::numeric, 1) as p75,
  round(percentile_cont(0.95) within group (order by hodnota)::numeric, 1) as p95,
  round(100.0 * count(*) filter (where rating = 'good') / count(*), 1) as podiel_good
from public.web_vitals
where created_at > now() - interval '28 days'
group by metrika, zariadenie
order by metrika, zariadenie;

-- Upratovanie. Tabuľka rastie s návštevnosťou, staršie než 90 dní netreba.
-- Spusti ručne alebo cez pg_cron, ak ho máš zapnutý.
--   delete from public.web_vitals where created_at < now() - interval '90 days';
