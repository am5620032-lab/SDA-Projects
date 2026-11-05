create table if not exists public.agricultural_lands (
  id uuid primary key default gen_random_uuid(),
  land_name text not null,
  area_size numeric(14, 2) not null default 0,
  soil_type text,
  water_source text,
  status text not null default 'صالحة',
  municipality text not null,
  coordinates text,
  is_available_for_investment boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.agricultural_lands
  add column if not exists coordinates text;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null,
  contractor_name text not null,
  project_id uuid references public.development_projects(id) on delete set null,
  value numeric(18, 2) not null default 0,
  start_date date,
  end_date date,
  status text not null default 'مسودة',
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  citizen_name text not null,
  phone text,
  complaint_type text not null,
  description text not null,
  status text not null default 'جديدة',
  created_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sector text not null,
  estimated_cost numeric(18, 2) not null default 0,
  status text not null default 'مقترح',
  description text,
  created_at timestamptz not null default now()
);

create index if not exists contracts_project_id_idx
  on public.contracts (project_id);
create index if not exists complaints_status_created_at_idx
  on public.complaints (status, created_at desc);
create index if not exists investments_sector_status_idx
  on public.investments (sector, status);

alter table public.agricultural_lands enable row level security;
alter table public.contracts enable row level security;
alter table public.complaints enable row level security;
alter table public.investments enable row level security;

notify pgrst, 'reload schema';
