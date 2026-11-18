-- Hustly MVP — migration 001: schema
-- hustly_* namespaced tables on the shared Supabase project (ref vtappsupjgsuzhemypkq).
-- UUID PKs, created_at/updated_at, explicit FKs. No live DB touched by the build.
-- Verification evidence lives in the PRIVATE bucket hustly-verification
-- (created in the Supabase dashboard / storage migration); rows + audit
-- entries are RETAINED for safety/audit, never public.

create extension if not exists "pgcrypto";

create table if not exists public.hustly_universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.hustly_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text not null,
  avatar_url text,
  bio text,
  university_id uuid references public.hustly_universities(id),
  faculty text,
  department text,
  academic_level text,
  account_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hustly_email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  resend_after timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hustly_student_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending_manual_review',
  document_path text,
  selfie_path text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id),
  decision_reason text,
  review_due_at timestamptz
);

create table if not exists public.hustly_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.hustly_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade,
  university_id uuid references public.hustly_universities(id),
  category_id uuid references public.hustly_categories(id),
  title text not null,
  description text not null,
  price_min numeric not null default 0,
  price_max numeric,
  availability text,
  delivery_estimate text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hustly_listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.hustly_listings(id) on delete cascade,
  media_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.hustly_job_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.hustly_listings(id) on delete cascade,
  buyer_id uuid references auth.users(id) on delete cascade,
  seller_id uuid references auth.users(id) on delete cascade,
  university_id uuid references public.hustly_universities(id),
  task_description text not null,
  proposed_price numeric not null default 0,
  deadline date,
  status text not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hustly_job_agreements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.hustly_job_requests(id) on delete cascade,
  agreed_scope text,
  agreed_total numeric,
  upfront_cap_percent integer not null default 50,
  agreed_at timestamptz,
  accepted_by_buyer_at timestamptz,
  accepted_by_seller_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hustly_conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.hustly_job_requests(id) on delete cascade,
  listing_id uuid references public.hustly_listings(id) on delete cascade,
  university_id uuid references public.hustly_universities(id),
  created_at timestamptz not null default now()
);

create table if not exists public.hustly_conversation_members (
  conversation_id uuid references public.hustly_conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.hustly_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.hustly_conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  body text not null,
  attachment_path text,
  moderation_status text not null default 'ok',
  created_at timestamptz not null default now()
);

create table if not exists public.hustly_contact_reveal_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.hustly_conversations(id) on delete cascade,
  job_id uuid references public.hustly_job_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  warning_version text not null default 'v1'
);

create table if not exists public.hustly_job_completion_confirmations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.hustly_job_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  confirmation_type text not null,
  confirmed_at timestamptz not null default now(),
  unique (job_id, user_id, confirmation_type)
);

create table if not exists public.hustly_reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.hustly_job_requests(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete cascade,
  reviewee_id uuid references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (job_id, reviewer_id)
);

create table if not exists public.hustly_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  listing_id uuid references public.hustly_listings(id) on delete cascade,
  job_id uuid references public.hustly_job_requests(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.hustly_blocks (
  blocker_id uuid references auth.users(id) on delete cascade,
  blocked_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.hustly_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.hustly_admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  target_type text,
  target_id uuid,
  reason text,
  metadata_redacted jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hustly_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_listings_university on public.hustly_listings(university_id, status);
create index if not exists idx_listings_category on public.hustly_listings(category_id);
create index if not exists idx_jobs_buyer on public.hustly_job_requests(buyer_id);
create index if not exists idx_jobs_seller on public.hustly_job_requests(seller_id);
create index if not exists idx_messages_conv on public.hustly_messages(conversation_id, created_at);
create index if not exists idx_verifications_status on public.hustly_student_verifications(status, submitted_at);
create index if not exists idx_reports_status on public.hustly_reports(status, created_at);
