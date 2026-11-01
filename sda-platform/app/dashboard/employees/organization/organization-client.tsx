'use client'

import { useMemo, useState } from 'react'
import { Building2, ChevronDown, Network, Pencil, Plus, Trash2, UsersRound } from 'lucide-react'
import {
  assignEmployeeToDepartment,
  createDepartment,
  deleteDepartment,
  getDepartments,
  getOrganizationEmployees,
  updateDepartment,
} from './actions'
import type { Department, DepartmentWithManager, OrganizationEmployee } from '@/types/department'

type DepartmentForm = Pick<Department, 'name' | 'type' | 'parent_id' | 'manager_id'>
const emptyForm: DepartmentForm = { name: '', type: 'إدارة', parent_id: null, manager_id: null }

export default function OrganizationClient({
  departments: initialDepartments,
  employees: initialEmployees,
  canEdit,
}: {
  departments: DepartmentWithManager[]
  employees: OrganizationEmployee[]
  canEdit: boolean
}) {
  const [departments, setDepartments] = useState(initialDepartments)
  const [employees, setEmployees] = useState(initialEmployees)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DepartmentForm>(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const childrenByParent = useMemo(() => {
    const result = new Map<string | null, DepartmentWithManager[]>()
    for (const department of departments) {
      const children = result.get(department.parent_id) ?? []
      children.push(department)
      result.set(department.parent_id, children)
    }
    return result
  }, [departments])
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees])

  const refresh = async () => {
    const [departmentResult, employeeResult] = await Promise.all([getDepartments(), getOrganizationEmployees()])
    if ('error' in departmentResult) throw new Error(departmentResult.error)
    if ('error' in employeeResult) throw new Error(employeeResult.error)
    setDepartments(departmentResult.data)
    setEmployees(employeeResult.data)
  }

  const openCreate = (parentId: string | null = null) => {
    setEditingId(null)
    setForm({ ...emptyForm, parent_id: parentId })
    setError('')
    setModalOpen(true)
  }

  const openEdit = (department: Department) => {
    setEditingId(department.id)
    setForm({
      name: department.name,
      type: department.type,
      parent_id: department.parent_id,
      manager_id: department.manager_id,
    })
    setError('')
    setModalOpen(true)
  }

  const saveDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = editingId
        ? await updateDepartment(editingId, form)
        : await createDepartment(form)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setModalOpen(false)
      await refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ بيانات الجهة.')
    } finally {
      setSaving(false)
    }
  }

  const removeDepartment = async (department: Department) => {
    if (!window.confirm(`هل تريد حذف "${department.name}"؟`)) return
    setError('')
    try {
      const result = await deleteDepartment(department.id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      await refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف الجهة.')
    }
  }

  const assignEmployee = async (employeeId: string, departmentId: string, directManagerId: string) => {
    setError('')
    const result = await assignEmployeeToDepartment(
      employeeId,
      departmentId || null,
      directManagerId || null,
    )
    if ('error' in result) {
      setError(result.error)
      return
    }
    await refresh()
  }

  const renderDepartment = (department: DepartmentWithManager, depth = 0): React.ReactNode => {
    const children = childrenByParent.get(department.id) ?? []
    const isExpanded = expandedIds.has(department.id)
    const departmentEmployees = employees.filter((employee) => employee.department_id === department.id)

    return (
      <li key={department.id} className="list-none">
        <div
          className="rounded-xl border border-gray-200 bg-white shadow-sm"
          style={{ marginRight: `${depth * 18}px` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <button
              type="button"
              onClick={() => setExpandedIds((current) => {
                const next = new Set(current)
                if (next.has(department.id)) next.delete(department.id)
                else next.add(department.id)
                return next
              })}
              aria-expanded={isExpanded}
              className="flex min-w-0 flex-1 items-center gap-3 text-right"
            >
              <span className="rounded-lg bg-emerald-50 p-2 text-[#157A3F]">
                <Building2 size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-gray-900">{department.name}</span>
                <span className="block text-xs text-gray-500">
                  {department.type || 'جهة'} · المدير: {department.manager?.full_name || 'غير محدد'} · {department.employees_count ?? 0} موظف
                </span>
              </span>
              <ChevronDown size={18} className={`shrink-0 transition ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {canEdit && (
              <div className="flex gap-2">
                <button type="button" onClick={() => openCreate(department.id)} className="rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" aria-label={`إضافة جهة تابعة لـ${department.name}`}>
                  <Plus size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => openEdit(department)} className="rounded-lg border px-3 py-2 text-sm text-blue-700 hover:bg-blue-50" aria-label={`تعديل ${department.name}`}>
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => void removeDepartment(department)} className="rounded-lg border px-3 py-2 text-sm text-red-700 hover:bg-red-50" aria-label={`حذف ${department.name}`}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="border-t bg-gray-50 p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
                <UsersRound size={17} aria-hidden="true" /> الموظفون التابعون
              </div>
              {departmentEmployees.length === 0 ? (
                <p className="rounded-lg bg-white p-3 text-sm text-gray-500">لا يوجد موظفون مسجلون في هذه الجهة.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-white">
                  <table className="w-full min-w-[620px] text-right text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="p-3">الاسم</th>
                        <th className="p-3">الرقم الوظيفي</th>
                        <th className="p-3">المدير المباشر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentEmployees.map((employee) => (
                        <tr key={employee.id} className="border-t">
                          <td className="p-3 font-medium">{employee.full_name}</td>
                          <td className="p-3">{employee.employee_number || '—'}</td>
                          <td className="p-3">
                            {canEdit ? (
                              <select
                                aria-label={`المدير المباشر للموظف ${employee.full_name}`}
                                value={employee.direct_manager_id ?? ''}
                                onChange={(event) => void assignEmployee(employee.id, department.id, event.target.value)}
                                className="w-full rounded-lg border px-3 py-2"
                              >
                                <option value="">غير محدد</option>
                                {employees.filter((candidate) => candidate.id !== employee.id).map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>{candidate.full_name}</option>
                                ))}
                              </select>
                            ) : (
                              employeeById.get(employee.direct_manager_id ?? '')?.full_name || 'غير محدد'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {canEdit && employees.some((employee) => employee.department_id !== department.id) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <select
                    aria-label={`إضافة موظف إلى ${department.name}`}
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value) void assignEmployee(event.target.value, department.id, '')
                      event.target.value = ''
                    }}
                    className="min-w-56 rounded-lg border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">إسناد موظف إلى الجهة...</option>
                    {employees.filter((employee) => employee.department_id !== department.id).map((employee) => (
                      <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
        {isExpanded && children.length > 0 && (
          <ul className="mt-3 space-y-3">
            {children.map((child) => renderDepartment(child, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  const rootDepartments = childrenByParent.get(null) ?? departments.filter(
    (department) => !departments.some((candidate) => candidate.id === department.parent_id),
  )

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-[#157A3F] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-50 p-3 text-[#157A3F]"><Network size={24} aria-hidden="true" /></span>
            <div>
              <h1 className="text-2xl font-bold text-[#157A3F]">الهيكل التنظيمي</h1>
              <p className="text-sm text-gray-500">الإدارات والمكاتب والأقسام والموظفون التابعون</p>
            </div>
          </div>
          {canEdit && (
            <button type="button" onClick={() => openCreate()} className="inline-flex items-center gap-2 rounded-lg bg-[#157A3F] px-4 py-2.5 font-bold text-white hover:bg-emerald-800">
              <Plus size={18} aria-hidden="true" /> إضافة إدارة/مكتب
            </button>
          )}
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {departments.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white p-10 text-center text-gray-500">
            لا توجد جهات في الهيكل التنظيمي بعد.
          </div>
        ) : (
          <ul className="space-y-3">{rootDepartments.map((department) => renderDepartment(department))}</ul>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="department-dialog-title" className="my-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
              <h2 id="department-dialog-title" className="mb-5 text-xl font-bold text-[#157A3F]">
                {editingId ? 'تعديل جهة تنظيمية' : 'إضافة إدارة/مكتب'}
              </h2>
              <form onSubmit={saveDepartment} className="space-y-4">
                <label className="block text-sm font-semibold">
                  الاسم
                  <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="block text-sm font-semibold">
                  النوع
                  <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="إدارة">إدارة</option>
                    <option value="مكتب">مكتب</option>
                    <option value="قسم">قسم</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  الجهة الأب
                  <select value={form.parent_id ?? ''} onChange={(event) => setForm({ ...form, parent_id: event.target.value || null })} className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="">الجهة الرئيسية</option>
                    {departments.filter((department) => department.id !== editingId).map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  المدير
                  <select value={form.manager_id ?? ''} onChange={(event) => setForm({ ...form, manager_id: event.target.value || null })} className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="">غير محدد</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                  </select>
                </label>
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border px-4 py-2 text-gray-700">إلغاء</button>
                  <button type="submit" disabled={saving} className="rounded-lg bg-[#157A3F] px-5 py-2 font-bold text-white disabled:opacity-60">
                    {saving ? 'جارٍ الحفظ...' : 'حفظ'}
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
