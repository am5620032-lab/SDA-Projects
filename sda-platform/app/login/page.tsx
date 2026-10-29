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
        // جلب الاسم من جدول profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (data) {
          setUserName(data.full_name)
        } else {
          console.error(error)
          setUserName('مستخدم') // إذا لم يجد الاسم يضع كلمة مستخدم
        }
      }
    }
    getUser()
  }, [router]) // تم إزالة supabase من هنا لمنع التحديث اللانهائي

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm mb-8">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">لوحة التحكم</h1>
            <p className="text-gray-500">مرحباً بك، <span className="font-bold text-blue-800">{userName}</span></p>
          </div>
          <button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition font-semibold">
            تسجيل الخروج
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-blue-500">
            <h2 className="text-xl font-bold text-gray-800 mb-2">منظومة شؤون الموظفين</h2>
            <p className="text-gray-500 text-sm mb-4">إدارة بيانات الموظفين، الحضور، والرواتب.</p>
            <button className="text-blue-600 font-semibold hover:underline">الدخول للمنظومة ←</button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-green-500">
            <h2 className="text-xl font-bold text-gray-800 mb-2">منظومة الأرشيف</h2>
            <p className="text-gray-500 text-sm mb-4">رفع، وتوثيق، والبحث في المراسلات والوثائق.</p>
            <button className="text-green-600 font-semibold hover:underline">الدخول للمنظومة ←</button>
          </div>
        </div>
      </div>
    </main>
  )
}