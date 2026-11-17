-- Keep class discovery public, but expose only published classes.
drop policy if exists classes_select_all on public.classes;
drop policy if exists classes_select_published_or_admin on public.classes;
create policy classes_select_published_or_admin
  on public.classes
  for select
  using (is_published = true or public.is_admin());

-- Enrollment records contain personal information and are visible to admins only.
drop policy if exists enrollments_select_all on public.enrollments;
drop policy if exists enrollments_select_admin_only on public.enrollments;
create policy enrollments_select_admin_only
  on public.enrollments
  for select
  using (public.is_admin());

-- Participants may read lesson pages only when the parent module is published.
drop policy if exists module_pages_select_published on public.module_pages;
create policy module_pages_select_published
  on public.module_pages
  for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.modules m
      where m.id = module_pages.module_id
        and m.is_published = true
    )
  );
