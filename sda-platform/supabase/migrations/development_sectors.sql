create table if not exists public.development_sectors_projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  sector_type text not null
    check (sector_type in ('صحي', 'تعليمي', 'بنية تحتية')),
  location text not null,
  budget numeric(18, 2) not null default 0 check (budget >= 0),
  status text not null default 'مقترح',
  completion_percentage numeric(5, 2) not null default 0
    check (completion_percentage between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.field_visits (
  id uuid primary key default gen_random_uuid(),
  visit_date date not null,
  location text not null,
  purpose text not null,
  findings text not null,
  visitor_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists development_sectors_type_idx
  on public.development_sectors_projects (sector_type, created_at desc);
create index if not exists field_visits_date_idx
  on public.field_visits (visit_date desc);

alter table public.development_sectors_projects enable row level security;
alter table public.field_visits enable row level security;
