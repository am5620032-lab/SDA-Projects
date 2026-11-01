'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createUser } from '@/app/actions/create-user'
import { deleteUser } from '@/app/actions/delete-user'
import { getAllUsers, type ManagedUser } from '@/app/actions/get-all-users'
import { getAuditLogs, type AuditLog } from '@/app/actions/get-audit-logs'

type UserRole = 'president' | 'vice_president' | 'admin_manager' | 'employee'

const roleLabels: Record<string, string> = {
  president: 'رئيس',
  vice_president: 'نائب الرئيس',
  admin_manager: 'مدير إداري',
  employee: 'موظف',
  it_manager: 'مدير تقنية المعلومات',
}

const actionLabels = { add: 'إضافة', update: 'تعديل', delete: 'حذف' } as const

export default function UsersClient({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditError, setAuditError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
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
              <button
                onClick={() => { setErrorMessage(''); setIsModalOpen(true) }}
                className="rounded-lg bg-[#157A3F] px-5 py-2 font-bold text-white hover:bg-green-800"
              >
                إضافة مستخدم جديد
              </button>
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
                      <th className="p-3">الصلاحية</th>
                      <th className="p-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{user.full_name || '-'}</td>
                        <td className="p-3 text-left" dir="ltr">{user.email || '-'}</td>
                        <td className="p-3">{user.role ? roleLabels[user.role] ?? user.role : 'غير محددة'}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id || currentUserId === user.id}
                            title={currentUserId === user.id ? 'لا يمكن حذف الحساب الحالي' : 'حذف المستخدم نهائياً'}
                            className="rounded-lg bg-red-50 px-3 py-1 font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === user.id ? 'جارٍ الحذف...' : 'حذف'}
                          </button>
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
