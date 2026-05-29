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
- CSV export and print view
- Local browser storage

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Add officer, supervisor, and admin users in Supabase Auth.
4. Add matching rows in `public.profiles`.
5. Add your project URL and anon key to `app-config.js`.

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
