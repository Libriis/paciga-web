-- ============================================================
-- Paciga web — databázová schéma (Supabase / Postgres)
-- Spusti celý súbor v Supabase: SQL Editor → New query → Run.
-- Obsahuje: tabuľky, RLS politiky, funkciu na sviečky,
-- storage bucket na fotky a seed existujúcich 12 parte.
--
-- POZOR: admin politiky nižšie sú len provizórium („stačí byť
-- prihlásený"). Nahrádza ich schema-admin.sql, ktorý musí bežať
-- po tomto súbore. Keď spúšťaš tento súbor znova, pusti potom
-- vždy aj schema-admin.sql, inak sa CRM otvorí každému účtu.
-- ============================================================

-- ---------- PARTE (smútočné oznámenia) ----------
create table if not exists public.parte (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  meno text not null,
  pohlavie text not null default 'zena' check (pohlavie in ('zena', 'muz')),
  datum_narodenia date,
  datum_umrtia date not null,
  vek int check (vek between 0 and 130),
  foto_url text,
  rozlucka_datum date,
  rozlucka_cas text check (rozlucka_cas is null or rozlucka_cas ~ '^\d{1,2}:\d{2}$'),
  rozlucka_miesto text,
  odkaz_rodine text,
  published boolean not null default true,
  sviecky int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists parte_umrtie_idx on public.parte (datum_umrtia desc);

-- ---------- KONDOLENCIE (moderované) ----------
create table if not exists public.kondolencie (
  id uuid primary key default gen_random_uuid(),
  parte_id uuid not null references public.parte (id) on delete cascade,
  meno text not null check (char_length(meno) between 1 and 120),
  odkaz text not null check (char_length(odkaz) between 1 and 2000),
  schvalene boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists kondolencie_parte_idx on public.kondolencie (parte_id, schvalene, created_at desc);

-- ---------- DOPYTY (kontaktný formulár) ----------
create table if not exists public.dopyty (
  id uuid primary key default gen_random_uuid(),
  meno text not null check (char_length(meno) between 1 and 120),
  telefon text check (telefon is null or char_length(telefon) <= 40),
  email text check (email is null or char_length(email) <= 200),
  sprava text not null check (char_length(sprava) between 1 and 4000),
  precitane boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- SVIEČKY — antispam log (1 sviečka / IP / deň / parte) ----------
create table if not exists public.sviecky_log (
  parte_id uuid not null references public.parte (id) on delete cascade,
  ip_hash text not null,
  den date not null default current_date,
  primary key (parte_id, ip_hash, den)
);

-- ---------- updated_at trigger ----------
-- search_path je pevný. Bez neho vie volajúci podstrčiť vlastnú schému
-- a funkcia beží nad cudzími objektmi. now() je v pg_catalog, ten je
-- v ceste vždy, takže prázdny search_path stačí.
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists parte_updated_at on public.parte;
create trigger parte_updated_at before update on public.parte
  for each row execute function public.set_updated_at();

-- ---------- funkcia: zapáliť sviečku ----------
-- PRESUNUTÁ do supabase/schema-sviecka-podpis.sql. Nespúšťaj ju odtiaľto.
--
-- Dovtedy tu stála nepodpísaná verzia zapal_sviecku(p_slug, p_ip_hash),
-- ktorá brala akýkoľvek p_ip_hash. Kto volal RPC priamo, poslal zakaždým iný
-- hash a nafúkol počítadlo sviečok donekonečna. Opravilo sa to 23. 8. 2026
-- podpisom (HMAC), lenže tu ostala pôvodná verzia aj s grantom pre anon.
--
-- Spustenie tohto súboru na produkcii by tak ochranu zmazalo: `create or
-- replace` by vrátil nepodpísanú funkciu a `grant` by ju znova otvoril
-- anonymnému volajúcemu. Nájdené auditom ASVS 5.0 L2 ako nález #8.
--
-- Poradie pri čistom nasadení:
--   1. schema.sql (tento súbor)
--   2. schema-sviecka-podpis.sql   <- funkcia, súkromná schéma, granty
--   3. ostatné schema-*.sql

-- ---------- RLS ----------
alter table public.parte enable row level security;
alter table public.kondolencie enable row level security;
alter table public.dopyty enable row level security;
alter table public.sviecky_log enable row level security;

-- parte: verejnosť vidí len publikované; prihlásený admin má plný prístup
drop policy if exists parte_public_read on public.parte;
create policy parte_public_read on public.parte
  for select to anon using (published = true);

drop policy if exists parte_admin_all on public.parte;
create policy parte_admin_all on public.parte
  for all to authenticated using (true) with check (true);

-- kondolencie: verejnosť vidí schválené; vkladať smie každý (len neschválené); admin všetko
drop policy if exists kondolencie_public_read on public.kondolencie;
create policy kondolencie_public_read on public.kondolencie
  for select to anon using (schvalene = true);

drop policy if exists kondolencie_public_insert on public.kondolencie;
create policy kondolencie_public_insert on public.kondolencie
  for insert to anon with check (schvalene = false);

drop policy if exists kondolencie_admin_all on public.kondolencie;
create policy kondolencie_admin_all on public.kondolencie
  for all to authenticated using (true) with check (true);

-- dopyty: verejnosť smie len vkladať; čítať a spravovať len admin
drop policy if exists dopyty_public_insert on public.dopyty;
create policy dopyty_public_insert on public.dopyty
  for insert to anon with check (precitane = false);

drop policy if exists dopyty_admin_all on public.dopyty;
create policy dopyty_admin_all on public.dopyty
  for all to authenticated using (true) with check (true);

-- sviecky_log: žiadny priamy prístup (zapisuje len zapal_sviecku ako definer)

-- ---------- STORAGE: fotky k parte ----------
insert into storage.buckets (id, name, public)
values ('parte-foto', 'parte-foto', true)
on conflict (id) do nothing;

-- Fotky chodia na web cez /storage/v1/object/public/parte-foto/...
-- Tá cesta obchádza RLS, lebo bucket je public, takže anon tu politiku
-- nepotrebuje. Keby ju mal, mohol by si vylistovať celý obsah bucketu.
-- Listovanie potrebuje len admin v /admin, a ten je prihlásený.
drop policy if exists "parte-foto verejne citanie" on storage.objects;
drop policy if exists "parte-foto admin citanie" on storage.objects;
create policy "parte-foto admin citanie" on storage.objects
  for select to authenticated using (bucket_id = 'parte-foto');

drop policy if exists "parte-foto admin zapis" on storage.objects;
create policy "parte-foto admin zapis" on storage.objects
  for insert to authenticated with check (bucket_id = 'parte-foto');

drop policy if exists "parte-foto admin update" on storage.objects;
create policy "parte-foto admin update" on storage.objects
  for update to authenticated using (bucket_id = 'parte-foto');

drop policy if exists "parte-foto admin delete" on storage.objects;
create policy "parte-foto admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'parte-foto');

-- ---------- SEED: existujúce parte z pôvodného webu ----------
insert into public.parte
  (slug, meno, pohlavie, datum_narodenia, datum_umrtia, vek, rozlucka_datum, rozlucka_cas, rozlucka_miesto)
values
  ('anna-kicakova',    'Anna Kičáková',    'zena', '1934-11-13', '2026-07-09', 91, '2026-07-11', '13:00', 'Dom smútku v Liptovskej Tepličke'),
  ('anna-silonova',    'Anna Šilonová',    'zena', '1937-10-18', '2026-07-08', 88, '2026-07-10', '11:00', 'Rímskokatolícky kostol v Ždiari'),
  ('helena-badovska',  'Helena Badovská',  'zena', '1966-08-29', '2026-07-07', 59, '2026-07-10', '14:00', 'Rímskokatolícky kostol v Lendaku'),
  ('ondrej-mlynar',    'Ondrej Mlynár',    'muz',  '1949-11-27', '2026-07-06', 76, '2026-07-13', '14:00', 'Dom smútku na cintoríne vo Švábovciach'),
  ('vladimir-koscak',  'Vladimír Koščák',  'muz',  '1997-07-08', '2026-07-06', 28, '2026-07-09', '14:00', 'Rímskokatolícky kostol v Lendaku'),
  ('andrej-badovsky',  'Andrej Badovský',  'muz',  '1967-04-05', '2026-07-05', 59, '2026-07-08', '14:00', 'Rímskokatolícky kostol v Lendaku'),
  ('anna-poracka',     'Anna Poracká',     'zena', '1947-07-13', '2026-07-05', 78, '2026-07-07', '15:00', 'Rímskokatolícky kostol v Spišskom Bystrom'),
  ('elena-ilavska',    'Elena Ilavská',    'zena', '1954-09-18', '2026-07-05', 71, '2026-07-09', '15:00', 'Evanjelický kostol vo Važci'),
  ('jozef-frankovsky', 'Jozef Frankovský', 'muz',  '1951-02-11', '2026-07-02', 75, '2026-07-10', '14:00', 'Rímskokatolícky kostol vo Veľkej Frankovej'),
  ('lydia-hudakova',   'Lýdia Hudáková',   'zena', '1953-05-19', '2026-07-02', 73, '2026-07-04', '14:00', 'Dom smútku vo Svite'),
  ('joanna-stasikova', 'Joanna Stasiková', 'zena', '1976-06-27', '2026-07-01', 50, '2026-07-03', '14:00', 'Rímskokatolícky kostol v Ždiari'),
  ('jozefa-sivakova',  'Jozefa Siváková',  'zena', '1933-09-12', '2026-06-28', 92, '2026-06-30', '13:30', 'Dom smútku v Liptovskom Mikuláši')
on conflict (slug) do nothing;
