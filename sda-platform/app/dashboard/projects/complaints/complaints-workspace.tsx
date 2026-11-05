'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CircleAlert, MessageSquareText, Plus, X } from 'lucide-react'
import { createComplaint, getComplaints, resolveComplaint, type ComplaintRow } from './actions'

export default function ComplaintsWorkspace({
  rows,
  canManage,
  initialError,
}: {
  rows: ComplaintRow[]
  canManage: boolean
  initialError: string
}) {
  const router = useRouter()
  const [complaints, setComplaints] = useState(rows)
  const [modalOpen, setModalOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [success, setSuccess] = useState('')

  async function submitComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const result = await createComplaint(new FormData(form))
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuccess('تم تسجيل الشكوى بنجاح.')
      form.reset()
      setModalOpen(false)
      const refreshed = await getComplaints()
      if ('error' in refreshed) setError(refreshed.error)
      else setComplaints(refreshed.rows)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر تسجيل الشكوى.')
    } finally {
      setPending(false)
    }
  }

  async function handleResolve(complaint: ComplaintRow) {
    setPending(true)
    setError('')
    setSuccess('')
    try {
      const result = await resolveComplaint(complaint.id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setComplaints((current) => current.map((item) => item.id === complaint.id ? { ...item, status: 'تم الحل' } : item))
      setSuccess('تم تحديث حالة الشكوى.')
      router.refresh()
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'تعذر تحديث حالة الشكوى.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-full bg-[#07111f] p-5 text-white md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-l from-[#172b39] to-slate-950 p-6">
          <div><p className="text-sm font-bold text-emerald-300">منظومة المشروعات</p><h1 className="mt-1 text-3xl font-black">الشكاوى والمقترحات</h1><p className="mt-2 text-sm text-slate-400">استقبال الشكاوى ومتابعة حالة معالجتها.</p></div>
          {canManage && <button type="button" onClick={() => { setError(''); setModalOpen(true) }} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 font-bold text-slate-950"><Plus size={18} /> تسجيل شكوى جديدة</button>}
        </header>

        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"><CircleAlert size={18} />{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{success}</p>}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <header className="flex items-center justify-between border-b border-white/10 p-5"><h2 className="font-bold">سجل الشكاوى</h2><span className="text-sm text-slate-400">{complaints.length} شكوى</span></header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-right text-sm">
              <thead className="bg-slate-950/70 text-xs text-slate-400"><tr>{['المواطن', 'الهاتف', 'نوع الشكوى', 'الوصف', 'الحالة', 'تاريخ التقديم', 'الإجراء'].map((title) => <th key={title} className="px-4 py-3">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/[0.06]">
                {complaints.map((complaint) => <tr key={complaint.id} className="align-top hover:bg-white/[0.03]">
                  <td className="px-4 py-4 font-semibold">{complaint.citizen_name}</td>
                  <td className="px-4 py-4 font-mono text-slate-300" dir="ltr">{complaint.phone || '—'}</td>
                  <td className="px-4 py-4 text-slate-300">{complaint.complaint_type}</td>
                  <td className="max-w-md whitespace-pre-wrap px-4 py-4 text-slate-400">{complaint.description}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${complaint.status === 'تم الحل' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-300/10 text-amber-200'}`}>{complaint.status}</span></td>
                  <td className="px-4 py-4 text-slate-400">{new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium' }).format(new Date(complaint.created_at))}</td>
                  <td className="px-4 py-4">{canManage && complaint.status === 'قيد المراجعة' ? <button type="button" onClick={() => void handleResolve(complaint)} disabled={pending} aria-label={`حل شكوى ${complaint.citizen_name}`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-50"><Check size={15} /> تم الحل</button> : '—'}</td>
                </tr>)}
              </tbody>
            </table>
            {!complaints.length && <p className="p-12 text-center text-sm text-slate-500">لا توجد شكاوى مسجلة.</p>}
          </div>
        </section>
      </div>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
        <section role="dialog" aria-modal="true" aria-labelledby="complaint-title" className="my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#0c1724] p-6 shadow-2xl">
          <header className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold text-emerald-300">سجل المواطنين</p><h2 id="complaint-title" className="mt-1 text-xl font-black">تسجيل شكوى جديدة</h2></div><button type="button" aria-label="إغلاق" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10"><X /></button></header>
          <form onSubmit={submitComplaint} className="grid gap-4">
            <label className="text-sm font-semibold text-slate-300">اسم المواطن<input name="citizen_name" required maxLength={200} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300">رقم الهاتف<input name="phone" type="tel" maxLength={30} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300">نوع الشكوى<input name="complaint_type" required maxLength={150} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            <label className="text-sm font-semibold text-slate-300">الوصف<textarea name="description" required maxLength={5000} rows={5} className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-white" /></label>
            {error && <p role="alert" className="rounded-lg bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-300">إلغاء</button><button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950"><MessageSquareText size={16} />{pending ? 'جارٍ الحفظ...' : 'حفظ الشكوى'}</button></div>
          </form>
        </section>
      </div>}
    </main>
  )
}
