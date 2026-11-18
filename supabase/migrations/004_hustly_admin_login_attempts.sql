-- 004: DB-backed brute-force tracking for the admin login.
-- One row per (hashed) client IP. The raw IP is NEVER stored — only a
-- one-way HMAC hash (lib/admin-rate-limit.ts). Service-role only: no
-- anonymous or authenticated user may read or write this table, and RLS
-- is enabled with no policies so even a grant mistake leaks nothing.
create table if not exists public.hustly_admin_login_attempts (
  ip_hash text primary key,
  failures integer not null default 0,
  first_failed_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.hustly_admin_login_attempts enable row level security;

grant select, insert, update, delete on public.hustly_admin_login_attempts to service_role;
