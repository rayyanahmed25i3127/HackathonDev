-- Review with Person 1 before applying. This does not modify existing jobs or functions.
alter table public.notification_jobs
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by text,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists sent_at timestamptz,
  add column if not exists provider_id text;

create index if not exists notification_jobs_worker_idx
  on public.notification_jobs (status, event_type, next_attempt_at, claimed_at);

create or replace function public.claim_notification_jobs(
  p_worker_id text,
  p_limit integer default 10,
  p_stale_after interval default interval '5 minutes',
  p_max_attempts integer default 5
)
returns setof public.notification_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select j.id
    from public.notification_jobs j
    where j.event_type = 'LEAD_ESCALATED'
      and j.status = 'pending'
      and j.attempts < p_max_attempts
      and j.next_attempt_at <= now()
      and (j.claimed_at is null or j.claimed_at < now() - p_stale_after)
    order by j.created_at
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  )
  update public.notification_jobs j
  set claimed_at = now(), claimed_by = p_worker_id
  from candidates c
  where j.id = c.id
  returning j.*;
end;
$$;

revoke all on function public.claim_notification_jobs(text, integer, interval, integer) from public, anon, authenticated;
