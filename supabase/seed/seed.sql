-- Hustly seed — clearly marked seed data. Run after migration 001/002.
-- Categories (spec §4) and a first set of Nigerian hustly_universities.
insert into public.hustly_categories (name, slug, sort_order) values
  ('Design & Creative', 'design-creative', 1),
  ('Writing & Editing', 'writing-editing', 2),
  ('Tech & Development', 'tech-development', 3),
  ('Academic Support', 'academic-support', 4),
  ('Photography & Media', 'photography-media', 5),
  ('Repairs & Practical Help', 'repairs-practical', 6),
  ('Business & Marketing', 'business-marketing', 7),
  ('Events', 'events', 8),
  ('Other', 'other', 9)
on conflict (slug) do nothing;

insert into public.hustly_universities (name) values
  ('University of Ilorin'),
  ('University of Lagos'),
  ('University of Ibadan'),
  ('Obafemi Awolowo University'),
  ('University of Nigeria, Nsukka'),
  ('Ahmadu Bello University'),
  ('Lagos State University'),
  ('Kwara State University'),
  ('University of Abuja'),
  ('Federal University of Technology, Akure')
on conflict (name) do nothing;

-- Private storage bucket for verification evidence (run in the Supabase
-- dashboard or via the storage API; bucket must be PRIVATE, no public read):
--   bucket: hustly-verification
--   public: false
-- Admin review uses server-authorized short-lived signed URLs only.
