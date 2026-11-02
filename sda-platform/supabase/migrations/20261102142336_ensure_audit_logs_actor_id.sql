alter table public.audit_logs
  add column if not exists actor_id uuid references auth.users(id) on delete set null;

notify pgrst, 'reload schema';
