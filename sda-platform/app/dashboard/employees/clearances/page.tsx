'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  getClearancesData,
  startClearance,
  type ClearanceEmployee,
} from './actions'

export default function EmployeeClearancesPage() {
  const [employees, setEmployees] = useState<ClearanceEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [blockedAssets, setBlockedAssets] = useState<{ employeeId: string; employeeName: string; assets: string[] } | null>(null)

  const refresh = useCallback(async () => {
    const result = await getClearancesData()
    if ('error' in result) throw new Error(result.error)
    setEmployees(result.data.employees)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        await refresh()
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل طلبات إخلاء الطرف.')
      } finally {
        setLoading(false)
      }
    })
  }, [refresh])

  const begin = async (employee: ClearanceEmployee) => {
    setWorkingId(employee.id)
    setError('')
    setNotice('')
    setBlockedAssets(null)
    try {
      const result = await startClearance(employee.id)
      if ('error' in result) throw new Error(result.error)
      if ('blockedAssets' in result) {
        setBlockedAssets({ employeeId: employee.id, employeeName: employee.full_name, assets: result.blockedAssets })
        await refresh()
        return
      }
      await refresh()
      setNotice(result.alreadyCleared
        ? `تم إخلاء طرف ${employee.full_name} سابقاً.`
        : result.warning
          ? `صدر إخلاء الطرف، مع تعذر تسجيل الحركة: ${result.warning}`
          : `تم التحقق من العهد وإصدار إخلاء طرف ${employee.full_name}.`)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'تعذر بدء إخلاء الطرف.')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-emerald-700 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-emerald-800">إخلاء الطرف</h1>
            <p className="mt-1 text-sm text-gray-500">التحقق من إعادة العهد قبل إصدار شهادة إخلاء الطرف</p>
          </div>
          <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة للموظفين</Link>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
        {blockedAssets && (
          <section role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-5 text-red-800">
            <h2 className="font-bold">لا يمكن إخلاء الطرف: {blockedAssets.employeeName} لم يسلم العهد التالية:</h2>
            <ul className="mt-2 list-inside list-disc">
              {blockedAssets.assets.map((asset, index) => <li key={`${asset}-${index}`}>{asset}</li>)}
            </ul>
            <p className="mt-2 text-sm">سجّل إعادة العهد في صفحة العهد ثم أعد المحاولة.</p>
            <Link href="/dashboard/employees/assets" className="mt-3 inline-block font-bold underline">الانتقال إلى سجل العهد</Link>
          </section>
        )}

        <section className="overflow-x-auto rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">الموظفون المنتهية خدمتهم أو المستقيلون ({employees.length})</h2>
          {loading ? <p className="py-8 text-center text-gray-500">جاري تحميل البيانات...</p> : employees.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا يوجد موظفون منتهية خدمتهم حالياً.</p>
          ) : (
            <table className="w-full min-w-[700px] text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr><th className="p-3">الموظف</th><th className="p-3">الحالة الوظيفية</th><th className="p-3">حالة إخلاء الطرف</th><th className="p-3">تاريخ الطلب</th><th className="p-3">الإجراء</th></tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t">
                    <td className="p-3 font-semibold">{employee.full_name}</td>
                    <td className="p-3">{employee.employment_status === 'resigned' ? 'مستقيل' : 'منتهية خدمته'}</td>
                    <td className="p-3">{employee.clearance_status === 'cleared' ? 'مكتمل' : employee.clearance_status === 'pending' ? 'قيد الإجراء' : 'لم يبدأ'}</td>
                    <td className="p-3">{employee.request_date || '—'}</td>
                    <td className="flex flex-wrap gap-2 p-3">
                      <button type="button" disabled={workingId === employee.id} onClick={() => void begin(employee)} className="rounded-lg bg-emerald-700 px-3 py-1 font-semibold text-white disabled:opacity-50">
                        {workingId === employee.id ? 'جارٍ الفحص...' : 'بدء / إعادة الفحص'}
                      </button>
                      {employee.clearance_id && employee.clearance_status === 'cleared' && (
                        <Link href={`/dashboard/employees/clearances/${employee.clearance_id}/print`} className="rounded-lg bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">طباعة الشهادة</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  )
}
