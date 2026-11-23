create or replace function public.delete_class_with_enrollments(p_class_id text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  dependency record;
  class_exists boolean;
begin
  select exists(select 1 from public.classes where id::text = p_class_id) into class_exists;
  if not class_exists then
    return false;
  end if;
  if to_regclass('public.class_sessions') is not null then
    if to_regclass('public.class_session_attendance') is not null then
      delete from public.class_session_attendance where session_id in (select id from public.class_sessions where class_id::text = p_class_id);
    end if;
    if to_regclass('public.class_session_guests') is not null then
      delete from public.class_session_guests where session_id in (select id from public.class_sessions where class_id::text = p_class_id);
    end if;
    if to_regclass('public.class_session_games') is not null then
      delete from public.class_session_games where session_id in (select id from public.class_sessions where class_id::text = p_class_id);
    end if;
    delete from public.class_sessions where class_id::text = p_class_id;
  end if;

  if to_regclass('public.enrollments') is not null then
    delete from public.enrollments where class_id::text = p_class_id;
  end if;
  if to_regclass('public.class_games') is not null then
    delete from public.class_games where class_id::text = p_class_id;
  end if;

  -- Remove any other direct, single-column FK children in this transaction.
  for dependency in
    select child.relname as table_name, child_ns.nspname as schema_name, att.attname as column_name
    from pg_constraint fk
    join pg_class child on child.oid = fk.conrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    join pg_attribute att on att.attrelid = child.oid and att.attnum = fk.conkey[1]
    where fk.contype = 'f'
      and fk.confrelid = 'public.classes'::regclass
      and cardinality(fk.conkey) = 1
      and child_ns.nspname = 'public'
      and child.relname not in ('class_sessions', 'class_session_attendance', 'class_session_guests', 'class_session_games', 'enrollments', 'class_games')
  loop
    execute format('delete from %I.%I where %I::text = $1', dependency.schema_name, dependency.table_name, dependency.column_name) using p_class_id;
  end loop;

  delete from public.classes where id::text = p_class_id;
  return true;
end;
$$;
