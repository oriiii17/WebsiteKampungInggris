-- ============================================================================
-- SCHEMA PRODUKSI SUPABASE: WEBSITE PEMBELAJARAN BAHASA INGGRIS KAMPUNG SAPEN
-- Sudah diterapkan langsung ke project Supabase: serrhhvoezqmtjabphag
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.rw_codes (
  id text primary key,
  rw text not null check (rw in ('RW 06', 'RW 07', 'RW 08')),
  code_hash text not null,
  code_display text not null unique,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  force_logout_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null default 'peserta' check (role in ('pengurus', 'developer', 'peserta', 'umum')),
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
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by text not null default 'Pengurus Sapen',
  created_at timestamptz not null default now()
);

create table if not exists public.external_users (
  id text primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,
  avatar_data_url text,
  created_at timestamptz not null default now()
);
alter table public.external_users add column if not exists avatar_data_url text;

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

create table if not exists public.games (
  id text primary key,
  nama_game text not null,
  jenis_game text not null,
  deskripsi text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_soal (
  id text primary key default gen_random_uuid()::text,
  game_id text not null references public.games(id) on delete cascade,
  pertanyaan text not null default '',
  clue text not null default '',
  jawaban text not null default '',
  urutan integer not null default 1,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.game_soal alter column id set default gen_random_uuid()::text;

insert into public.games (id, nama_game, jenis_game, deskripsi) values
  ('game-kuis-live', 'Soal Pilihan Ganda', 'kuis_live', 'Jawab pertanyaan Bahasa Inggris dengan memilih satu dari empat opsi.'),
  ('game-tebak-kata', 'Tebak Kata (Vocabulary)', 'tebak_kata', 'Tebak kosakata dari petunjuk.'),
  ('game-pasangkan-kata', 'Pasangkan Kata (Vocabulary Match)', 'pasangkan_kata', 'Pasangkan kosakata dan artinya.'),
  ('game-susun-kalimat', 'Susun Kalimat (Word Builder)', 'susun_kalimat', 'Susun kata menjadi kalimat.'),
  ('game-tebak-gambar', 'Tebak Gambar', 'tebak_gambar', 'Tebak nama benda dari gambar.'),
  ('game-kata-hilang', 'Kata Hilang (Fill in the Blank)', 'kata_hilang', 'Lengkapi kata yang hilang.'),
  ('game-duel-kata-cepat', 'Duel Kata Cepat', 'duel_kata_cepat', 'Jawab petunjuk secepat mungkin.')
on conflict (id) do nothing;

create index if not exists module_pages_module_id_idx on public.module_pages(module_id);
create index if not exists rw_codes_rw_active_idx on public.rw_codes(rw, is_active);
create index if not exists subscriptions_plan_id_idx on public.subscriptions(plan_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_user_email_idx on public.subscriptions(lower(user_email));
create index if not exists quiz_questions_module_id_idx on public.quiz_questions(module_id);
create index if not exists flashcards_module_id_idx on public.flashcards(module_id);
create index if not exists matching_pairs_module_id_idx on public.matching_pairs(module_id);
create index if not exists word_challenges_module_id_idx on public.word_challenges(module_id);
create index if not exists leaderboard_entries_module_id_idx on public.leaderboard_entries(module_id);
create index if not exists leaderboard_entries_week_score_idx on public.leaderboard_entries(week_label, score desc);
create index if not exists game_soal_game_order_idx on public.game_soal(game_id, urutan);

alter table public.games enable row level security;
alter table public.game_soal enable row level security;
grant select, insert, update, delete on public.games, public.game_soal to anon, authenticated, service_role;
drop policy if exists games_select_all on public.games;
create policy games_select_all on public.games for select using (true);
drop policy if exists games_service_all on public.games;
create policy games_service_all on public.games for all to service_role using (true) with check (true);
drop policy if exists game_soal_select_all on public.game_soal;
create policy game_soal_select_all on public.game_soal for select using (true);
drop policy if exists game_soal_admin_all on public.game_soal;
create policy game_soal_admin_all on public.game_soal for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('pengurus','developer')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('pengurus','developer')));
drop policy if exists game_soal_service_all on public.game_soal;
create policy game_soal_service_all on public.game_soal for all to service_role using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('module-pages', 'module-pages', false)
on conflict (id) do nothing;


-- Rename legacy demo games that used "Bukti" as a confusing title.
-- The old "Bukti Kata Hilang" record is a multiple-choice quiz, not a fill-in game.
with legacy_game_ids as (
  select id
  from public.games
  where lower(trim(nama_game)) = 'bukti kata hilang'
), normalized_questions as (
  select
    q.id,
    q.game_id,
    q.data,
    coalesce(nullif(q.data->>'prompt', ''), nullif(q.pertanyaan, ''), nullif(q.data->>'sentence', ''), 'Pilih jawaban yang tepat.') as prompt,
    coalesce(nullif(q.data->>'answer', ''), nullif(q.jawaban, '')) as answer,
    case
      when jsonb_typeof(q.data->'options') = 'array' and jsonb_array_length(q.data->'options') >= 4
        then q.data->'options'
      else jsonb_build_array(
        coalesce(nullif(q.data->>'answer', ''), nullif(q.jawaban, ''), 'Jawaban benar'),
        'Pilihan B', 'Pilihan C', 'Pilihan D'
      )
    end as options
  from public.game_soal q
  join legacy_game_ids g on g.id = q.game_id
), question_answers as (
  select
    q.*,
    case
      when coalesce(q.data->'correctIndexes'->>0, '') ~ '^[0-3]$'
        then (q.data->'correctIndexes'->>0)::integer
      else coalesce((
        select (option.ordinality - 1)::integer
        from jsonb_array_elements_text(q.options) with ordinality as option(value, ordinality)
        where lower(trim(option.value)) = lower(trim(coalesce(q.answer, '')))
        limit 1
      ), 0)
    end as correct_index
  from normalized_questions q
)
update public.game_soal q
set
  pertanyaan = qa.prompt,
  clue = '',
  jawaban = coalesce(qa.answer, ''),
  data = (qa.data - 'sentence' - 'hint' - 'answer' - 'correctIndex') || jsonb_build_object(
    'type', 'kuis_live',
    'prompt', qa.prompt,
    'options', qa.options,
    'correctIndexes', jsonb_build_array(qa.correct_index),
    'choiceMode', 'single'
  )
from question_answers qa
where q.id = qa.id;

update public.games
set
  nama_game = 'Soal Pilihan Ganda',
  jenis_game = 'kuis_live',
  deskripsi = 'Jawab pertanyaan Bahasa Inggris dengan memilih satu dari empat opsi.'
where lower(trim(nama_game)) = 'bukti kata hilang';

update public.games
set
  nama_game = case
    when lower(trim(nama_game)) = 'bukti' then 'Contoh ' || initcap(replace(coalesce(nullif(jenis_game, ''), 'game'), '_', ' '))
    else regexp_replace(nama_game, '^Bukti[[:space:]]*', 'Contoh ', 'i')
  end,
  deskripsi = coalesce(nullif(trim(deskripsi), ''),
    case jenis_game
      when 'kuis_live' then 'Contoh kuis Bahasa Inggris dengan empat pilihan jawaban.'
      when 'tebak_kata' then 'Contoh latihan menebak kosakata Bahasa Inggris dari petunjuk.'
      when 'pasangkan_kata' then 'Contoh latihan memasangkan kosakata Bahasa Inggris dengan artinya.'
      when 'susun_kalimat' then 'Contoh latihan menyusun kata menjadi kalimat Bahasa Inggris.'
      when 'tebak_gambar' then 'Contoh latihan menebak benda dalam Bahasa Inggris dari gambar.'
      when 'kata_hilang' then 'Contoh latihan melengkapi kata yang hilang dalam kalimat Bahasa Inggris.'
      when 'duel_kata_cepat' then 'Contoh tantangan menjawab petunjuk kosakata dengan cepat.'
      else 'Contoh soal latihan Bahasa Inggris untuk game ini.'
    end
  )
where nama_game ilike 'Bukti%';
