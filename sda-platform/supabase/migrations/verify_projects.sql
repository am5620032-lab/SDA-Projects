alter table public.development_projects
  add column if not exists is_verified boolean not null default false,
  add column if not exists verified_by uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz;

create index if not exists development_projects_verified_idx
  on public.development_projects (is_verified);
