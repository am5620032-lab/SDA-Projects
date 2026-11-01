'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Employee {
  id: string
  full_name: string
  leave_balance: number | null
}

interface Leave {
  id: string
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  days_count: number
  notes: string | null
  status: string
  employees: { full_name: string; job_title: string | null; department: string | null } | null
}

interface LeaveFormData {
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  notes: string
}

export default function LeavesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null)
  const [userRole, setUserRole] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState<LeaveFormData>({
    employee_id: '', 
    leave_type: 'سنوية', 
    start_date: '', 
    end_date: '', 
    notes: '' 
  })

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const isAdmin = ['president', 'vice_president', 'admin_manager'].includes(userRole)

  const fetchData = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) {
        router.push('/login')
        return
      }

      setErrorMessage('')
      const [{ data: profile, error: profileError }, { data: emps, error: employeesError }, { data: lvs, error: leavesError }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('employees').select('id, full_name, leave_balance').order('full_name'),
        supabase.from('leaves').select('*, employees(full_name, job_title, department)').order('created_at', { ascending: false }),
      ])
      if (profileError) throw profileError
      if (employeesError) throw employeesError
      if (leavesError) throw leavesError

      setUserRole(profile.role)
      setEmployees(emps ?? [])
      setLeaves(lvs ?? [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل بيانات الإجازات.')
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => { void Promise.resolve().then(fetchData) }, [fetchData])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    const start = Date.parse(`${formData.start_date}T00:00:00Z`)
    const end = Date.parse(`${formData.end_date}T00:00:00Z`)
    const daysCount = Math.floor((end - start) / 86_400_000) + 1
    if (!Number.isFinite(start) || !Number.isFinite(end) || daysCount <= 0) {
      setErrorMessage('تاريخ النهاية يجب أن يكون في يوم البداية أو بعده.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.from('leaves').insert([{
        ...formData,
        days_count: daysCount,
        status: 'pending',
      }])
      if (error) throw error

      setIsModalOpen(false)
      setFormData({ employee_id: '', leave_type: 'سنوية', start_date: '', end_date: '', notes: '' })
      await fetchData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حفظ طلب الإجازة.')
      setLoading(false)
    }
  }

  const handleStatusChange = async (leave: Leave, newStatus: 'approved' | 'rejected') => {
    if (!isAdmin || leave.status !== 'pending') return
    if (!window.confirm('هل أنت متأكد من تغيير حالة الطلب؟')) return

    setLoading(true)
    setErrorMessage('')
    try {
      let employee: Employee | undefined
      if (newStatus === 'approved') {
        const { data, error } = await supabase
          .from('employees')
          .select('id, full_name, leave_balance')
          .eq('id', leave.employee_id)
          .single()
        if (error) throw error
        employee = data
        if ((employee.leave_balance ?? 30) < leave.days_count) {
          throw new Error('رصيد الإجازات غير كافٍ للموافقة على هذا الطلب.')
        }
      }

      const { data: updatedLeave, error: leaveError } = await supabase
        .from('leaves')
        .update({ status: newStatus })
        .eq('id', leave.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()
      if (leaveError) throw leaveError
      if (!updatedLeave) throw new Error('تم تحديث هذا الطلب مسبقاً. حدّث الصفحة وحاول مجدداً.')

      if (newStatus === 'approved' && employee) {
        const currentBalance = employee.leave_balance ?? 30
        let balanceUpdate = supabase
          .from('employees')
          .update({ leave_balance: currentBalance - leave.days_count })
          .eq('id', employee.id)
        balanceUpdate = employee.leave_balance === null
          ? balanceUpdate.is('leave_balance', null)
          : balanceUpdate.eq('leave_balance', currentBalance)

        const { data: updatedEmployee, error: balanceError } = await balanceUpdate.select('id').maybeSingle()
        if (balanceError || !updatedEmployee) {
          const { error: rollbackError } = await supabase
            .from('leaves')
            .update({ status: 'pending' })
            .eq('id', leave.id)
            .eq('status', 'approved')
          if (rollbackError) {
            throw new Error(`تعذر خصم الرصيد (${balanceError?.message ?? 'تغير الرصيد بالتزامن'})، كما تعذر إعادة الطلب إلى الانتظار: ${rollbackError.message}`)
          }
          if (balanceError) throw balanceError
          throw new Error('تغير رصيد الموظف أثناء الموافقة. حدّث البيانات وحاول مجدداً.')
        }
      }

      await fetchData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحديث حالة طلب الإجازة.')
      setLoading(false)
    }
  }

  const handlePrint = () => window.print()

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto print:hidden">
        <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm mb-8 border-r-8 border-[#157A3F]">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="شعار" className="h-12 w-auto object-contain" />
            <div><h1 className="text-2xl font-bold text-[#157A3F]">منظومة الإجازات</h1></div>
          </div>
          <Link href="/dashboard" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-semibold">العودة</Link>
        </header>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">سجل الإجازات ({leaves.length})</h2>
            <button onClick={() => setIsModalOpen(true)} className="bg-[#157A3F] text-white px-6 py-2 rounded-lg font-bold shadow-md">+ طلب إجازة جديدة</button>
          </div>

          {errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{errorMessage}</p>}

          {loading ? ( <p className="text-center py-8">جاري التحميل...</p> ) : leaves.length === 0 ? ( <p className="text-center py-8">لا توجد إجازات.</p> ) : (
            <table className="w-full text-right text-sm">
              <thead><tr className="bg-gray-50 border-b text-gray-600"><th className="p-3">الموظف</th><th className="p-3">النوع</th><th className="p-3">من</th><th className="p-3">إلى</th><th className="p-3">الأيام</th><th className="p-3">الملاحظات</th><th className="p-3">الحالة</th><th className="p-3">إجراءات</th></tr></thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{l.employees?.full_name}</td>
                    <td className="p-3">{l.leave_type}</td>
                    <td className="p-3">{l.start_date}</td>
                    <td className="p-3">{l.end_date}</td>
                    <td className="p-3 font-bold text-[#157A3F]">{l.days_count}</td>
                    <td className="p-3 text-xs text-gray-500 max-w-[150px] truncate">{l.notes || '-'}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${l.status === 'approved' ? 'bg-green-100 text-green-700' : l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {l.status === 'approved' ? 'مقبولة' : l.status === 'rejected' ? 'مرفوضة' : 'قيد الانتظار'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button onClick={() => setSelectedLeave(l)} className="text-gray-600 bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200">طباعة</button>
                        {isAdmin && l.status === 'pending' && (
                          <>
                            <button onClick={() => handleStatusChange(l, 'approved')} disabled={loading} className="text-green-600 bg-green-50 px-2 py-1 rounded disabled:opacity-50">موافقة</button>
                            <button onClick={() => handleStatusChange(l, 'rejected')} disabled={loading} className="text-red-600 bg-red-50 px-2 py-1 rounded disabled:opacity-50">رفض</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* نموذج الإجازة الكبير */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-8 relative my-8">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 left-4 font-bold text-xl text-gray-500 hover:text-red-500">✕</button>
              
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-[#157A3F] mb-2">طلب إجازة جديد</h2>
                <p className="text-gray-500">يرجى تعبئة البيانات التالية بدقة</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* اختيار الموظف */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">الموظف مقدم الطلب *</label>
                    <select name="employee_id" value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#157A3F] text-sm">
                      <option value="">-- اختر الموظف --</option>
                      {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} (الرصيد: {employee.leave_balance ?? 30} يوم)</option>)}
                    </select>
                  </div>

                  {/* نوع الإجازة */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">نوع الإجازة *</label>
                    <select name="leave_type" value={formData.leave_type} onChange={(e) => setFormData({...formData, leave_type: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#157A3F] text-sm">
                      <option value="سنوية">إجازة سنوية</option>
                      <option value="مرضية">إجازة مرضية</option>
                      <option value="اضطرارية">إجازة اضطرارية</option>
                      <option value="زواج">إجازة زواج</option>
                      <option value="دراسة">إجازة دراسة</option>
                      <option value="سفر">إجازة سفر</option>
                      <option value="وضع">إجازة وضع (أمومة)</option>
                      <option value="بدون مرتب">إجازة بدون مرتب</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* تاريخ البداية */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ البداية *</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#157A3F] text-sm" />
                  </div>
                  {/* تاريخ النهاية */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ النهاية *</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#157A3F] text-sm" />
                  </div>
                </div>

                {/* الملاحظات */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">سبب الإجازة / ملاحظات إضافية</label>
                  <textarea 
                    rows={3}
                    value={formData.notes} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                    placeholder="مثال: سفري خارج البلاد لظروف عائلية..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#157A3F] text-sm"
                  ></textarea>
                </div>

                {/* أزرار الإجراءات */}
                <div className="pt-6 flex gap-4 border-t mt-6">
                  <button type="submit" disabled={loading} className="flex-1 bg-[#157A3F] hover:bg-[#0f5c2e] text-white font-bold py-3 rounded-lg transition-all shadow-md disabled:opacity-50">{loading ? 'جارٍ الحفظ...' : 'تقديم الطلب'}</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-lg transition-all">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 print:static print:block print:overflow-visible print:bg-white print:p-0">
          <section className="leave-print-sheet my-8 w-full max-w-3xl bg-white p-8 shadow-2xl print:my-0 print:w-full print:max-w-none print:p-0 print:shadow-none">
            <div className="mb-8 flex items-center justify-between border-b-2 border-gray-800 pb-4 print:hidden">
              <h2 className="text-xl font-bold text-gray-800">معاينة كشف الإجازة</h2>
              <div className="flex gap-3">
                <button onClick={handlePrint} className="rounded-lg bg-[#157A3F] px-6 py-2 font-bold text-white shadow-md">طباعة / حفظ PDF</button>
                <button onClick={() => setSelectedLeave(null)} className="rounded-lg bg-red-50 px-6 py-2 font-bold text-red-600">إغلاق</button>
              </div>
            </div>

            <div className="border-2 border-gray-800 p-8 print:p-6">
              <header className="mb-6 flex items-start justify-between border-b-2 border-gray-800 pb-4">
                <div>
                  <h1 className="mb-1 text-2xl font-bold text-[#157A3F]">جهاز تنمية وتطوير الجنوب</h1>
                  <p className="font-semibold text-gray-700">إدارة الشؤون الإدارية</p>
                  <p className="mt-2 text-sm text-gray-600">التاريخ: {new Date().toLocaleDateString('ar-LY')}</p>
                </div>
                <img src="/logo.jpg" alt="شعار الجهاز" className="h-20 w-auto object-contain" />
              </header>

              <h2 className="mb-6 border border-gray-300 bg-gray-100 py-2 text-center text-xl font-bold">كشف إجازة رسمي</h2>

              <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                <p><span className="font-bold text-gray-700">اسم الموظف:</span> {selectedLeave.employees?.full_name || 'غير محدد'}</p>
                <p><span className="font-bold text-gray-700">الوظيفة:</span> {selectedLeave.employees?.job_title || 'غير محدد'}</p>
                <p><span className="font-bold text-gray-700">القسم/الإدارة:</span> {selectedLeave.employees?.department || 'غير محدد'}</p>
                <p><span className="font-bold text-gray-700">نوع الإجازة:</span> {selectedLeave.leave_type}</p>
              </div>

              <table className="mb-6 w-full border-collapse border border-gray-800 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-800 p-2 text-right">تاريخ البداية</th>
                    <th className="border border-gray-800 p-2 text-right">تاريخ النهاية</th>
                    <th className="border border-gray-800 p-2 text-center">عدد الأيام</th>
                    <th className="border border-gray-800 p-2 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-800 p-2 font-bold">{selectedLeave.start_date}</td>
                    <td className="border border-gray-800 p-2 font-bold">{selectedLeave.end_date}</td>
                    <td className="border border-gray-800 p-2 text-center font-bold text-[#157A3F]">{selectedLeave.days_count} يوم</td>
                    <td className="border border-gray-800 p-2 text-center font-bold">
                      {selectedLeave.status === 'approved' ? 'مقبولة' : selectedLeave.status === 'rejected' ? 'مرفوضة' : 'قيد الانتظار'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {selectedLeave.notes && <p className="mb-6 text-sm"><span className="font-bold">ملاحظات:</span> {selectedLeave.notes}</p>}

              <div className="mt-16 flex justify-between text-center text-sm font-bold">
                <div><p>توقيع الموظف</p><p className="mt-8 text-gray-500">................................</p></div>
                <div><p>مدير الموارد البشرية</p><p className="mt-8 text-gray-500">................................</p></div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}