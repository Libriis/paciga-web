-- ============================================================
-- Paciga — rate limit pre verejné API (kontakt, kondolencia, sviecka)
-- Spustiť kedykoľvek po schema.sql. Aditívne, žiadny zásah do dát.
--
-- Načo to je: verejné endpointy mali len honeypot. Bez limitu vie bot
-- zaplaviť schránku admina notifikáciami alebo spamovať databázu.
-- Server (src/lib/ratelimit.ts) volá rate_limit_hit() s hash IP.
-- ============================================================

-- Fixné okno na kľúč 'endpoint:hash_ip'. Tabuľku číta a zapisuje len
-- security definer funkcia nižšie; anon/authenticated k nej priamo nesmú.
create table if not exists public.rate_limit (
  kluc text primary key,
  pocet int not null default 0,
  okno_do timestamptz not null
);

alter table public.rate_limit enable row level security;
revoke all on table public.rate_limit from anon, authenticated;

create or replace function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_pocet int;
begin
  insert into rate_limit (kluc, pocet, okno_do)
  values (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (kluc) do update
    set pocet = case when rate_limit.okno_do < v_now then 1 else rate_limit.pocet + 1 end,
        okno_do = case when rate_limit.okno_do < v_now
                       then v_now + make_interval(secs => p_window_seconds)
                       else rate_limit.okno_do end
  returning pocet into v_pocet;
  return v_pocet <= p_max;
end $$;

revoke all on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated;

-- Upratovanie starých kľúčov (nepovinné, cez pg_cron alebo ručne):
--   delete from public.rate_limit where okno_do < now() - interval '1 day';
