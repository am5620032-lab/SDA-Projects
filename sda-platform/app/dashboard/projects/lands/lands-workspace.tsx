'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, Plus, Search, Sprout } from 'lucide-react'
import { createAgriculturalLand, getAgriculturalLands, type AgriculturalLandRow } from '../strategic-actions'

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
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')

  async function filterByMunicipality(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const result = await getAgriculturalLands(search)
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
      const result = await createAgriculturalLand(new FormData(form))
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuccess('تمت إضافة الأرض الزراعية بنجاح.')
      form.reset()
      setFormOpen(false)
      const refreshed = await getAgriculturalLands(search)
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
    <main dir="rtl" className="min-h-full p-5 md:p-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-700">منظومة الجنوب الاستراتيجية</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">قاعدة بيانات الأراضي الزراعية</h1>
            <p className="mt-2 text-sm text-slate-500">سجل الأراضي حسب البلدية والحالة وإمكانات الاستثمار.</p>
          </div>
          <button type="button" onClick={() => { setError(''); setFormOpen((open) => !open) }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800">
            <Plus size={18} aria-hidden="true" /> إضافة أرض زراعية
          </button>
        </header>

        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={18} />{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}

        {formOpen && (
          <form onSubmit={submitLand} className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">اسم الأرض<input name="land_name" required maxLength={200} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-semibold text-slate-700">البلدية<input name="municipality" required maxLength={150} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-semibold text-slate-700">المساحة (هكتار)<input name="area_size" type="number" min={0} step="0.01" defaultValue={0} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-semibold text-slate-700">نوع التربة<input name="soil_type" maxLength={150} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-semibold text-slate-700">مصدر المياه<input name="water_source" maxLength={200} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-semibold text-slate-700">الحالة<select name="status" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option>صالحة</option><option>تحتاج استصلاح</option></select></label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2"><input name="is_available_for_investment" type="checkbox" className="h-4 w-4 accent-emerald-700" /> متاحة للاستثمار</label>
            <div className="flex justify-end gap-2 md:col-span-2">
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">إلغاء</button>
              <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? 'جارٍ الحفظ...' : 'حفظ الأرض'}</button>
            </div>
          </form>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <form onSubmit={filterByMunicipality} className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-5">
            <label className="min-w-60 flex-1 text-sm font-semibold text-slate-700">البحث بالبلدية
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم البلدية" className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
            </label>
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"><Search size={16} aria-hidden="true" /> بحث</button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['الأرض', 'البلدية', 'المساحة', 'نوع التربة', 'مصدر المياه', 'الحالة', 'الاستثمار'].map((title) => <th key={title} className="px-4 py-3">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => <tr key={row.id}>
                  <td className="px-4 py-4 font-bold text-slate-800">{row.land_name}</td>
                  <td className="px-4 py-4">{row.municipality}</td>
                  <td className="px-4 py-4 tabular-nums">{formatNumber(Number(row.area_size))} هكتار</td>
                  <td className="px-4 py-4">{row.soil_type || '—'}</td>
                  <td className="px-4 py-4">{row.water_source || '—'}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === 'صالحة' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{row.status}</span></td>
                  <td className="px-4 py-4">{row.is_available_for_investment ? <span className="inline-flex items-center gap-1 text-emerald-700"><Sprout size={14} /> متاحة</span> : '—'}</td>
                </tr>)}
              </tbody>
            </table>
            {!rows.length && <p className="p-12 text-center text-sm text-slate-500">لا توجد أراضٍ مسجلة تطابق البحث.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
