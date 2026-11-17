create table if not exists public.game_blueprints (
  id text primary key,
  title text not null,
  template text not null check (template in ('multiple-choice-quiz','drag-and-sort','listen-and-choose','sentence-builder','matching','word-bank','word-search')),
  level text not null check (level in ('A1','A2','B1','B2')),
  topic text not null,
  language text not null check (language in ('id','en','id-en')),
  cover_image text,
  status text not null default 'draft' check (status in ('draft','published')),
  play_count integer not null default 0 check (play_count >= 0),
  settings jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_blueprints enable row level security;
revoke all on public.game_blueprints from public, anon, authenticated;
grant select on public.game_blueprints to anon, authenticated;
grant insert, update, delete on public.game_blueprints to authenticated;

drop policy if exists game_blueprints_public_read on public.game_blueprints;
create policy game_blueprints_public_read on public.game_blueprints
  for select using (status = 'published');

drop policy if exists game_blueprints_admin_write on public.game_blueprints;
create policy game_blueprints_admin_write on public.game_blueprints
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('pengurus','developer')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('pengurus','developer')));

create index if not exists game_blueprints_public_recent_idx on public.game_blueprints(status, updated_at desc);

create or replace function public.record_game_blueprint_play(p_game_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_count integer;
begin
  update public.game_blueprints set play_count = play_count + 1
  where id = p_game_id and status = 'published'
  returning play_count into new_count;
  return new_count;
end;
$$;

revoke all on function public.record_game_blueprint_play(text) from public;
grant execute on function public.record_game_blueprint_play(text) to anon, authenticated;
