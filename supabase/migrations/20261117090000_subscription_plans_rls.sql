-- Paket berlangganan: publik hanya membaca paket aktif, admin berbasis profiles
-- dapat mengelola seluruh paket. RLS tetap aktif.
alter table public.subscription_plans enable row level security;

revoke all on table public.subscription_plans from public, anon, authenticated;
grant select on table public.subscription_plans to anon, authenticated;
grant insert, update, delete on table public.subscription_plans to authenticated;
grant all on table public.subscription_plans to service_role;

-- Hapus kebijakan lama agar tidak ada policy permissive yang membatalkan batas akses.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'subscription_plans'
  loop
    execute format('drop policy if exists %I on public.subscription_plans', existing_policy.policyname);
  end loop;
end
$$;

create policy subscription_plans_public_read_active
  on public.subscription_plans
  for select
  to anon
  using (is_active = true);

create policy subscription_plans_authenticated_read_active
  on public.subscription_plans
  for select
  to authenticated
  using (
    is_active = true
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('pengurus', 'developer')
    )
  );

create policy subscription_plans_admin_insert
  on public.subscription_plans
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('pengurus', 'developer')
    )
  );

create policy subscription_plans_admin_update
  on public.subscription_plans
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('pengurus', 'developer')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('pengurus', 'developer')
    )
  );

create policy subscription_plans_admin_delete
  on public.subscription_plans
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('pengurus', 'developer')
    )
  );
