insert into public.departments (name, type, parent_id)
select official.name, official.type, null
from (
  values
    ('مكتب شؤون رئيس الجهاز', 'مكتب'),
    ('مكتب المراجعة الداخلية', 'مكتب'),
    ('مكتب الشؤون القانونية', 'مكتب'),
    ('مكتب التعاون الدولي', 'مكتب'),
    ('مكتب الإعلام والاتصال الحكومي', 'مكتب'),
    ('مكتب تقنية المعلومات', 'مكتب'),
    ('إدارة التنمية والتطوير الحضري', 'إدارة'),
    ('إدارة المشروعات', 'إدارة'),
    ('إدارة الاستثمار', 'إدارة'),
    ('إدارة العقود', 'إدارة'),
    ('إدارة الشؤون الإدارية والموارد البشرية', 'إدارة'),
    ('إدارة الشؤون المالية والمخازن', 'إدارة'),
    ('الفروع والمكاتب', 'مكتب')
) as official(name, type)
where not exists (
  select 1
  from public.departments as existing
  where existing.name = official.name
    and existing.parent_id is null
);
