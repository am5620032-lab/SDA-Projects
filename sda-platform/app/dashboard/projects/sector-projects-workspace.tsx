'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, Plus, X, type LucideIcon } from 'lucide-react'
import EmptyState from '@/components/projects/EmptyState'
import SectorHero from '@/components/projects/SectorHero'
import SectorStats from '@/components/projects/SectorStats'
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
  sectorAppearance,
}: {
  title: string
  subtitle: string
  sectors: string[]
  rows: SectorProjectRow[]
  initialError: string
  sectorAppearance?: {
    nameEn: string
    icon: LucideIcon
    color: string
  }
}) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')
  const latestDate = rows.reduce<string | null>((latest, row) => (
    !latest || Date.parse(row.created_at) > Date.parse(latest) ? row.created_at : latest
  ), null)

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
    <main dir="rtl" className="min-h-full bg-[#0F172A] p-5 text-white md:p-8">
      <div className="mx-auto max-w-[1400px]">
        {sectorAppearance ? (
          <>
            <SectorHero name={title} description={subtitle} icon={sectorAppearance.icon} color={sectorAppearance.color} englishName={sectorAppearance.nameEn} />
            <SectorStats
              totalRecords={rows.length}
              locations={new Set(rows.map((row) => row.location)).size}
              locationLabel="المواقع"
              lastUpdated={latestDate ? new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium' }).format(new Date(latestDate)) : '—'}
            />
            <div className="mb-5 flex justify-end">
              <button type="button" onClick={() => { setError(''); setFormOpen(true) }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-500">
                <Plus size={18} aria-hidden="true" /> إضافة مشروع قطاعي جديد
              </button>
            </div>
          </>
        ) : (
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-300">منظومة الجنوب الاستراتيجية</p>
              <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
            </div>
            <button type="button" onClick={() => { setError(''); setFormOpen(true) }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500">
              <Plus size={18} aria-hidden="true" /> إضافة مشروع قطاعي جديد
            </button>
          </header>
        )}

        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"><CircleAlert size={18} />{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{success}</p>}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <h2 className="font-bold text-white">مشاريع القطاع</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{formatNumber(rows.length)} مشروع</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-slate-950/60 text-xs text-slate-400"><tr>{['اسم المشروع', 'القطاع', 'الموقع', 'الميزانية التقديرية', 'الحالة', 'نسبة الإنجاز'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/[0.06]">
                {rows.map((row) => <tr key={row.id}>
                  <td className="px-4 py-4 font-bold text-white">{row.project_name}</td>
                  <td className="px-4 py-4">{row.sector_type}</td>
                  <td className="px-4 py-4">{row.location}</td>
                  <td className="px-4 py-4 tabular-nums">{Number(row.budget) ? `${formatNumber(Number(row.budget))} د.ل` : '—'}</td>
                  <td className="px-4 py-4"><span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300">{row.status}</span></td>
                  <td className="px-4 py-4"><div className="flex min-w-28 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, Number(row.completion_percentage)))}%` }} /></div><span className="text-xs tabular-nums text-slate-300">{formatNumber(Number(row.completion_percentage))}%</span></div></td>
                </tr>)}
              </tbody>
            </table>
            {!rows.length && <div className="p-4"><EmptyState icon={sectorAppearance?.icon ?? Plus} description="لم يتم إدخال بيانات بعد." onAction={() => { setError(''); setFormOpen(true) }} /></div>}
          </div>
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="sector-project-title" className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0c1724] p-5 text-white shadow-2xl md:p-7">
            <header className="mb-5 flex items-center justify-between">
              <div><p className="text-xs font-bold text-emerald-300">بيانات القطاعات التنموية</p><h2 id="sector-project-title" className="mt-1 text-xl font-black text-white">إضافة مشروع قطاعي</h2></div>
              <button type="button" aria-label="إغلاق" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X size={20} /></button>
            </header>
            <form onSubmit={submitProject} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-300 sm:col-span-2">اسم المشروع<input name="project_name" required maxLength={200} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="text-sm font-semibold text-slate-300">نوع القطاع<select name="sector_type" required defaultValue={sectors[0]} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white">{sectors.map((sector) => <option key={sector}>{sector}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-300">الموقع<input name="location" required maxLength={200} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="text-sm font-semibold text-slate-300">الميزانية (د.ل)<input name="budget" type="number" min={0} step="0.01" defaultValue={0} required className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="text-sm font-semibold text-slate-300">الحالة<select name="status" defaultValue="مقترح" className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white">{projectStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-300 sm:col-span-2">نسبة الإنجاز (%)<input name="completion_percentage" type="number" min={0} max={100} step="0.1" defaultValue={0} required className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
              {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200 sm:col-span-2">{error}</p>}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300">إلغاء</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? 'جارٍ الحفظ...' : 'حفظ المشروع'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
