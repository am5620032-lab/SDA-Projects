'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, Search, Sprout, Wheat } from 'lucide-react'
import EmptyState from '@/components/projects/EmptyState'
import SectorHero from '@/components/projects/SectorHero'
import SectorStats from '@/components/projects/SectorStats'
import { createLand, getLands, type AgriculturalLandRow } from '../strategic-actions'

const formatNumber = (value: number) => new Intl.NumberFormat('ar-LY', { maximumFractionDigits: 2 }).format(value)

export default function LandsWorkspace({
  initialRows,
  initialSearch,
  error: initialError,
}: {
  initialRows: AgriculturalLandRow[]
  initialSearch: string
  error: string
}) {
  const router = useRouter()
  const [rows, setRows] = useState(initialRows)
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')
  const latestUpdate = rows.reduce<string | null>((latest, row) => (
    !latest || Date.parse(row.created_at) > Date.parse(latest) ? row.created_at : latest
  ), null)
  const lastUpdated = latestUpdate
    ? new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium' }).format(new Date(latestUpdate))
    : '—'

  async function filterByMunicipality(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const result = await getLands(search, status)
      if ('error' in result) setError(result.error)
      else setRows(result.rows)
    } catch (filterError) {
      setError(filterError instanceof Error ? filterError.message : 'تعذر البحث عن الأراضي.')
    }
  }

  async function submitLand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setSuccess('')
    const form = event.currentTarget
    try {
      const result = await createLand(new FormData(form))
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuccess('تمت إضافة الأرض الزراعية بنجاح.')
      form.reset()
      setFormOpen(false)
      const refreshed = await getLands(search, status)
      if ('error' in refreshed) setError(refreshed.error)
      else setRows(refreshed.rows)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر إضافة الأرض الزراعية.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-full bg-[#0F172A] p-5 text-white md:p-8">
      <div className="mx-auto max-w-[1400px]">
        <SectorHero
          name="قاعدة بيانات الأراضي الزراعية"
          englishName="Agriculture & Land"
          description="سجل الأراضي حسب البلدية والحالة وإمكانات الاستثمار."
          icon={Wheat}
          color="#10B981"
        />
        <SectorStats
          totalRecords={rows.length}
          locations={new Set(rows.map((row) => row.municipality)).size}
          lastUpdated={lastUpdated}
        />
        <div className="mb-5 flex justify-end">
          <button type="button" onClick={() => { setError(''); setFormOpen((open) => !open) }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-500">
            <Sprout size={18} aria-hidden="true" /> إضافة أرض زراعية
          </button>
        </div>

        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"><CircleAlert size={18} />{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{success}</p>}

        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
            <form onSubmit={submitLand} className="my-auto grid w-full max-w-2xl gap-4 rounded-2xl border border-white/10 bg-[#0c1724] p-6 shadow-2xl sm:grid-cols-2">
              <header className="flex items-center justify-between sm:col-span-2"><h2 className="text-xl font-black">إضافة أرض جديدة</h2><button type="button" aria-label="إغلاق" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10">×</button></header>
              <label className="text-sm font-semibold text-slate-300">اسم الأرض<input name="land_name" required maxLength={200} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="text-sm font-semibold text-slate-300">البلدية<input name="municipality" required maxLength={150} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="text-sm font-semibold text-slate-300">المساحة (هكتار)<input name="area_size" type="number" min={0} step="0.01" defaultValue={0} required className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="text-sm font-semibold text-slate-300">نوع التربة<input name="soil_type" maxLength={150} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="text-sm font-semibold text-slate-300">مصدر المياه<input name="water_source" maxLength={200} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="text-sm font-semibold text-slate-300">الحالة<select name="status" className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white"><option>صالحة</option><option>تحتاج استصلاح</option></select></label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 sm:col-span-2"><input name="is_available_for_investment" type="checkbox" className="h-4 w-4 accent-emerald-400" /> متاحة للاستثمار</label>
              {error && <p role="alert" className="rounded-lg bg-rose-400/10 p-3 text-sm text-rose-200 sm:col-span-2">{error}</p>}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300">إلغاء</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{pending ? 'جارٍ الحفظ...' : 'حفظ الأرض'}</button>
              </div>
            </form>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-md">
          <form onSubmit={filterByMunicipality} className="flex flex-wrap items-end gap-3 border-b border-white/10 p-5">
            <label className="min-w-60 flex-1 text-sm font-semibold text-slate-300">البحث بالبلدية
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم البلدية" className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" />
            </label>
            <label className="min-w-48 text-sm font-semibold text-slate-300">الحالة
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white"><option value="">كل الحالات</option><option value="صالحة">صالحة</option><option value="تحتاج استصلاح">تحتاج استصلاح</option></select>
            </label>
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/5"><Search size={16} aria-hidden="true" /> بحث</button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-slate-950/70 text-xs text-slate-400"><tr>{['الأرض', 'البلدية', 'المساحة', 'نوع التربة', 'مصدر المياه', 'الحالة', 'الاستثمار'].map((title) => <th key={title} className="px-4 py-3">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/[0.06]">
                {rows.map((row) => <tr key={row.id}>
                  <td className="px-4 py-4 font-bold text-white">{row.land_name}</td>
                  <td className="px-4 py-4 text-slate-300">{row.municipality}</td>
                  <td className="px-4 py-4 tabular-nums text-slate-300">{formatNumber(Number(row.area_size))} هكتار</td>
                  <td className="px-4 py-4 text-slate-300">{row.soil_type || '—'}</td>
                  <td className="px-4 py-4 text-slate-300">{row.water_source || '—'}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === 'صالحة' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}>{row.status}</span></td>
                  <td className="px-4 py-4">{row.is_available_for_investment ? <span className="inline-flex items-center gap-1 text-emerald-300"><Sprout size={14} /> متاحة</span> : '—'}</td>
                </tr>)}
              </tbody>
            </table>
            {!rows.length && <div className="p-4"><EmptyState icon={Wheat} description="لا توجد أراضٍ مسجلة تطابق عوامل البحث." onAction={() => { setError(''); setFormOpen(true) }} /></div>}
          </div>
        </section>
      </div>
    </main>
  )
}
