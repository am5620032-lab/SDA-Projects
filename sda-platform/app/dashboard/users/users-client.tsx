'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Building2, KeyRound, UsersRound } from 'lucide-react'
import { createUser } from '@/app/actions/create-user'
import { deleteUser } from '@/app/actions/delete-user'
import { getAllUsers, type ManagedUser } from '@/app/actions/get-all-users'
import { getAuditLogs, type AuditLog } from '@/app/actions/get-audit-logs'
import { setUserBanned, updateUserRole } from '@/app/actions/manage-user'
import {
  createModuleAccess,
  type ModuleAccount,
  type ModuleEmployee,
  type ModuleName,
} from '@/app/dashboard/settings/modules/actions'

type UserRole = 'president' | 'vice_president' | 'admin_manager' | 'employee'

const roleLabels: Record<string, string> = {
  president: 'رئيس',
  vice_president: 'نائب الرئيس',
  admin_manager: 'مدير إداري',
  it_manager: 'مدير تقنية المعلومات',
  employee: 'موظف',
}

const actionLabels = { add: 'إضافة', update: 'تعديل', delete: 'حذف' } as const

export default function UsersClient({
  currentUserId,
  initialModuleAccounts,
  moduleEmployees,
}: {
  currentUserId: string
  initialModuleAccounts: ModuleAccount[]
  moduleEmployees: ModuleEmployee[]
}) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [moduleAccounts, setModuleAccounts] = useState(initialModuleAccounts)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditError, setAuditError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [roleUser, setRoleUser] = useState<ManagedUser | null>(null)
  const [moduleModalOpen, setModuleModalOpen] = useState(false)
  const [moduleSaving, setModuleSaving] = useState(false)
  const [moduleError, setModuleError] = useState('')
  const [moduleForm, setModuleForm] = useState({
    employeeId: '',
    moduleName: 'hr' as ModuleName,
    username: '',
    password: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'employee' as UserRole,
  })

  const router = useRouter()
  const canManageUsers = true

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const [usersResult, auditResult] = await Promise.all([getAllUsers(), getAuditLogs()])
      if ('error' in usersResult) throw new Error(usersResult.error)
      setUsers(usersResult.users)
      if ('error' in auditResult) {
        setAuditError(auditResult.error)
      } else {
        setAuditLogs(auditResult.logs)
        setAuditError('')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل قائمة المستخدمين.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(fetchProfiles) }, [fetchProfiles])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await createUser(formData)
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }

      setSuccessMessage(result.warning
        ? `تم إنشاء حساب المستخدم بنجاح. ${result.warning}`
        : 'تم إنشاء حساب المستخدم بنجاح.')
      setFormData({ fullName: '', email: '', password: '', role: 'employee' })
      setIsModalOpen(false)
      await fetchProfiles()
      if (result.warning) setAuditError(result.warning)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر إنشاء المستخدم.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: ManagedUser) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب ${user.full_name || user.email || 'هذا المستخدم'} نهائياً؟`)) return
    setDeletingId(user.id)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await deleteUser(user.id)
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      setSuccessMessage(result.warning
        ? `تم حذف حساب ${user.email || user.full_name || 'المستخدم'} نهائياً. ${result.warning}`
        : `تم حذف حساب ${user.email || user.full_name || 'المستخدم'} نهائياً.`)
      await fetchProfiles()
      if (result.warning) setAuditError(result.warning)
      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حذف المستخدم.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRoleUpdate = async (user: ManagedUser) => {
    const role = roleDrafts[user.id] ?? user.role ?? ''
    setUpdatingId(user.id)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await updateUserRole(user.id, role)
      if ('error' in result) setErrorMessage(result.error)
      else {
        setSuccessMessage(result.warning ? `تم تحديث الدور. ${result.warning}` : 'تم تحديث دور المستخدم.')
        setRoleUser(null)
        await fetchProfiles()
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحديث دور المستخدم.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleModuleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setModuleSaving(true)
    setModuleError('')
    try {
      const result = await createModuleAccess(moduleForm)
      if ('error' in result) {
        setModuleError(result.error)
        return
      }
      setModuleAccounts((current) => [result.account, ...current])
      setModuleModalOpen(false)
      setModuleForm({ employeeId: '', moduleName: 'hr', username: '', password: '' })
      setSuccessMessage('تم حفظ صلاحية المنظومة بنجاح.')
    } catch (error) {
      setModuleError(error instanceof Error ? error.message : 'تعذر حفظ صلاحية المنظومة.')
    } finally {
      setModuleSaving(false)
    }
  }

  const handleBanToggle = async (user: ManagedUser) => {
    setUpdatingId(user.id)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await setUserBanned(user.id, user.is_active)
      if ('error' in result) setErrorMessage(result.error)
      else {
        setSuccessMessage(result.warning
          ? `تم ${user.is_active ? 'إيقاف' : 'تفعيل'} الحساب. ${result.warning}`
          : `تم ${user.is_active ? 'إيقاف' : 'تفعيل'} الحساب.`)
        await fetchProfiles()
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحديث حالة المستخدم.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between rounded-xl border-r-8 border-[#157A3F] bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-[#157A3F]">إدارة المستخدمين</h1>
            <p className="mt-1 text-sm text-gray-500">إدارة حسابات المستخدمين ومراقبة الحركات</p>
          </div>
          <Link href="/dashboard" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">
            العودة للوحة التحكم
          </Link>
        </header>

        {loading ? (
          <section className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">جاري تحميل البيانات...</section>
        ) : !canManageUsers ? (
          <section className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="font-bold text-red-700">ليس لديك صلاحية الوصول إلى إدارة المستخدمين.</p>
          </section>
        ) : (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col items-center justify-between gap-4 border-b pb-4 sm:flex-row">
              <h2 className="text-lg font-bold">المستخدمون ({users.length})</h2>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModuleError('')
                    setModuleForm({ employeeId: '', moduleName: 'hr', username: '', password: '' })
                    setModuleModalOpen(true)
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  <KeyRound size={17} aria-hidden="true" />
                  إدارة صلاحيات المنظومات
                </button>
                <button
                  type="button"
                  onClick={() => { setErrorMessage(''); setIsModalOpen(true) }}
                  className="rounded-lg bg-[#157A3F] px-5 py-2 font-bold text-white hover:bg-green-800"
                >
                  إضافة مستخدم جديد
                </button>
              </div>
            </div>

            {successMessage && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-green-700">{successMessage}</p>}
            {errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{errorMessage}</p>}

            {users.length === 0 ? (
              <p className="py-8 text-center text-gray-500">لا يوجد مستخدمون لعرضهم.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600">
                      <th className="p-3">الاسم الكامل</th>
                      <th className="p-3">البريد الإلكتروني</th>
                      <th className="p-3">الرقم الوطني</th>
                      <th className="p-3">الدور</th>
                      <th className="p-3">المنظومات</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{user.full_name || '-'}</td>
                        <td className="p-3 text-left" dir="ltr">{user.email || '-'}</td>
                        <td className="p-3">{user.national_id || '-'}</td>
                        <td className="p-3">
                          {user.role ? roleLabels[user.role] ?? user.role : 'غير محدد'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {moduleAccounts
                              .filter((account) => account.employee_id === user.employee_id)
                              .map((account) => {
                                const Icon = account.module_name === 'archive'
                                  ? Archive
                                  : account.module_name === 'hr'
                                    ? UsersRound
                                    : Building2
                                const moduleLabel = account.module_name === 'archive'
                                  ? 'الأرشيف'
                                  : account.module_name === 'hr'
                                    ? 'شؤون الموظفين'
                                    : 'المشروعات'
                                return (
                                  <span
                                    key={account.id}
                                    title={`${moduleLabel}${account.is_active ? '' : ' (موقوفة)'}`}
                                    aria-label={`${moduleLabel}${account.is_active ? '' : ' (موقوفة)'}`}
                                    className={`rounded-md p-1 ${account.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}
                                  >
                                    <Icon size={16} aria-hidden="true" />
                                  </span>
                                )
                              })}
                            {moduleAccounts.every((account) => account.employee_id !== user.employee_id) && (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={user.is_active ? 'text-green-700' : 'text-red-700'}>
                            {user.is_active ? 'نشط' : 'موقوف'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRoleDrafts({ ...roleDrafts, [user.id]: user.role ?? '' })
                                setErrorMessage('')
                                setRoleUser(user)
                              }}
                              disabled={currentUserId === user.id}
                              className="rounded-lg bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 disabled:opacity-50"
                            >
                              تغيير الدور
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBanToggle(user)}
                              disabled={updatingId === user.id || currentUserId === user.id}
                              className={`rounded-lg px-3 py-1 font-semibold disabled:opacity-50 ${user.is_active ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}
                            >
                              {user.is_active ? 'إيقاف' : 'تفعيل'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              disabled={deletingId === user.id || currentUserId === user.id}
                              title={currentUserId === user.id ? 'لا يمكن حذف الحساب الحالي' : 'حذف المستخدم نهائياً'}
                              className="rounded-lg bg-red-50 px-3 py-1 font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === user.id ? 'جارٍ الحذف...' : 'حذف'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {canManageUsers && !loading && (
          <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b pb-3 text-lg font-bold">سجل الحركات (Audit Log)</h2>
            {auditError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{auditError}</p>}
            {auditLogs.length === 0 ? (
              <p className="py-6 text-center text-gray-500">لا توجد حركات مسجلة.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600">
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">الإيميل</th>
                      <th className="p-3">الحركة</th>
                      <th className="p-3">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap p-3">{new Date(log.created_at).toLocaleString('ar-LY')}</td>
                        <td className="p-3 text-left" dir="ltr">{log.actor_email || '-'}</td>
                        <td className="p-3">{actionLabels[log.action] ?? log.action}</td>
                        <td className="p-3">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {moduleModalOpen && canManageUsers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="module-access-title" className="relative my-8 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
              <button type="button" onClick={() => setModuleModalOpen(false)} aria-label="إغلاق" className="absolute left-4 top-4 text-xl font-bold text-gray-500 hover:text-red-600">×</button>
              <h2 id="module-access-title" className="mb-5 text-xl font-bold text-[#157A3F]">إدارة صلاحيات المنظومات</h2>
              <form onSubmit={handleModuleAccessSubmit} className="space-y-4">
                <label className="block text-sm font-medium">
                  الموظف
                  <select required value={moduleForm.employeeId} onChange={(event) => setModuleForm({ ...moduleForm, employeeId: event.target.value })} className="mt-1 w-full rounded-lg border px-4 py-2.5">
                    <option value="">اختر الموظف</option>
                    {moduleEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  المنظومة
                  <select value={moduleForm.moduleName} onChange={(event) => setModuleForm({ ...moduleForm, moduleName: event.target.value as ModuleName })} className="mt-1 w-full rounded-lg border px-4 py-2.5">
                    <option value="hr">شؤون الموظفين</option>
                    <option value="projects">المشروعات</option>
                    <option value="archive">الأرشيف</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  اسم المستخدم
                  <input required minLength={3} maxLength={64} pattern="[a-zA-Z0-9._-]+" autoComplete="off" value={moduleForm.username} onChange={(event) => setModuleForm({ ...moduleForm, username: event.target.value })} className="mt-1 w-full rounded-lg border px-4 py-2.5 text-left" dir="ltr" />
                </label>
                <label className="block text-sm font-medium">
                  كلمة المرور
                  <input required minLength={10} maxLength={128} type="password" autoComplete="new-password" value={moduleForm.password} onChange={(event) => setModuleForm({ ...moduleForm, password: event.target.value })} className="mt-1 w-full rounded-lg border px-4 py-2.5" />
                  <span className="mt-1 block text-xs text-gray-500">عشرة أحرف على الأقل. تُخزّن كلمة المرور مشفرة.</span>
                </label>
                {moduleError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{moduleError}</p>}
                <div className="flex gap-3 border-t pt-4">
                  <button type="submit" disabled={moduleSaving} className="flex-1 rounded-lg bg-[#157A3F] py-2.5 font-bold text-white disabled:opacity-60">
                    {moduleSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                  <button type="button" onClick={() => setModuleModalOpen(false)} className="flex-1 rounded-lg bg-gray-100 py-2.5 font-bold text-gray-700">إلغاء</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {roleUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="change-role-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <h2 id="change-role-title" className="mb-2 text-xl font-bold text-[#157A3F]">تغيير دور المستخدم</h2>
              <p className="mb-5 text-sm text-gray-600">{roleUser.full_name || roleUser.email}</p>
              <label htmlFor="managed-user-role" className="mb-1 block text-sm font-medium">الدور الوظيفي</label>
              <select
                id="managed-user-role"
                value={roleDrafts[roleUser.id] ?? ''}
                onChange={(event) => setRoleDrafts({ ...roleDrafts, [roleUser.id]: event.target.value })}
                className="mb-4 w-full rounded-lg border px-4 py-2"
              >
                <option value="" disabled>اختر الدور</option>
                <option value="president">رئيس</option>
                <option value="admin_manager">مدير إداري</option>
                <option value="it_manager">مدير تقنية المعلومات</option>
                <option value="employee">موظف</option>
                {roleUser.role && !['president', 'admin_manager', 'it_manager', 'employee'].includes(roleUser.role) && (
                  <option value={roleUser.role}>{roleLabels[roleUser.role] ?? roleUser.role} (الدور الحالي)</option>
                )}
              </select>
              {errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleUpdate(roleUser)}
                  disabled={updatingId === roleUser.id || !roleDrafts[roleUser.id]}
                  className="flex-1 rounded-lg bg-[#157A3F] py-2 font-bold text-white disabled:opacity-50"
                >
                  {updatingId === roleUser.id ? 'جارٍ الحفظ...' : 'حفظ الدور'}
                </button>
                <button type="button" onClick={() => setRoleUser(null)} className="flex-1 rounded-lg bg-gray-100 py-2 font-bold text-gray-700">إلغاء</button>
              </div>
            </section>
          </div>
        )}

        {isModalOpen && canManageUsers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="create-user-title" className="relative my-8 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="إغلاق" className="absolute left-4 top-4 text-xl font-bold text-gray-500 hover:text-red-600">×</button>
              <h2 id="create-user-title" className="mb-6 text-xl font-bold text-[#157A3F]">إضافة مستخدم جديد</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="user-full-name" className="mb-1 block text-sm font-medium">الاسم الكامل</label>
                  <input id="user-full-name" required minLength={2} maxLength={150} value={formData.fullName} onChange={(event) => setFormData({ ...formData, fullName: event.target.value })} className="w-full rounded-lg border px-4 py-2" />
                </div>
                <div>
                  <label htmlFor="user-email" className="mb-1 block text-sm font-medium">البريد الإلكتروني</label>
                  <input id="user-email" type="email" required autoComplete="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} className="w-full rounded-lg border px-4 py-2 text-left" dir="ltr" />
                </div>
                <div>
                  <label htmlFor="user-password" className="mb-1 block text-sm font-medium">كلمة المرور</label>
                  <input id="user-password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} className="w-full rounded-lg border px-4 py-2 text-left" dir="ltr" />
                  <p className="mt-1 text-xs text-gray-500">ثمانية أحرف على الأقل.</p>
                </div>
                <div>
                  <label htmlFor="user-role" className="mb-1 block text-sm font-medium">الصلاحية</label>
                  <select id="user-role" value={formData.role} onChange={(event) => setFormData({ ...formData, role: event.target.value as typeof formData.role })} className="w-full rounded-lg border px-4 py-2">
                    <option value="president">رئيس</option>
                    <option value="vice_president">نائب الرئيس</option>
                    <option value="admin_manager">مدير إداري</option>
                    <option value="employee">موظف</option>
                  </select>
                </div>
                {errorMessage && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
                <div className="flex gap-3 border-t pt-4">
                  <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#157A3F] py-3 font-bold text-white hover:bg-green-800 disabled:cursor-wait disabled:opacity-60">
                    {saving ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
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
