create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_email text,
  action text not null check (action in ('add', 'update', 'delete')),
  details text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_desc_idx
  on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "IT managers can view audit logs" on public.audit_logs;
create policy "IT managers can view audit logs"
  on public.audit_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'it_manager'
    )
  );
