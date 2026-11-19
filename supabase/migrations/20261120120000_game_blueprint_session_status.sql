alter table public.game_blueprints
  drop constraint if exists game_blueprints_status_check;

alter table public.game_blueprints
  add constraint game_blueprints_status_check
  check (status in ('draft', 'published', 'session'));

create or replace function public.record_game_blueprint_play(p_game_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_count integer;
begin
  update public.game_blueprints set play_count = play_count + 1
  where id = p_game_id and status in ('published', 'session')
  returning play_count into new_count;
  return new_count;
end;
$$;

revoke all on function public.record_game_blueprint_play(text) from public;
revoke execute on function public.record_game_blueprint_play(text) from anon;
grant execute on function public.record_game_blueprint_play(text) to authenticated, service_role;
