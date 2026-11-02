create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.leaves
  add column if not exists manager_id uuid references public.employees(id);

alter table public.leaves
  add column if not exists manager_notes text;

create index if not exists notifications_employee_created_at_idx
  on public.notifications (employee_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Employees can read their notifications" on public.notifications;
create policy "Employees can read their notifications"
  on public.notifications
  for select
  to authenticated
  using (
    employee_id = nullif(auth.jwt() -> 'app_metadata' ->> 'employee_id', '')::uuid
  );

drop policy if exists "Employees can update their notifications" on public.notifications;
create policy "Employees can update their notifications"
  on public.notifications
  for update
  to authenticated
  using (
    employee_id = nullif(auth.jwt() -> 'app_metadata' ->> 'employee_id', '')::uuid
  )
  with check (
    employee_id = nullif(auth.jwt() -> 'app_metadata' ->> 'employee_id', '')::uuid
  );
