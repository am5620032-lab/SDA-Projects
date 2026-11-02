'use client'

import { useState } from 'react'
import { KeyRound, Plus, UserRound } from 'lucide-react'
import { createModuleAccess, setModuleAccessActive } from './actions'
import type { ModuleAccount, ModuleEmployee, ModuleName } from './actions'

export default function ModulesClient({
  accounts: initialAccounts,
  employees,
}: {
  accounts: ModuleAccount[]
  employees: ModuleEmployee[]
}) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    employeeId: '',
    moduleName: 'archive' as ModuleName,
    username: '',
    password: '',
  })

  const openModal = () => {
    setForm({ employeeId: '', moduleName: 'archive', username: '', password: '' })
    setError('')
    setModalOpen(true)
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = await createModuleAccess(form)
      if ('error' in result) {
        setError(result.error)
        return
      }

      setAccounts((current) => [result.account, ...current])
      setModalOpen(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر إنشاء الحساب.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (account: ModuleAccount) => {
    setError('')
    const result = await setModuleAccessActive(account.id, !account.is_active)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setAccounts((current) => current.map((item) => item.id === account.id
      ? { ...item, is_active: !item.is_active }
      : item))
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-[#157A3F] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-50 p-3 text-[#157A3F]"><KeyRound size={24} aria-hidden="true" /></span>
            <div>
              <h1 className="text-2xl font-bold text-[#157A3F]">صلاحيات المنظومات</h1>
              <p className="mt-1 text-sm text-gray-500">إدارة أسماء المستخدمين وكلمات المرور الخاصة بالموظفين</p>
            </div>
          </div>
          <button type="button" onClick={openModal} className="inline-flex items-center gap-2 rounded-lg bg-[#157A3F] px-4 py-2.5 font-bold text-white hover:bg-emerald-800">
            <Plus size={18} aria-hidden="true" /> إضافة صلاحية جديدة
          </button>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          {accounts.length === 0 ? (
            <p className="p-8 text-center text-gray-500">لا توجد حسابات منظومات حالياً.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-right text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-4">الموظف</th>
                    <th className="p-4">المنظومة</th>
                    <th className="p-4">اسم المستخدم</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-t">
                      <td className="p-4">{account.employee_name}</td>
                      <td className="p-4">{account.module_name === 'archive' ? 'الأرشيف' : 'شؤون الموظفين'}</td>
                      <td className="p-4 font-mono" dir="ltr">{account.username}</td>
                      <td className="p-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${account.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {account.is_active ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button type="button" onClick={() => void toggleActive(account)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50">
                          {account.is_active ? 'إيقاف' : 'تفعيل'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="module-dialog-title" className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <h2 id="module-dialog-title" className="mb-5 text-xl font-bold text-[#157A3F]">إضافة صلاحية جديدة</h2>
              <form onSubmit={submit} className="space-y-4">
                <label className="block text-sm font-semibold">
                  الموظف
                  <select required value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5">
                    <option value="">اختر الموظف</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  المنظومة
                  <select value={form.moduleName} onChange={(event) => setForm({ ...form, moduleName: event.target.value as ModuleName })} className="mt-1 w-full rounded-lg border px-3 py-2.5">
                    <option value="archive">الأرشيف</option>
                    <option value="hr">شؤون الموظفين</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  اسم المستخدم
                  <span className="relative mt-1 block">
                    <UserRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                    <input required minLength={3} maxLength={64} pattern="[a-zA-Z0-9._-]+" autoComplete="off" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="w-full rounded-lg border py-2.5 pl-10 pr-3" dir="ltr" />
                  </span>
                </label>
                <label className="block text-sm font-semibold">
                  كلمة المرور
                  <input required minLength={10} maxLength={128} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2.5" />
                  <span className="mt-1 block text-xs font-normal text-gray-500">10 أحرف على الأقل. تُخزّن كلمة المرور مشفرة ولا يمكن عرضها لاحقاً.</span>
                </label>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2">إلغاء</button>
                  <button type="submit" disabled={saving} className="rounded-lg bg-[#157A3F] px-5 py-2 font-bold text-white disabled:opacity-60">
                    {saving ? 'جارٍ الحفظ...' : 'حفظ الصلاحية'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
