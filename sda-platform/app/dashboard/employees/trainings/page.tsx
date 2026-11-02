'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createTraining,
  getTrainingsData,
  type HrEmployeeOption,
  type TrainingRecord,
} from '../hr-records/actions'

export default function EmployeeTrainingsPage() {
  const [trainings, setTrainings] = useState<TrainingRecord[]>([])
  const [employees, setEmployees] = useState<HrEmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    const result = await getTrainingsData()
    if ('error' in result) throw new Error(result.error)
    setTrainings(result.data.trainings)
    setEmployees(result.data.employees)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        await refresh()
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل سجل التدريب.')
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
    try {
      const result = await createTraining(new FormData(form))
      if ('error' in result) throw new Error(result.error)
      setModalOpen(false)
      form.reset()
      await refresh()
      setNotice(result.warning ? `تم تسجيل الدورة. تنبيه سجل المراقبة: ${result.warning}` : 'تم تسجيل الدورة التدريبية.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ الدورة التدريبية.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-cyan-700 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-cyan-800">التدريب والتطوير</h1>
            <p className="mt-1 text-sm text-gray-500">سجل الدورات التدريبية والشهادات للموظفين</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة للموظفين</Link>
            <button type="button" onClick={() => { setError(''); setModalOpen(true) }} className="rounded-lg bg-cyan-700 px-4 py-2 font-bold text-white hover:bg-cyan-800">إضافة دورة</button>
          </div>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
        <section className="overflow-x-auto rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">السجل التدريبي ({trainings.length})</h2>
          {loading ? <p className="py-8 text-center text-gray-500">جاري تحميل البيانات...</p> : trainings.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا توجد دورات تدريبية مسجلة.</p>
          ) : (
            <table className="w-full min-w-[750px] text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr><th className="p-3">الموظف</th><th className="p-3">الدورة</th><th className="p-3">الجهة</th><th className="p-3">من</th><th className="p-3">إلى</th><th className="p-3">الشهادة</th><th className="p-3">ملاحظات</th></tr>
              </thead>
              <tbody>
                {trainings.map((training) => (
                  <tr key={training.id} className="border-t align-top">
                    <td className="p-3 font-semibold">{training.employee_name}</td>
                    <td className="p-3">{training.course_name}</td>
                    <td className="p-3">{training.provider || '—'}</td>
                    <td className="p-3">{training.start_date}</td>
                    <td className="p-3">{training.end_date || '—'}</td>
                    <td className="p-3">{training.certificate_download_url ? <a href={training.certificate_download_url} target="_blank" rel="noreferrer" className="font-semibold text-cyan-700 underline">تحميل</a> : '—'}</td>
                    <td className="max-w-sm p-3">{training.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="training-dialog-title" className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <h2 id="training-dialog-title" className="mb-5 text-xl font-bold text-cyan-800">إضافة دورة تدريبية</h2>
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">الموظف
                  <select name="employee_id" required defaultValue="" className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="">اختر الموظف</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold">اسم الدورة
                  <input name="course_name" required maxLength={250} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold">الجهة المنفذة
                  <input name="provider" maxLength={250} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold">تاريخ البداية
                  <input name="start_date" type="date" required className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold">تاريخ النهاية
                  <input name="end_date" type="date" className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold">الشهادة (PDF أو صورة)
                  <input name="certificate" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="text-sm font-semibold sm:col-span-2">ملاحظات
                  <textarea name="notes" maxLength={4000} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <div className="flex gap-3 border-t pt-4 sm:col-span-2">
                  <button disabled={saving} className="flex-1 rounded-lg bg-cyan-700 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ الدورة'}</button>
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
