-- South Digital Development Platform (منصة الجنوب الرقمية للتنمية والاستثمار)
-- Migration: Complete Sectoral & Operational Upgrade

-- 1. Meetings & Minutes (الاجتماعات ومحاضر الاجتماعات)
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date date not null,
  meeting_time text,
  location text not null,
  chairperson text not null,
  meeting_type text not null default 'عادي' check (meeting_type in ('طارئ', 'عادي', 'استثنائي')),
  status text not null default 'مجدول' check (status in ('مجدول', 'جاري', 'منتهي', 'ملغى')),
  agenda text,
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  decision_text text not null,
  assigned_to text,
  due_date date,
  status text not null default 'قيد التنفيذ' check (status in ('معتمد', 'قيد التنفيذ', 'مكتمل', 'ملغى')),
  created_at timestamptz not null default now()
);


-- 3. Water Resources (الموارد المائية والآبار والسدود)
create table if not exists public.water_resources (
  id uuid primary key default gen_random_uuid(),
  resource_name text not null,
  resource_type text not null default 'بئر' check (resource_type in ('بئر', 'مياه جوفية', 'سد', 'محطة تحلية', 'خزان')),
  municipality text not null,
  location text not null,
  coordinates text,
  depth_meters numeric(10,2) default 0,
  production_capacity numeric(12,2) default 0,
  operational_status text not null default 'يعمل' check (operational_status in ('يعمل', 'يعمل جزئياً', 'متوقف', 'تحت الصيانة')),
  water_quality_analysis text,
  notes text,
  created_at timestamptz not null default now()
);

-- 4. Investor Directory & Feasibility Studies (المستثمرون ودراسات الجدوى)
create table if not exists public.investors (
  id uuid primary key default gen_random_uuid(),
  investor_code text not null unique,
  company_name text not null,
  contact_person text not null,
  nationality text not null default 'ليبي',
  email text not null,
  phone text not null,
  sector_interest text not null,
  commercial_reg_no text,
  investment_tier text not null default 'مبسط' check (investment_tier in ('استراتيجي', 'رئيسي', 'مبسط')),
  status text not null default 'نشط' check (status in ('نشط', 'محتمل', 'معلق')),
  created_at timestamptz not null default now()
);

create table if not exists public.feasibility_studies (
  id uuid primary key default gen_random_uuid(),
  study_code text not null unique,
  title text not null,
  opportunity_id uuid references public.investment_opportunities(id) on delete set null,
  investor_id uuid references public.investors(id) on delete set null,
  sector text not null,
  estimated_cost numeric(18,2) not null default 0,
  expected_roi numeric(5,2) default 0,
  expected_jobs integer default 0,
  study_summary text not null,
  status text not null default 'قيد الدراسة' check (status in ('مسودة', 'قيد الدراسة', 'موافق عليه', 'مرفوض')),
  created_at timestamptz not null default now()

-- 5. Standard Unified Workflow Engine (نظام سير العمل والاعتمادات)
create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  title text not null,
  current_step text not null default 'إنشاء المعاملة',
  status text not null default 'جديدة' check (status in ('جديدة', 'قيد المراجعة', 'محالة', 'موافق عليها', 'مرفوضة', 'معادة للنواقص', 'معتمدة نهائياً', 'قيد التنفيذ', 'مغلقة ومؤرشفة')),
  initiator_id uuid references auth.users(id) on delete set null,
  initiator_name text not null,
  current_assignee_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_history (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  step_name text not null,
  action text not null check (action in ('إنشاء', 'مراجعة', 'إحالة', 'موافقة', 'رفض', 'إعادة للنواقص', 'اعتماد نهائي', 'إغلاق')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  actor_role text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- 6. Central Notifications Center (مركز الإشعارات الشامل)
create table if not exists public.system_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_role text,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  category text not null default 'معاملة' check (category in ('معاملة', 'اعتماد', 'تأخير', 'عقد', 'اجتماع', 'مشروع', 'إجازة', 'أمني')),
  priority text not null default 'عادية' check (priority in ('عاجلة', 'عالية', 'عادية', 'منخفضة')),
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7. IT Support Tickets & Asset Fleet (الدعم الفني والسيارات والآليات)
create table if not exists public.it_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  requester_name text not null,
  department text not null,
  category text not null default 'أجهزة ومعدات' check (category in ('أجهزة ومعدات', 'برمجيات شبكات', 'صلاحيات حسابات', 'صيانة')),
  priority text not null default 'متوسطة' check (priority in ('حرجة', 'عالية', 'متوسطة', 'منخفضة')),
  description text not null,
  status text not null default 'مفتوحة' check (status in ('مفتوحة', 'قيد المعالجة', 'تم الحل', 'مغلقة')),
  assigned_to text,
  created_at timestamptz not null default now()
);

create table if not exists public.fleet_machinery (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null unique,
  name_type text not null,
  plate_number_chassis text,
  municipality_assigned text not null,
  operational_status text not null default 'شغال' check (operational_status in ('شغال', 'تحت الصيانة', 'عاطل', 'مكهن')),
  custodian_name text,
  last_maintenance_date date,
  created_at timestamptz not null default now()
);

-- RLS & Indexes
alter table public.meetings enable row level security;
alter table public.meeting_minutes enable row level security;
alter table public.tasks enable row level security;
alter table public.water_resources enable row level security;
alter table public.investors enable row level security;
alter table public.feasibility_studies enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_history enable row level security;
alter table public.system_notifications enable row level security;
alter table public.it_tickets enable row level security;
alter table public.fleet_machinery enable row level security;

create index if not exists meetings_date_idx on public.meetings(meeting_date desc);
create index if not exists tasks_status_due_idx on public.tasks(status, due_date);
create index if not exists water_res_muni_idx on public.water_resources(municipality);
create index if not exists sys_notif_user_idx on public.system_notifications(recipient_user_id, is_read, created_at desc);
create index if not exists workflows_entity_idx on public.workflows(entity_type, entity_id);

notify pgrst, 'reload schema';

);

-- 2. Tasks & Assignments (المهام والتكليفات ومتابعة القرار)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_number text not null unique,
  title text not null,
  description text not null,
  assigned_to_name text not null,
  assigned_to_id uuid references public.employees(id) on delete set null,
  department text not null,
  priority text not null default 'متوسطة' check (priority in ('عاجل جداً', 'عالية', 'متوسطة', 'منخفضة')),
  status text not null default 'قيد التنفيذ' check (status in ('جديدة', 'قيد التنفيذ', 'قيد المراجعة', 'منجزة', 'متأخرة', 'ملغاة')),
  start_date date not null default current_date,
  due_date date not null,
  completion_percentage numeric(5,2) not null default 0 check (completion_percentage between 0 and 100),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
