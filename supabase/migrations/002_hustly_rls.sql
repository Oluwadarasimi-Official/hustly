-- Hustly MVP — migration 002: RLS, deny-by-default.
-- Every table gets RLS enabled. Policies are narrowly scoped:
--  * users edit only their own permitted profile fields
--  * listings are visible only within the same university
--  * only conversation members can read messages
--  * only job participants can update their job
--  * only eligible participants can confirm completion / review
--  * verification documents are never readable by other users
--  * admin role is never self-assignable (only an existing admin can grant it)
-- Storage bucket hustly-verification must be PRIVATE (no public read).
-- Admin review uses server-authorized short-lived signed URLs only.

alter table public.hustly_universities enable row level security;
alter table public.hustly_profiles enable row level security;
alter table public.hustly_email_verifications enable row level security;
alter table public.hustly_student_verifications enable row level security;
alter table public.hustly_categories enable row level security;
alter table public.hustly_listings enable row level security;
alter table public.hustly_listing_media enable row level security;
alter table public.hustly_job_requests enable row level security;
alter table public.hustly_job_agreements enable row level security;
alter table public.hustly_conversations enable row level security;
alter table public.hustly_conversation_members enable row level security;
alter table public.hustly_messages enable row level security;
alter table public.hustly_contact_reveal_acknowledgements enable row level security;
alter table public.hustly_job_completion_confirmations enable row level security;
alter table public.hustly_reviews enable row level security;
alter table public.hustly_reports enable row level security;
alter table public.hustly_blocks enable row level security;
alter table public.hustly_admin_roles enable row level security;
alter table public.hustly_admin_audit_logs enable row level security;
alter table public.hustly_notifications enable row level security;

-- Helper: is the caller an admin?
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from public.hustly_admin_roles where user_id = auth.uid());
$$;

-- Universities & categories: readable by anyone signed in; writable by admins only.
create policy "universities readable" on public.hustly_universities for select using (true);
create policy "universities admin write" on public.hustly_universities for all using (public.is_admin());
create policy "categories readable" on public.hustly_categories for select using (true);
create policy "categories admin write" on public.hustly_categories for all using (public.is_admin());

-- Profiles: a user reads their own full row; anyone signed in reads only the
-- public-safe columns via the app layer. Users update only their own row.
create policy "profiles own read" on public.hustly_profiles for select using (id = auth.uid());
create policy "profiles own update" on public.hustly_profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles own insert" on public.hustly_profiles for insert with check (id = auth.uid());

-- Email verifications: owner only.
create policy "otp own" on public.hustly_email_verifications for all using (user_id = auth.uid());

-- Student verifications: owner sees their own status only; admins see all.
-- No other user can read another user's documents or status.
create policy "verification own read" on public.hustly_student_verifications for select using (user_id = auth.uid() or public.is_admin());
create policy "verification own insert" on public.hustly_student_verifications for insert with check (user_id = auth.uid());
create policy "verification admin update" on public.hustly_student_verifications for update using (public.is_admin());

-- Listings: visible only to signed-in users whose profile university matches
-- the listing's university (enforced in the app query + RLS). Sellers manage
-- their own listings; admins can moderate any listing.
create policy "listings same university read" on public.hustly_listings for select using (
  exists (select 1 from public.hustly_profiles p where p.id = auth.uid() and p.university_id = hustly_listings.university_id)
  or public.is_admin()
);
create policy "listings seller insert" on public.hustly_listings for insert with check (seller_id = auth.uid());
create policy "listings seller update" on public.hustly_listings for update using (seller_id = auth.uid() or public.is_admin());

-- Job requests: only buyer or seller can read/update their job.
create policy "jobs participants read" on public.hustly_job_requests for select using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());
create policy "jobs buyer insert" on public.hustly_job_requests for insert with check (buyer_id = auth.uid());
create policy "jobs participants update" on public.hustly_job_requests for update using (buyer_id = auth.uid() or seller_id = auth.uid());

-- Job agreements: participants only.
create policy "agreements participants" on public.hustly_job_agreements for select using (
  exists (select 1 from public.hustly_job_requests j where j.id = hustly_job_agreements.job_id and (j.buyer_id = auth.uid() or j.seller_id = auth.uid()))
);

-- Conversations / members / messages: members only.
create policy "conversations members" on public.hustly_conversations for select using (
  exists (select 1 from public.hustly_conversation_members m where m.conversation_id = hustly_conversations.id and m.user_id = auth.uid())
);
create policy "members own" on public.hustly_conversation_members for select using (user_id = auth.uid());
create policy "messages members" on public.hustly_messages for select using (
  exists (select 1 from public.hustly_conversation_members m where m.conversation_id = hustly_messages.conversation_id and m.user_id = auth.uid())
);
create policy "messages members insert" on public.hustly_messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from public.hustly_conversation_members m where m.conversation_id = hustly_messages.conversation_id and m.user_id = auth.uid())
);

-- Contact reveal acknowledgements: owner + admin only.
create policy "reveal own" on public.hustly_contact_reveal_acknowledgements for select using (user_id = auth.uid() or public.is_admin());
create policy "reveal own insert" on public.hustly_contact_reveal_acknowledgements for insert with check (user_id = auth.uid());

-- Completion confirmations: job participants only; one per job/user/type (unique index).
create policy "confirmations participants" on public.hustly_job_completion_confirmations for all using (
  exists (select 1 from public.hustly_job_requests j where j.id = hustly_job_completion_confirmations.job_id and (j.buyer_id = auth.uid() or j.seller_id = auth.uid()))
);

-- Reviews: readable by participants; insert only by the reviewer (eligibility
-- is enforced again in the API route: mutual completion + one per job).
create policy "reviews participants read" on public.hustly_reviews for select using (reviewer_id = auth.uid() or reviewee_id = auth.uid() or public.is_admin());
create policy "reviews reviewer insert" on public.hustly_reviews for insert with check (reviewer_id = auth.uid());

-- Reports: reporter + admin only. Blocks: blocker only.
create policy "reports reporter" on public.hustly_reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports reporter insert" on public.hustly_reports for insert with check (reporter_id = auth.uid());
create policy "reports admin update" on public.hustly_reports for update using (public.is_admin());
create policy "blocks own" on public.hustly_blocks for all using (blocker_id = auth.uid());

-- Admin roles: readable by admins; grantable only by an existing admin.
create policy "admin roles admin read" on public.hustly_admin_roles for select using (public.is_admin());
create policy "admin roles admin insert" on public.hustly_admin_roles for insert with check (public.is_admin());

-- Audit logs: admins only.
create policy "audit admin" on public.hustly_admin_audit_logs for select using (public.is_admin());

-- Notifications: owner only.
create policy "notifications own" on public.hustly_notifications for all using (user_id = auth.uid());

-- Grants for the new tables (Supabase no longer auto-grants Data API access).
grant select on public.hustly_universities to anon, authenticated;
grant select on public.hustly_categories to anon, authenticated;
grant select, insert, update, delete on public.hustly_profiles to authenticated;
grant select, insert, update, delete on public.hustly_email_verifications to authenticated;
grant select, insert, update, delete on public.hustly_student_verifications to authenticated;
grant select, insert, update, delete on public.hustly_listings to authenticated;
grant select, insert, update, delete on public.hustly_listing_media to authenticated;
grant select, insert, update, delete on public.hustly_job_requests to authenticated;
grant select, insert, update, delete on public.hustly_job_agreements to authenticated;
grant select, insert, update, delete on public.hustly_conversations to authenticated;
grant select, insert, update, delete on public.hustly_conversation_members to authenticated;
grant select, insert, update, delete on public.hustly_messages to authenticated;
grant select, insert, update, delete on public.hustly_contact_reveal_acknowledgements to authenticated;
grant select, insert, update, delete on public.hustly_job_completion_confirmations to authenticated;
grant select, insert, update, delete on public.hustly_reviews to authenticated;
grant select, insert, update, delete on public.hustly_reports to authenticated;
grant select, insert, update, delete on public.hustly_blocks to authenticated;
grant select, insert, update, delete on public.hustly_admin_roles to authenticated;
grant select, insert, update, delete on public.hustly_admin_audit_logs to authenticated;
grant select, insert, update, delete on public.hustly_notifications to authenticated;
grant select, insert, update, delete on public.hustly_universities to service_role;
grant select, insert, update, delete on public.hustly_categories to service_role;
grant select, insert, update, delete on public.hustly_profiles to service_role;
grant select, insert, update, delete on public.hustly_email_verifications to service_role;
grant select, insert, update, delete on public.hustly_student_verifications to service_role;
grant select, insert, update, delete on public.hustly_listings to service_role;
grant select, insert, update, delete on public.hustly_listing_media to service_role;
grant select, insert, update, delete on public.hustly_job_requests to service_role;
grant select, insert, update, delete on public.hustly_job_agreements to service_role;
grant select, insert, update, delete on public.hustly_conversations to service_role;
grant select, insert, update, delete on public.hustly_conversation_members to service_role;
grant select, insert, update, delete on public.hustly_messages to service_role;
grant select, insert, update, delete on public.hustly_contact_reveal_acknowledgements to service_role;
grant select, insert, update, delete on public.hustly_job_completion_confirmations to service_role;
grant select, insert, update, delete on public.hustly_reviews to service_role;
grant select, insert, update, delete on public.hustly_reports to service_role;
grant select, insert, update, delete on public.hustly_blocks to service_role;
grant select, insert, update, delete on public.hustly_admin_roles to service_role;
grant select, insert, update, delete on public.hustly_admin_audit_logs to service_role;
grant select, insert, update, delete on public.hustly_notifications to service_role;

-- Explicit Data API grants for the shared project (Supabase no longer
-- auto-grants new tables). RLS still governs every row; anon has no
-- auth.uid(), so only the public-read policies can return rows to anon.
grant select on public.hustly_profiles to anon;
grant select on public.hustly_universities to anon;
grant select on public.hustly_email_verifications to anon;
grant select on public.hustly_student_verifications to anon;
grant select on public.hustly_categories to anon;
grant select on public.hustly_listings to anon;
grant select on public.hustly_listing_media to anon;
grant select on public.hustly_job_requests to anon;
grant select on public.hustly_job_agreements to anon;
grant select on public.hustly_conversations to anon;
grant select on public.hustly_conversation_members to anon;
grant select on public.hustly_messages to anon;
grant select on public.hustly_contact_reveal_acknowledgements to anon;
grant select on public.hustly_job_completion_confirmations to anon;
grant select on public.hustly_reviews to anon;
grant select on public.hustly_reports to anon;
grant select on public.hustly_blocks to anon;
grant select on public.hustly_admin_roles to anon;
grant select on public.hustly_admin_audit_logs to anon;
grant select on public.hustly_notifications to anon;
grant select, insert, update, delete on public.hustly_profiles to authenticated, service_role;
grant select, insert, update, delete on public.hustly_universities to authenticated, service_role;
grant select, insert, update, delete on public.hustly_email_verifications to authenticated, service_role;
grant select, insert, update, delete on public.hustly_student_verifications to authenticated, service_role;
grant select, insert, update, delete on public.hustly_categories to authenticated, service_role;
grant select, insert, update, delete on public.hustly_listings to authenticated, service_role;
grant select, insert, update, delete on public.hustly_listing_media to authenticated, service_role;
grant select, insert, update, delete on public.hustly_job_requests to authenticated, service_role;
grant select, insert, update, delete on public.hustly_job_agreements to authenticated, service_role;
grant select, insert, update, delete on public.hustly_conversations to authenticated, service_role;
grant select, insert, update, delete on public.hustly_conversation_members to authenticated, service_role;
grant select, insert, update, delete on public.hustly_messages to authenticated, service_role;
grant select, insert, update, delete on public.hustly_contact_reveal_acknowledgements to authenticated, service_role;
grant select, insert, update, delete on public.hustly_job_completion_confirmations to authenticated, service_role;
grant select, insert, update, delete on public.hustly_reviews to authenticated, service_role;
grant select, insert, update, delete on public.hustly_reports to authenticated, service_role;
grant select, insert, update, delete on public.hustly_blocks to authenticated, service_role;
grant select, insert, update, delete on public.hustly_admin_roles to authenticated, service_role;
grant select, insert, update, delete on public.hustly_admin_audit_logs to authenticated, service_role;
grant select, insert, update, delete on public.hustly_notifications to authenticated, service_role;
