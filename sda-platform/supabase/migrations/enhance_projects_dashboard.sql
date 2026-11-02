alter table public.development_projects
  add column if not exists completion_percentage numeric(5, 2) not null default 0
    check (completion_percentage between 0 and 100);
