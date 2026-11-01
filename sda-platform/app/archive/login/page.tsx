'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, LockKeyhole } from 'lucide-react'
import { archiveLogin } from './actions'

export default function ArchiveLoginPage() {
  const router = useRouter()
  const [nationalId, setNationalId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await archiveLogin(nationalId, password)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.replace('/archive/dashboard')
      router.refresh()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'تعذر تسجيل الدخول إلى الأرشيف.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-2xl border-t-8 border-[#F4B41A] bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <Archive size={32} aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">منظومة الأرشيف</h1>
          <p className="mt-2 text-sm text-gray-500">سجّل الدخول باستخدام الرقم الوطني وكلمة المرور</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            الرقم الوطني
            <input
              type="text"
              inputMode="numeric"
              autoComplete="username"
              required
              value={nationalId}
              onChange={(event) => setNationalId(event.target.value)}
              className="mt-1 w-full rounded-lg border px-4 py-3"
              dir="ltr"
            />
          </label>
          <label className="block text-sm font-semibold text-gray-700">
            كلمة المرور
            <span className="relative mt-1 block">
              <LockKeyhole size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border py-3 pl-10 pr-4"
              />
            </span>
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-amber-600 py-3 font-bold text-white transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60">
            {submitting ? 'جارٍ التحقق...' : 'دخول'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-6 text-gray-500">
          يجب أن يكون حساب الأرشيف مفعّلاً مسبقاً في Supabase Auth باستخدام البريد الافتراضي للرقم الوطني.
        </p>
      </section>
    </main>
  )
}
