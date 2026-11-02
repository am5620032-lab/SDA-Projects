alter table public.employees
  add column if not exists birth_date date,
  add column if not exists birth_place text,
  add column if not exists nationality text,
  add column if not exists social_status text,
  add column if not exists gender text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists category text,
  add column if not exists rank text,
  add column if not exists last_promotion_date date,
  add column if not exists delegation_start_date date,
  add column if not exists delegation_end_date date;

alter table public.departments
  add column if not exists manager_id uuid references public.employees(id);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  asset_name text not null,
  serial_number text,
  status text not null default 'assigned',
  delivered_date date not null default current_date,
  returned_date date,
  created_at timestamptz not null default now()
);

create index if not exists assets_employee_status_idx
  on public.assets (employee_id, status);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists documents_employee_created_idx
  on public.documents (employee_id, created_at desc);

alter table public.assets enable row level security;
alter table public.documents enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-documents',
  'employee-documents',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
