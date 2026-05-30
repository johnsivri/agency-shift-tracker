-- Run this if schema.sql was already applied before supervisor court import was added.

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
