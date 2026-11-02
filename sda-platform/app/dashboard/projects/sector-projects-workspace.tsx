'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, Plus, X } from 'lucide-react'
import {
  createSectorProject,
  type SectorProjectRow,
} from './strategic-actions'

const projectStatuses = ['مقترح', 'قيد الدراسة', 'متوقف', 'قيد التنفيذ', 'منجز']
const formatNumber = (value: number) => new Intl.NumberFormat('ar-LY', { maximumFractionDigits: 1 }).format(value)

export default function SectorProjectsWorkspace({
  title,
  subtitle,
  sectors,
  rows,
  initialError,
}: {
  title: string
  subtitle: string
  sectors: string[]
  rows: SectorProjectRow[]
  initialError: string
}) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const result = await createSectorProject(new FormData(form))
      if ('error' in result) {
        setError(result.error)
        return
      }
      form.reset()
      setFormOpen(false)
      setSuccess('تمت إضافة المشروع القطاعي بنجاح.')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر إضافة المشروع القطاعي.')
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
            <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={() => { setError(''); setFormOpen(true) }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800">
            <Plus size={18} aria-hidden="true" /> إضافة مشروع قطاعي جديد
          </button>
        </header>

        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={18} />{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">مشاريع القطاع</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{formatNumber(rows.length)} مشروع</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['اسم المشروع', 'القطاع', 'الموقع', 'الميزانية التقديرية', 'الحالة', 'نسبة الإنجاز'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => <tr key={row.id}>
                  <td className="px-4 py-4 font-bold text-slate-800">{row.project_name}</td>
                  <td className="px-4 py-4">{row.sector_type}</td>
                  <td className="px-4 py-4">{row.location}</td>
                  <td className="px-4 py-4 tabular-nums">{Number(row.budget) ? `${formatNumber(Number(row.budget))} د.ل` : '—'}</td>
                  <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.status}</span></td>
                  <td className="px-4 py-4"><div className="flex min-w-28 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, Number(row.completion_percentage)))}%` }} /></div><span className="text-xs tabular-nums text-slate-600">{formatNumber(Number(row.completion_percentage))}%</span></div></td>
                </tr>)}
              </tbody>
            </table>
            {!rows.length && <p className="p-12 text-center text-sm text-slate-500">لم يتم إدخال بيانات بعد.</p>}
          </div>
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="sector-project-title" className="my-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl md:p-7">
            <header className="mb-5 flex items-center justify-between">
              <div><p className="text-xs font-bold text-emerald-700">بيانات القطاعات التنموية</p><h2 id="sector-project-title" className="mt-1 text-xl font-black text-slate-900">إضافة مشروع قطاعي</h2></div>
              <button type="button" aria-label="إغلاق" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </header>
            <form onSubmit={submitProject} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">اسم المشروع<input name="project_name" required maxLength={200} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-semibold text-slate-700">نوع القطاع<select name="sector_type" required defaultValue={sectors[0]} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">{sectors.map((sector) => <option key={sector}>{sector}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-700">الموقع<input name="location" required maxLength={200} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-semibold text-slate-700">الميزانية (د.ل)<input name="budget" type="number" min={0} step="0.01" defaultValue={0} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-semibold text-slate-700">الحالة<select name="status" defaultValue="مقترح" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">{projectStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">نسبة الإنجاز (%)<input name="completion_percentage" type="number" min={0} max={100} step="0.1" defaultValue={0} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{error}</p>}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">إلغاء</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? 'جارٍ الحفظ...' : 'حفظ المشروع'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
