create extension if not exists pg_cron;

create index if not exists game_score_history_created_at_idx
  on public.game_score_history (created_at);

create or replace function public.purge_expired_game_score_history()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.game_score_history
  where created_at < now() - interval '7 days';
$$;

revoke all on function public.purge_expired_game_score_history() from public;

select cron.schedule(
  'purge-game-score-history',
  '*/15 * * * *',
  'select public.purge_expired_game_score_history();'
);
