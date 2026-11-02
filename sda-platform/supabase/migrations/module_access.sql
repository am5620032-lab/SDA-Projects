create table if not exists public.module_access (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  module_name text not null check (module_name in ('archive', 'hr')),
  username text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.module_access enable row level security;
