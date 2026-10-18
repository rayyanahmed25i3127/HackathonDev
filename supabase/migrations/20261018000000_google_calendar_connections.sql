create table if not exists public.google_calendar_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  scope text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_id)
);

alter table public.google_calendar_connections enable row level security;

-- Access is intentionally server-only through the service-role client.
revoke all on public.google_calendar_connections from anon, authenticated;
