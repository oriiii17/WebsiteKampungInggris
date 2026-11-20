-- Prevent legacy participant IDs from colliding across separate live games.
-- A repeated ID within the same session remains an idempotent rejoin.
create or replace function public.join_game_session(
  p_pin text,
  p_player_id text,
  p_player_name text,
  p_avatar_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.game_sessions%rowtype;
  clean_name text := btrim(p_player_name);
  assigned_team text;
  current_team text;
  player_count integer;
  assigned_player_id text := p_player_id;
begin
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok', false, 'error', 'PIN sesi tidak valid.');
  end if;
  if p_player_id is null or p_player_id !~ '^[A-Za-z0-9_-]{8,80}$' then
    return jsonb_build_object('ok', false, 'error', 'ID peserta tidak valid.');
  end if;
  if clean_name is null or char_length(clean_name) < 2 or char_length(clean_name) > 25 then
    return jsonb_build_object('ok', false, 'error', 'Nama panggilan harus 2–25 karakter.');
  end if;
  if p_avatar_id not in ('leaf', 'book', 'sun', 'bird') then
    return jsonb_build_object('ok', false, 'error', 'Avatar tidak dikenal.');
  end if;

  select * into target
  from public.game_sessions as gs
  where gs.pin = p_pin
  for update;
  if not found or target.status = 'closed' then
    return jsonb_build_object('ok', false, 'error', 'Sesi tidak ditemukan atau sudah ditutup.');
  end if;

  -- Player IDs are a table-wide primary key. Keep a valid rejoin ID when it
  -- belongs to this session, otherwise issue a new ID instead of moving data.
  if exists (
    select 1 from public.game_session_players as gsp
    where gsp.id = assigned_player_id and gsp.session_id <> target.id
  ) then
    assigned_player_id := 'player-' || replace(gen_random_uuid()::text, '-', '');
  end if;

  select gsp.team into current_team
  from public.game_session_players as gsp
  where gsp.session_id = target.id and gsp.id = assigned_player_id;
  select count(*) into player_count
  from public.game_session_players as gsp
  where gsp.session_id = target.id;
  if player_count >= 50 and current_team is null then
    return jsonb_build_object('ok', false, 'error', 'Kapasitas sesi penuh (maksimal 50 peserta).');
  end if;

  if current_team is null then
    select case
      when count(*) filter (where gsp.team = 'forest') <= count(*) filter (where gsp.team = 'saffron') then 'forest'
      else 'saffron'
    end into assigned_team
    from public.game_session_players as gsp
    where gsp.session_id = target.id;
  else
    assigned_team := current_team;
  end if;

  -- A simultaneous join to a different session may race the collision check.
  -- Retry the insert with a new ID only for that table-wide PK collision.
  loop
    begin
      insert into public.game_session_players as existing (id, session_id, player_name, avatar_id, team)
      values (assigned_player_id, target.id, clean_name, p_avatar_id, assigned_team)
      on conflict (session_id, id) do update
        set player_name = excluded.player_name,
            avatar_id = excluded.avatar_id;
      exit;
    exception when unique_violation then
      if exists (
        select 1 from public.game_session_players as gsp
        where gsp.id = assigned_player_id and gsp.session_id = target.id
      ) then
        raise;
      end if;
      assigned_player_id := 'player-' || replace(gen_random_uuid()::text, '-', '');
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'playerId', assigned_player_id,
    'sessionId', target.id,
    'gameId', target.game_id,
    'hostName', target.host_name,
    'status', target.status,
    'title', target.game_snapshot ->> 'title',
    'avatarId', p_avatar_id,
    'team', assigned_team
  );
end;
$$;

revoke all on function public.join_game_session(text, text, text, text) from public;
grant execute on function public.join_game_session(text, text, text, text) to anon, authenticated;

-- RW access codes are administered by trusted signed-in staff only. The
-- application retains its existing local-data fallback if this table is absent.
create table if not exists public.rw_codes (
  id text primary key,
  rw text not null check (rw in ('RW 06', 'RW 07', 'RW 08')),
  code_hash text not null,
  code_display text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  force_logout_at timestamptz
);

create index if not exists rw_codes_rw_active_idx
  on public.rw_codes (rw, is_active);
create index if not exists rw_codes_updated_at_idx
  on public.rw_codes (updated_at desc);

alter table public.rw_codes enable row level security;
revoke all on public.rw_codes from public, anon, authenticated;
grant select, insert, update, delete on public.rw_codes to authenticated;

drop policy if exists rw_codes_staff_manage on public.rw_codes;
create policy rw_codes_staff_manage on public.rw_codes
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles as p
      where p.id = auth.uid() and p.role in ('pengurus', 'developer')
    )
  )
  with check (
    exists (
      select 1 from public.profiles as p
      where p.id = auth.uid() and p.role in ('pengurus', 'developer')
    )
  );
