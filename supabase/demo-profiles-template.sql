-- Demo profile and shift assignment template.
-- Create these users in Supabase Auth first, then replace every UUID below
-- with the matching Authentication > Users UUID before running this file.

insert into public.profiles (id, display_name, badge_number, role, supervisor_id)
values
  ('00000000-0000-0000-0000-000000000101', 'Sgt. Elena Rivera', 'S-104', 'supervisor', null),
  ('00000000-0000-0000-0000-000000000102', 'Sgt. Marcus Chen', 'S-118', 'supervisor', null),
  ('00000000-0000-0000-0000-000000000201', 'Officer Jordan Lee', 'P-221', 'officer', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000202', 'Officer Maya Alvarez', 'P-237', 'officer', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000203', 'Officer Dana Price', 'P-244', 'officer', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000204', 'Officer Sam Patel', 'P-258', 'officer', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000205', 'Officer Chris Morgan', 'P-263', 'officer', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000206', 'Officer Taylor Brooks', 'P-279', 'officer', '00000000-0000-0000-0000-000000000102');

insert into public.shift_assignments (officer_id, shift, starts_at, ends_at)
values
  ('00000000-0000-0000-0000-000000000201', 'A', time '06:00', time '18:00'),
  ('00000000-0000-0000-0000-000000000202', 'B', time '06:00', time '18:00'),
  ('00000000-0000-0000-0000-000000000203', 'C', time '18:00', time '06:00'),
  ('00000000-0000-0000-0000-000000000204', 'D', time '18:00', time '06:00'),
  ('00000000-0000-0000-0000-000000000205', 'A', time '06:00', time '18:00'),
  ('00000000-0000-0000-0000-000000000206', 'C', time '18:00', time '06:00');
