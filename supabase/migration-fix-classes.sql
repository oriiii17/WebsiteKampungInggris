-- ============================================================================
-- MIGRASI: tabel classes, enrollments, games (Panel Pengurus Kampung Inggris Sapen)
-- Jalankan di Supabase Dashboard > SQL Editor. Idempotent (IF NOT EXISTS / OR REPLACE).
-- Kolom "modules"/"materi"/"questions" disimpan sebagai JSONB agar Bab & Materi
-- (ClassModule: judulBebas, deskripsi, urutan, filePDF/fileAsli, status, quiz)
-- serta soal game tersimpan utuh tanpa skema relasional tambahan.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- CLASSES
-- ---------------------------------------------------------------------------
create table if not exists public.classes (
  id text primary key,
  slug text unique,
  title text not null,
  subtitle text,
  description text not null default '',
  cover_theme text not null default 'emerald',
  price_idr integer not null default 0,
  duration_days integer not null default 30,
  module_ids jsonb not null default '[]'::jsonb,
  modules jsonb not null default '[]'::jsonb,        -- Bab & Materi (ClassModule[])
  materi jsonb not null default '[]'::jsonb,         -- alias/cadangan materi
  game_template_ids jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  tingkat text,
  jadwal text,
  kode_akses text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.classes add column if not exists slug text;
alter table public.classes add column if not exists subtitle text;
alter table public.classes add column if not exists cover_theme text not null default 'emerald';
alter table public.classes add column if not exists price_idr integer not null default 0;
alter table public.classes add column if not exists duration_days integer not null default 30;
alter table public.classes add column if not exists module_ids jsonb not null default '[]'::jsonb;
alter table public.classes add column if not exists modules jsonb not null default '[]'::jsonb;
alter table public.classes add column if not exists materi jsonb not null default '[]'::jsonb;
alter table public.classes add column if not exists game_template_ids jsonb not null default '[]'::jsonb;
alter table public.classes add column if not exists is_published boolean not null default true;
alter table public.classes add column if not exists tingkat text;
alter table public.classes add column if not exists jadwal text;
alter table public.classes add column if not exists kode_akses text;
alter table public.classes add column if not exists status text not null default 'draft';
alter table public.classes add column if not exists created_at timestamptz not null default now();
alter table public.classes add column if not exists updated_at timestamptz not null default now();

create unique index if not exists classes_slug_idx on public.classes (slug) where slug is not null;
create index if not exists classes_is_published_idx on public.classes (is_published);
create index if not exists classes_created_at_idx on public.classes (created_at desc);

-- ---------------------------------------------------------------------------
-- ENROLLMENTS
-- ---------------------------------------------------------------------------
create table if not exists public.enrollments (
  id text primary key,
  class_id text not null,
  user_email text not null,
  user_name text not null,
  starts_at timestamptz,
  expires_at timestamptz,
  status text not null default 'active',
  paid_amount_idr integer not null default 0,
  payment_method text,
  created_at timestamptz not null default now()
);

alter table public.enrollments add column if not exists starts_at timestamptz;
alter table public.enrollments add column if not exists expires_at timestamptz;
alter table public.enrollments add column if not exists paid_amount_idr integer not null default 0;
alter table public.enrollments add column if not exists payment_method text;
alter table public.enrollments add column if not exists created_at timestamptz not null default now();

create index if not exists enrollments_class_id_idx on public.enrollments (class_id);
create index if not exists enrollments_user_email_idx on public.enrollments (lower(user_email));

-- ---------------------------------------------------------------------------
-- GAMES
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id text primary key,
  nama_game text not null,
  jenis_game text not null,
  deskripsi text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade installations that used the old title/kind/questions JSON layout.
alter table public.games add column if not exists nama_game text;
alter table public.games add column if not exists jenis_game text;
alter table public.games add column if not exists deskripsi text not null default '';
alter table public.games add column if not exists created_at timestamptz not null default now();
alter table public.games add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='games' and column_name='title') then
    execute 'update public.games set nama_game = coalesce(nama_game, title), jenis_game = coalesce(jenis_game, kind)';
  end if;
end $$;
update public.games set nama_game = coalesce(nama_game, id), jenis_game = coalesce(jenis_game, 'kuis_live');
alter table public.games alter column nama_game set not null;
alter table public.games alter column jenis_game set not null;

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

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='games' and column_name='questions') then
    execute $migrate$
      insert into public.game_soal (id, game_id, pertanyaan, clue, jawaban, urutan, data)
      select g.id || ':q:' || item.ordinality::text || ':' || coalesce(q->>'id','legacy'), g.id,
        coalesce(q->>'prompt',''), coalesce(q->>'hint',''), coalesce(q->>'answer',''), item.ordinality::integer,
        jsonb_set(q, '{id}', to_jsonb(g.id || ':q:' || item.ordinality::text || ':' || coalesce(q->>'id','legacy')), true)
      from public.games g
      cross join lateral jsonb_array_elements(coalesce(g.questions, '[]'::jsonb)) with ordinality as item(q, ordinality)
      where q->>'id' is not null
    $migrate$;
  end if;
end $$;
alter table public.games drop column if exists questions;
alter table public.games drop column if exists title;
alter table public.games drop column if exists kind;
alter table public.games drop column if exists migrated_from_template_id;

insert into public.games (id, nama_game, jenis_game, deskripsi) values
  ('game-kuis-live', 'Soal Pilihan Ganda', 'kuis_live', 'Jawab pertanyaan Bahasa Inggris dengan memilih satu dari empat opsi.'),
  ('game-tebak-kata', 'Tebak Kata (Vocabulary)', 'tebak_kata', 'Tebak kosakata dari petunjuk.'),
  ('game-pasangkan-kata', 'Pasangkan Kata (Vocabulary Match)', 'pasangkan_kata', 'Pasangkan kosakata dan artinya.'),
  ('game-susun-kalimat', 'Susun Kalimat (Word Builder)', 'susun_kalimat', 'Susun kata menjadi kalimat.'),
  ('game-tebak-gambar', 'Tebak Gambar', 'tebak_gambar', 'Tebak nama benda dari gambar.'),
  ('game-kata-hilang', 'Kata Hilang (Fill in the Blank)', 'kata_hilang', 'Lengkapi kata yang hilang.'),
  ('game-duel-kata-cepat', 'Duel Kata Cepat', 'duel_kata_cepat', 'Jawab petunjuk secepat mungkin.')
on conflict (id) do nothing;

create index if not exists games_kind_idx on public.games (jenis_game);
create index if not exists games_updated_at_idx on public.games (updated_at desc);
create index if not exists game_soal_game_order_idx on public.game_soal (game_id, urutan);

-- ---------------------------------------------------------------------------
-- RLS: aktif + policy untuk service_role dan admin (authenticated pengurus/dev)
-- Service role key melewati RLS; policy ini memastikan akses server resmi (anon key
-- + session Supabase Auth pengurus/developer) tetap dapat INSERT/SELECT/UPDATE/DELETE.
-- ---------------------------------------------------------------------------
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.games enable row level security;
alter table public.game_soal enable row level security;

-- helper: grant ke service_role (selalu) + authenticated
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.classes to anon, authenticated, service_role;
grant select, insert, update, delete on table public.enrollments to anon, authenticated, service_role;
grant select, insert, update, delete on table public.games to anon, authenticated, service_role;
grant select, insert, update, delete on table public.game_soal to anon, authenticated, service_role;

-- CLASSES policies
drop policy if exists "classes_select_all" on public.classes;
create policy "classes_select_all" on public.classes for select using (true);

drop policy if exists "classes_admin_all" on public.classes;
create policy "classes_admin_all" on public.classes for all
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('pengurus','developer'))
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('pengurus','developer'))
  );

drop policy if exists "classes_service_all" on public.classes;
create policy "classes_service_all" on public.classes for all
  to service_role using (true) with check (true);

-- ENROLLMENTS policies
drop policy if exists "enrollments_select_all" on public.enrollments;
create policy "enrollments_select_all" on public.enrollments for select using (true);

drop policy if exists "enrollments_admin_all" on public.enrollments;
create policy "enrollments_admin_all" on public.enrollments for all
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('pengurus','developer'))
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('pengurus','developer'))
  );

drop policy if exists "enrollments_service_all" on public.enrollments;
create policy "enrollments_service_all" on public.enrollments for all
  to service_role using (true) with check (true);

-- GAMES policies
drop policy if exists "games_select_all" on public.games;
create policy "games_select_all" on public.games for select using (true);

drop policy if exists "games_admin_all" on public.games;

drop policy if exists "games_service_all" on public.games;
create policy "games_service_all" on public.games for all
  to service_role using (true) with check (true);

-- Pengurus dapat mengelola soal saja; master game hanya dapat dibaca.
drop policy if exists "game_soal_select_all" on public.game_soal;
create policy "game_soal_select_all" on public.game_soal for select using (true);
drop policy if exists "game_soal_admin_all" on public.game_soal;
create policy "game_soal_admin_all" on public.game_soal for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('pengurus','developer')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('pengurus','developer')));
drop policy if exists "game_soal_service_all" on public.game_soal;
create policy "game_soal_service_all" on public.game_soal for all to service_role using (true) with check (true);

-- Selesai. Setelah migrasi, aplikasi akan upsert ke tabel ini saat Supabase terkonfigurasi.


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
