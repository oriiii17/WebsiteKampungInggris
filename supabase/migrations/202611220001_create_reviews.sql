create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  isi text not null check (char_length(btrim(isi)) between 1 and 500),
  status text not null default 'menunggu' check (status in ('menunggu', 'terbit')),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  created_at timestamptz not null default now()
);

create index if not exists reviews_status_created_at_idx
  on public.reviews (status, created_at desc);
create index if not exists reviews_user_id_idx
  on public.reviews (user_id);

alter table public.reviews enable row level security;

drop policy if exists "Published reviews are public" on public.reviews;
create policy "Published reviews are public"
  on public.reviews for select to anon, authenticated
  using (status = 'terbit');

drop policy if exists "Authors can read their reviews" on public.reviews;
create policy "Authors can read their reviews"
  on public.reviews for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Verified participants can submit reviews" on public.reviews;
create policy "Verified participants can submit reviews"
  on public.reviews for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'menunggu'
    and exists (
      select 1 from auth.users u
      join public.profiles p on p.id = u.id
      where u.id = auth.uid()
        and u.email_confirmed_at is not null
        and p.role in ('peserta', 'umum', 'member')
    )
  );

drop policy if exists "Authors can edit their reviews back to pending" on public.reviews;
create policy "Authors can edit their reviews back to pending"
  on public.reviews for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status = 'menunggu');

drop policy if exists "Admins can manage reviews" on public.reviews;
create policy "Admins can manage reviews"
  on public.reviews for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'pengurus', 'developer')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'pengurus', 'developer')));
