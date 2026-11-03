'use client'

import { useEffect, useState } from 'react'
import { Archive, Building2, CalendarDays, LogOut, UsersRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function Dashboard() {
  const [userName, setUserName] = useState('جاري التحميل...')
  const [userRole, setUserRole] = useState('')
  const [profileError, setProfileError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()
      if (error) throw error

      setUserName(data.full_name)
      setUserRole(data.role)
    }

    void loadProfile().catch((error: unknown) => {
      setProfileError(error instanceof Error ? error.message : 'تعذر تحميل بيانات المستخدم.')
    })
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      setProfileError(`تعذر تسجيل الخروج: ${error.message}`)
      return
    }
    router.push('/login')
  }

  const systems = [
    {
      title: 'منظومة المشروعات والاستثمار',
      description: 'مركز القيادة الاستراتيجي لمحفظة التنمية الوطنية: متابعة المشاريع والميزانيات والأولويات والاحتياجات عبر البلديات والقطاعات.',
      href: '/projects/login',
      icon: Building2,
      iconClass: 'bg-amber-300/15 text-amber-300',
      featured: true,
    },
    {
      title: 'منظومة شؤون الموظفين',
      description: 'إدارة الموظفين والحضور والإجازات والترقيات والملفات الوظيفية.',
      href: '/hr/login',
      icon: UsersRound,
      iconClass: 'bg-sky-50 text-sky-700',
    },
    {
      title: 'منظومة الأرشيف',
      description: 'الوصول إلى منظومة حفظ الوثائق والمراسلات الإدارية.',
      href: '/archive/login',
      icon: Archive,
      iconClass: 'bg-amber-50 text-amber-700',
    },
  ].filter((system) => !('featured' in system && system.featured)
    || ['president', 'vice_president', 'admin_manager', 'it_manager'].includes(userRole))

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-4 rounded-xl border-r-8 border-[#157A3F] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="شعار الجهاز" className="h-14 w-auto object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-[#157A3F]">بوابة المنظومات</h1>
              <p className="mt-1 text-gray-600">جهاز تنمية وتطوير الجنوب</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-5">
            <div className="hidden items-center gap-2 text-sm text-gray-500 sm:flex">
              <CalendarDays size={17} className="text-[#157A3F]" aria-hidden="true" />
              <time>{new Intl.DateTimeFormat('ar-LY', { dateStyle: 'full' }).format(new Date())}</time>
            </div>
            <div className="hidden h-9 w-px bg-gray-200 sm:block" />
            <div className="text-left sm:text-right">
              <p className="text-xs text-gray-500">مرحباً بك</p>
              <p className="font-bold text-gray-800">{userName}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-semibold text-red-600 transition-all duration-300 hover:bg-red-100 sm:px-4">
              <LogOut size={17} aria-hidden="true" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </header>

        {profileError && <p role="alert" className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{profileError}</p>}

        <section aria-labelledby="systems-heading">
          <div className="mb-6">
            <h2 id="systems-heading" className="text-xl font-bold text-gray-800">اختر المنظومة</h2>
            <p className="mt-1 text-sm text-gray-500">ابدأ العمل باختيار إحدى المنظومات المتاحة لحسابك.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {systems.map(({ title, description, href, icon: Icon, iconClass, featured }) => (
              <Link
                key={href}
                href={href}
                className={`group relative overflow-hidden rounded-2xl border ${featured ? 'border-amber-200/20 bg-gradient-to-l from-[#101d2d] via-[#172b39] to-[#253523] p-8 text-white shadow-xl shadow-slate-950/20 md:col-span-2 md:p-10' : href === '/hr/login' ? 'border-sky-200/60 bg-gradient-to-br from-sky-700 via-teal-700 to-emerald-800 p-7 text-white shadow-lg shadow-teal-950/15' : 'border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-7 text-slate-800 shadow-sm'} transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#157A3F]`}
              >
                <Icon size={170} strokeWidth={0.8} aria-hidden="true" className={`pointer-events-none absolute -left-5 -top-7 opacity-[0.07] transition-transform duration-500 group-hover:scale-110 ${featured ? 'text-amber-200' : href === '/hr/login' ? 'text-white' : 'text-amber-700'}`} />
                {featured && <span className="pointer-events-none absolute -left-10 -top-20 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />}
                <span className={`relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${featured ? iconClass : href === '/hr/login' ? 'border border-white/15 bg-white/10 text-emerald-100' : 'border border-amber-200 bg-amber-100 text-amber-800'}`}>
                  <Icon size={34} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <h3 className={`relative text-xl font-bold transition ${featured ? 'text-amber-100 group-hover:text-amber-200 md:text-2xl' : href === '/hr/login' ? 'text-white group-hover:text-emerald-100' : 'text-gray-800 group-hover:text-amber-800'}`}>{title}</h3>
                <p className={`relative mt-3 max-w-3xl leading-7 ${featured || href === '/hr/login' ? 'text-slate-200/85' : 'text-gray-600'}`}>{description}</p>
                <span className={`relative mt-6 inline-flex items-center gap-2 font-bold ${featured ? 'text-amber-300' : href === '/hr/login' ? 'text-emerald-100' : 'text-amber-800'}`}>
                  الدخول إلى المنظومة <span aria-hidden="true">←</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
