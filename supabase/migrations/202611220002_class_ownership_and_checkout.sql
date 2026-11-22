alter table public.enrollments
  add column if not exists source text not null default 'legacy'
  check (source in ('beli', 'gratis', 'admin', 'legacy'));

with ranked as (
  select id, row_number() over (
    partition by class_id, lower(user_email)
    order by (status = 'active') desc, created_at desc nulls last, id
  ) as row_num
  from public.enrollments
)
delete from public.enrollments e using ranked r
where e.id = r.id and r.row_num > 1;

create unique index if not exists enrollments_class_user_unique
  on public.enrollments (class_id, lower(user_email));

create table if not exists public.class_checkout_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  class_ids jsonb not null check (jsonb_typeof(class_ids) = 'array' and jsonb_array_length(class_ids) > 0),
  user_email text not null,
  user_name text not null,
  amount_idr bigint not null check (amount_idr > 0),
  payment_method text not null default 'QRIS',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'canceled')),
  snap_token text,
  redirect_url text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists class_checkout_orders_user_created_idx
  on public.class_checkout_orders (lower(user_email), created_at desc);
alter table public.class_checkout_orders enable row level security;
