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
