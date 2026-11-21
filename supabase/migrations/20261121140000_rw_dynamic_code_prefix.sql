create table if not exists public.rw_code_settings (
  id smallint primary key default 1 check (id = 1),
  active_prefix text not null default 'SAP' check (active_prefix ~ '^[A-Z0-9]{3,4}$'),
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.rw_code_settings (id, active_prefix)
values (1, 'SAP')
on conflict (id) do nothing;

alter table public.rw_code_settings enable row level security;
grant select on public.rw_code_settings to anon, authenticated;
grant update on public.rw_code_settings to authenticated;
drop policy if exists rw_code_settings_public_read on public.rw_code_settings;
create policy rw_code_settings_public_read on public.rw_code_settings
  for select to anon, authenticated using (true);
drop policy if exists rw_code_settings_admin_update on public.rw_code_settings;
create policy rw_code_settings_admin_update on public.rw_code_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
