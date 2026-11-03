'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getDelegations, updateDelegationDates, type DelegatedEmployee } from './actions'

function parseDate(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return null
  return timestamp
}

function getDelegationDurationDays(
  startDate: string | null,
  endDate: string | null,
): number | null {
  if (!startDate) return null

  const startTimestamp = parseDate(startDate)
  if (startTimestamp === null) return null

  const today = new Date()
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const endTimestamp = endDate ? parseDate(endDate) : todayUtc
  if (endTimestamp === null || endTimestamp < startTimestamp) return null

  return Math.floor((endTimestamp - startTimestamp) / 86_400_000) + 1
}

function formatDelegationDuration(days: number): string {
  if (days < 30) return `${days} يوم`

  const months = Math.floor(days / 30)
  const remainingDays = days % 30
  return remainingDays > 0
    ? `${months} شهر و${remainingDays} يوم`
    : `${months} شهر`
}

export default function DelegationsPage() {
  const [employees, setEmployees] = useState<DelegatedEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingEmployee, setEditingEmployee] = useState<DelegatedEmployee | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [savingDates, setSavingDates] = useState(false)

  const fetchDelegations = useCallback(async () => {
    try {
      const result = await getDelegations()
      if ('error' in result) throw new Error(result.error)
      setEmployees(result.data)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل بيانات الندب والإعارة.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(fetchDelegations) }, [fetchDelegations])

  const saveDates = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingEmployee) return
    setSavingDates(true)
    setErrorMessage('')
    try {
      const result = await updateDelegationDates({
        employeeId: editingEmployee.id,
        startDate,
        endDate,
      })
      if ('error' in result) throw new Error(result.error)
      setEditingEmployee(null)
      await fetchDelegations()
      if (result.warning) setErrorMessage(`تم حفظ التواريخ، لكن ${result.warning}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حفظ تواريخ الندب.')
    } finally {
      setSavingDates(false)
    }
  }

  const filteredEmployees = employees.filter((employee) =>
    [employee.full_name, employee.employee_number, employee.department, employee.branch, employee.delegation_entity]
      .some((value) => value?.includes(searchQuery))
  )

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between rounded-xl border-r-8 border-indigo-600 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-indigo-700">الندب والإعارة</h1>
            <p className="mt-1 text-sm text-gray-500">سجل الموظفين المنتدبين والمعارين</p>
          </div>
          <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">
            العودة للموظفين
          </Link>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col items-center justify-between gap-4 border-b pb-4 md:flex-row">
            <h2 className="text-lg font-bold">الموظفون ({filteredEmployees.length})</h2>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="بحث بالاسم أو الرقم أو الجهة..."
              className="w-full rounded-lg border px-4 py-2 text-sm md:w-80"
            />
          </div>

          {loading ? (
            <p className="py-8 text-center text-gray-500">جاري تحميل البيانات...</p>
          ) : errorMessage ? (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-center text-red-700">{errorMessage}</p>
          ) : filteredEmployees.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا توجد سجلات ندب أو إعارة مطابقة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="p-3">الموظف</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">الوظيفة / القسم</th>
                    <th className="p-3">جهة الندب/الإعارة</th>
                    <th className="p-3">تاريخ البداية</th>
                    <th className="p-3">مدة الندب/الإعارة</th>
                    <th className="p-3">الفرع</th>
                    <th className="p-3">الهاتف</th>
                    <th className="p-3">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => {
                    const durationDays = getDelegationDurationDays(
                      employee.delegation_start_date,
                      employee.delegation_end_date,
                    )
                    return (
                      <tr key={employee.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <span className="block font-bold">{employee.full_name}</span>
                          <span className="text-xs text-gray-500">{employee.employee_number || 'بدون رقم وظيفي'}</span>
                        </td>
                        <td className="p-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${employee.employment_status === 'delegated' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                            {employee.employment_status === 'delegated' ? 'ندب' : 'إعارة'}
                          </span>
                        </td>
                        <td className="p-3">{employee.job_title || '-'} / {employee.department || '-'}</td>
                        <td className="p-3">{employee.delegation_entity || '-'}</td>
                        <td className="p-3">{employee.delegation_start_date || '-'}</td>
                        <td className="p-3">
                          {durationDays === null ? 'غير محدد' : `(${formatDelegationDuration(durationDays)})`}
                        </td>
                        <td className="p-3">{employee.branch || 'الإدارة الرئيسيه / طرابلس'}</td>
                        <td className="p-3" dir="ltr">{employee.phone || '-'}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEmployee(employee)
                              setStartDate(employee.delegation_start_date ?? '')
                              setEndDate(employee.delegation_end_date ?? '')
                            }}
                            className="rounded-lg border px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-50"
                          >
                            تعديل المدة
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="delegation-dialog-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <h2 id="delegation-dialog-title" className="mb-5 text-xl font-bold text-indigo-700">تعديل مدة {editingEmployee.full_name}</h2>
              <form onSubmit={saveDates} className="space-y-4">
                <label className="block text-sm font-semibold">تاريخ البداية
                  <input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="block text-sm font-semibold">تاريخ النهاية (اختياري)
                  <input type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <div className="flex gap-3 border-t pt-4">
                  <button disabled={savingDates} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white disabled:opacity-50">{savingDates ? 'جارٍ الحفظ...' : 'حفظ'}</button>
                  <button type="button" disabled={savingDates} onClick={() => setEditingEmployee(null)} className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-bold">إلغاء</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
