'use client'

import {
  Archive,
  Banknote,
  Building,
  Building2,
  CalendarDays,
  ClipboardCheck,
  DatabaseBackup,
  FileArchive,
  FileCheck2,
  FileText,
  Globe2,
  GraduationCap,
  HeartPulse,
  Home,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Mountain,
  Plane,
  Scale,
  Sprout,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logoutFromPlatform } from '@/app/actions/logout'

function NavigationLink({
  href,
  children,
  onClick,
  active,
  dark,
}: {
  href: string
  children: React.ReactNode
  onClick?: () => void
  active: boolean
  dark: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-300 ${active ? dark ? 'bg-emerald-300/15 font-bold text-emerald-200 shadow-sm shadow-emerald-950/20' : 'bg-emerald-50 font-bold text-[#157A3F]' : dark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-emerald-50 hover:font-bold hover:text-[#157A3F]'}`}
    >
      {children}
    </Link>
  )
}

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()
  const closeMobileMenu = () => setIsMobileOpen(false)
  const isEmployeeArea = pathname.startsWith('/dashboard/employees')
  const isProjectArea = pathname.startsWith('/dashboard/projects')
  const isDark = isProjectArea || isEmployeeArea

  const renderLinks = (items: Array<{ href: string; label: string; icon: LucideIcon }>) => (
    <div className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => (
        <NavigationLink
          key={href}
          href={href}
          onClick={closeMobileMenu}
          active={pathname === href || (href !== '/dashboard/projects' && pathname.startsWith(`${href}/`))}
          dark={isDark}
        >
          <Icon size={18} aria-hidden="true" />
          {label}
        </NavigationLink>
      ))}
    </div>
  )

  const employeeLinks = [
    { href: '/dashboard/employees', label: 'الموظفون', icon: UsersRound },
    { href: '/dashboard/employees/organization', label: 'الهيكل التنظيمي', icon: Building2 },
    { href: '/dashboard/attendance', label: 'الحضور والانصراف', icon: CalendarDays },
    { href: '/dashboard/leaves', label: 'الإجازات', icon: Plane },
    { href: '/dashboard/employees/decisions', label: 'القرارات الإدارية', icon: FileCheck2 },
    { href: '/dashboard/employees/delegations', label: 'الندب والإعارة', icon: ClipboardCheck },
    { href: '/dashboard/employees/promotions', label: 'الترقيات', icon: Scale },
    { href: '/dashboard/employees/evaluations', label: 'تقييم الأداء', icon: UserRoundCheck },
    { href: '/dashboard/employees/trainings', label: 'التدريب والتطوير', icon: GraduationCap },
    { href: '/dashboard/employees/penalties', label: 'الجزاءات', icon: ShieldCheck },
    { href: '/dashboard/employees/custody', label: 'العهد', icon: FileArchive },
    { href: '/dashboard/employees/assets', label: 'الأصول', icon: Building },
    { href: '/dashboard/employees/clearances', label: 'إخلاء الطرف', icon: FileCheck2 },
    { href: '/dashboard/employees/correspondences', label: 'المراسلات', icon: FileText },
    { href: '/dashboard/employees/archive', label: 'أرشيف الموظفين', icon: Archive },
    { href: '/dashboard/employees/reports', label: 'تقارير الموارد البشرية', icon: FileText },
  ]

  const projectLinks = [
    { href: '/dashboard/projects', label: 'مركز القيادة الاستراتيجي', icon: LayoutDashboard },
    { href: '/dashboard/projects/database', label: 'قاعدة بيانات المشاريع', icon: Building2 },
    { href: '/dashboard/projects/tracking', label: 'متابعة تنفيذ المشاريع', icon: FileCheck2 },
    { href: '/dashboard/projects/visits', label: 'الزيارات والمتابعة الميدانية', icon: MapPinned },
    { href: '/dashboard/projects/gis', label: 'الخريطة الجغرافية GIS', icon: Globe2 },
    { href: '/dashboard/projects/finance', label: 'إدارة الميزانيات والتمويل', icon: Banknote },
    { href: '/dashboard/projects/lands', label: 'قاعدة بيانات الأراضي والزراعة', icon: Sprout },
    { href: '/dashboard/projects/minerals', label: 'الموارد الطبيعية والمعادن', icon: Mountain },
    { href: '/dashboard/projects/investments', label: 'بوابة الفرص الاستثمارية', icon: Building },
    { href: '/dashboard/projects/urban', label: 'التنمية العمرانية والبنية التحتية', icon: Building2 },
    { href: '/dashboard/projects/health-education', label: 'التنمية الصحية والتعليمية', icon: HeartPulse },
    { href: '/dashboard/reports', label: 'التقارير والإحصائيات', icon: FileText },
  ]

  const administrationLinks = [
    { href: '/dashboard/users', label: 'إدارة المستخدمين والصلاحيات', icon: UsersRound },
    { href: '/dashboard/audit-logs', label: 'سجل العمليات والتدقيق', icon: ScrollText },
    { href: '/dashboard/settings', label: 'إعدادات النظام', icon: Settings },
    { href: '/dashboard/backup', label: 'النسخ الاحتياطي', icon: DatabaseBackup },
  ]

  const navigation = (
    <>
      {(isEmployeeArea || isProjectArea) && (
        <Link
          href="/dashboard"
          onClick={closeMobileMenu}
          className={`mb-2 flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition-all duration-300 ${isDark ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200 hover:bg-emerald-300/15' : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
        >
          <Home size={18} aria-hidden="true" />
          العودة لبوابة المنظومات
        </Link>
      )}
      {isEmployeeArea ? (
        <section>
          <h2 className={`mb-2 px-3 text-sm font-black ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>منظومة شؤون الموظفين</h2>
          {renderLinks(employeeLinks)}
        </section>
      ) : isProjectArea ? (
        <section>
          <h2 className="mb-2 px-3 text-sm font-black text-emerald-300">منظومة الجنوب الاستراتيجية</h2>
          {renderLinks(projectLinks)}
        </section>
      ) : (
        <section>
          <h2 className={`mb-2 px-3 text-xs font-bold ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>الإدارة العليا</h2>
          {renderLinks(administrationLinks)}
        </section>
      )}
    </>
  )

  const logoutControl = (
    <form action={logoutFromPlatform} className={`mt-3 shrink-0 border-t pt-4 ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
      <button
        type="submit"
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-300 ${isDark ? 'text-rose-300 hover:bg-rose-400/10' : 'text-red-700 hover:bg-red-50'}`}
      >
        <LogOut size={18} aria-hidden="true" />
        تسجيل الخروج من المنصة
      </button>
    </form>
  )

  return (
    <>
      <div className={`sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 transition-colors md:hidden ${isDark ? 'border-white/10 bg-[#0b1624] text-white' : 'bg-white text-[#157A3F]'}`} dir="rtl">
        <Link href="/dashboard" className={`font-bold ${isDark ? 'text-emerald-200' : 'text-[#157A3F]'}`}>بوابة المنظومات</Link>
        <button
          type="button"
          onClick={() => setIsMobileOpen((open) => !open)}
          aria-label={isMobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={isMobileOpen}
          className={`rounded-lg p-2 transition-all duration-300 ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <aside dir="rtl" className={`sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-l p-4 shadow-xl backdrop-blur-md transition-colors md:flex ${isDark ? 'border-white/10 bg-slate-950/90 shadow-black/20' : 'border-gray-100 bg-white shadow-slate-900/5'}`}>
        <Link href="/dashboard" className={`mb-6 flex items-center gap-3 border-b pb-5 ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
          <img src="/logo.jpg" alt="شعار الجهاز" className="h-10 w-auto object-contain" />
          <span className={`font-bold ${isDark ? 'text-emerald-200' : 'text-[#157A3F]'}`}>بوابة المنظومات</span>
        </Link>
        <nav aria-label="القائمة الرئيسية" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">{navigation}</nav>
        {logoutControl}
      </aside>
      {isMobileOpen && (
        <aside dir="rtl" className={`flex min-h-[calc(100vh-57px)] flex-col border-b p-4 shadow-sm backdrop-blur-md md:hidden ${isDark ? 'border-white/10 bg-slate-950/95' : 'bg-white'}`}>
          <nav aria-label="القائمة الرئيسية" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">{navigation}</nav>
          {logoutControl}
        </aside>
      )}
    </>
  )
}
