alter table public.class_session_guests
  alter column whatsapp drop not null;

alter table public.class_session_guests
  drop constraint if exists class_session_guests_whatsapp_check;

alter table public.class_session_guests
  add constraint class_session_guests_whatsapp_check
  check (whatsapp is null or char_length(whatsapp) between 9 and 16);

create or replace function public.register_class_session_guest(p_code text, p_name text, p_whatsapp text default null)
returns table (registration_id uuid, session_id uuid, session_title text, registration_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.class_sessions%rowtype;
  guest_id uuid;
  guest_status text;
  clean_whatsapp text := nullif(left(regexp_replace(coalesce(p_whatsapp, ''), '[^+0-9]', '', 'g'), 16), '');
begin
  select cs.*
    into target
    from public.class_sessions as cs
    where cs.code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'))
    for update;

  if target.id is null or target.status <> 'open' then
    raise exception 'SESSION_CLOSED';
  end if;

  guest_status := case when target.require_approval then 'pending' else 'approved' end;

  if clean_whatsapp is null then
    insert into public.class_session_guests (session_id, full_name, whatsapp, status)
    values (target.id, left(btrim(p_name), 80), null, guest_status)
    returning id, status into guest_id, guest_status;
  else
    insert into public.class_session_guests as csg (session_id, full_name, whatsapp, status)
    values (target.id, left(btrim(p_name), 80), clean_whatsapp, guest_status)
    on conflict on constraint class_session_guests_session_id_whatsapp_key
    do update set full_name = excluded.full_name, status = excluded.status
    returning csg.id, csg.status into guest_id, guest_status;
  end if;

  if guest_status = 'approved' then
    insert into public.class_session_attendance as csa
      (session_id, participant_key, participant_name, participant_type, guest_registration_id)
    values (target.id, 'guest:' || guest_id::text, left(btrim(p_name), 80), 'guest', guest_id)
    on conflict on constraint class_session_attendance_session_id_participant_key_key
    do nothing;
  end if;

  return query select guest_id, target.id, target.title, guest_status;
end;
$$;

revoke all on function public.register_class_session_guest(text, text, text) from public;
grant execute on function public.register_class_session_guest(text, text, text) to anon, authenticated, service_role;
