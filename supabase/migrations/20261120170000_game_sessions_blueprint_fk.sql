-- Live quiz sessions are created from game_blueprints, not public.games.
-- Keep historical rows intact while enforcing the correct parent for new writes.
alter table public.game_sessions
  drop constraint if exists game_sessions_game_id_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.game_sessions'::regclass
      and conname = 'game_sessions_game_blueprints_fkey'
  ) then
    alter table public.game_sessions
      add constraint game_sessions_game_blueprints_fkey
      foreign key (game_id)
      references public.game_blueprints(id)
      on delete cascade
      not valid;
  end if;
end;
$$;
