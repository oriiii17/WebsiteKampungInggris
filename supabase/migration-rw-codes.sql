-- Jalankan sekali pada database Supabase yang sudah berjalan.
-- Aplikasi menyimpan hash kode, tidak menyimpan kode asli.
create table if not exists public.rw_codes (
  rw text primary key check (rw in ('RW 06', 'RW 07', 'RW 08')),
  code_hash text not null,
  code_display text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  force_logout_at timestamptz
);
