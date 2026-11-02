'use client'

import {
  Archive,
  Banknote,
  Building,
  Building2,
  DatabaseBackup,
  FileCheck2,
  FileText,
  Globe2,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Mountain,
  Sprout,
  ScrollText,
  Settings,
  UsersRound,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { logoutFromPlatform } from '@/app/actions/logout'

function NavigationLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 transition hover:bg-emerald-50 hover:font-bold hover:text-[#157A3F]"
    >
      {children}
    </Link>
  )
}

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const closeMobileMenu = () => setIsMobileOpen(false)

  const navigation = (
    <>
      <section>
        <h2 className="mb-2 px-3 text-xs font-bold text-emerald-700">منظومة الجنوب الاستراتيجية</h2>
        <div className="space-y-1">
          <NavigationLink href="/dashboard/projects" onClick={closeMobileMenu}>
            <LayoutDashboard size={18} aria-hidden="true" />
            مركز القيادة الاستراتيجي
          </NavigationLink>
          <NavigationLink href="/dashboard/projects/database" onClick={closeMobileMenu}>
            <Building2 size={18} aria-hidden="true" />
            قاعدة بيانات المشاريع
          </NavigationLink>
          <NavigationLink href="/dashboard/projects/tracking" onClick={closeMobileMenu}>
            <FileCheck2 size={18} aria-hidden="true" />
            متابعة تنفيذ المشاريع
          </NavigationLink>
          <NavigationLink href="/dashboard/projects/gis" onClick={closeMobileMenu}>
            <Globe2 size={18} aria-hidden="true" />
            الخريطة الجغرافية GIS
          </NavigationLink>
          <NavigationLink href="/dashboard/projects/finance" onClick={closeMobileMenu}>
            <Banknote size={18} aria-hidden="true" />
            إدارة الميزانيات والتمويل
          </NavigationLink>
          <NavigationLink href="/dashboard/projects/lands" onClick={closeMobileMenu}>
            <Sprout size={18} aria-hidden="true" />
            قاعدة بيانات الأراضي والزراعة
          </NavigationLink>
          <NavigationLink href="/dashboard/projects/minerals" onClick={closeMobileMenu}>
            <Mountain size={18} aria-hidden="true" />
            قاعدة بيانات الموارد الطبيعية والمعادن
          </NavigationLink>
          <NavigationLink href="/dashboard/projects/investments" onClick={closeMobileMenu}>
            <Building size={18} aria-hidden="true" />
            بوابة الفرص الاستثمارية
          </NavigationLink>
          <NavigationLink href="/dashboard/projects/urban-development" onClick={closeMobileMenu}>
            <Building2 size={18} aria-hidden="true" />
            التنمية العمرانية والبنية التحتية
          </NavigationLink>
          <NavigationLink href="/dashboard/projects/health-education" onClick={closeMobileMenu}>
            <HeartPulse size={18} aria-hidden="true" />
            التنمية الصحية والتعليمية
          </NavigationLink>
          <NavigationLink href="/dashboard/reports" onClick={closeMobileMenu}>
            <FileText size={18} aria-hidden="true" />
            التقارير والإحصائيات
          </NavigationLink>
          <NavigationLink href="/dashboard/projects/field-visits" onClick={closeMobileMenu}>
            <MapPinned size={18} aria-hidden="true" />
            الزيارات والمتابعة الميدانية
          </NavigationLink>
          <NavigationLink href="/dashboard/employees/correspondences" onClick={closeMobileMenu}>
            <FileCheck2 size={18} aria-hidden="true" />
            المراسلات والاعتمادات
          </NavigationLink>
          <NavigationLink href="/dashboard/archive" onClick={closeMobileMenu}>
            <Archive size={18} aria-hidden="true" />
            الأرشيف الإلكتروني
          </NavigationLink>
        </div>
      </section>

      <section className="border-t border-gray-100 pt-3">
        <h2 className="mb-2 px-3 text-xs font-bold text-gray-400">الإدارة العليا</h2>
        <div className="space-y-1">
          <NavigationLink href="/dashboard/users" onClick={closeMobileMenu}>
            <UsersRound size={18} aria-hidden="true" />
            إدارة المستخدمين والصلاحيات
          </NavigationLink>
          <NavigationLink href="/dashboard/audit-logs" onClick={closeMobileMenu}>
            <ScrollText size={18} aria-hidden="true" />
            سجل العمليات والتدقيق
          </NavigationLink>
          <NavigationLink href="/dashboard/settings" onClick={closeMobileMenu}>
            <Settings size={18} aria-hidden="true" />
            إعدادات النظام
          </NavigationLink>
          <NavigationLink href="/dashboard/backup" onClick={closeMobileMenu}>
            <DatabaseBackup size={18} aria-hidden="true" />
            النسخ الاحتياطي
          </NavigationLink>
        </div>
      </section>

    </>
  )

  const logoutControl = (
    <form action={logoutFromPlatform} className="mt-3 shrink-0 border-t border-gray-100 pt-4">
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        <LogOut size={18} aria-hidden="true" />
        تسجيل الخروج من المنصة
      </button>
    </form>
  )

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 md:hidden" dir="rtl">
        <Link href="/dashboard" className="font-bold text-[#157A3F]">بوابة المنظومات</Link>
        <button
          type="button"
          onClick={() => setIsMobileOpen((open) => !open)}
          aria-label={isMobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={isMobileOpen}
          className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
        >
          {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <aside dir="rtl" className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-l bg-white p-4 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-3 border-b pb-5">
          <img src="/logo.jpg" alt="شعار الجهاز" className="h-10 w-auto object-contain" />
          <span className="font-bold text-[#157A3F]">بوابة المنظومات</span>
        </Link>
        <nav aria-label="القائمة الرئيسية" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">{navigation}</nav>
        {logoutControl}
      </aside>
      {isMobileOpen && (
        <aside dir="rtl" className="flex min-h-[calc(100vh-57px)] flex-col border-b bg-white p-4 shadow-sm md:hidden">
          <nav aria-label="القائمة الرئيسية" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">{navigation}</nav>
          {logoutControl}
        </aside>
      )}
    </>
  )
}
