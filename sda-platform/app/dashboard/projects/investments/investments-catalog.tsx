'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, CircleAlert, HandCoins, Plus, X } from 'lucide-react'
import EmptyState from '@/components/projects/EmptyState'
import { createInvestment, getInvestments, type InvestmentRow } from '../strategic-actions'

const formatNumber = (value: number) => new Intl.NumberFormat('ar-LY').format(value)

export default function InvestmentsCatalog({
  rows,
  canManage,
  initialError,
}: {
  rows: InvestmentRow[]
  canManage: boolean
  initialError: string
}) {
  const router = useRouter()
  const [investments, setInvestments] = useState(rows)
  const [selected, setSelected] = useState<InvestmentRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')

  async function submitInvestment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const result = await createInvestment(new FormData(form))
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuccess('تمت إضافة الفرصة الاستثمارية.')
      form.reset()
      setFormOpen(false)
      const refreshed = await getInvestments()
      if ('error' in refreshed) setError(refreshed.error)
      else setInvestments(refreshed.rows)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر إضافة الفرصة الاستثمارية.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section dir="rtl" aria-label="فرص الاستثمار الاستراتيجية" className="mb-8 text-white">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-bold text-emerald-300">محفظة المبادرات</p><h2 className="mt-1 text-2xl font-black">الفرص الاستثمارية</h2></div>
        {canManage && <button type="button" onClick={() => { setError(''); setFormOpen(true) }} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-slate-950"><Plus size={17} /> إضافة فرصة جديدة</button>}
      </header>
      {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"><CircleAlert size={18} />{error}</p>}
      {success && <p role="status" className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{success}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {investments.map((investment) => <article key={investment.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/10 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-emerald-300/30">
          <div className="flex items-start justify-between gap-3"><span className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300"><HandCoins size={21} /></span><span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-200">{investment.status}</span></div>
          <h3 className="mt-4 text-lg font-black">{investment.title}</h3>
          <p className="mt-2 text-sm text-slate-400">{investment.sector}</p>
          <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-4 text-sm"><span className="inline-flex items-center gap-2 text-slate-400"><Banknote size={16} /> التكلفة التقديرية</span><strong className="tabular-nums text-amber-200">{formatNumber(Number(investment.estimated_cost))} د.ل</strong></div>
          <button type="button" onClick={() => setSelected(investment)} className="mt-5 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-emerald-200 hover:bg-white/5">التفاصيل</button>
        </article>)}
        {!investments.length && <div className="md:col-span-2 xl:col-span-3"><EmptyState icon={HandCoins} description="لا توجد فرص في سجل الاستثمارات حالياً." onAction={canManage ? () => setFormOpen(true) : undefined} /></div>}
      </div>

      {selected && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
        <section role="dialog" aria-modal="true" aria-labelledby="investment-details-title" className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0c1724] p-6 text-white shadow-2xl">
          <header className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-emerald-300">{selected.sector} · {selected.status}</p><h2 id="investment-details-title" className="mt-1 text-xl font-black">{selected.title}</h2></div><button type="button" aria-label="إغلاق" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X /></button></header>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">{selected.description || 'لا يوجد وصف إضافي لهذه الفرصة.'}</p>
          <p className="mt-5 border-t border-white/10 pt-4 text-sm text-slate-400">التكلفة التقديرية: <strong className="text-amber-200">{formatNumber(Number(selected.estimated_cost))} د.ل</strong></p>
        </section>
      </div>}

      {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
        <section role="dialog" aria-modal="true" aria-labelledby="new-investment-title" className="my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#0c1724] p-6 text-white shadow-2xl">
          <header className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold text-emerald-300">محفظة المبادرات</p><h2 id="new-investment-title" className="mt-1 text-xl font-black">إضافة فرصة جديدة</h2></div><button type="button" aria-label="إغلاق" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X /></button></header>
          <form onSubmit={submitInvestment} className="grid gap-4">
            <label className="text-sm font-semibold text-slate-300">عنوان الفرصة<input name="title" required maxLength={200} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300">القطاع<input name="sector" required maxLength={150} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300">التكلفة التقديرية<input name="estimated_cost" type="number" min={0} step="0.01" required className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300">الحالة<input name="status" required maxLength={100} defaultValue="مقترح" className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300">الوصف<textarea name="description" maxLength={5000} rows={4} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            {error && <p role="alert" className="rounded-lg bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-300">إلغاء</button><button type="submit" disabled={pending} className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950">{pending ? 'جارٍ الحفظ...' : 'حفظ الفرصة'}</button></div>
          </form>
        </section>
      </div>}
    </section>
  )
}
