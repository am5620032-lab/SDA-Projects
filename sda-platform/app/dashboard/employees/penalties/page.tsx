'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createPenalty,
  getPenaltiesData,
  type HrEmployeeOption,
  type PenaltyRecord,
} from '../hr-records/actions'

const emptyForm = {
  employeeId: '',
  violationType: '',
  description: '',
  decisionNumber: '',
  decisionDate: '',
  penaltyType: '',
}

export default function EmployeePenaltiesPage() {
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([])
  const [employees, setEmployees] = useState<HrEmployeeOption[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    const result = await getPenaltiesData()
    if ('error' in result) throw new Error(result.error)
    setPenalties(result.data.penalties)
    setEmployees(result.data.employees)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        await refresh()
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل سجل الجزاءات.')
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
    try {
      const result = await createPenalty(form)
      if ('error' in result) throw new Error(result.error)
      setModalOpen(false)
      setForm(emptyForm)
      await refresh()
      setNotice(result.warning ? `تم تسجيل الجزاء. تنبيه سجل المراقبة: ${result.warning}` : 'تم تسجيل الجزاء بنجاح.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ الجزاء.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-red-700 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-red-800">الجزاءات والمخالفات</h1>
            <p className="mt-1 text-sm text-gray-500">سجل القرارات والإجراءات التأديبية للموظفين</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة للموظفين</Link>
            <button type="button" onClick={() => { setError(''); setModalOpen(true) }} className="rounded-lg bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800">إضافة جزاء</button>
          </div>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
        <section className="overflow-x-auto rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">سجل الجزاءات ({penalties.length})</h2>
          {loading ? <p className="py-8 text-center text-gray-500">جاري تحميل البيانات...</p> : penalties.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا توجد جزاءات مسجلة.</p>
          ) : (
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">نوع المخالفة</th>
                  <th className="p-3">العقوبة</th>
                  <th className="p-3">رقم القرار</th>
                  <th className="p-3">تاريخ القرار</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {penalties.map((penalty) => (
                  <tr key={penalty.id} className="border-t align-top">
                    <td className="p-3 font-semibold">{penalty.employee_name}</td>
                    <td className="p-3">{penalty.violation_type}</td>
                    <td className="p-3">{penalty.penalty_type}</td>
                    <td className="p-3">{penalty.decision_number}</td>
                    <td className="p-3">{penalty.decision_date}</td>
                    <td className="p-3">{penalty.status === 'active' ? 'ساري' : penalty.status}</td>
                    <td className="max-w-sm p-3">{penalty.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="penalty-dialog-title" className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <h2 id="penalty-dialog-title" className="mb-5 text-xl font-bold text-red-800">إضافة جزاء أو مخالفة</h2>
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">الموظف
                  <select required value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="">اختر الموظف</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold">نوع المخالفة
                  <input required maxLength={200} value={form.violationType} onChange={(event) => setForm({ ...form, violationType: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold">نوع العقوبة
                  <input required maxLength={200} value={form.penaltyType} onChange={(event) => setForm({ ...form, penaltyType: event.target.value })} placeholder="إنذار، خصم..." className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold">رقم القرار
                  <input required maxLength={100} value={form.decisionNumber} onChange={(event) => setForm({ ...form, decisionNumber: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold">تاريخ القرار
                  <input type="date" required value={form.decisionDate} onChange={(event) => setForm({ ...form, decisionDate: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold sm:col-span-2">وصف المخالفة
                  <textarea required maxLength={4000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <div className="flex gap-3 border-t pt-4 sm:col-span-2">
                  <button disabled={saving} className="flex-1 rounded-lg bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ الجزاء'}</button>
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
