'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  approveLeave,
  approvePermission,
  deleteLeaveRequest,
  getLeaveDashboardData,
  requestPermission,
  requestLeave,
  updateLeaveRequest,
  type LeaveEmployee,
  type LeaveRequest,
  type LeaveType,
  type PermissionRequest,
} from './actions'

interface LeaveFormData {
  leave_type: string
  start_date: string
  end_date: string
  notes: string
}

export default function LeavesPage() {
  const [employee, setEmployee] = useState<LeaveEmployee | null>(null)
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [approvals, setApprovals] = useState<LeaveRequest[]>([])
  const [hasDirectReports, setHasDirectReports] = useState(false)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [myPermissions, setMyPermissions] = useState<PermissionRequest[]>([])
  const [permissionApprovals, setPermissionApprovals] = useState<PermissionRequest[]>([])
  const [activeTab, setActiveTab] = useState<'requests' | 'approvals' | 'permissions'>('requests')
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false)
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [formData, setFormData] = useState<LeaveFormData>({
    leave_type: '',
    start_date: '', 
    end_date: '', 
    notes: '' 
  })
  const [permissionForm, setPermissionForm] = useState({ date: '', durationHours: '1', reason: '' })

  const fetchData = useCallback(async () => {
    try {
      setErrorMessage('')
      const result = await getLeaveDashboardData()
      if ('error' in result) throw new Error(result.error)
      setEmployee(result.data.employee)
      setLeaves(result.data.myLeaves)
      setApprovals(result.data.approvals)
      setLeaveTypes(result.data.leaveTypes)
      setMyPermissions(result.data.myPermissions)
      setPermissionApprovals(result.data.permissionApprovals)
      setHasDirectReports(result.data.hasDirectReports)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل بيانات الإجازات.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(fetchData) }, [fetchData])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const result = editingLeave
        ? await updateLeaveRequest(editingLeave.id, formData)
        : await requestLeave(formData)
      if ('error' in result) throw new Error(result.error)

      setIsModalOpen(false)
      setEditingLeave(null)
      setFormData({ leave_type: '', start_date: '', end_date: '', notes: '' })
      if (editingLeave) toast.success('تم تحديث طلب الإجازة بنجاح.')
      if (result.warning) toast.warning(result.warning)
      await fetchData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ طلب الإجازة.'
      if (editingLeave) toast.error(message)
      else setErrorMessage(message)
      setLoading(false)
    }
  }

  const handleDeleteLeave = async (leave: LeaveRequest) => {
    if (leave.status !== 'pending' || !window.confirm('هل تريد حذف طلب الإجازة المعلّق؟')) return
    setLoading(true)
    try {
      const result = await deleteLeaveRequest(leave.id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('تم حذف طلب الإجازة.')
      if (result.warning) toast.warning(result.warning)
      await fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف طلب الإجازة.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (leave: LeaveRequest, newStatus: 'approved' | 'rejected') => {
    if (!hasDirectReports || (leave.status !== 'pending' && !(leave.status === 'approved' && newStatus === 'rejected'))) return
    if (!window.confirm(`هل تريد ${newStatus === 'approved' ? 'قبول' : 'رفض'} طلب الإجازة؟`)) return

    setLoading(true)
    setErrorMessage('')
    try {
      const result = await approveLeave(leave.id, newStatus, managerNotes[leave.id] ?? '')
      if ('error' in result) throw new Error(result.error)
      if (result.warning) setErrorMessage(result.warning)
      await fetchData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحديث حالة طلب الإجازة.')
      setLoading(false)
    }
  }

  const handlePermissionSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('')
    try {
      const result = await requestPermission({
        date: permissionForm.date,
        durationHours: Number(permissionForm.durationHours),
        reason: permissionForm.reason,
      })
      if ('error' in result) throw new Error(result.error)
      setIsPermissionModalOpen(false)
      setPermissionForm({ date: '', durationHours: '1', reason: '' })
      if (result.warning) setErrorMessage(result.warning)
      await fetchData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تقديم طلب الإذن.')
      setLoading(false)
    }
  }

  const handlePermissionStatus = async (permission: PermissionRequest, status: 'approved' | 'rejected') => {
    if (!hasDirectReports || permission.status !== 'pending') return
    setLoading(true)
    setErrorMessage('')
    try {
      const result = await approvePermission(permission.id, status, managerNotes[permission.id] ?? '')
      if ('error' in result) throw new Error(result.error)
      if (result.warning) setErrorMessage(result.warning)
      await fetchData()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحديث طلب الإذن.')
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
            <h2 className="text-lg font-bold text-gray-800">
              {activeTab === 'requests'
                ? `طلباتي (${leaves.length})`
                : activeTab === 'approvals'
                  ? `الموافقات (${approvals.length})`
                  : `الأذونات (${myPermissions.length})`}
            </h2>
            <button
              onClick={() => {
                if (activeTab === 'permissions') setIsPermissionModalOpen(true)
                else {
                  setEditingLeave(null)
                  setFormData({ leave_type: '', start_date: '', end_date: '', notes: '' })
                  setIsModalOpen(true)
                }
              }}
              className="bg-[#157A3F] text-white px-6 py-2 rounded-lg font-bold shadow-md"
            >
              {activeTab === 'permissions' ? '+ طلب إذن' : '+ طلب إجازة جديدة'}
            </button>
          </div>

          <div className="mb-5 flex gap-2 border-b">
            <button type="button" onClick={() => setActiveTab('requests')} className={`border-b-2 px-4 py-2 text-sm font-bold ${activeTab === 'requests' ? 'border-[#157A3F] text-[#157A3F]' : 'border-transparent text-gray-500'}`}>
              طلباتي
            </button>
            {hasDirectReports && (
              <button type="button" onClick={() => setActiveTab('approvals')} className={`border-b-2 px-4 py-2 text-sm font-bold ${activeTab === 'approvals' ? 'border-[#157A3F] text-[#157A3F]' : 'border-transparent text-gray-500'}`}>
                الموافقات{approvals.length > 0 ? ` (${approvals.length})` : ''}
              </button>
            )}
            <button type="button" onClick={() => setActiveTab('permissions')} className={`border-b-2 px-4 py-2 text-sm font-bold ${activeTab === 'permissions' ? 'border-[#157A3F] text-[#157A3F]' : 'border-transparent text-gray-500'}`}>
              الأذونات{myPermissions.length > 0 ? ` (${myPermissions.length})` : ''}
            </button>
          </div>

          {errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{errorMessage}</p>}

          {loading ? (
            <p className="py-8 text-center">جاري التحميل...</p>
          ) : activeTab === 'permissions' ? (
            <div className="space-y-8">
              <section>
                <h3 className="mb-3 font-bold">طلباتي من الأذونات</h3>
                {myPermissions.length === 0 ? <p className="py-4 text-sm text-gray-500">لا توجد طلبات أذونات.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-right text-sm">
                      <thead><tr className="border-b bg-gray-50"><th className="p-3">التاريخ</th><th className="p-3">المدة</th><th className="p-3">السبب</th><th className="p-3">الحالة</th><th className="p-3">ملاحظات المدير</th></tr></thead>
                      <tbody>{myPermissions.map((permission) => (
                        <tr key={permission.id} className="border-b">
                          <td className="p-3">{permission.date}</td><td className="p-3">{permission.duration_hours} ساعة</td><td className="p-3">{permission.reason}</td>
                          <td className="p-3">{permission.status === 'approved' ? 'مقبول' : permission.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}</td>
                          <td className="p-3">{permission.manager_notes || '-'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </section>
              {hasDirectReports && <section>
                <h3 className="mb-3 font-bold">طلبات الأذونات بانتظار اعتمادك</h3>
                {permissionApprovals.length === 0 ? <p className="py-4 text-sm text-gray-500">لا توجد أذونات بانتظار اعتمادك.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] text-right text-sm">
                      <thead><tr className="border-b bg-gray-50"><th className="p-3">الموظف</th><th className="p-3">التاريخ</th><th className="p-3">المدة</th><th className="p-3">السبب</th><th className="p-3">ملاحظات المدير</th><th className="p-3">القرار</th></tr></thead>
                      <tbody>{permissionApprovals.map((permission) => (
                        <tr key={permission.id} className="border-b">
                          <td className="p-3">{permission.employee_name}</td><td className="p-3">{permission.date}</td><td className="p-3">{permission.duration_hours} ساعة</td><td className="p-3">{permission.reason}</td>
                          <td className="p-3"><textarea aria-label="ملاحظات المدير" value={managerNotes[permission.id] ?? ''} onChange={(event) => setManagerNotes((current) => ({ ...current, [permission.id]: event.target.value }))} className="rounded border p-2" /></td>
                          <td className="p-3"><div className="flex gap-2"><button onClick={() => void handlePermissionStatus(permission, 'approved')} disabled={loading} className="rounded bg-green-50 px-2 py-1 text-green-700">قبول</button><button onClick={() => void handlePermissionStatus(permission, 'rejected')} disabled={loading} className="rounded bg-red-50 px-2 py-1 text-red-700">رفض</button></div></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </section>}
            </div>
          ) : (activeTab === 'requests' ? leaves : approvals).length === 0 ? (
            <p className="py-8 text-center text-gray-500">{activeTab === 'requests' ? 'لا توجد طلبات إجازة.' : 'لا توجد طلبات بانتظار اعتمادك.'}</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead><tr className="bg-gray-50 border-b text-gray-600"><th className="p-3">الموظف</th><th className="p-3">النوع</th><th className="p-3">من</th><th className="p-3">إلى</th><th className="p-3">الأيام</th><th className="p-3">ملاحظات الطلب</th>{activeTab === 'approvals' && <th className="p-3">ملاحظات المدير</th>}<th className="p-3">الحالة</th><th className="p-3">إجراءات</th></tr></thead>
              <tbody>
                {(activeTab === 'requests' ? leaves : approvals).map((l) => (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{l.employees?.full_name || employee?.full_name}</td>
                    <td className="p-3">{l.leave_type}</td>
                    <td className="p-3">{l.start_date}</td>
                    <td className="p-3">{l.end_date}</td>
                    <td className="p-3 font-bold text-[#157A3F]">{l.days_count}</td>
                    <td className="p-3 text-xs text-gray-500 max-w-[150px] truncate">{l.notes || '-'}</td>
                    {activeTab === 'approvals' && (
                      <td className="p-3">
                        <textarea
                          aria-label={`ملاحظات المدير لطلب ${l.employees?.full_name ?? ''}`}
                          rows={2}
                          maxLength={2000}
                          value={managerNotes[l.id] ?? ''}
                          onChange={(event) => setManagerNotes((current) => ({ ...current, [l.id]: event.target.value }))}
                          className="min-w-40 rounded border px-2 py-1"
                        />
                      </td>
                    )}
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${l.status === 'approved' ? 'bg-green-100 text-green-700' : l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {l.status === 'approved' ? 'مقبولة' : l.status === 'rejected' ? 'مرفوضة' : 'قيد الانتظار'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button onClick={() => setSelectedLeave(l)} className="text-gray-600 bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200">طباعة</button>
                        {activeTab === 'requests' && l.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLeave(l)
                                setFormData({
                                  leave_type: l.leave_type,
                                  start_date: l.start_date,
                                  end_date: l.end_date,
                                  notes: l.notes ?? '',
                                })
                                setIsModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1 text-amber-800 hover:bg-amber-100"
                            >
                              <Pencil size={14} aria-hidden="true" /> تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteLeave(l)}
                              disabled={loading}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1 text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              <Trash2 size={14} aria-hidden="true" /> حذف
                            </button>
                          </>
                        )}
                        {activeTab === 'approvals' && (l.status === 'pending' || l.status === 'approved') && (
                          <>
                            {l.status === 'pending' && <button onClick={() => handleStatusChange(l, 'approved')} disabled={loading} className="text-green-600 bg-green-50 px-2 py-1 rounded disabled:opacity-50">موافقة</button>}
                            <button onClick={() => handleStatusChange(l, 'rejected')} disabled={loading} className="text-red-600 bg-red-50 px-2 py-1 rounded disabled:opacity-50">رفض</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* نموذج الإجازة الكبير */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-8 relative my-8">
              <button onClick={() => { setIsModalOpen(false); setEditingLeave(null) }} className="absolute top-4 left-4 font-bold text-xl text-gray-500 hover:text-red-500">✕</button>
              
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-[#157A3F] mb-2">{editingLeave ? 'تعديل طلب الإجازة' : 'طلب إجازة جديد'}</h2>
                <p className="text-gray-500">يرجى تعبئة البيانات التالية بدقة</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {employee && <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">الموظف مقدم الطلب *</label>
                    <div className="w-full rounded-lg border bg-gray-50 px-4 py-3 text-sm">
                      {employee.full_name} (الرصيد: {employee.leave_balance ?? 30} يوم)
                    </div>
                  </div>}

                  {/* نوع الإجازة */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">نوع الإجازة *</label>
                    <select name="leave_type" value={formData.leave_type} onChange={(e) => setFormData({...formData, leave_type: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#157A3F] text-sm">
                      <option value="">اختر نوع الإجازة</option>
                      {leaveTypes.map((type) => <option key={type.id} value={type.name}>{type.name} (حتى {type.max_days_per_year} يوماً سنوياً)</option>)}
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
                  <button type="submit" disabled={loading} className="flex-1 bg-[#157A3F] hover:bg-[#0f5c2e] text-white font-bold py-3 rounded-lg transition-all shadow-md disabled:opacity-50">{loading ? 'جارٍ الحفظ...' : editingLeave ? 'حفظ التعديلات' : 'تقديم الطلب'}</button>
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingLeave(null) }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-lg transition-all">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {isPermissionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <section className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
              <h2 className="mb-5 text-xl font-bold text-[#157A3F]">طلب إذن بالساعات</h2>
              <form onSubmit={handlePermissionSubmit} className="space-y-4">
                <label className="block text-sm font-bold">تاريخ الإذن
                  <input required type="date" value={permissionForm.date} onChange={(event) => setPermissionForm({ ...permissionForm, date: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="block text-sm font-bold">المدة بالساعات (حد أقصى 24)
                  <input required type="number" min="0.25" max="24" step="0.25" value={permissionForm.durationHours} onChange={(event) => setPermissionForm({ ...permissionForm, durationHours: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="block text-sm font-bold">سبب الإذن
                  <textarea required maxLength={1000} rows={4} value={permissionForm.reason} onChange={(event) => setPermissionForm({ ...permissionForm, reason: event.target.value })} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <div className="flex gap-3">
                  <button disabled={loading} className="flex-1 rounded-lg bg-[#157A3F] p-3 font-bold text-white disabled:opacity-50">إرسال للمدير</button>
                  <button type="button" onClick={() => setIsPermissionModalOpen(false)} className="rounded-lg bg-gray-100 px-5 font-semibold">إلغاء</button>
                </div>
              </form>
            </section>
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