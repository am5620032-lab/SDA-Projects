'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CircleAlert, FileText, Plus, X } from 'lucide-react'
import type { DevelopmentProject } from '../actions'
import { createContract, getContracts, type ContractRow } from './actions'

const formatNumber = (value: number) => new Intl.NumberFormat('ar-LY').format(value)

function isEndingSoon(endDate: string | null) {
  if (!endDate) return false
  const remainingDays = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)) / 86_400_000
  return remainingDays <= 30
}

export default function ContractsWorkspace({
  rows,
  projects,
  canManage,
  initialError,
}: {
  rows: ContractRow[]
  projects: DevelopmentProject[]
  canManage: boolean
  initialError: string
}) {
  const router = useRouter()
  const [contracts, setContracts] = useState(rows)
  const [modalOpen, setModalOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')
  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.project_name])), [projects])

  async function submitContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const result = await createContract(new FormData(form))
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuccess('تم تسجيل العقد بنجاح.')
      form.reset()
      setModalOpen(false)
      const refreshed = await getContracts()
      if ('error' in refreshed) setError(refreshed.error)
      else setContracts(refreshed.rows)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر تسجيل العقد.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-full bg-[#07111f] p-5 text-white md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-l from-[#172b39] to-slate-950 p-6">
          <div>
            <p className="text-sm font-bold text-emerald-300">منظومة المشروعات</p>
            <h1 className="mt-1 text-3xl font-black">العقود والمناقصات</h1>
            <p className="mt-2 text-sm text-slate-400">متابعة العقود المرتبطة بمحفظة المشاريع ومواعيد انتهائها.</p>
          </div>
          {canManage && <button type="button" onClick={() => { setError(''); setModalOpen(true) }} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 font-bold text-slate-950"><Plus size={18} /> إضافة عقد جديد</button>}
        </header>

        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"><CircleAlert size={18} />{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{success}</p>}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <h2 className="font-bold">سجل العقود</h2><span className="text-sm text-slate-400">{contracts.length} عقد</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-right text-sm">
              <thead className="bg-slate-950/70 text-xs text-slate-400"><tr>{['رقم العقد', 'المقاول / الشركة', 'المشروع المرتبط', 'القيمة', 'البداية', 'النهاية', 'الحالة'].map((title) => <th key={title} className="px-4 py-3">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/[0.06]">
                {contracts.map((contract) => {
                  const expiring = isEndingSoon(contract.end_date)
                  return <tr key={contract.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-4 font-mono text-slate-200" dir="ltr">{contract.contract_number}</td>
                    <td className="px-4 py-4 font-semibold">{contract.contractor_name}</td>
                    <td className="px-4 py-4 text-slate-300">{contract.project_id ? projectNames.get(contract.project_id) ?? 'مشروع غير متاح' : '—'}</td>
                    <td className="px-4 py-4 tabular-nums text-amber-200">{formatNumber(Number(contract.value))} د.ل</td>
                    <td className="px-4 py-4 text-slate-300">{contract.start_date ?? '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${expiring ? 'bg-rose-400/15 text-rose-200' : 'bg-slate-800 text-slate-300'}`}>
                        {expiring && <AlertTriangle size={13} aria-label="ينتهي خلال 30 يوماً أو انتهى" />}
                        {contract.end_date ?? '—'}{expiring && <span>{contract.end_date && contract.end_date < new Date().toISOString().slice(0, 10) ? ' · منتهٍ' : ' · ينتهي قريباً'}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4"><span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-xs font-bold text-sky-200">{contract.status}</span></td>
                  </tr>
                })}
              </tbody>
            </table>
            {!contracts.length && <p className="p-12 text-center text-sm text-slate-500">لا توجد عقود مسجلة.</p>}
          </div>
        </section>
      </div>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
        <section role="dialog" aria-modal="true" aria-labelledby="contract-title" className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0c1724] p-6 shadow-2xl">
          <header className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold text-emerald-300">سجل التعاقدات</p><h2 id="contract-title" className="mt-1 text-xl font-black">إضافة عقد جديد</h2></div><button type="button" aria-label="إغلاق" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X /></button></header>
          <form onSubmit={submitContract} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-300">رقم العقد<input name="contract_number" required maxLength={100} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300">اسم المقاول / الشركة<input name="contractor_name" required maxLength={200} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300 sm:col-span-2">المشروع المرتبط<select name="project_id" required defaultValue="" className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white"><option value="" disabled>اختر المشروع</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} — {project.project_name}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-300">قيمة العقد<input name="value" type="number" min={0} step="0.01" required className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300">الحالة<select name="status" className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white"><option>مسودة</option><option>قيد التنفيذ</option><option>مكتمل</option><option>ملغي</option></select></label>
            <label className="text-sm font-semibold text-slate-300">تاريخ البداية<input name="start_date" type="date" required className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300">تاريخ النهاية<input name="end_date" type="date" required className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            {error && <p role="alert" className="sm:col-span-2 rounded-lg bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-300">إلغاء</button><button type="submit" disabled={pending || !projects.length} className="inline-flex items-center gap-2 rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><FileText size={16} />{pending ? 'جارٍ الحفظ...' : 'حفظ العقد'}</button></div>
            {!projects.length && <p className="sm:col-span-2 text-sm text-amber-200">أضف مشروعاً أولاً لربط العقد به.</p>}
          </form>
        </section>
      </div>}
    </main>
  )
}
