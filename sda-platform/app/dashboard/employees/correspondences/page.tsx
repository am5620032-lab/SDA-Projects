'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createCorrespondence,
  getCorrespondencesData,
  type CorrespondenceRecord,
  type HrEmployeeOption,
} from '../hr-records/actions'

export default function EmployeeCorrespondencesPage() {
  const [correspondences, setCorrespondences] = useState<CorrespondenceRecord[]>([])
  const [employees, setEmployees] = useState<HrEmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    const result = await getCorrespondencesData()
    if ('error' in result) throw new Error(result.error)
    setCorrespondences(result.data.correspondences)
    setEmployees(result.data.employees)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        await refresh()
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل سجل المراسلات.')
      } finally {
        setLoading(false)
      }
    })
  }, [refresh])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const form = event.currentTarget
    const values = new FormData(form)
    try {
      const type = String(values.get('type') ?? '')
      if (type !== 'incoming' && type !== 'outgoing') throw new Error('نوع المراسلة غير صالح.')
      const result = await createCorrespondence({
        type,
        referenceNumber: String(values.get('reference_number') ?? ''),
        subject: String(values.get('subject') ?? ''),
        date: String(values.get('date') ?? ''),
        relatedEmployeeId: String(values.get('related_employee_id') ?? ''),
        notes: String(values.get('notes') ?? ''),
      })
      if ('error' in result) throw new Error(result.error)
      form.reset()
      setModalOpen(false)
      await refresh()
      setNotice(result.warning ? `تم تسجيل المراسلة. تنبيه سجل المراقبة: ${result.warning}` : 'تم تسجيل المراسلة بنجاح.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر تسجيل المراسلة.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-sky-700 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-sky-800">المراسلات الإدارية</h1>
            <p className="mt-1 text-sm text-gray-500">سجل المراسلات الواردة والصادرة وربطها بالموظفين</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة للموظفين</Link>
            <button type="button" onClick={() => { setError(''); setModalOpen(true) }} className="rounded-lg bg-sky-700 px-4 py-2 font-bold text-white hover:bg-sky-800">تسجيل مراسلة</button>
          </div>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
        <section className="overflow-x-auto rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">سجل الصادر والوارد ({correspondences.length})</h2>
          {loading ? <p className="py-8 text-center text-gray-500">جاري تحميل البيانات...</p> : correspondences.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا توجد مراسلات مسجلة.</p>
          ) : (
            <table className="w-full min-w-[800px] text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr><th className="p-3">النوع</th><th className="p-3">رقم المرجع</th><th className="p-3">الموضوع</th><th className="p-3">التاريخ</th><th className="p-3">الموظف المرتبط</th><th className="p-3">ملاحظات</th></tr>
              </thead>
              <tbody>
                {correspondences.map((correspondence) => (
                  <tr key={correspondence.id} className="border-t align-top">
                    <td className="p-3">{correspondence.type === 'incoming' ? 'واردة' : 'صادرة'}</td>
                    <td className="p-3 font-semibold">{correspondence.reference_number}</td>
                    <td className="p-3">{correspondence.subject}</td>
                    <td className="p-3">{correspondence.date}</td>
                    <td className="p-3">{correspondence.related_employee_name}</td>
                    <td className="max-w-sm p-3">{correspondence.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="correspondence-dialog-title" className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <h2 id="correspondence-dialog-title" className="mb-5 text-xl font-bold text-sky-800">تسجيل مراسلة</h2>
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">نوع المراسلة
                  <select name="type" required defaultValue="incoming" className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="incoming">واردة</option>
                    <option value="outgoing">صادرة</option>
                  </select>
                </label>
                <label className="text-sm font-semibold">رقم المرجع
                  <input name="reference_number" required maxLength={100} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold">التاريخ
                  <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold">الموظف المرتبط (اختياري)
                  <select name="related_employee_id" defaultValue="" className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="">بدون ربط بموظف</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold sm:col-span-2">موضوع المراسلة
                  <input name="subject" required maxLength={500} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold sm:col-span-2">ملاحظات
                  <textarea name="notes" maxLength={4000} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <div className="flex gap-3 border-t pt-4 sm:col-span-2">
                  <button disabled={saving} className="flex-1 rounded-lg bg-sky-700 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ المراسلة'}</button>
                  <button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-700">إلغاء</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
