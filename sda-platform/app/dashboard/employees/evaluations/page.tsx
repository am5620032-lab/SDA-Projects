'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createEvaluation,
  getEvaluationsData,
  updateEvaluationStatus,
  type EvaluationRecord,
  type HrEmployeeOption,
} from '../hr-records/actions'

export default function EmployeeEvaluationsPage() {
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([])
  const [employees, setEmployees] = useState<HrEmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    const result = await getEvaluationsData()
    if ('error' in result) throw new Error(result.error)
    setEvaluations(result.data.evaluations)
    setEmployees(result.data.employees)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        await refresh()
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل التقييمات.')
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
      const result = await createEvaluation({
        employeeId: String(values.get('employee_id') ?? ''),
        year: Number(values.get('year')),
        score: Number(values.get('score')),
        notes: String(values.get('notes') ?? ''),
      })
      if ('error' in result) throw new Error(result.error)
      form.reset()
      setModalOpen(false)
      await refresh()
      setNotice(result.warning ? `تم حفظ التقييم كمسودة. تنبيه سجل المراقبة: ${result.warning}` : 'تم حفظ التقييم كمسودة.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ التقييم.')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (evaluation: EvaluationRecord, status: 'draft' | 'approved') => {
    setError('')
    setNotice('')
    try {
      const result = await updateEvaluationStatus(evaluation.id, status)
      if ('error' in result) throw new Error(result.error)
      await refresh()
      setNotice(result.warning ? `تم تحديث حالة التقييم. تنبيه: ${result.warning}` : 'تم تحديث حالة التقييم.')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'تعذر تحديث حالة التقييم.')
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-violet-700 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-violet-800">تقييم الأداء الوظيفي</h1>
            <p className="mt-1 text-sm text-gray-500">سجل التقييمات السنوية وحالات اعتمادها</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة للموظفين</Link>
            <button type="button" onClick={() => { setError(''); setModalOpen(true) }} className="rounded-lg bg-violet-700 px-4 py-2 font-bold text-white hover:bg-violet-800">تقييم موظف</button>
          </div>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
        <section className="overflow-x-auto rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">التقييمات ({evaluations.length})</h2>
          {loading ? <p className="py-8 text-center text-gray-500">جاري تحميل البيانات...</p> : evaluations.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا توجد تقييمات مسجلة.</p>
          ) : (
            <table className="w-full min-w-[800px] text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr><th className="p-3">الموظف</th><th className="p-3">السنة</th><th className="p-3">الدرجة</th><th className="p-3">المقيّم</th><th className="p-3">الحالة</th><th className="p-3">ملاحظات</th><th className="p-3">الإجراء</th></tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="border-t align-top">
                    <td className="p-3 font-semibold">{evaluation.employee_name}</td>
                    <td className="p-3">{evaluation.year}</td>
                    <td className="p-3 font-bold">{evaluation.score} / 100</td>
                    <td className="p-3">{evaluation.evaluator_name}</td>
                    <td className="p-3">{evaluation.status === 'approved' ? 'معتمد' : 'مسودة'}</td>
                    <td className="max-w-sm p-3">{evaluation.notes || '—'}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => void changeStatus(evaluation, evaluation.status === 'approved' ? 'draft' : 'approved')} className="rounded-lg bg-violet-50 px-3 py-1 font-semibold text-violet-700 hover:bg-violet-100">
                        {evaluation.status === 'approved' ? 'إعادة لمسودة' : 'اعتماد'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="evaluation-dialog-title" className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
              <h2 id="evaluation-dialog-title" className="mb-5 text-xl font-bold text-violet-800">تقييم موظف</h2>
              <form onSubmit={submit} className="space-y-4">
                <label className="block text-sm font-semibold">الموظف
                  <select name="employee_id" required defaultValue="" className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="">اختر الموظف</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">السنة
                    <input name="year" type="number" min="1900" max={new Date().getFullYear()} defaultValue={new Date().getFullYear()} required className="mt-1 w-full rounded-lg border px-3 py-2" />
                  </label>
                  <label className="block text-sm font-semibold">الدرجة من 100
                    <input name="score" type="number" min="0" max="100" step="0.01" required className="mt-1 w-full rounded-lg border px-3 py-2" />
                  </label>
                </div>
                <label className="block text-sm font-semibold">ملاحظات
                  <textarea name="notes" maxLength={4000} rows={4} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <p className="text-xs text-gray-500">سيُحفظ التقييم كمسودة إلى حين اعتماده من الجدول.</p>
                <div className="flex gap-3 border-t pt-4">
                  <button disabled={saving} className="flex-1 rounded-lg bg-violet-700 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ المسودة'}</button>
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
