-- Jalankan di Supabase Dashboard > SQL Editor.
-- Tabel profiles adalah sumber role admin untuk akun yang sudah ada di Auth.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  role text not null default 'peserta',
  origin_type text not null default 'luar',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text not null default '';
alter table public.profiles add column if not exists role text not null default 'peserta';
alter table public.profiles add column if not exists origin_type text not null default 'luar';
alter table public.profiles add column if not exists created_at timestamptz not null default now();

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

alter table public.profiles alter column email set not null;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('pengurus', 'developer', 'peserta', 'umum'));

alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);
