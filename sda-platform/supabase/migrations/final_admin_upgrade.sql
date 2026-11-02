create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  system_name text not null,
  system_logo_url text,
  contact_email text,
  contact_phone text,
  address text,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (
  id,
  system_name,
  system_logo_url,
  contact_email,
  contact_phone,
  address
)
values (
  '00000000-0000-4000-8000-000000000001',
  'جهاز تنمية وتطوير الجنوب',
  null,
  null,
  null,
  null
)
on conflict (id) do nothing;

alter table public.system_settings enable row level security;

alter table public.audit_logs
  add column if not exists ip_address text;
