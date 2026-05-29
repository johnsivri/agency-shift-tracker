# Security Notes

This app is being prepared for a Supabase-backed multi-user version.

## Security Model

- Supabase Auth should be the source of user identity.
- PostgreSQL Row Level Security must stay enabled on every app table.
- Officers should only read their own court records and their own accepted/requested swaps.
- Open swap requests may be visible to authenticated officers so they can accept them.
- Supervisors should only approve swap requests involving officers assigned to them.
- Admins may manage officer rosters, hidden shift assignments, court imports, and audit review.
- The Supabase anon key is safe to ship to the browser only when RLS policies are correctly enforced.
- Never ship the Supabase service role key to the browser.

## Recommended Supabase Settings

- Require confirmed email for officers and supervisors.
- Disable open public signups once the roster is established.
- Use strong password requirements and MFA for supervisor/admin accounts.
- Keep audit logs for court imports, swap acceptance, approvals, denials, and deletes.
- Store uploaded court documents in a private bucket with access controlled by RLS-backed policies.

See `supabase/schema.sql` for the first-pass database and RLS policy plan.
