alter table public.external_users
  add column if not exists avatar_data_url text;

notify pgrst, 'reload schema';
