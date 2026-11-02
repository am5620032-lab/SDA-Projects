'use client'

import { useEffect, useState } from 'react'
import { Archive, Building2, UsersRound } from 'lucide-react'
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
      href: '/dashboard/projects',
      icon: Building2,
      iconClass: 'bg-amber-300/15 text-amber-300',
      borderClass: 'border-amber-300',
      featured: true,
    },
    {
      title: 'منظومة شؤون الموظفين',
      description: 'إدارة الموظفين والحضور والإجازات والترقيات والملفات الوظيفية.',
      href: '/hr/login',
      icon: UsersRound,
      iconClass: 'bg-emerald-50 text-[#157A3F]',
      borderClass: 'border-[#157A3F]',
    },
    {
      title: 'منظومة الأرشيف',
      description: 'الوصول إلى منظومة حفظ الوثائق والمراسلات الإدارية.',
      href: '/archive/login',
      icon: Archive,
      iconClass: 'bg-amber-50 text-amber-700',
      borderClass: 'border-[#F4B41A]',
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
              <p className="mt-1 text-gray-600">مرحباً بك يا <span className="font-bold text-[#F4B41A]">{userName}</span></p>
            </div>
          </div>
          <button onClick={handleLogout} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-600 transition hover:bg-red-100">
            تسجيل الخروج
          </button>
        </header>

        {profileError && <p role="alert" className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{profileError}</p>}

        <section aria-labelledby="systems-heading">
          <div className="mb-6">
            <h2 id="systems-heading" className="text-xl font-bold text-gray-800">اختر المنظومة</h2>
            <p className="mt-1 text-sm text-gray-500">ابدأ العمل باختيار إحدى المنظومات المتاحة لحسابك.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {systems.map(({ title, description, href, icon: Icon, iconClass, borderClass, featured }) => (
              <Link
                key={href}
                href={href}
                className={`group rounded-2xl border-r-8 ${borderClass} ${featured ? 'relative overflow-hidden bg-gradient-to-l from-[#102b35] via-[#133c3b] to-[#10202d] p-8 text-white shadow-xl shadow-emerald-950/20 md:col-span-2 md:p-10' : 'bg-white p-7 shadow-sm'} transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#157A3F]`}
              >
                {featured && <span className="pointer-events-none absolute -left-10 -top-20 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />}
                <span className={`relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${iconClass}`}>
                  <Icon size={34} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <h3 className={`relative text-xl font-bold transition ${featured ? 'text-amber-100 group-hover:text-amber-200 md:text-2xl' : 'text-gray-800 group-hover:text-[#157A3F]'}`}>{title}</h3>
                <p className={`relative mt-3 max-w-3xl leading-7 ${featured ? 'text-slate-300' : 'text-gray-500'}`}>{description}</p>
                <span className={`relative mt-6 inline-flex items-center gap-2 font-bold ${featured ? 'text-amber-300' : 'text-[#157A3F]'}`}>
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
