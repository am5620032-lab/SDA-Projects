'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, LockKeyhole, UsersRound } from 'lucide-react'
import { moduleLogin } from '@/app/actions/module-login'
import type { ModuleName } from '@/app/actions/module-login'

export default function ModuleLoginForm({
  moduleName,
  title,
}: {
  moduleName: ModuleName
  title: string
}) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const Icon = moduleName === 'archive' ? Archive : UsersRound

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await moduleLogin(moduleName, username, password)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.replace(moduleName === 'archive' ? '/archive/dashboard' : '/dashboard/employees')
      router.refresh()
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'تعذر تسجيل الدخول إلى المنظومة.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-2xl border-t-8 border-[#F4B41A] bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <Icon size={32} aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-sm text-gray-500">سجّل الدخول باسم المستخدم وكلمة المرور المخصصة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-gray-700">
            اسم المستخدم
            <input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
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
      </section>
    </main>
  )
}
