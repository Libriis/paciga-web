-- Kondolencie pozostalym (26. 10. 2026).
-- Klient chce po pohrebe poslat rodine e-mailom vsetky schvalene
-- kondolencie k parte. Obsluha zada adresy v admine
-- (/admin/parte/kondolencie-pozostalym), e-mail posiela server cez Resend
-- (src/pages/api/admin/kondolencie-pozostalym.ts).
--
-- Tato tabulka je zaznam o odoslani: komu, kedy, kto a kolko kondolencii.
-- Admin z nej ukazuje historiu a varuje pred druhym odoslanim.
-- Riadky sa len pridavaju. Uprava ani mazanie nie su povolene, zmiznu
-- az spolu s parte (on delete cascade).
--
-- Zapisuje server pod prihlasenim obsluhy (jej access token), nie service
-- kluc. RLS aj dennik aktivity tak vidia skutocneho cloveka.

create table if not exists public.kondolencie_odoslania (
  id uuid primary key default gen_random_uuid(),
  parte_id uuid not null references public.parte (id) on delete cascade,
  komu text[] not null check (cardinality(komu) between 1 and 10),
  pocet int not null check (pocet >= 1),
  odoslal uuid default auth.uid(),
  odoslal_email text default (auth.jwt() ->> 'email'),
  created_at timestamptz not null default now()
);

create index if not exists kondolencie_odoslania_parte_idx
  on public.kondolencie_odoslania (parte_id, created_at desc);

alter table public.kondolencie_odoslania enable row level security;

drop policy if exists kondolencie_odoslania_select on public.kondolencie_odoslania;
create policy kondolencie_odoslania_select on public.kondolencie_odoslania
  for select to authenticated using (public.ma_pristup('web'));

-- Zapisat sa da len za seba: odoslal musi byt prihlaseny clovek.
drop policy if exists kondolencie_odoslania_insert on public.kondolencie_odoslania;
create policy kondolencie_odoslania_insert on public.kondolencie_odoslania
  for insert to authenticated
  with check (public.ma_pristup('web') and odoslal = auth.uid());

-- Supabase dava novym tabulkam v public vsetky prava pre authenticated,
-- aj TRUNCATE, na ktory RLS neplati. Preto revoke aj z authenticated.
revoke all on public.kondolencie_odoslania from public, anon, authenticated;
grant select, insert on public.kondolencie_odoslania to authenticated;

-- ---------- dennik aktivity ----------
-- Vlastny zapisovac, nie zapis_aktivitu(): veta v Aktivite ma byt
-- „Marcel poslal kondolencie pozostalym „Jan Novak"", teda s menom
-- zosnuleho z parte, ktore v tomto riadku nie je. Rovnaka poistka:
-- zlyhanie logovania nikdy nezablokuje samotny zapis.
create or replace function public.zapis_odoslanie_kondolencii()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  begin
    insert into public.aktivita (user_id, email, akcia, tabulka, zaznam_id, popis)
    select auth.uid(), auth.jwt() ->> 'email', 'poslal', 'kondolencie_odoslania',
           new.id::text, p.meno
    from public.parte p
    where p.id = new.parte_id;
  exception when others then
    null; -- dennik nikdy nezablokuje pracu
  end;

  return new;
end;
$$;

revoke all on function public.zapis_odoslanie_kondolencii() from public, anon;

drop trigger if exists aktivita_kondolencie_odoslania on public.kondolencie_odoslania;
create trigger aktivita_kondolencie_odoslania after insert on public.kondolencie_odoslania
  for each row execute function public.zapis_odoslanie_kondolencii();
