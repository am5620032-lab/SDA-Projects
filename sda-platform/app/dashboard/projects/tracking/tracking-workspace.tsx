'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, CircleAlert, FileCheck2, Plus, Upload } from 'lucide-react'
import type { DevelopmentProject } from '../actions'
import { addProjectTracking, type TrackingRow } from '../strategic-actions'

const formatNumber = (value: number) => new Intl.NumberFormat('ar-LY', { maximumFractionDigits: 1 }).format(value)

export default function TrackingWorkspace({
  projects,
  rows,
  initialError,
}: {
  projects: DevelopmentProject[]
  rows: TrackingRow[]
  initialError: string
}) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setPending(true)
    setError('')
    setSuccess('')
    const formData = new FormData(formElement)
    try {
      const result = await addProjectTracking(formData)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuccess('تم حفظ التحديث الميداني بنجاح.')
      setFormOpen(false)
      formElement.reset()
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر حفظ التحديث الميداني.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-full p-5 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-700">منظومة الجنوب الاستراتيجية</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">متابعة تنفيذ المشاريع</h1>
            <p className="mt-2 text-sm text-slate-500">سجل التحديثات الميدانية ونسب الإنجاز المعتمدة للمشروعات.</p>
          </div>
          <button type="button" onClick={() => { setError(''); setFormOpen((open) => !open) }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800">
            <Plus size={18} aria-hidden="true" /> إضافة تحديث ميداني
          </button>
        </header>

        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={18} />{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}

        {formOpen && (
          <form onSubmit={submitUpdate} className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              المشروع
              <select name="project_id" required defaultValue="" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
                <option value="" disabled>اختر المشروع</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} — {project.project_name}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              نسبة الإنجاز الحالية (%)
              <input name="completion_percentage" type="number" min={0} max={100} step="0.1" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              اسم المقاول
              <input name="contractor_name" maxLength={200} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              صورة ميدانية (JPG / PNG / WebP، حتى 5MB)
              <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2">
                <Camera size={17} className="text-slate-400" aria-hidden="true" />
                <input name="field_photo" type="file" accept="image/jpeg,image/png,image/webp" className="min-w-0 text-xs" />
              </span>
            </label>
            <label className="text-sm font-semibold text-slate-700 md:col-span-2">
              أسباب التأخير / ملاحظات الزيارة
              <textarea name="delay_reasons" rows={3} maxLength={2000} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
            </label>
            <div className="flex justify-end gap-2 md:col-span-2">
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">إلغاء</button>
              <button type="submit" disabled={pending || !projects.length} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                <Upload size={16} aria-hidden="true" />{pending ? 'جارٍ الحفظ...' : 'حفظ التحديث'}
              </button>
            </div>
            {!projects.length && <p className="text-sm text-amber-700 md:col-span-2">أضف مشروعاً أولاً قبل تسجيل تحديث ميداني.</p>}
          </form>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 p-5">
            <FileCheck2 className="text-emerald-700" size={20} aria-hidden="true" />
            <h2 className="font-bold text-slate-900">سجل التحديثات الميدانية</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>{['المشروع', 'تاريخ التحديث', 'الإنجاز', 'المقاول', 'أسباب التأخير / الملاحظات', 'الصورة'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-4"><p className="font-bold text-slate-800">{row.project_name}</p><p className="mt-1 font-mono text-xs text-slate-400" dir="ltr">{row.project_code}</p></td>
                    <td className="px-4 py-4 text-slate-600">{new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.update_date))}</td>
                    <td className="px-4 py-4"><span className="font-bold tabular-nums text-emerald-700">{formatNumber(Number(row.completion_percentage))}%</span><div className="mt-2 h-1.5 w-28 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, Number(row.completion_percentage)))}%` }} /></div></td>
                    <td className="px-4 py-4 text-slate-600">{row.contractor_name || '—'}</td>
                    <td className="max-w-sm whitespace-pre-wrap px-4 py-4 text-slate-600">{row.delay_reasons || '—'}</td>
                    <td className="px-4 py-4">{row.field_photos_url ? <a href={row.field_photos_url} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">عرض الصورة</a> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="p-12 text-center text-sm text-slate-500">لا توجد تحديثات ميدانية مسجلة.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
