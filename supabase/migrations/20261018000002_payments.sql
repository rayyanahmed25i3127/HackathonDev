-- Review with Anas before applying. This migration is not executed by this change.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid,
  contact_id uuid,
  amount_paisa integer not null check (amount_paisa between 100 and 100000000),
  currency text not null default 'PKR' check (currency = 'PKR'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  safepay_tracker text unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint payments_linked_record_check check (lead_id is not null or contact_id is not null)
);

create index if not exists payments_workspace_created_idx on public.payments (workspace_id, created_at desc);
create index if not exists payments_workspace_status_idx on public.payments (workspace_id, status);
create index if not exists payments_lead_idx on public.payments (workspace_id, lead_id) where lead_id is not null;
create index if not exists payments_contact_idx on public.payments (workspace_id, contact_id) where contact_id is not null;

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
