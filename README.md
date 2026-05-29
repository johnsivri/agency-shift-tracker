# Agency Shift Tracker

A small browser-based tracker for agency shift operations.

## Features

- Hidden patrol shift data for shift swap context
- Fixed A/B/C/D shift assignments
- A and B shifts run 0600-1800
- C and D shifts run 1800-0600
- Traffic court schedule rules for Tuesdays at 1330 and Thursdays at 0900
- Traffic court hours are tracked separately from shift hours
- Court appearance tracking with case numbers, subpoena status, duration, and notes
- Shift swap tracking with a requesting officer, accepting officer, and required approvals
- Swap approval tracking for the requesting officer, requester's supervisor, and accepting officer's supervisor
- Patrol-unit scoped views for each unit's own shifts, court, and swap information
- Open shift swap request sidebar shared across patrol units
- Month and search filters
- Supabase-ready secure access panel
- Mobile card views for court and shift swap records
- Local demo roster with two supervisors and six officers
- CSV export and print view
- Local browser storage

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Add officer, supervisor, and admin users in Supabase Auth.
4. Add matching rows in `public.profiles`.
5. Add your project URL and anon key to `app-config.js`.

### What Step 4 Means

Supabase Auth stores login accounts in `auth.users`. The app stores agency-specific details in `public.profiles`.

Each Auth user needs one matching `public.profiles` row where:

- `id` is the same UUID as the user's `auth.users.id`
- `display_name` is the officer or supervisor name shown in the app
- `role` is `officer`, `supervisor`, or `admin`
- `supervisor_id` points to that officer's supervisor profile, when applicable

Example:

```sql
insert into public.profiles (id, display_name, badge_number, role, supervisor_id)
values
  ('SUPERVISOR-AUTH-USER-ID', 'Sgt. Rivera', 'S-104', 'supervisor', null),
  ('OFFICER-AUTH-USER-ID', 'Officer Jordan Lee', 'P-221', 'officer', 'SUPERVISOR-AUTH-USER-ID');
```

You can find each UUID in Supabase under Authentication > Users.

For test data, `supabase/demo-profiles-template.sql` includes two supervisors and six officers. Replace the placeholder UUIDs with real Auth user UUIDs before running it.

The app will remain in local demo mode until `app-config.js` has Supabase values.

Security notes and RLS expectations are in `SECURITY.md`.

## Run Locally

Open `index.html` directly in a browser, or run:

```bash
node server.mjs
```

Then visit:

```text
http://127.0.0.1:4173
```
