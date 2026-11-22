create table if not exists public.auth_email_rate_limits (
  scope text not null check (scope in ('email', 'ip')),
  subject_hash text not null check (length(subject_hash) = 64),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (scope, subject_hash)
);

alter table public.auth_email_rate_limits enable row level security;
revoke all on public.auth_email_rate_limits from anon, authenticated;
grant all on public.auth_email_rate_limits to service_role;
create index if not exists auth_email_rate_limits_window_idx on public.auth_email_rate_limits(window_started_at);

create or replace function public.consume_auth_email_rate_limit(
  p_email_hash text,
  p_ip_hash text,
  p_email_limit integer,
  p_ip_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_time_value timestamptz := clock_timestamp();
  email_count integer;
  ip_count integer;
begin
  if length(p_email_hash) <> 64 or length(p_ip_hash) <> 64
    or p_email_limit < 1 or p_ip_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit parameters';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(least(p_email_hash, p_ip_hash), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(p_email_hash, p_ip_hash), 0));
  delete from public.auth_email_rate_limits
  where window_started_at < current_time_value - interval '2 hours';

  insert into public.auth_email_rate_limits(scope, subject_hash, window_started_at, request_count)
  values ('email', p_email_hash, current_time_value, 1)
  on conflict (scope, subject_hash) do update
    set request_count = case
      when auth_email_rate_limits.window_started_at <= current_time_value - make_interval(secs => p_window_seconds) then 1
      else auth_email_rate_limits.request_count + 1
    end,
    window_started_at = case
      when auth_email_rate_limits.window_started_at <= current_time_value - make_interval(secs => p_window_seconds) then current_time_value
      else auth_email_rate_limits.window_started_at
    end
  returning request_count into email_count;

  insert into public.auth_email_rate_limits(scope, subject_hash, window_started_at, request_count)
  values ('ip', p_ip_hash, current_time_value, 1)
  on conflict (scope, subject_hash) do update
    set request_count = case
      when auth_email_rate_limits.window_started_at <= current_time_value - make_interval(secs => p_window_seconds) then 1
      else auth_email_rate_limits.request_count + 1
    end,
    window_started_at = case
      when auth_email_rate_limits.window_started_at <= current_time_value - make_interval(secs => p_window_seconds) then current_time_value
      else auth_email_rate_limits.window_started_at
    end
  returning request_count into ip_count;

  return email_count <= p_email_limit and ip_count <= p_ip_limit;
end;
$$;

revoke all on function public.consume_auth_email_rate_limit(text, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_auth_email_rate_limit(text, text, integer, integer, integer) to service_role;
