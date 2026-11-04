alter table public.development_projects
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7);