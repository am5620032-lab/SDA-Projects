create table if not exists public.agricultural_lands (
  id uuid primary key default gen_random_uuid(),
  land_name text not null,
  area_size numeric(14, 2) not null default 0 check (area_size >= 0),
  municipality text not null,
  soil_type text,
  water_source text,
  status text not null default 'صالحة'
    check (status in ('صالحة', 'تحتاج استصلاح')),
  is_available_for_investment boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.mineral_resources (
  id uuid primary key default gen_random_uuid(),
  resource_name text not null,
  location text not null,
  coordinates text,
  area_size numeric(14, 2) not null default 0 check (area_size >= 0),
  exploration_status text not null default 'غير مستكشف',
  classification text not null default 'عادي'
    check (classification in ('سري', 'عادي')),
  created_at timestamptz not null default now()
);

create table if not exists public.investment_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sector text not null,
  description text not null default '',
  estimated_cost numeric(18, 2) not null default 0 check (estimated_cost >= 0),
  target_investor text,
  status text not null default 'متاحة',
  created_at timestamptz not null default now()
);

create table if not exists public.project_tracking (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.development_projects(id) on delete cascade,
  update_date timestamptz not null default now(),
  completion_percentage numeric(5, 2) not null default 0
    check (completion_percentage between 0 and 100),
  contractor_name text,
  delay_reasons text,
  field_photos_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_financials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.development_projects(id) on delete cascade,
  approved_budget numeric(18, 2) not null default 0 check (approved_budget >= 0),
  contract_value numeric(18, 2) not null default 0 check (contract_value >= 0),
  amount_spent numeric(18, 2) not null default 0 check (amount_spent >= 0),
  financial_obligations numeric(18, 2) not null default 0 check (financial_obligations >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.investment_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.investment_opportunities(id) on delete cascade,
  applicant_id uuid references auth.users(id) on delete set null,
  applicant_name text not null,
  applicant_email text not null,
  note text,
  status text not null default 'قيد المراجعة',
  created_at timestamptz not null default now()
);

alter table public.development_projects
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists contractor_name text;

create index if not exists project_tracking_project_date_idx
  on public.project_tracking (project_id, update_date desc);
create index if not exists project_financials_project_idx
  on public.project_financials (project_id);
create index if not exists agricultural_lands_municipality_idx
  on public.agricultural_lands (municipality);

create or replace function public.sync_project_completion_from_tracking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.update_date >= coalesce(
    (select max(update_date) from public.project_tracking where project_id = new.project_id and id <> new.id),
    '-infinity'::timestamptz
  ) then
    update public.development_projects
    set completion_percentage = new.completion_percentage,
        contractor_name = coalesce(new.contractor_name, contractor_name)
    where id = new.project_id;
  end if;
  return new;
end;
$$;

drop trigger if exists project_tracking_sync_completion on public.project_tracking;
create trigger project_tracking_sync_completion
after insert on public.project_tracking
for each row execute function public.sync_project_completion_from_tracking();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-field-photos',
  'project-field-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

alter table public.agricultural_lands enable row level security;
alter table public.mineral_resources enable row level security;
alter table public.investment_opportunities enable row level security;
alter table public.project_tracking enable row level security;
alter table public.project_financials enable row level security;
alter table public.investment_applications enable row level security;
