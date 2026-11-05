'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, MapPinned, Plus, X } from 'lucide-react'
import type { DevelopmentProject } from '../actions'
import { createFieldVisit, type FieldVisitRow } from '../strategic-actions'

export default function FieldVisitsWorkspace({
  rows,
  projects,
  initialError,
}: {
  rows: FieldVisitRow[]
  projects: DevelopmentProject[]
  initialError: string
}) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')
  const projectById = new Map(projects.map((project) => [project.id, project]))

  async function submitVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const result = await createFieldVisit(new FormData(form))
      if ('error' in result) {
        setError(result.error)
        return
      }
      form.reset()
      setFormOpen(false)
      setSuccess('تم تسجيل الزيارة الميدانية بنجاح.')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر تسجيل الزيارة.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-full p-5 md:p-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-700">منظومة الجنوب الاستراتيجية</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900 md:text-3xl"><MapPinned aria-hidden="true" /> الزيارات والمتابعة الميدانية</h1>
            <p className="mt-2 text-sm text-slate-500">سجل الزيارات الميدانية المرتبطة بمشاريع المنظومة، مع الملاحظات والمخالفات والتوصيات.</p>
          </div>
          <button type="button" onClick={() => { setError(''); setFormOpen(true) }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800">
            <Plus size={18} aria-hidden="true" /> تسجيل زيارة جديدة
          </button>
        </header>

        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={18} />{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['المشروع', 'التاريخ والحالة', 'فريق الزيارة', 'الإحداثيات', 'الملاحظات', 'المخالفات', 'التوصيات', 'المسجل'].map((title) => <th key={title} className="px-4 py-3">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => <tr key={row.id} className="align-top">
                  <td className="px-4 py-4 font-semibold text-slate-800">{row.project_id ? projectById.get(row.project_id)?.project_name ?? row.location : row.location}</td>
                  <td className="px-4 py-4 tabular-nums">{new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium' }).format(new Date(`${row.visit_date}T00:00:00`))}<span className="mt-1 block text-xs text-slate-500">{row.status || '—'}</span></td>
                  <td className="max-w-xs whitespace-pre-wrap px-4 py-4 text-slate-600">{row.team_members || row.visitor_name}</td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-500" dir="ltr">{row.gps_coordinates || '—'}</td>
                  <td className="max-w-xs whitespace-pre-wrap px-4 py-4 text-slate-600">{row.notes || row.findings || '—'}</td>
                  <td className="max-w-xs whitespace-pre-wrap px-4 py-4 text-slate-600">{row.violations || '—'}</td>
                  <td className="max-w-xs whitespace-pre-wrap px-4 py-4 text-slate-600">{row.recommendations || '—'}</td>
                  <td className="px-4 py-4 text-slate-600">{row.visitor_name}</td>
                </tr>)}
              </tbody>
            </table>
            {!rows.length && <p className="p-12 text-center text-sm text-slate-500">لم يتم تسجيل زيارات ميدانية بعد.</p>}
          </div>
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="field-visit-title" className="my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl md:p-7">
            <header className="mb-5 flex items-center justify-between">
              <div><p className="text-xs font-bold text-emerald-700">سجل المتابعة الميدانية</p><h2 id="field-visit-title" className="mt-1 text-xl font-black text-slate-900">تسجيل زيارة جديدة</h2></div>
              <button type="button" aria-label="إغلاق" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </header>
            <form onSubmit={submitVisit} className="grid gap-4">
              <label className="text-sm font-semibold text-slate-700">المشروع
                <select name="project_id" required defaultValue="" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5">
                  <option value="" disabled>اختر المشروع</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} — {project.project_name}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">تاريخ الزيارة<input name="visit_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-semibold text-slate-700">فريق الزيارة<input name="team_members" required maxLength={1000} placeholder="أسماء أعضاء الفريق" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-semibold text-slate-700">الإحداثيات الجغرافية<input name="gps_coordinates" maxLength={200} placeholder="خط العرض، خط الطول" dir="ltr" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-semibold text-slate-700">حالة الزيارة
                <select name="status" required defaultValue="منفذة" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5">
                  <option value="مجدولة">مجدولة</option><option value="منفذة">منفذة</option><option value="تحتاج متابعة">تحتاج متابعة</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700">الملاحظات<textarea name="notes" maxLength={5000} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-semibold text-slate-700">المخالفات<textarea name="violations" maxLength={3000} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-semibold text-slate-700">التوصيات<textarea name="recommendations" maxLength={3000} rows={2} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">إلغاء</button>
                <button type="submit" disabled={pending || !projects.length} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? 'جارٍ التسجيل...' : 'حفظ الزيارة'}</button>
              </div>
              {!projects.length && <p className="text-sm text-amber-700">أضف مشروعاً أولاً قبل تسجيل زيارة ميدانية.</p>}
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
