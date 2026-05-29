-- Run this if schema.sql was already applied before open swap visibility or acceptance was added.

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
