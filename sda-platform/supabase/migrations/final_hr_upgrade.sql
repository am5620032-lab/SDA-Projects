create table if not exists public.hr_decisions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  decision_type text not null,
  decision_number text not null,
  decision_date date not null,
  details text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists hr_decisions_employee_date_idx
  on public.hr_decisions (employee_id, decision_date desc);

create table if not exists public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  max_days_per_year integer not null check (max_days_per_year >= 0)
);

insert into public.leave_types (name, max_days_per_year)
values
  ('سنوية', 30),
  ('مرضية', 30),
  ('طارئة', 6)
on conflict (name) do nothing;

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null,
  duration_hours numeric(5, 2) not null check (duration_hours > 0 and duration_hours <= 24),
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  manager_id uuid references public.employees(id) on delete set null,
  manager_notes text,
  created_at timestamptz not null default now()
);

create index if not exists permissions_employee_date_idx
  on public.permissions (employee_id, date desc);
create index if not exists permissions_manager_status_idx
  on public.permissions (manager_id, status, created_at desc);

alter table public.leaves
  add column if not exists manager_id uuid references public.employees(id);
alter table public.leaves
  add column if not exists manager_notes text;
alter table public.leaves
  add column if not exists status text not null default 'pending';

alter table public.attendance
  add column if not exists late_minutes integer not null default 0
    check (late_minutes >= 0);

alter table public.hr_decisions enable row level security;
alter table public.leave_types enable row level security;
alter table public.permissions enable row level security;
