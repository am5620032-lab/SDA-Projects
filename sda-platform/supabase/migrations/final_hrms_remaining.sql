create table if not exists public.penalties (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  violation_type text not null,
  description text not null,
  decision_number text not null,
  decision_date date not null,
  penalty_type text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists penalties_employee_date_idx
  on public.penalties (employee_id, decision_date desc);

create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  course_name text not null,
  provider text,
  start_date date not null,
  end_date date,
  certificate_url text,
  notes text,
  created_at timestamptz not null default now(),
  constraint trainings_date_range check (end_date is null or end_date >= start_date)
);

create index if not exists trainings_employee_date_idx
  on public.trainings (employee_id, start_date desc);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  year integer not null check (year between 1900 and 9999),
  evaluator_id uuid references public.employees(id) on delete set null,
  score numeric(5, 2) not null check (score between 0 and 100),
  notes text,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_at timestamptz not null default now()
);

create index if not exists evaluations_employee_year_idx
  on public.evaluations (employee_id, year desc, created_at desc);

create table if not exists public.clearances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  request_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'cleared')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists clearances_employee_date_idx
  on public.clearances (employee_id, request_date desc);

create table if not exists public.correspondences (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('incoming', 'outgoing')),
  reference_number text not null,
  subject text not null,
  date date not null,
  related_employee_id uuid references public.employees(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists correspondences_date_idx
  on public.correspondences (date desc);

alter table public.penalties enable row level security;
alter table public.trainings enable row level security;
alter table public.evaluations enable row level security;
alter table public.clearances enable row level security;
alter table public.correspondences enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-training-certificates',
  'employee-training-certificates',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
