alter table public.game_session_players add column if not exists avatar_id text not null default 'leaf';
alter table public.game_session_players add column if not exists team text not null default 'forest';
alter table public.game_session_players drop constraint if exists game_session_players_avatar_id_check;
alter table public.game_session_players add constraint game_session_players_avatar_id_check check (avatar_id in ('leaf','book','sun','bird'));
alter table public.game_session_players drop constraint if exists game_session_players_team_check;
alter table public.game_session_players add constraint game_session_players_team_check check (team in ('forest','saffron'));

create or replace function public.join_game_session(p_pin text, p_player_id text, p_player_name text, p_avatar_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare target public.game_sessions%rowtype; clean_name text := btrim(p_player_name); assigned_team text; current_team text; player_count integer;
begin
  if p_pin !~ '^[0-9]{6}$' then return jsonb_build_object('ok',false,'error','PIN sesi tidak valid.'); end if;
  if p_player_id is null or p_player_id !~ '^[A-Za-z0-9_-]{8,80}$' then return jsonb_build_object('ok',false,'error','ID peserta tidak valid.'); end if;
  if clean_name is null or char_length(clean_name) < 2 or char_length(clean_name) > 40 then return jsonb_build_object('ok',false,'error','Nama harus terdiri dari 2 sampai 40 karakter.'); end if;
  if p_avatar_id not in ('leaf','book','sun','bird') then return jsonb_build_object('ok',false,'error','Avatar tidak dikenal.'); end if;
  select * into target from public.game_sessions where pin = p_pin for update;
  if not found or target.status = 'closed' then return jsonb_build_object('ok',false,'error','Sesi tidak ditemukan atau sudah ditutup.'); end if;
  select team into current_team from public.game_session_players where session_id = target.id and id = p_player_id;
  select count(*) into player_count from public.game_session_players where session_id = target.id;
  if player_count >= 50 and current_team is null then return jsonb_build_object('ok',false,'error','Kapasitas sesi penuh (maksimal 50 peserta).'); end if;
  if current_team is null then
    select case when count(*) filter (where team = 'forest') <= count(*) filter (where team = 'saffron') then 'forest' else 'saffron' end
      into assigned_team from public.game_session_players where session_id = target.id;
  else assigned_team := current_team; end if;
  insert into public.game_session_players (id, session_id, player_name, avatar_id, team)
  values (p_player_id, target.id, clean_name, p_avatar_id, assigned_team)
  on conflict (session_id, id) do update set player_name = excluded.player_name, avatar_id = excluded.avatar_id;
  return jsonb_build_object('ok',true,'sessionId',target.id,'gameId',target.game_id,'hostName',target.host_name,'status',target.status,'title',target.game_snapshot->>'title','avatarId',p_avatar_id,'team',assigned_team);
end;
$$;

revoke all on function public.join_game_session(text,text,text,text) from public;
grant execute on function public.join_game_session(text,text,text,text) to anon, authenticated;
