import {
  Building,
  Droplet,
  Factory,
  Globe,
  GraduationCap,
  Hospital,
  Landmark,
  Pickaxe,
  TrendingUp,
  Trees,
  Truck,
  Wheat,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export interface SectorConfig {
  nameAr: string
  nameEn: string
  icon: LucideIcon
  color: string
  description: string
}

export const sectorConfig = {
  agriculture: {
    nameAr: 'الزراعة والأراضي',
    nameEn: 'Agriculture & Land',
    icon: Wheat,
    color: '#10B981',
    description: 'إدارة الأراضي الزراعية وفرص الإنتاج والاستثمار الزراعي في بلديات الجنوب.',
  },
  minerals: {
    nameAr: 'المعادن والموارد الطبيعية',
    nameEn: 'Minerals & Natural Resources',
    icon: Pickaxe,
    color: '#F59E0B',
    description: 'متابعة الموارد الطبيعية ومواقعها وحالة الاستكشاف والتصنيف.',
  },
  investment: {
    nameAr: 'الاستثمار',
    nameEn: 'Investment',
    icon: TrendingUp,
    color: '#2563EB',
    description: 'استعراض الفرص الاستثمارية ومبادرات التنمية والشراكات.',
  },
  urban: {
    nameAr: 'التنمية العمرانية',
    nameEn: 'Urban Development',
    icon: Building,
    color: '#8B5CF6',
    description: 'متابعة مشروعات الإعمار والبنية التحتية والمرافق العامة.',
  },
  water: {
    nameAr: 'المياه',
    nameEn: 'Water',
    icon: Droplet,
    color: '#06B6D4',
    description: 'مشروعات المياه وإدارة الموارد والإمداد المائي.',
  },
  energy: {
    nameAr: 'الطاقة',
    nameEn: 'Energy',
    icon: Zap,
    color: '#EAB308',
    description: 'مشروعات الطاقة والإمداد والتحول إلى مصادر مستدامة.',
  },
  tourism: {
    nameAr: 'السياحة',
    nameEn: 'Tourism',
    icon: Landmark,
    color: '#14B8A6',
    description: 'تنمية المواقع السياحية والتراثية وفتح آفاق الاستثمار فيها.',
  },
  industry: {
    nameAr: 'الصناعة',
    nameEn: 'Industry',
    icon: Factory,
    color: '#F97316',
    description: 'تطوير القاعدة الصناعية وسلاسل الإنتاج المحلية.',
  },
  transport: {
    nameAr: 'النقل',
    nameEn: 'Transport',
    icon: Truck,
    color: '#0EA5E9',
    description: 'تعزيز الربط والتنقل والخدمات اللوجستية بين مناطق الجنوب.',
  },
  health: {
    nameAr: 'الصحة',
    nameEn: 'Health',
    icon: Hospital,
    color: '#F43F5E',
    description: 'تطوير مرافق الرعاية الصحية والخدمات الطبية.',
  },
  education: {
    nameAr: 'التعليم',
    nameEn: 'Education',
    icon: GraduationCap,
    color: '#A855F7',
    description: 'دعم المؤسسات التعليمية وتحسين الوصول إلى التعليم.',
  },
  communications: {
    nameAr: 'الاتصالات',
    nameEn: 'Communications',
    icon: Globe,
    color: '#6366F1',
    description: 'توسيع البنية الرقمية والاتصال في مدن وقرى الجنوب.',
  },
  environment: {
    nameAr: 'البيئة',
    nameEn: 'Environment',
    icon: Trees,
    color: '#22C55E',
    description: 'حماية النظم البيئية وتعزيز الاستدامة والغطاء النباتي.',
  },
} satisfies Record<string, SectorConfig>

export type SectorKey = keyof typeof sectorConfig
