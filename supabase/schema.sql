-- ============================================================================
-- SCHEMA PRODUKSI SUPABASE: WEBSITE PEMBELAJARAN BAHASA INGGRIS KAMPUNG SAPEN
-- Sudah diterapkan langsung ke project Supabase: serrhhvoezqmtjabphag
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null default 'peserta' check (role in ('pengurus', 'developer', 'peserta')),
  origin_type text not null default 'luar' check (origin_type in ('warga', 'luar')),
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  duration_days integer not null,
  price_idr integer not null,
  badge text,
  description text,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  id text primary key,
  slug text unique not null,
  title text not null,
  subtitle text not null,
  category text not null,
  level text not null,
  duration_label text not null,
  schedule_label text not null default 'Jam belajar fleksibel (24 Jam)',
  target_audience text not null,
  quota_note text not null default 'Gratis dengan Kode Warga Sapen • Tersedia untuk Umum',
  summary text not null,
  description text not null,
  cover_theme text not null default 'emerald',
  total_pages integer not null default 0,
  has_custom_uploaded_pages boolean not null default false,
  syllabus jsonb not null default '[]'::jsonb,
  learning_outcomes jsonb not null default '[]'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  preview_highlights jsonb not null default '[]'::jsonb,
  seed_pages jsonb,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.module_pages (
  id uuid primary key default gen_random_uuid(),
  module_id text not null references public.modules(id) on delete cascade,
  page_number integer not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique(module_id, page_number)
);

create table if not exists public.access_codes (
  id text primary key,
  code text unique not null,
  label text not null,
  rt_rw text not null default 'RT 01 / RW 01',
  holder_type text not null default 'keluarga' check (holder_type in ('keluarga', 'individu')),
  max_devices integer not null default 4,
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_by text not null default 'Pengurus Sapen',
  created_at timestamptz not null default now()
);

create table if not exists public.access_code_devices (
  id uuid primary key default gen_random_uuid(),
  code_id text not null references public.access_codes(id) on delete cascade,
  device_id text not null,
  participant_name text not null,
  device_label text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(code_id, device_id)
);

create table if not exists public.external_users (
  id text primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id text primary key,
  user_email text not null,
  user_name text not null,
  plan_id text not null references public.subscription_plans(id),
  plan_name text not null default 'Paket Belajar',
  amount_idr integer not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'failed')),
  payment_method text,
  midtrans_order_id text unique not null,
  midtrans_snap_token text,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id text primary key,
  module_id text not null references public.modules(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index integer not null check (correct_index between 0 and 3),
  explanation text not null,
  order_num integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id text primary key,
  module_id text not null references public.modules(id) on delete cascade,
  english text not null,
  phonetic text,
  indonesian text not null,
  example_en text,
  example_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.matching_pairs (
  id text primary key,
  module_id text not null references public.modules(id) on delete cascade,
  english text not null,
  indonesian text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.word_challenges (
  id text primary key,
  module_id text not null references public.modules(id) on delete cascade,
  challenge_type text not null check (challenge_type in ('scramble', 'fill_blank')),
  clue_id text not null,
  sentence_blank text,
  answer text not null,
  hint text,
  created_at timestamptz not null default now()
);

create table if not exists public.leaderboard_entries (
  id text primary key,
  participant_key text not null,
  participant_name text not null,
  origin_badge text not null default 'Warga Sapen',
  module_id text references public.modules(id) on delete set null,
  module_title text not null default 'Modul Bahasa Inggris',
  game_type text not null,
  score integer not null check (score >= 0),
  week_label text not null,
  created_at timestamptz not null default now()
);

create index if not exists module_pages_module_id_idx on public.module_pages(module_id);
create index if not exists access_code_devices_code_id_idx on public.access_code_devices(code_id);
create index if not exists subscriptions_plan_id_idx on public.subscriptions(plan_id);
create index if not exists subscriptions_user_email_idx on public.subscriptions(lower(user_email));
create index if not exists quiz_questions_module_id_idx on public.quiz_questions(module_id);
create index if not exists flashcards_module_id_idx on public.flashcards(module_id);
create index if not exists matching_pairs_module_id_idx on public.matching_pairs(module_id);
create index if not exists word_challenges_module_id_idx on public.word_challenges(module_id);
create index if not exists leaderboard_entries_module_id_idx on public.leaderboard_entries(module_id);
create index if not exists leaderboard_entries_week_score_idx on public.leaderboard_entries(week_label, score desc);

insert into storage.buckets (id, name, public)
values ('module-pages', 'module-pages', false)
on conflict (id) do nothing;
