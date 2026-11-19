-- Let session managers access session guests/attendance based on the current actor,
-- not on the role of the session's teacher. Tutors remain limited to their own sessions.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','pengurus','developer','tutor','peserta','umum','member','guest'));

drop policy if exists class_sessions_tutor_access on public.class_sessions;
create policy class_sessions_tutor_access on public.class_sessions for all to authenticated
  using (
    exists (
      select 1 from public.profiles actor
      where actor.id = auth.uid()
        and (actor.role in ('admin','pengurus','developer')
          or (actor.role = 'tutor' and actor.id::text = class_sessions.teacher_id))
    )
  )
  with check (
    exists (
      select 1 from public.profiles actor
      where actor.id = auth.uid()
        and (actor.role in ('admin','pengurus','developer')
          or (actor.role = 'tutor' and actor.id::text = class_sessions.teacher_id))
    )
  );

drop policy if exists class_session_guests_tutor_access on public.class_session_guests;
create policy class_session_guests_tutor_access on public.class_session_guests for all to authenticated
  using (
    exists (
      select 1 from public.class_sessions s
      where s.id = class_session_guests.session_id
        and (
          exists (select 1 from public.profiles actor where actor.id = auth.uid() and actor.role in ('admin','pengurus','developer'))
          or exists (
            select 1 from public.profiles tutor
            where tutor.id = auth.uid() and tutor.role = 'tutor' and tutor.id::text = s.teacher_id
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.class_sessions s
      where s.id = class_session_guests.session_id
        and (
          exists (select 1 from public.profiles actor where actor.id = auth.uid() and actor.role in ('admin','pengurus','developer'))
          or exists (
            select 1 from public.profiles tutor
            where tutor.id = auth.uid() and tutor.role = 'tutor' and tutor.id::text = s.teacher_id
          )
        )
    )
  );

drop policy if exists class_session_attendance_tutor_read on public.class_session_attendance;
create policy class_session_attendance_tutor_read on public.class_session_attendance for select to authenticated
  using (
    exists (
      select 1 from public.class_sessions s
      where s.id = class_session_attendance.session_id
        and (
          exists (select 1 from public.profiles actor where actor.id = auth.uid() and actor.role in ('admin','pengurus','developer'))
          or exists (
            select 1 from public.profiles tutor
            where tutor.id = auth.uid() and tutor.role = 'tutor' and tutor.id::text = s.teacher_id
          )
        )
    )
  );
