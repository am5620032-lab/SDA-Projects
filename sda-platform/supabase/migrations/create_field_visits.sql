create table if not exists public.field_visits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.development_projects(id) on delete set null,
  visit_date date not null,
  team_members text,
  gps_coordinates text,
  notes text,
  violations text,
  recommendations text,
  status text not null default 'مجدولة',
  created_at timestamptz not null default now(),
  location text not null default '',
  purpose text not null default '',
  findings text not null default '',
  visitor_name text not null default 'مستخدم المنظومة'
);

alter table public.field_visits
  add column if not exists project_id uuid,
  add column if not exists team_members text,
  add column if not exists gps_coordinates text,
  add column if not exists notes text,
  add column if not exists violations text,
  add column if not exists recommendations text,
  add column if not exists status text not null default 'مجدولة';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.field_visits'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) like 'FOREIGN KEY (project_id) REFERENCES development_projects%'
  ) then
    alter table public.field_visits
      add constraint field_visits_project_id_fkey
      foreign key (project_id) references public.development_projects(id)
      on delete set null;
  end if;
end;
$$;

alter table public.development_projects
  add column if not exists contractor_company text,
  add column if not exists supervising_entity text,
  add column if not exists engineer_name text,
  add column if not exists planned_completion_percentage numeric(5, 2),
  add column if not exists actual_completion_percentage numeric(5, 2),
  add column if not exists financial_completion_percentage numeric(5, 2),
  add column if not exists delay_reasons text;

create index if not exists field_visits_project_date_idx
  on public.field_visits (project_id, visit_date desc);

alter table public.field_visits enable row level security;

notify pgrst, 'reload schema';
