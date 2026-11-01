'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface EmployeeOption {
  id: string
  full_name: string
}

interface CustodyRecord {
  id: string
  employee_id: string
  asset_name: string
  description: string | null
  delivery_date: string
  return_date: string | null
  status: 'issued' | 'returned'
  employee_name: string
}

interface CustodyRow {
  id: string
  employee_id: string
  asset_name: string
  description: string | null
  delivery_date: string
  return_date: string | null
  status: string
}

function getLocalDate(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export default function CustodyPage() {
  const [records, setRecords] = useState<CustodyRecord[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [returningId, setReturningId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState({
    employee_id: '',
    asset_name: '',
    description: '',
    delivery_date: getLocalDate(),
  })

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

      const [{ data: employeeData, error: employeesError }, { data: custodyData, error: custodyError }] = await Promise.all([
        supabase.from('employees').select('id, full_name').order('full_name'),
        supabase.from('custody').select('id, employee_id, asset_name, description, delivery_date, return_date, status').order('delivery_date', { ascending: false }),
      ])
      if (employeesError) throw employeesError
      if (custodyError) throw custodyError

      const employeeList = (employeeData ?? []) as EmployeeOption[]
      const employeeNames = new Map(employeeList.map((employee) => [employee.id, employee.full_name]))
      const custodyRecords: CustodyRecord[] = ((custodyData ?? []) as CustodyRow[]).map((record) => {
        if (record.status !== 'issued' && record.status !== 'returned') {
          throw new Error(`حالة العهدة غير معروفة للسجل ${record.id}.`)
        }
        return {
          ...record,
          status: record.status,
          employee_name: employeeNames.get(record.employee_id) ?? 'موظف غير موجود',
        }
      })
      setEmployees(employeeList)
      setRecords(custodyRecords)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل بيانات العهد.')
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => { void Promise.resolve().then(fetchData) }, [fetchData])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    try {
      const { error } = await supabase.from('custody').insert({
        employee_id: formData.employee_id,
        asset_name: formData.asset_name.trim(),
        description: formData.description.trim() || null,
        delivery_date: formData.delivery_date,
        return_date: null,
        status: 'issued',
      })
      if (error) throw error

      setIsModalOpen(false)
      setFormData({ employee_id: '', asset_name: '', description: '', delivery_date: getLocalDate() })
      await fetchData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تسجيل تسليم العهدة.')
    } finally {
      setSaving(false)
    }
  }

  const handleReturn = async (record: CustodyRecord) => {
    if (!window.confirm(`تأكيد إرجاع العهدة «${record.asset_name}»؟`)) return

    setReturningId(record.id)
    setErrorMessage('')
    try {
      const { data, error } = await supabase
        .from('custody')
        .update({ status: 'returned', return_date: getLocalDate() })
        .eq('id', record.id)
        .eq('status', 'issued')
        .select('id')
      if (error) throw error
      if (!data?.length) throw new Error('تم تحديث هذه العهدة من مستخدم آخر أو لم تعد حالتها «مسلمة».')
      await fetchData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تسجيل إرجاع العهدة.')
    } finally {
      setReturningId(null)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between rounded-xl border-r-8 border-amber-600 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-amber-700">العهد والأمانات</h1>
            <p className="mt-1 text-sm text-gray-500">سجل العهد المسلمة والمرتجعة للموظفين</p>
          </div>
          <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">
            العودة للموظفين
          </Link>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col items-center justify-between gap-4 border-b pb-4 sm:flex-row">
            <h2 className="text-lg font-bold">سجل العهد ({records.length})</h2>
            <button
              onClick={() => { setErrorMessage(''); setIsModalOpen(true) }}
              className="rounded-lg bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-700"
            >
              تسليم عهدة جديدة
            </button>
          </div>

          {errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}

          {loading ? (
            <p className="py-8 text-center text-gray-500">جاري تحميل البيانات...</p>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا توجد عهد مسجلة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="p-3">اسم الموظف</th>
                    <th className="p-3">اسم العهدة</th>
                    <th className="p-3">الوصف</th>
                    <th className="p-3">تاريخ التسليم</th>
                    <th className="p-3">تاريخ الإرجاع</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-3 font-medium">{record.employee_name}</td>
                      <td className="p-3 font-semibold">{record.asset_name}</td>
                      <td className="max-w-xs whitespace-pre-wrap p-3">{record.description || '-'}</td>
                      <td className="p-3">{record.delivery_date}</td>
                      <td className="p-3">{record.return_date || '-'}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${record.status === 'issued' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
                          {record.status === 'issued' ? 'مسلمة' : 'مرتجعة'}
                        </span>
                      </td>
                      <td className="p-3">
                        {record.status === 'issued' && (
                          <button
                            onClick={() => void handleReturn(record)}
                            disabled={returningId === record.id}
                            className="rounded-lg bg-green-50 px-3 py-1 font-bold text-green-700 hover:bg-green-100 disabled:cursor-wait disabled:opacity-60"
                          >
                            {returningId === record.id ? 'جارٍ الإرجاع...' : 'إرجاع'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="custody-modal-title" className="relative my-8 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="إغلاق" className="absolute left-4 top-4 text-xl font-bold text-gray-500 hover:text-red-600">×</button>
              <h2 id="custody-modal-title" className="mb-6 text-xl font-bold text-amber-700">تسليم عهدة جديدة</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="custody-employee" className="mb-1 block text-sm font-medium">الموظف</label>
                  <select
                    id="custody-employee"
                    required
                    value={formData.employee_id}
                    onChange={(event) => setFormData({ ...formData, employee_id: event.target.value })}
                    className="w-full rounded-lg border px-4 py-2"
                  >
                    <option value="">-- اختر الموظف --</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="custody-asset" className="mb-1 block text-sm font-medium">اسم العهدة</label>
                  <input id="custody-asset" required maxLength={150} value={formData.asset_name} onChange={(event) => setFormData({ ...formData, asset_name: event.target.value })} className="w-full rounded-lg border px-4 py-2" />
                </div>
                <div>
                  <label htmlFor="custody-description" className="mb-1 block text-sm font-medium">الوصف</label>
                  <textarea id="custody-description" rows={3} maxLength={2000} value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} className="w-full rounded-lg border px-4 py-2" />
                </div>
                <div>
                  <label htmlFor="custody-delivery-date" className="mb-1 block text-sm font-medium">تاريخ التسليم</label>
                  <input id="custody-delivery-date" type="date" required value={formData.delivery_date} onChange={(event) => setFormData({ ...formData, delivery_date: event.target.value })} className="w-full rounded-lg border px-4 py-2" />
                </div>
                {errorMessage && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
                <div className="flex gap-3 border-t pt-4">
                  <button type="submit" disabled={saving || loading || employees.length === 0} className="flex-1 rounded-lg bg-amber-600 py-3 font-bold text-white hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60">
                    {saving ? 'جارٍ الحفظ...' : 'تسجيل التسليم'}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-lg bg-gray-100 py-3 font-bold text-gray-700">إلغاء</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
