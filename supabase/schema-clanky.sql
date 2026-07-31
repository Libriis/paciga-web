-- ============================================================
-- Paciga — aktuality ako redakčný obsah
-- Spustiť PO schema.sql a schema-admin.sql (potrebuje je_admin()).
--
-- Načo to je: články dovtedy žili v src/data/aktuality.ts, čiže pridať
-- článok znamenalo upraviť kód a nasadiť web. Toto ich presúva do
-- databázy, aby ich spravoval redaktor v /admin/clanky.
--
-- Pôvodný súbor v repe ostáva. Slúži ako záloha pre beh bez env
-- premenných a ako zdroj jednorazového importu (tlačidlo v admine).
-- ============================================================

create table if not exists public.clanky (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,120}$'),
  titulok text not null check (char_length(titulok) between 1 and 200),
  -- perex: text na karte v prehľade aj v úvode článku
  perex text not null check (char_length(perex) between 1 and 600),
  kategoria text not null default 'rada' check (kategoria in ('rada', 'novinka', 'spolupraca')),
  datum date not null default current_date,
  foto_url text,
  foto_alt text,
  -- telo je pole odstavcov v tom istom zápise, aký vie web zobraziť:
  -- '## Nadpis' → medzinadpis, '→ Položka' → odrážka, ostatné → odstavec.
  -- Prázdne pole znamená, že článok nemá vlastnú stránku, len kartu.
  telo text[] not null default '{}',
  -- odkaz z karty, keď článok nemá detail
  odkaz text,
  odkaz_text text,
  -- CTA na konci článku
  cta_nadpis text,
  cta_text text,
  cta_odkaz text,
  cta_odkaz_text text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clanky_datum_idx on public.clanky (datum desc);
create index if not exists clanky_kategoria_idx on public.clanky (kategoria, datum desc);

drop trigger if exists clanky_updated_at on public.clanky;
create trigger clanky_updated_at before update on public.clanky
  for each row execute function public.set_updated_at();

alter table public.clanky enable row level security;

-- Verejnosť číta len zverejnené, koncept vidí iba admin.
drop policy if exists clanky_public_read on public.clanky;
create policy clanky_public_read on public.clanky
  for select to anon using (published = true);

drop policy if exists clanky_admin_all on public.clanky;
create policy clanky_admin_all on public.clanky
  for all to authenticated using (public.je_admin()) with check (public.je_admin());

-- ---------- STORAGE: titulné fotky článkov ----------
insert into storage.buckets (id, name, public)
values ('clanky-foto', 'clanky-foto', true)
on conflict (id) do nothing;

-- Bucket je public, takže fotka na webe RLS neprechádza. Politika je len
-- pre admina, ktorý v administrácii nahráva a potrebuje listovať.
drop policy if exists "clanky-foto admin citanie" on storage.objects;
create policy "clanky-foto admin citanie" on storage.objects
  for select to authenticated using (bucket_id = 'clanky-foto' and public.je_admin());

drop policy if exists "clanky-foto admin zapis" on storage.objects;
create policy "clanky-foto admin zapis" on storage.objects
  for insert to authenticated with check (bucket_id = 'clanky-foto' and public.je_admin());

drop policy if exists "clanky-foto admin update" on storage.objects;
create policy "clanky-foto admin update" on storage.objects
  for update to authenticated using (bucket_id = 'clanky-foto' and public.je_admin());

drop policy if exists "clanky-foto admin delete" on storage.objects;
create policy "clanky-foto admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'clanky-foto' and public.je_admin());
