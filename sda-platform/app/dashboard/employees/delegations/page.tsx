'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface DelegatedEmployee {
  id: string
  full_name: string
  employee_number: string | null
  job_title: string | null
  department: string | null
  branch: string | null
  employment_status: 'delegated' | 'seconded'
  delegation_entity: string | null
  delegation_start_date: string | null
  phone: string | null
}

function getDelegationDurationDays(startDate: string | null): number | null {
  if (!startDate) return null

  const startTimestamp = Date.parse(`${startDate}T00:00:00Z`)
  if (Number.isNaN(startTimestamp)) return null

  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(0, Math.floor((todayUtc - startTimestamp) / 86_400_000) + 1)
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
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const fetchDelegations = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, employee_number, job_title, department, branch, employment_status, delegation_entity, delegation_start_date, phone')
        .in('employment_status', ['delegated', 'seconded'])
        .order('full_name')
      if (error) throw error

      setEmployees(data ?? [])
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل بيانات الندب والإعارة.')
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => { void Promise.resolve().then(fetchDelegations) }, [fetchDelegations])

  const filteredEmployees = employees.filter((employee) =>
    [employee.full_name, employee.employee_number, employee.department, employee.branch, employee.delegation_entity]
      .some((value) => value?.includes(searchQuery))
  )

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between rounded-xl border-r-8 border-indigo-600 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-indigo-700">قسم الندب والإعارة</h1>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => {
                    const durationDays = getDelegationDurationDays(employee.delegation_start_date)
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
                        <td className="p-3">{durationDays === null ? 'غير محدد' : formatDelegationDuration(durationDays)}</td>
                        <td className="p-3">{employee.branch || 'الإدارة الرئيسيه / طرابلس'}</td>
                        <td className="p-3" dir="ltr">{employee.phone || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
