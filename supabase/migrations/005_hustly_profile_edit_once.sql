-- 005: One-time profile edit + public avatar bucket.
-- A user may edit their profile ONLY ONCE, ever: name + profile picture.
-- profile_edit_used is set the first time a profile edit is saved and the
-- server refuses any further edit. University and all verification
-- details (university, faculty, department, level, ID card, selfie) are
-- NEVER editable through profile editing and live nowhere in this flow.
alter table public.hustly_profiles
  add column if not exists profile_edit_used boolean not null default false;

-- Public bucket for profile pictures (avatars are public by design —
-- unlike verification evidence in the private hustly-verification bucket).
insert into storage.buckets (id, name, public)
values ('hustly-avatars', 'hustly-avatars', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public read for hustly-avatars'
  ) then
    create policy "Public read for hustly-avatars"
      on storage.objects for select
      using (bucket_id = 'hustly-avatars');
  end if;
end $$;
