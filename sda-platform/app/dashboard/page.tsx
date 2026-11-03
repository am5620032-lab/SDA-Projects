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
      iconClass: 'border border-amber-300/20 bg-amber-300/10 text-amber-300 shadow-lg shadow-amber-500/10',
      featured: true,
    },
    {
      title: 'منظومة شؤون الموظفين',
      description: 'إدارة الموظفين والحضور والإجازات والترقيات والملفات الوظيفية.',
      href: '/hr/login',
      icon: UsersRound,
      iconClass: 'border border-sky-300/20 bg-sky-400/10 text-sky-300 shadow-lg shadow-sky-500/10',
    },
    {
      title: 'منظومة الأرشيف',
      description: 'الوصول إلى منظومة حفظ الوثائق والمراسلات الإدارية.',
      href: '/archive/login',
      icon: Archive,
      iconClass: 'border border-violet-300/20 bg-violet-400/10 text-violet-300 shadow-lg shadow-violet-500/10',
    },
  ].filter((system) => !('featured' in system && system.featured)
    || ['president', 'vice_president', 'admin_manager', 'it_manager'].includes(userRole))

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-slate-950 p-4 font-sans text-white md:p-8">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-32 h-[30rem] w-[30rem] rounded-full bg-blue-500/10 blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <header className="relative mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-6">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="شعار الجهاز" className="h-14 w-auto object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-white">بوابة المنظومات</h1>
              <p className="mt-1 text-slate-400">جهاز تنمية وتطوير الجنوب</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-5">
            <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex">
              <CalendarDays size={17} className="text-emerald-300" aria-hidden="true" />
              <time>{new Intl.DateTimeFormat('ar-LY', { dateStyle: 'full' }).format(new Date())}</time>
            </div>
            <div className="hidden h-9 w-px bg-white/10 sm:block" />
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-400">مرحباً بك</p>
              <p className="font-bold text-white">{userName}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 font-semibold text-rose-200 transition-all duration-300 hover:bg-rose-400/20 sm:px-4">
              <LogOut size={17} aria-hidden="true" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </header>

        {profileError && <p role="alert" className="relative mb-6 rounded-lg border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-200">{profileError}</p>}

        <section aria-labelledby="systems-heading" className="relative">
          <div className="mb-6">
            <h2 id="systems-heading" className="text-xl font-bold text-white">اختر المنظومة</h2>
            <p className="mt-1 text-sm text-slate-400">ابدأ العمل باختيار إحدى المنظومات المتاحة لحسابك.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {systems.map(({ title, description, href, icon: Icon, iconClass, featured }) => (
              <Link
                key={href}
                href={href}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-7 text-white shadow-xl shadow-black/20 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-emerald-500/50 hover:bg-white/10 hover:shadow-emerald-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${featured ? 'md:col-span-2 md:p-10' : ''}`}
              >
                <Icon size={170} strokeWidth={0.8} aria-hidden="true" className={`pointer-events-none absolute -left-5 -top-7 opacity-[0.07] transition-transform duration-500 group-hover:scale-110 ${featured ? 'text-amber-200' : href === '/hr/login' ? 'text-sky-200' : 'text-violet-200'}`} />
                <span className={`relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${iconClass}`}>
                  <Icon size={34} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <h3 className={`relative text-xl font-bold transition group-hover:text-emerald-100 ${featured ? 'text-amber-100 md:text-2xl' : 'text-white'}`}>{title}</h3>
                <p className="relative mt-3 max-w-3xl leading-7 text-slate-300">{description}</p>
                <span className={`relative mt-6 inline-flex items-center gap-2 font-bold ${featured ? 'text-amber-300' : href === '/hr/login' ? 'text-sky-300' : 'text-violet-300'}`}>
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
