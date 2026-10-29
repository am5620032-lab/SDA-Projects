 'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [userName, setUserName] = useState('جاري التحميل...')
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
      } else {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (data) setUserName(data.full_name)
      }
    }
    getUser()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm mb-8 border-r-8 border-[#157A3F]">
          <div>
            <h1 className="text-2xl font-bold text-[#157A3F]">لوحة التحكم</h1>
            <p className="text-gray-600">مرحباً بك، <span className="font-bold text-[#F4B41A]">{userName}</span></p>
          </div>
          <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition font-semibold border border-red-200">
            تسجيل الخروج
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* بطاقة الموظفين */}
          <div className="bg-white p-6 rounded-xl shadow-sm border-r-8 border-[#157A3F]">
            <h2 className="text-xl font-bold text-gray-800 mb-2">منظومة شؤون الموظفين</h2>
            <p className="text-gray-500 text-sm mb-4">إدارة بيانات الموظفين، الحضور، والرواتب.</p>
            <button className="text-[#157A3F] font-bold hover:underline flex items-center gap-2">
              الدخول للمنظومة <span>←</span>
            </button>
          </div>

          {/* بطاقة الأرشيف */}
          <div className="bg-white p-6 rounded-xl shadow-sm border-r-8 border-[#F4B41A]">
            <h2 className="text-xl font-bold text-gray-800 mb-2">منظومة الأرشيف</h2>
            <p className="text-gray-500 text-sm mb-4">رفع، وتوثيق، والبحث في المراسلات والوثائق.</p>
            <button className="text-[#F4B41A] font-bold hover:underline flex items-center gap-2">
              الدخول للمنظومة <span>←</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}