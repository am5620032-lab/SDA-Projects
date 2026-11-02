'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getAttendanceDashboardData,
  recordAttendance,
  recordAttendanceCheckout,
  type AttendanceEmployee,
  type AttendanceRecord,
} from './actions'

function getEmployeeName(record: AttendanceRecord) {
  return record.employees?.full_name || 'غير محدد'
}

function formatTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('ar-LY', {
        timeZone: 'Africa/Tripoli',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ar-LY', {
    timeZone: 'Africa/Tripoli',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export default function EmployeeAttendancePage() {
  const [employee, setEmployee] = useState<AttendanceEmployee | null>(null)
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const result = await getAttendanceDashboardData()
      if ('error' in result) throw new Error(result.error)
      setEmployee(result.data.employee)
      setTodayRecord(result.data.todayRecord)
      setAttendance(result.data.attendance)
      const record = result.data.todayRecord
      setSuccessMessage(record ? 'لقد سجلت حضورك اليوم بالفعل' : '')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل بيانات الحضور.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(fetchData)
  }, [fetchData])

  const handleCheckIn = async () => {
    if (!employee || saving) return
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await recordAttendance()
      if ('error' in result) throw new Error(result.error)
      await fetchData()
      setSuccessMessage('تم تسجيل الحضور بنجاح.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تسجيل الحضور.')
    } finally {
      setSaving(false)
    }
  }

  const handleCheckOut = async () => {
    if (!todayRecord || todayRecord.check_out || saving) return
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await recordAttendanceCheckout(todayRecord.id)
      if ('error' in result) throw new Error(result.error)
      await fetchData()
      setSuccessMessage('تم تسجيل الانصراف بنجاح.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تسجيل الانصراف.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between rounded-xl border-r-8 border-blue-600 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="شعار الجهاز" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-blue-800">منظومة الحضور والانصراف</h1>
              {employee && <p className="mt-1 text-sm text-gray-600">{employee.full_name}</p>}
            </div>
          </div>
          <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة للموظفين</Link>
        </header>

        <section aria-label="تسجيل الحضور والانصراف" className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-800">تسجيل اليوم</h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={loading || saving || !employee || Boolean(todayRecord)}
              className="min-h-16 flex-1 rounded-xl bg-blue-600 px-6 py-4 text-lg font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && !todayRecord ? 'جارٍ تسجيل الحضور...' : 'تسجيل الحضور'}
            </button>
            {todayRecord && !todayRecord.check_out && (
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={loading || saving}
                className="min-h-16 flex-1 rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50"
              >
                {saving ? 'جارٍ تسجيل الانصراف...' : 'تسجيل الانصراف'}
              </button>
            )}
          </div>
          {todayRecord && <p className="mt-4 text-sm text-gray-600">الحضور: {formatTime(todayRecord.check_in)}{todayRecord.check_out ? ` — الانصراف: ${formatTime(todayRecord.check_out)}` : ''} — التأخير: {todayRecord.late_minutes} دقيقة</p>}
        </section>

        {successMessage && <p role="status" className="mb-4 rounded-lg bg-green-50 p-4 text-sm font-semibold text-green-700">{successMessage}</p>}
        {errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-gray-800">سجل حضور جميع الموظفين</h2>
          {loading ? (
            <p className="py-8 text-center text-gray-500">جاري تحميل سجلات الحضور...</p>
          ) : attendance.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا توجد سجلات حضور.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-right text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="p-3">الاسم</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">وقت الحضور</th>
                    <th className="p-3">وقت الانصراف</th>
                    <th className="p-3">دقائق التأخير</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{getEmployeeName(record)}</td>
                      <td className="p-3">{formatDate(record.check_in)}</td>
                      <td className="p-3">{formatTime(record.check_in)}</td>
                      <td className="p-3">{formatTime(record.check_out)}</td>
                      <td className="p-3">{record.late_minutes} دقيقة</td>
                      <td className="p-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${record.check_out ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                          {record.status === 'absent' ? 'غائب' : record.check_out ? 'انصرف' : 'حاضر'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
