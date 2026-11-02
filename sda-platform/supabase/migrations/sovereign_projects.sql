create table if not exists public.development_projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique,
  project_name text not null,
  sector text not null check (sector in ('زراعة', 'تعليم', 'صحة', 'بنية تحتية', 'إعمار')),
  municipality text not null,
  location_details text,
  area_size numeric(14, 2) not null default 0 check (area_size >= 0),
  estimated_budget numeric(18, 2) not null default 0 check (estimated_budget >= 0),
  funding_source text not null,
  priority_level text not null check (priority_level in ('حرجة', 'عالية', 'متوسطة', 'منخفضة')),
  status text not null default 'مقترح'
    check (status in ('مقترح', 'قيد الدراسة', 'متوقف', 'قيد التنفيذ', 'منجز')),
  required_intervention text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists development_projects_sector_idx
  on public.development_projects (sector);
create index if not exists development_projects_municipality_idx
  on public.development_projects (municipality);
create index if not exists development_projects_status_priority_idx
  on public.development_projects (status, priority_level);
create index if not exists development_projects_created_at_idx
  on public.development_projects (created_at desc);

create table if not exists public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.development_projects(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  attachment_type text not null check (attachment_type in ('مخطط', 'دراسة جدوى', 'صور')),
  created_at timestamptz not null default now()
);

create index if not exists project_attachments_project_id_idx
  on public.project_attachments (project_id);

create table if not exists public.project_code_counters (
  code_year integer primary key check (code_year between 2000 and 9999),
  last_sequence bigint not null check (last_sequence > 0)
);

alter table public.development_projects enable row level security;
alter table public.project_attachments enable row level security;
alter table public.project_code_counters enable row level security;

create or replace function public.next_development_project_code(p_year integer)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_sequence bigint;
begin
  if p_year < 2000 or p_year > 9999 then
    raise exception 'Invalid project code year';
  end if;

  insert into public.project_code_counters (code_year, last_sequence)
  values (p_year, 1)
  on conflict (code_year)
  do update set last_sequence = project_code_counters.last_sequence + 1
  returning last_sequence into next_sequence;

  return 'PRJ-' || p_year::text || '-' || lpad(next_sequence::text, 3, '0');
end;
$$;

revoke all on function public.next_development_project_code(integer) from public, anon, authenticated;
grant execute on function public.next_development_project_code(integer) to service_role;
