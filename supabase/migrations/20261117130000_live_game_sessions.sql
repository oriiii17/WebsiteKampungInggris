create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  pin text not null unique check (pin ~ '^[0-9]{6}$'),
  host_user_id uuid,
  host_name text not null,
  status text not null default 'lobby' check (status in ('lobby', 'question', 'reveal', 'podium', 'closed')),
  current_question_index integer not null default 0 check (current_question_index >= 0),
  total_questions integer not null check (total_questions > 0),
  game_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_session_players (
  id text primary key,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  player_name text not null check (char_length(player_name) between 2 and 40),
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  unique (session_id, id)
);

create index if not exists game_sessions_game_created_idx on public.game_sessions(game_id, created_at desc);
create index if not exists game_session_players_session_idx on public.game_session_players(session_id, joined_at);

alter table public.game_sessions enable row level security;
alter table public.game_session_players enable row level security;

drop policy if exists game_sessions_admin_all on public.game_sessions;
create policy game_sessions_admin_all on public.game_sessions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists game_session_players_admin_all on public.game_session_players;
create policy game_session_players_admin_all on public.game_session_players
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.join_game_session(p_pin text, p_player_id text, p_player_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.game_sessions%rowtype;
  clean_name text := btrim(p_player_name);
begin
  if p_pin !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok', false, 'error', 'PIN sesi tidak valid.');
  end if;
  if p_player_id is null or p_player_id !~ '^[A-Za-z0-9_-]{8,80}$' then
    return jsonb_build_object('ok', false, 'error', 'ID peserta tidak valid.');
  end if;
  if clean_name is null or char_length(clean_name) < 2 or char_length(clean_name) > 40 then
    return jsonb_build_object('ok', false, 'error', 'Nama harus terdiri dari 2 sampai 40 karakter.');
  end if;

  select * into target from public.game_sessions where pin = p_pin for update;
  if not found or target.status = 'closed' then
    return jsonb_build_object('ok', false, 'error', 'Sesi tidak ditemukan atau sudah ditutup.');
  end if;

  insert into public.game_session_players (id, session_id, player_name)
  values (p_player_id, target.id, clean_name)
  on conflict (session_id, id) do update set player_name = excluded.player_name;

  return jsonb_build_object(
    'ok', true,
    'sessionId', target.id,
    'gameId', target.game_id,
    'hostName', target.host_name,
    'status', target.status,
    'title', target.game_snapshot ->> 'title'
  );
end;
$$;

revoke all on function public.join_game_session(text, text, text) from public;
grant execute on function public.join_game_session(text, text, text) to anon, authenticated;
