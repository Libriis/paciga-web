-- ============================================================
-- Paciga — admin identita
-- Spustiť PO schema.sql, schema-crm.sql a schema-vitals.sql.
--
-- Načo to je: pôvodné politiky otvárali CRM každému, kto mal rolu
-- authenticated. Registrácia v Supabase bola pritom otvorená, takže
-- ktokoľvek si vytvorí účet, potvrdí vlastný e-mail a dostane sa
-- k zákazkám aj k naskenovaným úmrtným listom. Toto je druhá zámka,
-- nezávislá od prepínača registrácie v dashboarde.
-- ============================================================

create table if not exists public.admini (
  email text primary key check (position('@' in email) > 1),
  -- doplní sa po prvom prihlásení; potom platí namiesto e-mailu
  user_id uuid unique references auth.users (id) on delete set null,
  poznamka text,
  created_at timestamptz not null default now()
);

-- Zoznam adminov nesmie čítať ani meniť nikto cez API.
-- Pristupuje k nemu len je_admin() ako security definer.
alter table public.admini enable row level security;
revoke all on table public.admini from anon, authenticated;

-- Kým nie je vyplnené user_id, platí zhoda e-mailu z JWT. Po jeho
-- doplnení je e-mail ignorovaný, takže prepísanie vlastnej adresy
-- na adresu admina prístup nedá.
create or replace function public.je_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admini a
    where case
      when a.user_id is not null then a.user_id = auth.uid()
      else lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    end
  );
$$;

revoke all on function public.je_admin() from public, anon;
grant execute on function public.je_admin() to authenticated;

-- ---------- politiky tabuliek ----------
drop policy if exists parte_admin_all on public.parte;
create policy parte_admin_all on public.parte
  for all to authenticated using (public.je_admin()) with check (public.je_admin());

drop policy if exists kondolencie_admin_all on public.kondolencie;
create policy kondolencie_admin_all on public.kondolencie
  for all to authenticated using (public.je_admin()) with check (public.je_admin());

drop policy if exists dopyty_admin_all on public.dopyty;
create policy dopyty_admin_all on public.dopyty
  for all to authenticated using (public.je_admin()) with check (public.je_admin());

drop policy if exists kontakty_admin_all on public.kontakty;
create policy kontakty_admin_all on public.kontakty
  for all to authenticated using (public.je_admin()) with check (public.je_admin());

drop policy if exists zakazky_admin_all on public.zakazky;
create policy zakazky_admin_all on public.zakazky
  for all to authenticated using (public.je_admin()) with check (public.je_admin());

drop policy if exists ukony_admin_all on public.ukony;
create policy ukony_admin_all on public.ukony
  for all to authenticated using (public.je_admin()) with check (public.je_admin());

drop policy if exists dokumenty_admin_all on public.dokumenty;
create policy dokumenty_admin_all on public.dokumenty
  for all to authenticated using (public.je_admin()) with check (public.je_admin());

drop policy if exists web_vitals_admin_read on public.web_vitals;
create policy web_vitals_admin_read on public.web_vitals
  for all to authenticated using (public.je_admin()) with check (public.je_admin());

-- ---------- politiky storage ----------
drop policy if exists "parte-foto verejne citanie" on storage.objects;
drop policy if exists "parte-foto admin citanie" on storage.objects;
create policy "parte-foto admin citanie" on storage.objects
  for select to authenticated using (bucket_id = 'parte-foto' and public.je_admin());

drop policy if exists "parte-foto admin zapis" on storage.objects;
create policy "parte-foto admin zapis" on storage.objects
  for insert to authenticated with check (bucket_id = 'parte-foto' and public.je_admin());

drop policy if exists "parte-foto admin update" on storage.objects;
create policy "parte-foto admin update" on storage.objects
  for update to authenticated using (bucket_id = 'parte-foto' and public.je_admin());

drop policy if exists "parte-foto admin delete" on storage.objects;
create policy "parte-foto admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'parte-foto' and public.je_admin());

drop policy if exists "dokumenty admin citanie" on storage.objects;
create policy "dokumenty admin citanie" on storage.objects
  for select to authenticated using (bucket_id = 'dokumenty' and public.je_admin());

drop policy if exists "dokumenty admin zapis" on storage.objects;
create policy "dokumenty admin zapis" on storage.objects
  for insert to authenticated with check (bucket_id = 'dokumenty' and public.je_admin());

drop policy if exists "dokumenty admin update" on storage.objects;
create policy "dokumenty admin update" on storage.objects
  for update to authenticated using (bucket_id = 'dokumenty' and public.je_admin());

drop policy if exists "dokumenty admin delete" on storage.objects;
create policy "dokumenty admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'dokumenty' and public.je_admin());

-- ---------- prvý admin ----------
-- Zmeň adresu, ak sa budeš registrovať pod inou.
insert into public.admini (email, poznamka)
values ('paciga@paciga.sk', 'prvy admin, zalozene pri nasadeni schemy')
on conflict (email) do nothing;

-- ---------- po prvom prihlásení ----------
-- Doplň user_id, aby prístup prestal visieť na e-maile:
--   update public.admini a set user_id = u.id
--   from auth.users u where lower(u.email) = lower(a.email);
--
-- Ďalší admin:
--   insert into public.admini (email, poznamka) values ('meno@paciga.sk', 'kto to je');
