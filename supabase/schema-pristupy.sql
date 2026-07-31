-- ============================================================
-- Paciga — právomoci používateľov administrácie
-- Spustiť PO schema-admin.sql a schema-clanky.sql.
--
-- Doteraz platilo: kto je v tabuľke admini, vidí všetko. Teraz má každý
-- používateľ zoznam sekcií a jeden z nich je hlavný správca, ktorý tie
-- zoznamy upravuje v /admin/pouzivatelia.
--
-- PODSTATNÉ: skrytie položky v menu nie je ochrana. Kto pozná adresu,
-- otvorí ju priamo. Preto sekcie vynucujeme tu, v RLS na tabuľkách.
-- Menu v administrácii z týchto istých hodnôt len vychádza.
-- ============================================================

alter table public.admini
  add column if not exists meno text,
  add column if not exists pristupy text[] not null default '{}',
  add column if not exists hlavny boolean not null default false;

comment on column public.admini.pristupy is
  'Sekcie administrácie: dashboard, zakazky, kontakty, statistiky, web, clanky, vitals. Hodnota * znamená všetko.';
comment on column public.admini.hlavny is
  'Hlavný správca: smie meniť prístupy ostatných. Vidí vždy všetko.';

-- Doterajší admini mali plný prístup, nech im zmenou nič nezmizne.
update public.admini set pristupy = ARRAY['*'] where pristupy = '{}';

/* Má prihlásený používateľ prístup do sekcie?
   Hlavný správca a hviezdička znamenajú všetko. */
create or replace function public.ma_pristup(p_sekcia text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admini a
    where (case
             when a.user_id is not null then a.user_id = auth.uid()
             else lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
           end)
      and (a.hlavny or a.pristupy && ARRAY['*', p_sekcia])
  );
$$;

revoke all on function public.ma_pristup(text) from public, anon;
grant execute on function public.ma_pristup(text) to authenticated;

/* Je prihlásený hlavný správca? Stráži tabuľku admini, aby si bežný
   redaktor nemohol pridať právomoci. */
create or replace function public.je_hlavny_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admini a
    where a.hlavny
      and (case
             when a.user_id is not null then a.user_id = auth.uid()
             else lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
           end)
  );
$$;

revoke all on function public.je_hlavny_admin() from public, anon;
grant execute on function public.je_hlavny_admin() to authenticated;

/* Vlastné prístupy prihláseného. Menu sa podľa nich skladá.
   Vracia výhradne riadok volajúceho, nikdy cudzí. */
create or replace function public.moje_pristupy()
returns table (meno text, email text, pristupy text[], hlavny boolean)
language sql
stable
security definer
set search_path = public
as $$
  select a.meno, a.email, a.pristupy, a.hlavny
  from public.admini a
  where case
          when a.user_id is not null then a.user_id = auth.uid()
          else lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        end
  limit 1;
$$;

revoke all on function public.moje_pristupy() from public, anon;
grant execute on function public.moje_pristupy() to authenticated;

-- ---------- tabuľka admini: číta a mení iba hlavný správca ----------
grant select, insert, update, delete on table public.admini to authenticated;

drop policy if exists admini_hlavny_all on public.admini;
create policy admini_hlavny_all on public.admini
  for all to authenticated using (public.je_hlavny_admin()) with check (public.je_hlavny_admin());

-- ============================================================
-- Politiky tabuliek podľa sekcií
-- ============================================================

-- ---------- sekcia web ----------
drop policy if exists parte_admin_all on public.parte;
create policy parte_admin_all on public.parte
  for all to authenticated using (public.ma_pristup('web')) with check (public.ma_pristup('web'));

drop policy if exists kondolencie_admin_all on public.kondolencie;
create policy kondolencie_admin_all on public.kondolencie
  for all to authenticated using (public.ma_pristup('web')) with check (public.ma_pristup('web'));

drop policy if exists dopyty_admin_all on public.dopyty;
create policy dopyty_admin_all on public.dopyty
  for all to authenticated using (public.ma_pristup('web')) with check (public.ma_pristup('web'));

-- ---------- sekcia clanky ----------
drop policy if exists clanky_admin_all on public.clanky;
create policy clanky_admin_all on public.clanky
  for all to authenticated using (public.ma_pristup('clanky')) with check (public.ma_pristup('clanky'));

-- ---------- sekcia zakazky ----------
drop policy if exists zakazky_admin_all on public.zakazky;
create policy zakazky_admin_all on public.zakazky
  for all to authenticated using (public.ma_pristup('zakazky')) with check (public.ma_pristup('zakazky'));

drop policy if exists ukony_admin_all on public.ukony;
create policy ukony_admin_all on public.ukony
  for all to authenticated using (public.ma_pristup('zakazky')) with check (public.ma_pristup('zakazky'));

drop policy if exists dokumenty_admin_all on public.dokumenty;
create policy dokumenty_admin_all on public.dokumenty
  for all to authenticated using (public.ma_pristup('zakazky')) with check (public.ma_pristup('zakazky'));

-- ---------- sekcia kontakty ----------
drop policy if exists kontakty_admin_all on public.kontakty;
create policy kontakty_admin_all on public.kontakty
  for all to authenticated using (public.ma_pristup('kontakty')) with check (public.ma_pristup('kontakty'));

-- ---------- sekcia vitals ----------
drop policy if exists web_vitals_admin_read on public.web_vitals;
create policy web_vitals_admin_read on public.web_vitals
  for all to authenticated using (public.ma_pristup('vitals')) with check (public.ma_pristup('vitals'));

-- ---------- storage: bucket patrí k sekcii, ktorá ho používa ----------
drop policy if exists "buckety vidi admin" on storage.buckets;
create policy "buckety vidi admin" on storage.buckets
  for select to authenticated using (
    public.ma_pristup('web') or public.ma_pristup('clanky') or public.ma_pristup('zakazky')
  );

drop policy if exists "parte-foto admin citanie" on storage.objects;
create policy "parte-foto admin citanie" on storage.objects
  for select to authenticated using (bucket_id = 'parte-foto' and public.ma_pristup('web'));

drop policy if exists "parte-foto admin zapis" on storage.objects;
create policy "parte-foto admin zapis" on storage.objects
  for insert to authenticated with check (bucket_id = 'parte-foto' and public.ma_pristup('web'));

drop policy if exists "parte-foto admin update" on storage.objects;
create policy "parte-foto admin update" on storage.objects
  for update to authenticated using (bucket_id = 'parte-foto' and public.ma_pristup('web'));

drop policy if exists "parte-foto admin delete" on storage.objects;
create policy "parte-foto admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'parte-foto' and public.ma_pristup('web'));

drop policy if exists "clanky-foto admin citanie" on storage.objects;
create policy "clanky-foto admin citanie" on storage.objects
  for select to authenticated using (bucket_id = 'clanky-foto' and public.ma_pristup('clanky'));

drop policy if exists "clanky-foto admin zapis" on storage.objects;
create policy "clanky-foto admin zapis" on storage.objects
  for insert to authenticated with check (bucket_id = 'clanky-foto' and public.ma_pristup('clanky'));

drop policy if exists "clanky-foto admin update" on storage.objects;
create policy "clanky-foto admin update" on storage.objects
  for update to authenticated using (bucket_id = 'clanky-foto' and public.ma_pristup('clanky'));

drop policy if exists "clanky-foto admin delete" on storage.objects;
create policy "clanky-foto admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'clanky-foto' and public.ma_pristup('clanky'));

drop policy if exists "dokumenty admin citanie" on storage.objects;
create policy "dokumenty admin citanie" on storage.objects
  for select to authenticated using (bucket_id = 'dokumenty' and public.ma_pristup('zakazky'));

drop policy if exists "dokumenty admin zapis" on storage.objects;
create policy "dokumenty admin zapis" on storage.objects
  for insert to authenticated with check (bucket_id = 'dokumenty' and public.ma_pristup('zakazky'));

drop policy if exists "dokumenty admin update" on storage.objects;
create policy "dokumenty admin update" on storage.objects
  for update to authenticated using (bucket_id = 'dokumenty' and public.ma_pristup('zakazky'));

drop policy if exists "dokumenty admin delete" on storage.objects;
create policy "dokumenty admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'dokumenty' and public.ma_pristup('zakazky'));

-- ---------- prvý hlavný správca ----------
-- Bez neho by nemal kto prideliť právomoci ostatným.
update public.admini set hlavny = true, pristupy = ARRAY['*']
where email = 'libriis@outlook.com';
