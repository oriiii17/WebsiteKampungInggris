create table if not exists public.class_session_games (
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  game_id text not null references public.game_blueprints(id) on delete cascade,
  live_pin text,
  live_status text,
  created_at timestamptz not null default now(),
  primary key (session_id, game_id)
);

alter table public.class_session_games add column if not exists live_pin text;
alter table public.class_session_games add column if not exists live_status text;

create index if not exists class_session_games_session_idx
  on public.class_session_games(session_id, created_at);

alter table public.class_session_games enable row level security;
revoke all on public.class_session_games from public, anon, authenticated;
grant select, insert, update, delete on public.class_session_games to authenticated, service_role;

drop policy if exists class_session_games_manager_access on public.class_session_games;
create policy class_session_games_manager_access on public.class_session_games for all to authenticated
  using (exists (
    select 1 from public.class_sessions s
    join public.profiles p on p.id::text = s.teacher_id
    where s.id = session_id and (p.role in ('admin', 'pengurus', 'developer') or p.id = auth.uid())
  ))
  with check (exists (
    select 1 from public.class_sessions s
    join public.profiles p on p.id::text = s.teacher_id
    where s.id = session_id and (p.role in ('admin', 'pengurus', 'developer') or p.id = auth.uid())
  ));

drop policy if exists game_blueprints_session_read on public.game_blueprints;
create policy game_blueprints_session_read on public.game_blueprints for select to authenticated
  using (status = 'session' and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'pengurus', 'developer', 'tutor')
  ));

create or replace function public.set_class_session_games(p_session_id uuid, p_game_ids text[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare selected_ids text[] := coalesce(p_game_ids, '{}');
begin
  if cardinality(selected_ids) > 30 then
    raise exception 'SESSION_GAME_LIMIT';
  end if;

  if exists (
    select 1 from unnest(selected_ids) as requested(game_id)
    left join public.game_blueprints g on g.id = requested.game_id and g.status = 'session'
    where g.id is null
  ) then
    raise exception 'SESSION_GAME_INVALID';
  end if;

  delete from public.class_session_games
  where session_id = p_session_id and not (game_id = any(selected_ids));
  insert into public.class_session_games(session_id, game_id)
  select p_session_id, requested.game_id
  from (select distinct unnest(selected_ids) as game_id) requested
  on conflict (session_id, game_id) do nothing;
end;
$$;

revoke all on function public.set_class_session_games(uuid, text[]) from public;
grant execute on function public.set_class_session_games(uuid, text[]) to authenticated, service_role;
