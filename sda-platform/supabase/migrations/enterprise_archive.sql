create table if not exists public.archive_documents (
  id uuid primary key default gen_random_uuid(),
  document_number text not null unique,
  document_name text not null,
  document_type text not null,
  classification text not null,
  employee_id uuid references public.employees(id) on delete set null,
  file_url text not null unique,
  file_type text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists archive_documents_owner_created_idx
  on public.archive_documents (uploaded_by, created_at desc);
create index if not exists archive_documents_type_created_idx
  on public.archive_documents (document_type, created_at desc);
create index if not exists archive_documents_employee_created_idx
  on public.archive_documents (employee_id, created_at desc);
create unique index if not exists archive_documents_file_url_key
  on public.archive_documents (file_url);

alter table public.archive_documents enable row level security;

drop policy if exists "Archive users can view own documents" on public.archive_documents;
create policy "Archive users can view own documents"
  on public.archive_documents
  for select
  to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin_manager', 'it_manager')
    )
  );

drop policy if exists "Archive users can upload own documents" on public.archive_documents;
create policy "Archive users can upload own documents"
  on public.archive_documents
  for insert
  to authenticated
  with check (uploaded_by = auth.uid());

drop policy if exists "Archive managers can review documents" on public.archive_documents;
create policy "Archive managers can review documents"
  on public.archive_documents
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin_manager', 'it_manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin_manager', 'it_manager')
    )
  );

drop policy if exists "Archive users can delete own pending documents" on public.archive_documents;
create policy "Archive users can delete own pending documents"
  on public.archive_documents
  for delete
  to authenticated
  using (
    (uploaded_by = auth.uid() and status = 'pending')
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin_manager', 'it_manager')
    )
  );

create table if not exists public.archive_document_counters (
  document_type text not null,
  document_year integer not null,
  last_sequence bigint not null check (last_sequence > 0),
  primary key (document_type, document_year)
);
alter table public.archive_document_counters enable row level security;

create or replace function public.next_archive_document_number(
  p_document_type text,
  p_document_year integer
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_sequence bigint;
begin
  if p_document_type !~ '^[A-Z0-9]{2,8}$'
    or p_document_year < 2000
    or p_document_year > 9999 then
    raise exception 'Invalid archive document number parameters';
  end if;

  insert into public.archive_document_counters (document_type, document_year, last_sequence)
  values (
    p_document_type,
    p_document_year,
    (
      select count(*) + 1
      from public.archive_documents
      where document_number like p_document_type || '-' || p_document_year::text || '-%'
    )
  )
  on conflict (document_type, document_year)
  do update set last_sequence = archive_document_counters.last_sequence + 1
  returning last_sequence into next_sequence;

  return p_document_type || '-' || p_document_year::text || '-' || lpad(next_sequence::text, 3, '0');
end;
$$;

revoke all on function public.next_archive_document_number(text, integer) from public, anon, authenticated;
grant execute on function public.next_archive_document_number(text, integer) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'archive_files',
  'archive_files',
  false,
  15728640,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
