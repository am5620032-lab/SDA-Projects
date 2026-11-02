drop policy if exists "Allow authorized roles to insert employees"
  on public.employees;

create policy "Allow authorized roles to insert employees"
  on public.employees
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in (
          'president',
          'vice_president',
          'admin_manager',
          'it_manager'
        )
    )
  );
