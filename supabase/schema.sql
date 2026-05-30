-- Agency Shift Tracker Supabase schema
-- Run this in the Supabase SQL editor for the project.

create extension if not exists pgcrypto;

create type app_role as enum ('officer', 'supervisor', 'admin');
create type shift_group as enum ('A', 'B', 'C', 'D');
create type approval_status as enum ('Pending', 'Approved', 'Denied');
create type swap_status as enum ('Open', 'Awaiting Approvals', 'Approved', 'Denied');
create type court_status as enum ('Scheduled', 'Appeared', 'Continued', 'Canceled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  badge_number text,
  role app_role not null default 'officer',
  supervisor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  officer_id uuid not null references public.profiles(id) on delete cascade,
  shift shift_group not null,
  starts_at time not null,
  ends_at time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint shift_hours_match check (
    (shift in ('A', 'B') and starts_at = time '06:00' and ends_at = time '18:00')
    or
    (shift in ('C', 'D') and starts_at = time '18:00' and ends_at = time '06:00')
  )
);

create table public.traffic_court_events (
  id uuid primary key default gen_random_uuid(),
  officer_id uuid not null references public.profiles(id) on delete cascade,
  court_date date not null,
  court_time time not null,
  court_hours numeric(4,2) not null default 0,
  citation_number text not null,
  complainant text,
  has_attorney boolean not null default false,
  court_location text,
  status court_status not null default 'Scheduled',
  notes text,
  source_document_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint traffic_court_schedule check (
    (extract(dow from court_date) = 2 and court_time = time '13:30')
    or
    (extract(dow from court_date) = 4 and court_time = time '09:00')
  )
);

create table public.shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  requesting_officer_id uuid not null references public.profiles(id) on delete cascade,
  accepting_officer_id uuid references public.profiles(id) on delete set null,
  give_date date not null,
  give_shift text,
  take_date date,
  take_shift text,
  requesting_officer_approval approval_status not null default 'Pending',
  requester_supervisor_approval approval_status not null default 'Pending',
  accepting_supervisor_approval approval_status not null default 'Pending',
  status swap_status not null default 'Open',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.shift_assignments enable row level security;
alter table public.traffic_court_events enable row level security;
alter table public.shift_swap_requests enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_supervisor_for(officer uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = officer and supervisor_id = auth.uid()
  );
$$;

create policy "Profiles are visible to authenticated users"
on public.profiles for select
to authenticated
using (true);

create policy "Admins manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Officers read their own shift assignment"
on public.shift_assignments for select
to authenticated
using (officer_id = auth.uid() or public.is_admin() or public.is_supervisor_for(officer_id));

create policy "Admins manage shift assignments"
on public.shift_assignments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Officers read own court events"
on public.traffic_court_events for select
to authenticated
using (officer_id = auth.uid() or public.is_admin() or public.is_supervisor_for(officer_id));

create policy "Admins manage court events"
on public.traffic_court_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Supervisors create court events for assigned officers"
on public.traffic_court_events for insert
to authenticated
with check (public.is_supervisor_for(officer_id));

create policy "Supervisors update court events for assigned officers"
on public.traffic_court_events for update
to authenticated
using (public.is_supervisor_for(officer_id))
with check (public.is_supervisor_for(officer_id));

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

create policy "Officers create their own swap requests"
on public.shift_swap_requests for insert
to authenticated
with check (requesting_officer_id = auth.uid());

create policy "Involved officers and supervisors update swap requests"
on public.shift_swap_requests for update
to authenticated
using (
  status = 'Open'
  or
  requesting_officer_id = auth.uid()
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
