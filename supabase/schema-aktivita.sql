-- Dennik aktivity administratorov (1. 9. 2026).
-- Na zivej DB nasadene migraciou aktivita_dennik. Tento subor drzi
-- repozitar v obraze, ako ostatne schema-*.sql.
--
-- Kto sa prihlasil a co zmenil. Cita ho len hlavny admin (sekcia Aktivita).
-- Zapisovac je AFTER trigger so SECURITY DEFINER a EXCEPTION poistkou:
-- zlyhanie logovania NIKDY nesmie zablokovat samotny zapis.
-- Loguju sa len prihlaseni pouzivatelia (auth.uid() is not null);
-- anonymne zapisy z webu (kondolencie, dopyty, sviecky) sa neloguju.

create table if not exists public.aktivita (
  id bigint generated always as identity primary key,
  cas timestamptz not null default now(),
  user_id uuid,
  email text,
  akcia text not null,
  tabulka text,
  zaznam_id text,
  popis text
);

create index if not exists aktivita_cas_idx on public.aktivita (cas desc);

alter table public.aktivita enable row level security;

drop policy if exists aktivita_hlavny_select on public.aktivita;
create policy aktivita_hlavny_select on public.aktivita
  for select to authenticated using (public.je_hlavny_admin());

revoke all on public.aktivita from public, anon;
grant select on public.aktivita to authenticated;

-- ---------- zapisovac zmien ----------
create or replace function public.zapis_aktivitu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  v_popis text;
begin
  -- anonymne zapisy z webu sa netykaju dennika administratorov
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  begin
    r := to_jsonb(case when tg_op = 'DELETE' then old else new end);
    v_popis := case tg_table_name
      when 'parte'       then r->>'meno'
      when 'clanky'      then r->>'titulok'
      when 'kondolencie' then r->>'meno'
      when 'dopyty'      then r->>'meno'
      when 'kontakty'    then r->>'meno'
      when 'zakazky'     then coalesce(nullif(r->>'zosnuly_meno', ''), r->>'cislo')
      when 'admini'      then coalesce(r->>'meno', r->>'email')
      else null
    end;

    insert into public.aktivita (user_id, email, akcia, tabulka, zaznam_id, popis)
    values (
      auth.uid(),
      auth.jwt() ->> 'email',
      case tg_op when 'INSERT' then 'vytvoril' when 'UPDATE' then 'upravil' else 'zmazal' end,
      tg_table_name,
      r->>'id',
      v_popis
    );
  exception when others then
    null; -- dennik nikdy nezablokuje pracu
  end;

  return coalesce(new, old);
end;
$$;

revoke all on function public.zapis_aktivitu() from public, anon;

-- ---------- triggery na tabulkach, ktore admini upravuju ----------
drop trigger if exists aktivita_parte on public.parte;
create trigger aktivita_parte after insert or update or delete on public.parte
  for each row execute function public.zapis_aktivitu();

drop trigger if exists aktivita_clanky on public.clanky;
create trigger aktivita_clanky after insert or update or delete on public.clanky
  for each row execute function public.zapis_aktivitu();

drop trigger if exists aktivita_kondolencie on public.kondolencie;
create trigger aktivita_kondolencie after insert or update or delete on public.kondolencie
  for each row execute function public.zapis_aktivitu();

drop trigger if exists aktivita_dopyty on public.dopyty;
create trigger aktivita_dopyty after insert or update or delete on public.dopyty
  for each row execute function public.zapis_aktivitu();

drop trigger if exists aktivita_kontakty on public.kontakty;
create trigger aktivita_kontakty after insert or update or delete on public.kontakty
  for each row execute function public.zapis_aktivitu();

drop trigger if exists aktivita_zakazky on public.zakazky;
create trigger aktivita_zakazky after insert or update or delete on public.zakazky
  for each row execute function public.zapis_aktivitu();

drop trigger if exists aktivita_admini on public.admini;
create trigger aktivita_admini after insert or update or delete on public.admini
  for each row execute function public.zapis_aktivitu();

-- ---------- zapis prihlasenia ----------
-- Supabase na tomto projekte nedrzi auth audit log v databaze
-- (auth.audit_log_entries je prazdna), tak si uspesne prihlasenie
-- zapise klient sam hned po signInWithPassword (Prihlasenie.tsx).
-- Funkcia berie identitu z auth.uid(), takze sa neda zapisat
-- prihlasenie za niekoho ineho.
create or replace function public.zapis_prihlasenie()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.je_admin() then
    return;
  end if;
  insert into public.aktivita (user_id, email, akcia)
  values (auth.uid(), auth.jwt() ->> 'email', 'prihlásil sa');
exception when others then
  null;
end;
$$;

revoke all on function public.zapis_prihlasenie() from public, anon;
grant execute on function public.zapis_prihlasenie() to authenticated;
