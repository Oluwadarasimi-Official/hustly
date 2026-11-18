-- Hustly — migration 003: store the student's typed verification fields on
-- the verification row itself.
--
-- Root cause of the admin blind spot: hustly_student_verifications only
-- stored document_path / selfie_path / status / timestamps. The name,
-- university, faculty, department and level the student typed only survived
-- inside an audit-log reason string, so the admin queue could only show
-- "Student submission" + a raw timestamp and had no way to show who
-- submitted what. New submissions now store the fields here; the queue API
-- falls back to parsing the audit-log string for rows created before this
-- migration. RLS is already enabled on this table (migration 002); no new
-- grants or policies — the columns are readable only through the existing
-- server-side admin path, never by other users.

alter table public.hustly_student_verifications
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists university text,
  add column if not exists faculty text,
  add column if not exists department text,
  add column if not exists academic_level text;
