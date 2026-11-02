'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  createDecision,
  getDecisionData,
  type DecisionEmployee,
  type DecisionType,
  type HrDecision,
} from './actions'

const decisionLabels: Record<DecisionType, string> = {
  appointment: 'تعيين',
  promotion: 'ترقية',
  job_title: 'تغيير المسمى الوظيفي',
  transfer: 'نقل',
  delegation: 'ندب',
  secondment: 'إعارة',
  allowance: 'علاوة',
  termination: 'إنهاء خدمة',
}

const fixedDecisionTypes: DecisionType[] = ['appointment', 'delegation', 'secondment', 'termination']

export default function DecisionsClient() {
  const [decisions, setDecisions] = useState<HrDecision[]>([])
  const [employees, setEmployees] = useState<DecisionEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({
    employeeId: '',
    decisionType: 'appointment' as DecisionType,
    decisionNumber: '',
    decisionDate: '',
    details: '',
    newValue: '',
  })

  const refresh = async () => {
    setLoading(true)
    const result = await getDecisionData()
    if ('error' in result) setError(result.error)
    else {
      setDecisions(result.decisions)
      setEmployees(result.employees)
    }
    setLoading(false)
  }

  useEffect(() => { void Promise.resolve().then(refresh) }, [])

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await createDecision(form)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setModalOpen(false)
      setNotice(result.warning ?? 'تم إصدار القرار وتحديث ملف الموظف.')
      setForm({
        employeeId: '',
        decisionType: 'appointment',
        decisionNumber: '',
        decisionDate: '',
        details: '',
        newValue: '',
      })
      await refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ القرار.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-[#157A3F] bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-[#157A3F]">القرارات والإجراءات الوظيفية</h1>
            <p className="mt-1 text-sm text-gray-500">سجل القرارات الإدارية المعتمدة للموظفين</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة للموظفين</Link>
            <button type="button" onClick={() => { setError(''); setModalOpen(true) }} className="rounded-lg bg-[#157A3F] px-4 py-2 font-bold text-white hover:bg-green-800">إصدار قرار جديد</button>
          </div>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">{notice}</p>}

        <section className="overflow-x-auto rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold">سجل القرارات ({decisions.length})</h2>
          {loading ? <p className="py-8 text-center text-gray-500">جاري تحميل القرارات...</p> : decisions.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا توجد قرارات مسجلة.</p>
          ) : (
            <table className="w-full min-w-[800px] text-right text-sm">
              <thead><tr className="border-b bg-gray-50 text-gray-600">
                <th className="p-3">رقم القرار</th><th className="p-3">الموظف</th><th className="p-3">النوع</th>
                <th className="p-3">التاريخ</th><th className="p-3">القيمة الجديدة</th><th className="p-3">الإجراء</th>
              </tr></thead>
              <tbody>{decisions.map((decision) => (
                <tr key={decision.id} className="border-b">
                  <td className="p-3 font-semibold">{decision.decision_number}</td>
                  <td className="p-3">{decision.employee_name}</td>
                  <td className="p-3">{decisionLabels[decision.decision_type]}</td>
                  <td className="p-3">{decision.decision_date}</td>
                  <td className="max-w-xs truncate p-3">{decision.new_value ?? '-'}</td>
                  <td className="p-3"><Link className="font-bold text-[#157A3F] hover:underline" href={`/dashboard/employees/decisions/${decision.id}/print`}>عرض / طباعة</Link></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-5 text-xl font-bold text-[#157A3F]">إصدار قرار إداري</h2>
            <form onSubmit={save} className="space-y-4">
              <label className="block text-sm font-semibold">الموظف
                <select required value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })} className="mt-1 w-full rounded-lg border p-3">
                  <option value="">اختر الموظف</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">نوع القرار
                <select value={form.decisionType} onChange={(event) => setForm({ ...form, decisionType: event.target.value as DecisionType, newValue: '' })} className="mt-1 w-full rounded-lg border p-3">
                  {(Object.keys(decisionLabels) as DecisionType[]).map((type) => <option key={type} value={type}>{decisionLabels[type]}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">رقم القرار
                  <input required maxLength={100} value={form.decisionNumber} onChange={(event) => setForm({ ...form, decisionNumber: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="block text-sm font-semibold">تاريخ القرار
                  <input required type="date" value={form.decisionDate} onChange={(event) => setForm({ ...form, decisionDate: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                </label>
              </div>
              {!fixedDecisionTypes.includes(form.decisionType) && (
                <label className="block text-sm font-semibold">{form.decisionType === 'allowance' ? 'قيمة العلاوة' : 'القيمة الجديدة'}
                  <input required type={form.decisionType === 'allowance' ? 'number' : 'text'} min={form.decisionType === 'allowance' ? 0 : undefined} value={form.newValue} onChange={(event) => setForm({ ...form, newValue: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                </label>
              )}
              <label className="block text-sm font-semibold">نص القرار / التفاصيل
                <textarea required maxLength={4000} rows={5} value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
              </label>
              <div className="flex gap-3 pt-2">
                <button disabled={saving} className="flex-1 rounded-lg bg-[#157A3F] p-3 font-bold text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'حفظ وإصدار القرار'}</button>
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg bg-gray-100 px-5 font-semibold">إلغاء</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
