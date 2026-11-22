create table if not exists public.game_score_history (
  id uuid primary key default gen_random_uuid(),
  participant_id text not null,
  game_id text not null,
  game_title text not null,
  game_type text not null default 'Kuis',
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index if not exists game_score_history_participant_score_idx
  on public.game_score_history (participant_id, score desc, created_at desc);

alter table public.game_score_history enable row level security;
grant select, insert on public.game_score_history to authenticated;

drop policy if exists "Participants read own quiz history" on public.game_score_history;
create policy "Participants read own quiz history"
  on public.game_score_history for select to authenticated
  using (auth.uid()::text = participant_id);

drop policy if exists "Participants insert own quiz history" on public.game_score_history;
create policy "Participants insert own quiz history"
  on public.game_score_history for insert to authenticated
  with check (auth.uid()::text = participant_id);
