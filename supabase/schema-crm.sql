-- ============================================================
-- Paciga CRM — databázová schéma (Fáza 1)
-- Spustiť PO schema.sql (potrebuje tabuľky parte a dopyty).
-- Obsahuje: kontakty, zákazky, checklist úkonov, dokumenty,
-- RLS (len prihlásení) a privátny storage bucket na dokumenty.
-- ============================================================

-- ---------- KONTAKTY (pozostalí, objednávatelia) ----------
create table if not exists public.kontakty (
  id uuid primary key default gen_random_uuid(),
  meno text not null check (char_length(meno) between 1 and 120),
  telefon text check (telefon is null or char_length(telefon) <= 40),
  email text check (email is null or char_length(email) <= 200),
  adresa text,
  poznamka text,
  created_at timestamptz not null default now()
);

-- ---------- ZÁKAZKY (jedna zákazka = jeden pohreb) ----------
create table if not exists public.zakazky (
  id uuid primary key default gen_random_uuid(),
  cislo text,
  stav text not null default 'novy'
    check (stav in ('novy', 'prevoz', 'priprava', 'obrad', 'vybavene', 'vyuctovane')),
  pobocka text,
  typ text not null default 'pochovanie' check (typ in ('pochovanie', 'kremacia')),
  suma numeric(10, 2) check (suma is null or suma >= 0),
  zdroj text check (zdroj is null or zdroj in ('telefon', 'osobne', 'odporucanie', 'web')),
  zosnuly_meno text not null default '',
  zosnuly_pohlavie text not null default 'zena' check (zosnuly_pohlavie in ('zena', 'muz')),
  datum_narodenia date,
  datum_umrtia date,
  miesto_umrtia text,
  objednavatel_id uuid references public.kontakty (id) on delete set null,
  vztah text,
  parte_id uuid references public.parte (id) on delete set null,
  dopyt_id uuid references public.dopyty (id) on delete set null,
  -- termíny ako text 'YYYY-MM-DDTHH:mm' (lokálny čas, bez časových pásiem)
  termin_vyzdvihnutie text check (termin_vyzdvihnutie is null or termin_vyzdvihnutie ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'),
  termin_rakva text check (termin_rakva is null or termin_rakva ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'),
  termin_rozlucka text check (termin_rozlucka is null or termin_rozlucka ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'),
  miesto_rozlucky text,
  poznamka text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zakazky_stav_idx on public.zakazky (stav);
create index if not exists zakazky_objednavatel_idx on public.zakazky (objednavatel_id);

drop trigger if exists zakazky_updated_at on public.zakazky;
create trigger zakazky_updated_at before update on public.zakazky
  for each row execute function public.set_updated_at();

-- ---------- ÚKONY (checklist krokov na zákazke) ----------
create table if not exists public.ukony (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid not null references public.zakazky (id) on delete cascade,
  poradie int not null default 0,
  nazov text not null,
  hotovo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ukony_zakazka_idx on public.ukony (zakazka_id, poradie);

-- ---------- DOKUMENTY (scany a fotky dokladov k zákazke) ----------
create table if not exists public.dokumenty (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid not null references public.zakazky (id) on delete cascade,
  typ text not null default 'ine',
  nazov text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists dokumenty_zakazka_idx on public.dokumenty (zakazka_id);

-- ---------- RLS: CRM je len pre prihlásených ----------
alter table public.kontakty enable row level security;
alter table public.zakazky enable row level security;
alter table public.ukony enable row level security;
alter table public.dokumenty enable row level security;

drop policy if exists kontakty_admin_all on public.kontakty;
create policy kontakty_admin_all on public.kontakty
  for all to authenticated using (true) with check (true);

drop policy if exists zakazky_admin_all on public.zakazky;
create policy zakazky_admin_all on public.zakazky
  for all to authenticated using (true) with check (true);

drop policy if exists ukony_admin_all on public.ukony;
create policy ukony_admin_all on public.ukony
  for all to authenticated using (true) with check (true);

drop policy if exists dokumenty_admin_all on public.dokumenty;
create policy dokumenty_admin_all on public.dokumenty
  for all to authenticated using (true) with check (true);

-- ---------- STORAGE: privátny bucket na dokumenty ----------
-- Citlivé doklady (úmrtné listy a pod.) — bucket NIE JE verejný,
-- aplikácia k nim pristupuje cez podpísané URL po prihlásení.
insert into storage.buckets (id, name, public)
values ('dokumenty', 'dokumenty', false)
on conflict (id) do nothing;

drop policy if exists "dokumenty admin citanie" on storage.objects;
create policy "dokumenty admin citanie" on storage.objects
  for select to authenticated using (bucket_id = 'dokumenty');

drop policy if exists "dokumenty admin zapis" on storage.objects;
create policy "dokumenty admin zapis" on storage.objects
  for insert to authenticated with check (bucket_id = 'dokumenty');

drop policy if exists "dokumenty admin update" on storage.objects;
create policy "dokumenty admin update" on storage.objects
  for update to authenticated using (bucket_id = 'dokumenty');

drop policy if exists "dokumenty admin delete" on storage.objects;
create policy "dokumenty admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'dokumenty');
