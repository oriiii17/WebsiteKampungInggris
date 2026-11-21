-- Create the RW code parent before adding the login-event relationship.
-- IDs intentionally use text to match public.access_codes.id and verify_access_code.
create table if not exists public.rw_access_codes (
  id text primary key,
  rw text not null check (rw in ('RW 06', 'RW 07', 'RW 08')),
  created_at timestamptz not null default now()
);

-- Keep existing RW code identities available to the reporting relation.
insert into public.rw_access_codes (id, rw)
select id,
  case
    when rt_rw ~* 'RW[^0-9]*0?6' then 'RW 06'
    when rt_rw ~* 'RW[^0-9]*0?7' then 'RW 07'
    when rt_rw ~* 'RW[^0-9]*0?8' then 'RW 08'
  end
from public.access_codes
where rt_rw ~* 'RW[^0-9]*0?[678]'
on conflict (id) do update set rw = excluded.rw;

create table if not exists public.rw_access_login_events (
  id uuid primary key default gen_random_uuid(),
  rw_access_code_id text,
  rw text not null check (rw in ('RW 06', 'RW 07', 'RW 08')),
  occurred_at timestamptz not null default now()
);

-- Upgrade an installation where the earlier event table already exists.
alter table public.rw_access_login_events
  add column if not exists rw_access_code_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rw_access_login_events_rw_access_code_id_fkey'
      and conrelid = 'public.rw_access_login_events'::regclass
  ) then
    alter table public.rw_access_login_events
      add constraint rw_access_login_events_rw_access_code_id_fkey
      foreign key (rw_access_code_id) references public.rw_access_codes(id) on delete set null;
  end if;
end $$;

create index if not exists rw_access_codes_rw_idx
  on public.rw_access_codes (rw);
create index if not exists rw_access_login_events_occurred_at_idx
  on public.rw_access_login_events (occurred_at desc);
create index if not exists rw_access_login_events_rw_occurred_at_idx
  on public.rw_access_login_events (rw, occurred_at desc);
create index if not exists rw_access_login_events_code_occurred_at_idx
  on public.rw_access_login_events (rw_access_code_id, occurred_at desc);

alter table public.rw_access_codes enable row level security;
alter table public.rw_access_login_events enable row level security;

alter table public.class_sessions
  add column if not exists auto_close_at timestamptz;
