alter table public.class_session_guests
  drop constraint if exists class_session_guests_status_check;

alter table public.class_session_guests
  add constraint class_session_guests_status_check
  check (status in ('pending', 'approved', 'rejected'));
