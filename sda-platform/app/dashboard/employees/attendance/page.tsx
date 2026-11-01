'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Employee {
  id: string
  full_name: string
}

interface AttendanceRecord {
  id: string
  employee_id: string
  check_in: string
  check_out: string | null
  status: string | null
  employees: { full_name: string } | { full_name: string }[] | null
}

function getTripoliDayRange() {
  const timeZone = 'Africa/Tripoli'
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const datePart = (type: string) => dateParts.find((part) => part.type === type)?.value
  const today = `${datePart('year')}-${datePart('month')}-${datePart('day')}`
  const midnightUtc = (date: string) => {
    const utcGuess = new Date(`${date}T00:00:00Z`)
    const localParts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(utcGuess)
    const value = (type: string) => Number(localParts.find((part) => part.type === type)?.value)
    const localAsUtc = Date.UTC(
      value('year'),
      value('month') - 1,
      value('day'),
      value('hour'),
      value('minute'),
      value('second'),
    )
    return new Date(utcGuess.getTime() - (localAsUtc - utcGuess.getTime()))
  }
  const nextDay = new Date(`${today}T00:00:00Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const nextDate = nextDay.toISOString().slice(0, 10)

  return {
    start: midnightUtc(today).toISOString(),
    end: midnightUtc(nextDate).toISOString(),
  }
}

function getEmployeeName(record: AttendanceRecord) {
  return (Array.isArray(record.employees) ? record.employees[0] : record.employees)?.full_name || 'غير محدد'
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
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) {
        router.push('/login')
        return
      }
      if (!user.email) throw new Error('لا يوجد بريد إلكتروني مرتبط بحساب المستخدم.')

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('email', user.email)
        .maybeSingle()
      if (employeeError) throw employeeError
      if (!employeeData) {
        setEmployee(null)
        setTodayRecord(null)
        setAttendance([])
        throw new Error(`لا يوجد موظف مرتبط بالبريد الإلكتروني ${user.email}.`)
      }

      setEmployee(employeeData)
      const { start, end } = getTripoliDayRange()
      const [todayResult, firstPage] = await Promise.all([
        supabase
          .from('attendance')
          .select('id, employee_id, check_in, check_out, status, employees(full_name)')
          .eq('employee_id', employeeData.id)
          .gte('check_in', start)
          .lt('check_in', end)
          .order('check_in', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('attendance')
          .select('id, employee_id, check_in, check_out, status, employees(full_name)')
          .order('check_in', { ascending: false })
          .range(0, 999),
      ])
      if (todayResult.error) throw todayResult.error
      if (firstPage.error) throw firstPage.error

      const allRecords: AttendanceRecord[] = firstPage.data ?? []
      for (let startIndex = 1000; allRecords.length >= startIndex; startIndex += 1000) {
        const { data, error } = await supabase
          .from('attendance')
          .select('id, employee_id, check_in, check_out, status, employees(full_name)')
          .order('check_in', { ascending: false })
          .range(startIndex, startIndex + 999)
        if (error) throw error
        allRecords.push(...(data ?? []))
        if (!data || data.length < 1000) break
      }

      const record: AttendanceRecord | null = todayResult.data
      setTodayRecord(record)
      setAttendance(allRecords)
      setSuccessMessage(record ? 'لقد سجلت حضورك اليوم بالفعل' : '')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل بيانات الحضور.')
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => {
    void Promise.resolve().then(fetchData)
  }, [fetchData])

  const handleCheckIn = async () => {
    if (!employee || saving) return
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const { start, end } = getTripoliDayRange()
      const { data: existingRecord, error: lookupError } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', employee.id)
        .gte('check_in', start)
        .lt('check_in', end)
        .limit(1)
        .maybeSingle()
      if (lookupError) throw lookupError
      if (existingRecord) {
        setSuccessMessage('لقد سجلت حضورك اليوم بالفعل')
        await fetchData()
        return
      }

      const { error } = await supabase.from('attendance').insert({
        employee_id: employee.id,
        check_in: new Date().toISOString(),
        status: 'present',
      })
      if (error) throw error

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
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out: new Date().toISOString() })
        .eq('id', todayRecord.id)
        .is('check_out', null)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('تم تسجيل الانصراف مسبقًا. حدّث الصفحة للتحقق من الحالة.')

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
          {todayRecord && <p className="mt-4 text-sm text-gray-600">الحضور: {formatTime(todayRecord.check_in)}{todayRecord.check_out ? ` — الانصراف: ${formatTime(todayRecord.check_out)}` : ''}</p>}
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
