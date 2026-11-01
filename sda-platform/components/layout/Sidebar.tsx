'use client'

import {
  ArrowLeftRight,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  Menu,
  Network,
  Package,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

function NavigationLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick?: () => void
}) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
        active ? 'bg-emerald-50 font-bold text-[#157A3F]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {children}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState('')
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [employeesExpanded, setEmployeesExpanded] = useState(() => pathname.startsWith('/dashboard/employees'))
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let active = true
    const fetchRole = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return
      const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!error && active) setUserRole(data.role)
    }

    void fetchRole()
    return () => { active = false }
  }, [supabase])

  const closeMobileMenu = () => setIsMobileOpen(false)
  const navigation = (
    <>
      <NavigationLink href="/dashboard" onClick={closeMobileMenu}>
        <LayoutDashboard size={18} aria-hidden="true" />
        لوحة التحكم
      </NavigationLink>

      <section>
        <button
          type="button"
          onClick={() => setEmployeesExpanded((expanded) => !expanded)}
          aria-expanded={employeesExpanded}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-right text-sm font-bold text-gray-800 transition hover:bg-gray-50"
        >
          <span className="flex items-center gap-3"><UsersRound size={18} className="text-[#157A3F]" aria-hidden="true" />منظومة شؤون الموظفين</span>
          <ChevronDown size={16} className={`transition-transform ${employeesExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {employeesExpanded && (
          <nav aria-label="أقسام شؤون الموظفين" className="mr-3 mt-1 space-y-1 border-r border-gray-200 pr-3">
            <NavigationLink href="/dashboard/employees" onClick={closeMobileMenu}><UsersRound size={16} aria-hidden="true" />إدارة الموظفين</NavigationLink>
            <NavigationLink href="/dashboard/employees/organization" onClick={closeMobileMenu}><Network size={16} aria-hidden="true" />الهيكل التنظيمي</NavigationLink>
            <NavigationLink href="/dashboard/employees/attendance" onClick={closeMobileMenu}><CalendarCheck2 size={16} aria-hidden="true" />الحضور والانصراف</NavigationLink>
            <NavigationLink href="/dashboard/leaves" onClick={closeMobileMenu}><CalendarDays size={16} aria-hidden="true" />الإجازات</NavigationLink>
            <NavigationLink href="/dashboard/employees/promotions" onClick={closeMobileMenu}><ShieldCheck size={16} aria-hidden="true" />الترقيات والعلاوات</NavigationLink>
            <NavigationLink href="/dashboard/employees/delegations" onClick={closeMobileMenu}><ArrowLeftRight size={16} aria-hidden="true" />الندب والإعارة</NavigationLink>
            <NavigationLink href="/dashboard/employees/custody" onClick={closeMobileMenu}><Package size={16} aria-hidden="true" />العهد والأمانات</NavigationLink>
            {userRole === 'it_manager' && <NavigationLink href="/dashboard/users" onClick={closeMobileMenu}><UsersRound size={16} aria-hidden="true" />إدارة المستخدمين</NavigationLink>}
          </nav>
        )}
      </section>

    </>
  )

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 md:hidden" dir="rtl">
        <Link href="/dashboard" className="font-bold text-[#157A3F]">بوابة المنظومات</Link>
        <button type="button" onClick={() => setIsMobileOpen((open) => !open)} aria-label={isMobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={isMobileOpen} className="rounded-lg p-2 text-gray-700 hover:bg-gray-100">
          {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <aside dir="rtl" className="hidden min-h-screen w-72 shrink-0 border-l bg-white p-4 md:block">
        <Link href="/dashboard" className="mb-6 flex items-center gap-3 border-b pb-5">
          <img src="/logo.jpg" alt="شعار الجهاز" className="h-10 w-auto object-contain" />
          <span className="font-bold text-[#157A3F]">بوابة المنظومات</span>
        </Link>
        <nav aria-label="القائمة الرئيسية" className="space-y-3">{navigation}</nav>
      </aside>
      {isMobileOpen && (
        <aside dir="rtl" className="border-b bg-white p-4 shadow-sm md:hidden">
          <nav aria-label="القائمة الرئيسية" className="space-y-3">{navigation}</nav>
        </aside>
      )}
    </>
  )
}
