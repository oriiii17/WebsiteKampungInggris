alter table public.game_blueprints
  add column if not exists card_initials text;

update public.game_blueprints
set card_initials = upper(left(regexp_replace(coalesce(title, 'Kuis'), '[^[:alnum:]]', '', 'g'), 2))
where card_initials is null or btrim(card_initials) = '';

update public.game_blueprints set card_initials = 'KU'
where card_initials is null or length(card_initials) < 2;

alter table public.game_blueprints alter column card_initials set default 'KU';
alter table public.game_blueprints alter column card_initials set not null;

alter table public.game_blueprints
  drop constraint if exists game_blueprints_card_initials_check;
alter table public.game_blueprints
  add constraint game_blueprints_card_initials_check
  check (card_initials ~ '^[A-Z0-9]{2,4}$');

alter table public.game_blueprints
  drop constraint if exists game_blueprints_level_check;
alter table public.game_blueprints
  add constraint game_blueprints_level_check
  check (level in ('A1','A2','B1','B2','C1','C2'));
