-- Run this on an existing Agency Shift Tracker database after pulling app updates.
-- Do not rerun schema.sql on an existing database unless you intend to rebuild it.

drop policy if exists "Open swap requests visible to authenticated officers"
on public.shift_swap_requests;

create policy "Open swap requests visible to authenticated officers"
on public.shift_swap_requests for select
to authenticated
using (
  status = 'Open'
  or requesting_officer_id = auth.uid()
  or accepting_officer_id = auth.uid()
  or public.is_admin()
  or public.is_supervisor_for(requesting_officer_id)
  or public.is_supervisor_for(accepting_officer_id)
);

drop policy if exists "Involved officers and supervisors update swap requests"
on public.shift_swap_requests;

create policy "Involved officers and supervisors update swap requests"
on public.shift_swap_requests for update
to authenticated
using (
  status = 'Open'
  or requesting_officer_id = auth.uid()
  or accepting_officer_id = auth.uid()
  or public.is_admin()
  or public.is_supervisor_for(requesting_officer_id)
  or public.is_supervisor_for(accepting_officer_id)
)
with check (
  requesting_officer_id = auth.uid()
  or accepting_officer_id = auth.uid()
  or public.is_admin()
  or public.is_supervisor_for(requesting_officer_id)
  or public.is_supervisor_for(accepting_officer_id)
);

drop policy if exists "Supervisors create court events for assigned officers"
on public.traffic_court_events;

drop policy if exists "Supervisors update court events for assigned officers"
on public.traffic_court_events;

create policy "Supervisors create court events for assigned officers"
on public.traffic_court_events for insert
to authenticated
with check (public.is_supervisor_for(officer_id));

create policy "Supervisors update court events for assigned officers"
on public.traffic_court_events for update
to authenticated
using (public.is_supervisor_for(officer_id))
with check (public.is_supervisor_for(officer_id));

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

drop policy if exists "Supervisors and admins read activity logs"
on public.activity_logs;

drop policy if exists "Authenticated users create activity logs"
on public.activity_logs;

create policy "Supervisors and admins read activity logs"
on public.activity_logs for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'supervisor'
  )
);

create policy "Authenticated users create activity logs"
on public.activity_logs for insert
to authenticated
with check (actor_id = auth.uid());
