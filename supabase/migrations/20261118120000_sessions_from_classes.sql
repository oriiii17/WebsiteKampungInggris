-- Sessions belong to a published platform class (public.modules).
-- Legacy rows are retained with a null class_id until an admin assigns them.
create table if not exists public.class_games (
  class_id text not null references public.classes(id) on delete cascade,
  game_id text not null references public.game_blueprints(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, game_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('game-media', 'game-media', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=2097152, allowed_mime_types=excluded.allowed_mime_types;

alter table public.class_sessions add column if not exists class_id text references public.classes(id) on delete restrict;
alter table public.class_sessions add column if not exists starts_at timestamptz;
alter table public.class_sessions drop column if exists capacity;
alter table public.class_sessions drop column if exists material_links;
alter table public.class_sessions drop column if exists game_ids;
create index if not exists class_sessions_class_idx on public.class_sessions(class_id, starts_at desc);
alter table public.class_games enable row level security;
revoke all on public.class_games from public, anon, authenticated;
grant select, insert, update, delete on public.class_games to authenticated, service_role;

drop function if exists public.get_class_session_info(text);
drop function if exists public.get_guest_class_session(text,uuid);
drop function if exists public.get_member_class_session(text,text);

create or replace function public.register_class_session_guest(p_code text, p_name text, p_whatsapp text)
returns table (registration_id uuid, session_id uuid, session_title text, registration_status text)
language plpgsql security definer set search_path = public as $$
declare target public.class_sessions%rowtype; guest_id uuid; guest_status text;
begin
  select * into target from public.class_sessions where code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) for update;
  if target.id is null or target.status <> 'open' then raise exception 'SESSION_CLOSED'; end if;
  insert into public.class_session_guests(session_id, full_name, whatsapp, status)
  values(target.id, left(btrim(p_name),80), left(regexp_replace(p_whatsapp, '[^+0-9]', '', 'g'),16), case when target.require_approval then 'pending' else 'approved' end)
  on conflict(session_id, whatsapp) do update set full_name = excluded.full_name
  returning id, status into guest_id, guest_status;
  if guest_status = 'approved' then
    insert into public.class_session_attendance(session_id, participant_key, participant_name, participant_type, guest_registration_id)
    values(target.id, 'guest:' || guest_id::text, left(btrim(p_name),80), 'guest', guest_id)
    on conflict(session_id, participant_key) do nothing;
  end if;
  return query select guest_id, target.id, target.title, guest_status;
end; $$;
revoke all on function public.register_class_session_guest(text,text,text) from public;
grant execute on function public.register_class_session_guest(text,text,text) to anon, authenticated, service_role;

create or replace function public.approve_class_session_guest(p_registration_id uuid, p_session_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare guest public.class_session_guests%rowtype; target public.class_sessions%rowtype;
begin
  select * into target from public.class_sessions where id=p_session_id and status='open';
  if target.id is null then return false; end if;
  select * into guest from public.class_session_guests where id=p_registration_id and session_id=p_session_id;
  if guest.id is null then return false; end if;
  update public.class_session_guests set status='approved' where id=guest.id;
  insert into public.class_session_attendance(session_id,participant_key,participant_name,participant_type,guest_registration_id)
  values(target.id,'guest:'||guest.id::text,guest.full_name,'guest',guest.id) on conflict(session_id,participant_key) do nothing;
  return true;
end; $$;

create or replace function public.get_class_session_info(p_code text)
returns table (id uuid, code varchar, title text, status text, require_approval boolean, attendee_count bigint, class_id text, class_title text, class_slug text, starts_at timestamptz)
language sql security definer set search_path = public as $$
  select s.id,s.code,s.title,s.status,s.require_approval,
    (select count(*) from public.class_session_attendance a where a.session_id=s.id),
    c.id,c.title,c.slug,s.starts_at
  from public.class_sessions s left join public.classes c on c.id=s.class_id
  where s.code=upper(regexp_replace(p_code,'[^A-Za-z0-9]','','g'));
$$;
revoke all on function public.get_class_session_info(text) from public;
grant execute on function public.get_class_session_info(text) to anon, authenticated, service_role;

create or replace function public.get_guest_class_session(p_code text, p_registration_id uuid)
returns table (id uuid, code varchar, title text, status text, registration_status text, class_id text, class_title text, class_slug text, starts_at timestamptz)
language sql security definer set search_path = public as $$
  select s.id,s.code,s.title,s.status,g.status,c.id,c.title,c.slug,s.starts_at
  from public.class_sessions s join public.class_session_guests g on g.session_id=s.id
  left join public.classes c on c.id=s.class_id
  where s.code=upper(regexp_replace(p_code,'[^A-Za-z0-9]','','g')) and g.id=p_registration_id;
$$;
revoke all on function public.get_guest_class_session(text,uuid) from public;
grant execute on function public.get_guest_class_session(text,uuid) to anon, authenticated, service_role;

create or replace function public.mark_member_class_attendance(p_code text, p_participant_key text, p_participant_name text)
returns table (session_id uuid, session_title text, attendance_id uuid)
language plpgsql security definer set search_path = public as $$
declare target public.class_sessions%rowtype; mark_id uuid;
begin
  select * into target from public.class_sessions where code=upper(regexp_replace(p_code,'[^A-Za-z0-9]','','g')) for update;
  if target.id is null or target.status <> 'open' then raise exception 'SESSION_CLOSED'; end if;
  insert into public.class_session_attendance(session_id,participant_key,participant_name,participant_type)
  values(target.id,left(p_participant_key,150),left(p_participant_name,80),'member')
  on conflict(session_id,participant_key) do update set participant_name=excluded.participant_name returning id into mark_id;
  return query select target.id,target.title,mark_id;
end; $$;

create or replace function public.get_member_class_session(p_code text, p_participant_key text)
returns table (id uuid, code varchar, title text, status text, class_id text, class_title text, class_slug text, starts_at timestamptz)
language sql security definer set search_path = public as $$
  select s.id,s.code,s.title,s.status,c.id,c.title,c.slug,s.starts_at
  from public.class_sessions s join public.class_session_attendance a on a.session_id=s.id
  left join public.classes c on c.id=s.class_id
  where s.code=upper(regexp_replace(p_code,'[^A-Za-z0-9]','','g')) and a.participant_key=left(p_participant_key,150) and a.participant_type='member';
$$;
revoke all on function public.get_member_class_session(text,text) from public;
grant execute on function public.get_member_class_session(text,text) to service_role;

notify pgrst, 'reload schema';
