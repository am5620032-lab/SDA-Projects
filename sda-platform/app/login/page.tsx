'use client'
import { useState, type FormEvent } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('بيانات الدخول غير صحيحة.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071713] p-4 font-sans sm:p-8"
      style={{
        backgroundImage: "linear-gradient(115deg, rgba(5, 20, 17, .9), rgba(8, 34, 30, .68)), url('https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=2400&q=85')",
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-7 text-white shadow-2xl shadow-black/40 backdrop-blur-md sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-2 shadow-lg shadow-black/20">
            <img src="/logo.jpg" alt="شعار الجهاز" className="h-full w-full object-contain" />
          </div>
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-emerald-200">جهاز تنمية وتطوير الجنوب</p>
          <h1 className="text-3xl font-black text-white">تسجيل الدخول</h1>
          <p className="mt-3 text-sm text-slate-300">أدخل بياناتك للوصول إلى بوابة المنظومات</p>
        </div>
        {error && <div role="alert" className="mb-5 rounded-xl border border-red-300/30 bg-red-500/15 p-3 text-center text-sm text-red-100">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-200">البريد الإلكتروني</label>
            <div className="relative">
              <Mail size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" className="w-full rounded-xl border border-white/15 bg-slate-950/35 px-4 py-3.5 pl-11 text-left text-white outline-none transition-all duration-300 placeholder:text-slate-500 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/20" dir="ltr" />
            </div>
          </div>
          <div>
            <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-200">كلمة المرور</label>
            <div className="relative">
              <KeyRound size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="w-full rounded-xl border border-white/15 bg-slate-950/35 px-4 py-3.5 pl-11 text-left text-white outline-none transition-all duration-300 placeholder:text-slate-500 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/20" dir="ltr" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-500 to-[#157A3F] py-3.5 font-bold text-white shadow-lg shadow-emerald-950/40 transition-all duration-300 hover:-translate-y-0.5 hover:from-emerald-400 hover:to-emerald-600 hover:shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            {!loading && <ArrowLeft size={18} aria-hidden="true" className="transition-transform group-hover:-translate-x-1" />}
          </button>
        </form>
        <div className="mt-7 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-400">
          <ShieldCheck size={15} aria-hidden="true" className="text-emerald-300" />
          <span>بوابة آمنة للأنظمة الحكومية</span>
        </div>
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-emerald-200 transition-colors duration-300 hover:text-white">العودة للصفحة الرئيسية</Link>
        </div>
      </div>
    </main>
  )
}