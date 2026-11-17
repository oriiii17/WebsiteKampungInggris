-- Jalankan sekali pada Supabase SQL Editor untuk memperbaiki PGRST205
-- dan mendukung beberapa kode akses per RW.
create table if not exists public.rw_codes (
  id text,
  rw text not null check (rw in ('RW 06', 'RW 07', 'RW 08')),
  code_hash text not null,
  code_display text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  force_logout_at timestamptz
);

alter table public.rw_codes add column if not exists id text;
update public.rw_codes
set id = 'rw-' || lpad(regexp_replace(rw, '[^0-9]', '', 'g'), 2, '0') || '-1'
where id is null;
alter table public.rw_codes alter column id set not null;
alter table public.rw_codes drop constraint if exists rw_codes_pkey;
alter table public.rw_codes add constraint rw_codes_pkey primary key (id);
create unique index if not exists rw_codes_code_display_key on public.rw_codes (code_display);

notify pgrst, 'reload schema';
