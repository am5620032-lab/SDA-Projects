'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { updateSystemSettings, type SystemSettingsInput } from '@/app/actions/admin-settings'

export default function SettingsForm({ settings }: { settings: SystemSettingsInput }) {
  const [values, setValues] = useState(settings)
  const [errorMessage, setErrorMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setSaved(false)
    try {
      const result = await updateSystemSettings(values)
      if ('error' in result) setErrorMessage(result.error)
      else setSaved(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حفظ إعدادات النظام.')
    } finally {
      setSaving(false)
    }
  }

  const fields: { key: keyof Omit<SystemSettingsInput, 'id'>; label: string; type?: string }[] = [
    { key: 'system_name', label: 'اسم الجهاز' },
    { key: 'system_logo_url', label: 'رابط الشعار', type: 'url' },
    { key: 'contact_email', label: 'البريد الإلكتروني', type: 'email' },
    { key: 'contact_phone', label: 'رقم الهاتف', type: 'tel' },
    { key: 'address', label: 'العنوان' },
  ]

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between rounded-xl border-r-8 border-[#157A3F] bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-[#157A3F]">إعدادات النظام</h1>
            <p className="mt-1 text-sm text-gray-500">تعديل بيانات جهاز تنمية وتطوير الجنوب</p>
          </div>
          <Link href="/dashboard" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700">لوحة التحكم</Link>
        </header>
        <form onSubmit={onSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
          {fields.map(({ key, label, type }) => (
            <div key={key}>
              <label htmlFor={key} className="mb-1 block text-sm font-medium">{label}</label>
              <input
                id={key}
                type={type ?? 'text'}
                required={key === 'system_name'}
                maxLength={key === 'system_name' ? 200 : 500}
                value={values[key]}
                onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                className="w-full rounded-lg border px-4 py-2"
                dir={key === 'contact_email' || key === 'system_logo_url' ? 'ltr' : undefined}
              />
            </div>
          ))}
          {errorMessage && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{errorMessage}</p>}
          {saved && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-700">تم حفظ الإعدادات بنجاح.</p>}
          <button type="submit" disabled={saving} className="rounded-lg bg-[#157A3F] px-6 py-3 font-bold text-white disabled:opacity-60">
            {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </form>
      </div>
    </main>
  )
}
