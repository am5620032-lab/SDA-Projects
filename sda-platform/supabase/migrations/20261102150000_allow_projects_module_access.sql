alter table public.module_access
  drop constraint if exists module_access_module_name_check;

alter table public.module_access
  add constraint module_access_module_name_check
  check (module_name in ('archive', 'hr', 'projects'));
