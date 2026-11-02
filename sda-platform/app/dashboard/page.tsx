'use client'

import { useEffect, useState } from 'react'
import { Archive, UsersRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function Dashboard() {
  const [userName, setUserName] = useState('جاري التحميل...')
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
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (error) throw error

      setUserName(data.full_name)
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
  ]

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
            {systems.map(({ title, description, href, icon: Icon, iconClass, borderClass }) => (
              <Link
                key={href}
                href={href}
                className={`group rounded-2xl border-r-8 ${borderClass} bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#157A3F]`}
              >
                <span className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${iconClass}`}>
                  <Icon size={34} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <h3 className="text-xl font-bold text-gray-800 transition group-hover:text-[#157A3F]">{title}</h3>
                <p className="mt-3 leading-7 text-gray-500">{description}</p>
                <span className="mt-6 inline-flex items-center gap-2 font-bold text-[#157A3F]">
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
