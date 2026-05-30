-- Run this if schema.sql was already applied before activity logging was added.

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  record_type text not null check (record_type in ('court', 'swap')),
  record_id uuid,
  action text not null,
  summary text,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

drop policy if exists "Authenticated users read activity logs"
on public.activity_logs;

drop policy if exists "Authenticated users create activity logs"
on public.activity_logs;

create policy "Authenticated users read activity logs"
on public.activity_logs for select
to authenticated
using (true);

create policy "Authenticated users create activity logs"
on public.activity_logs for insert
to authenticated
with check (actor_id = auth.uid());
