alter table public.game_blueprints
  add column if not exists destination text not null default 'public';

alter table public.game_blueprints
  drop constraint if exists game_blueprints_destination_check;
alter table public.game_blueprints
  add constraint game_blueprints_destination_check
  check (destination in ('public', 'session', 'independent'));

update public.game_blueprints
set destination = case
  when status = 'session' then 'session'
  when status = 'independent' then 'independent'
  else coalesce(nullif(destination, ''), 'public')
end;

alter table public.game_blueprints
  drop constraint if exists game_blueprints_status_check;
alter table public.game_blueprints
  add constraint game_blueprints_status_check
  check (status in ('draft', 'published', 'session', 'independent'));

create index if not exists game_blueprints_destination_status_idx
  on public.game_blueprints (destination, status, updated_at desc);

drop policy if exists game_blueprints_independent_read on public.game_blueprints;
create policy game_blueprints_independent_read on public.game_blueprints
  for select to authenticated
  using (status = 'independent');

create or replace function public.record_game_blueprint_play(p_game_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_count integer;
begin
  update public.game_blueprints
  set play_count = play_count + 1
  where id = p_game_id and status in ('published', 'session', 'independent')
  returning play_count into new_count;
  return new_count;
end;
$$;

revoke all on function public.record_game_blueprint_play(text) from public;
grant execute on function public.record_game_blueprint_play(text) to authenticated, service_role;
