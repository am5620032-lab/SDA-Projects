'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, CircleAlert, HandCoins, Send, X } from 'lucide-react'
import { submitInvestmentApplication, type InvestmentOpportunityRow } from '../strategic-actions'

const formatNumber = (value: number) => new Intl.NumberFormat('ar-LY', { maximumFractionDigits: 0 }).format(value)

export default function InvestmentsWorkspace({
  rows,
  initialName,
  initialEmail,
  error: initialError,
}: {
  rows: InvestmentOpportunityRow[]
  initialName: string
  initialEmail: string
  error: string
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')
  const selectedOpportunity = rows.find((row) => row.id === selectedId)

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const result = await submitInvestmentApplication(new FormData(event.currentTarget))
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuccess('تم تسجيل طلب الاستثمار. سيجري التواصل معكم بعد مراجعته.')
      setSelectedId(null)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر تسجيل طلب الاستثمار.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-full p-5 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 rounded-3xl bg-gradient-to-l from-emerald-900 to-slate-900 p-7 text-white shadow-xl md:p-9">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1 text-xs font-bold text-emerald-100"><HandCoins size={15} aria-hidden="true" /> بوابة الاستثمار</div>
          <h1 className="mt-4 text-3xl font-black md:text-4xl">الفرص الاستثمارية في الجنوب</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-emerald-50/75">استكشف الفرص المتاحة وقدّم طلب اهتمام أولياً لمراجعته من قبل فريق المنظومة.</p>
        </header>

        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={18} />{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
        <section aria-label="الفرص المتاحة" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((opportunity) => (
            <article key={opportunity.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><HandCoins size={21} aria-hidden="true" /></span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{opportunity.sector}</span>
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-900">{opportunity.title}</h2>
              <p className="mt-2 flex-1 whitespace-pre-wrap text-sm leading-7 text-slate-600">{opportunity.description || 'تفاصيل الفرصة متاحة عند التواصل مع فريق الاستثمار.'}</p>
              <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2 text-slate-500"><Banknote size={16} aria-hidden="true" /> التكلفة التقديرية</dt>
                  <dd className="font-bold tabular-nums text-slate-900">{opportunity.estimated_cost ? `${formatNumber(Number(opportunity.estimated_cost))} د.ل` : 'تحدد لاحقاً'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">المستثمر المستهدف</dt><dd className="font-semibold text-slate-700">{opportunity.target_investor || 'مفتوح'}</dd></div>
              </dl>
              <button type="button" onClick={() => { setError(''); setSelectedId(opportunity.id) }} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800">
                <Send size={16} aria-hidden="true" /> تقديم طلب استثمار
              </button>
            </article>
          ))}
          {!rows.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">لا توجد فرص استثمارية متاحة حالياً.</div>}
        </section>
      </div>

      {selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="investment-application-title" className="my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl md:p-7">
            <header className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-700">طلب اهتمام أولي</p>
                <h2 id="investment-application-title" className="mt-1 text-xl font-black text-slate-900">{selectedOpportunity.title}</h2>
              </div>
              <button type="button" aria-label="إغلاق" onClick={() => setSelectedId(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </header>
            <form onSubmit={submitApplication} className="grid gap-4">
              <input type="hidden" name="opportunity_id" value={selectedOpportunity.id} />
              <label className="text-sm font-semibold text-slate-700">اسم مقدم الطلب<input name="applicant_name" required maxLength={200} defaultValue={initialName} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-semibold text-slate-700">البريد الإلكتروني<input name="applicant_email" type="email" required maxLength={254} defaultValue={initialEmail} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              <label className="text-sm font-semibold text-slate-700">نبذة عن الطلب<textarea name="note" rows={4} maxLength={2000} placeholder="اكتب نبذة عن اهتمامك الاستثماري..." className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50"><Send size={16} />{pending ? 'جارٍ إرسال الطلب...' : 'إرسال الطلب'}</button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
