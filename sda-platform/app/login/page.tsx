 'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-100 p-8 font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full border-t-4 border-blue-800">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-900 mb-2">تسجيل الدخول</h1>
          <p className="text-gray-500 text-sm">منصة جهاز تنمية وتطوير الجنوب</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2 border rounded-lg text-left" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-2 border rounded-lg text-left" dir="ltr" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg">
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-blue-600 hover:underline">العودة للصفحة الرئيسية</Link>
        </div>
      </div>
    </main>
  )
}