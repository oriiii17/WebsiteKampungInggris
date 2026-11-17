alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('pengurus','developer','tutor','peserta','umum','member','guest'));

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  code varchar(6) not null unique check (code ~ '^[A-Z0-9]{6}$'),
  title text not null,
  teacher_id text not null,
  teacher_name text not null,
  status text not null default 'open' check (status in ('open','closed')),
  require_approval boolean not null default false,
  capacity integer check (capacity is null or capacity > 0),
  material_links text[] not null default '{}',
  game_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.class_session_guests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  whatsapp text not null check (char_length(whatsapp) between 9 and 16),
  status text not null default 'pending' check (status in ('pending','approved')),
  registered_at timestamptz not null default now(),
  unique (session_id, whatsapp)
);

create table if not exists public.class_session_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  participant_key text not null,
  participant_name text not null,
  participant_type text not null check (participant_type in ('guest','member')),
  guest_registration_id uuid references public.class_session_guests(id) on delete set null,
  attended_at timestamptz not null default now(),
  unique (session_id, participant_key)
);

create index if not exists class_sessions_teacher_idx on public.class_sessions(teacher_id, created_at desc);
create index if not exists class_session_guests_session_idx on public.class_session_guests(session_id, registered_at desc);
create index if not exists class_session_attendance_session_idx on public.class_session_attendance(session_id, attended_at);

alter table public.class_sessions enable row level security;
alter table public.class_session_guests enable row level security;
alter table public.class_session_attendance enable row level security;
revoke all on public.class_sessions, public.class_session_guests, public.class_session_attendance from public, anon, authenticated;
grant select, insert, update, delete on public.class_sessions, public.class_session_guests, public.class_session_attendance to authenticated;

drop policy if exists class_sessions_tutor_access on public.class_sessions;
create policy class_sessions_tutor_access on public.class_sessions for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role in ('pengurus','developer') or (p.role = 'tutor' and p.id::text = teacher_id))))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role in ('pengurus','developer') or (p.role = 'tutor' and p.id::text = teacher_id))));

drop policy if exists class_session_guests_tutor_access on public.class_session_guests;
create policy class_session_guests_tutor_access on public.class_session_guests for all to authenticated
  using (exists (select 1 from public.class_sessions s join public.profiles p on p.id::text = s.teacher_id where s.id = session_id and (p.role in ('pengurus','developer') or p.id = auth.uid())))
  with check (exists (select 1 from public.class_sessions s join public.profiles p on p.id::text = s.teacher_id where s.id = session_id and (p.role in ('pengurus','developer') or p.id = auth.uid())));

drop policy if exists class_session_attendance_tutor_read on public.class_session_attendance;
create policy class_session_attendance_tutor_read on public.class_session_attendance for select to authenticated
  using (exists (select 1 from public.class_sessions s join public.profiles p on p.id::text = s.teacher_id where s.id = session_id and (p.role in ('pengurus','developer') or p.id = auth.uid())));

create or replace function public.register_class_session_guest(p_code text, p_name text, p_whatsapp text)
returns table (registration_id uuid, session_id uuid, session_title text, registration_status text)
language plpgsql
security definer
set search_path = public
as $$
declare target public.class_sessions%rowtype; guest_id uuid; guest_status text; present_count integer;
begin
  select * into target from public.class_sessions where code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) for update;
  if target.id is null or target.status <> 'open' then raise exception 'SESSION_CLOSED'; end if;
  if target.capacity is not null then
    select count(*) into present_count from public.class_session_attendance where class_session_attendance.session_id = target.id;
    if present_count >= target.capacity then raise exception 'SESSION_FULL'; end if;
  end if;
  guest_status := case when target.require_approval then 'pending' else 'approved' end;
  insert into public.class_session_guests(session_id, full_name, whatsapp, status)
  values (target.id, p_name, p_whatsapp, guest_status)
  on conflict (session_id, whatsapp) do update set full_name = excluded.full_name
  returning id, status into guest_id, guest_status;
  if guest_status = 'approved' then
    insert into public.class_session_attendance(session_id, participant_key, participant_name, participant_type, guest_registration_id)
    values (target.id, 'guest:' || guest_id::text, p_name, 'guest', guest_id)
    on conflict (session_id, participant_key) do nothing;
  end if;
  return query select guest_id, target.id, target.title, guest_status;
end;
$$;

revoke all on function public.register_class_session_guest(text,text,text) from public;
grant execute on function public.register_class_session_guest(text,text,text) to anon, authenticated;

create or replace function public.approve_class_session_guest(p_registration_id uuid, p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare target public.class_sessions%rowtype; guest public.class_session_guests%rowtype; present_count integer;
begin
  select * into target from public.class_sessions where id = p_session_id for update;
  if target.id is null then return false; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role in ('pengurus','developer') or (p.role = 'tutor' and p.id::text = target.teacher_id))) then return false; end if;
  select * into guest from public.class_session_guests where id = p_registration_id and session_id = p_session_id for update;
  if guest.id is null then return false; end if;
  if target.capacity is not null then
    select count(*) into present_count from public.class_session_attendance where session_id = p_session_id;
    if present_count >= target.capacity then return false; end if;
  end if;
  update public.class_session_guests set status = 'approved' where id = guest.id;
  insert into public.class_session_attendance(session_id, participant_key, participant_name, participant_type, guest_registration_id)
  values (p_session_id, 'guest:' || guest.id::text, guest.full_name, 'guest', guest.id)
  on conflict (session_id, participant_key) do nothing;
  return true;
end;
$$;

revoke all on function public.approve_class_session_guest(uuid,uuid) from public;
grant execute on function public.approve_class_session_guest(uuid,uuid) to authenticated, service_role;

create or replace function public.get_class_session_info(p_code text)
returns table (id uuid, code varchar, title text, status text, require_approval boolean, capacity integer, attendee_count bigint)
language sql
security definer
set search_path = public
as $$
  select s.id, s.code, s.title, s.status, s.require_approval, s.capacity,
    (select count(*) from public.class_session_attendance a where a.session_id = s.id)
  from public.class_sessions s
  where s.code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
$$;
revoke all on function public.get_class_session_info(text) from public;
grant execute on function public.get_class_session_info(text) to anon, authenticated;

create or replace function public.get_guest_class_session(p_code text, p_registration_id uuid)
returns table (id uuid, code varchar, title text, status text, registration_status text, material_links text[], game_ids text[])
language sql
security definer
set search_path = public
as $$
  select s.id, s.code, s.title, s.status, g.status, s.material_links, s.game_ids
  from public.class_sessions s
  join public.class_session_guests g on g.session_id = s.id
  where s.code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) and g.id = p_registration_id;
$$;
revoke all on function public.get_guest_class_session(text,uuid) from public;
grant execute on function public.get_guest_class_session(text,uuid) to anon, authenticated;

create or replace function public.mark_member_class_attendance(p_code text, p_participant_key text, p_participant_name text)
returns table (session_id uuid, session_title text, attendance_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare target public.class_sessions%rowtype; present_count integer; mark_id uuid;
begin
  select * into target from public.class_sessions where code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) for update;
  if target.id is null or target.status <> 'open' then raise exception 'SESSION_CLOSED'; end if;
  if target.capacity is not null then
    select count(*) into present_count from public.class_session_attendance where class_session_attendance.session_id = target.id;
    if present_count >= target.capacity then raise exception 'SESSION_FULL'; end if;
  end if;
  insert into public.class_session_attendance(session_id, participant_key, participant_name, participant_type)
  values (target.id, left(p_participant_key, 150), left(p_participant_name, 80), 'member')
  on conflict (session_id, participant_key) do update set participant_name = excluded.participant_name
  returning id into mark_id;
  return query select target.id, target.title, mark_id;
end;
$$;
revoke all on function public.mark_member_class_attendance(text,text,text) from public;
grant execute on function public.mark_member_class_attendance(text,text,text) to service_role;

create or replace function public.get_member_class_session(p_code text, p_participant_key text)
returns table (id uuid, code varchar, title text, status text, material_links text[], game_ids text[])
language sql
security definer
set search_path = public
as $$
  select s.id, s.code, s.title, s.status, s.material_links, s.game_ids
  from public.class_sessions s
  join public.class_session_attendance a on a.session_id = s.id
  where s.code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'))
    and a.participant_key = left(p_participant_key, 150) and a.participant_type = 'member';
$$;
revoke all on function public.get_member_class_session(text,text) from public;
grant execute on function public.get_member_class_session(text,text) to service_role;
