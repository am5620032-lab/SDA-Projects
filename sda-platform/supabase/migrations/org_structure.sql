create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  parent_id uuid references public.departments(id),
  manager_id uuid references public.employees(id),
  created_at timestamptz default now()
);

alter table public.employees
  add column if not exists department_id uuid references public.departments(id);

alter table public.employees
  add column if not exists direct_manager_id uuid references public.employees(id);
