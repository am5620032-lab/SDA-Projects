'use server'

import { createSupabaseAdminClient, getAuthenticatedActor } from '@/app/actions/server-auth'
import type { Department, DepartmentWithManager, OrganizationEmployee } from '@/types/department'

const editableRoles = ['admin_manager', 'it_manager']
const departmentTypes = ['إدارة', 'مكتب', 'قسم']

type DepartmentInput = Pick<Department, 'name' | 'type' | 'parent_id' | 'manager_id'>
type ActionResult = { success: true } | { error: string }

async function getAuthorizedClient(requireEditor = false) {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (requireEditor && !editableRoles.includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية تعديل الهيكل التنظيمي.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { client: adminResult.client }
}

function validateDepartmentInput(data: DepartmentInput) {
  if (!data.name.trim()) return 'اسم الإدارة مطلوب.'
  if (!departmentTypes.includes(data.type)) return 'نوع الجهة غير صالح.'
  return null
}

export async function getDepartments(): Promise<{ data: DepartmentWithManager[] } | { error: string }> {
  const context = await getAuthorizedClient()
  if ('error' in context) return context

  const { data: departments, error: departmentsError } = await context.client
    .from('departments')
    .select('id, name, type, parent_id, manager_id, created_at')
    .order('name')
  if (departmentsError) return { error: `تعذر جلب الإدارات: ${departmentsError.message}` }

  const { data: employees, error: employeesError } = await context.client
    .from('employees')
    .select('id, full_name, employee_number, department_id, direct_manager_id')
  if (employeesError) return { error: `تعذر جلب موظفي الإدارات: ${employeesError.message}` }

  const employeeById = new Map((employees ?? []).map((employee) => [employee.id, employee]))
  const employeesByDepartment = new Map<string, OrganizationEmployee[]>()
  for (const employee of employees ?? []) {
    if (!employee.department_id) continue
    const departmentEmployees = employeesByDepartment.get(employee.department_id) ?? []
    departmentEmployees.push(employee)
    employeesByDepartment.set(employee.department_id, departmentEmployees)
  }

  return {
    data: (departments ?? []).map((department) => {
      const manager = department.manager_id ? employeeById.get(department.manager_id) : undefined
      return {
        ...department,
        ...(manager ? { manager: { full_name: manager.full_name } } : {}),
        employees_count: employeesByDepartment.get(department.id)?.length ?? 0,
      }
    }),
  }
}

export async function getOrganizationEmployees(): Promise<
  { data: OrganizationEmployee[] } | { error: string }
> {
  const context = await getAuthorizedClient()
  if ('error' in context) return context

  const { data, error } = await context.client
    .from('employees')
    .select('id, full_name, employee_number, department_id, direct_manager_id')
    .order('full_name')
  if (error) return { error: `تعذر جلب الموظفين: ${error.message}` }
  return { data: data ?? [] }
}

export async function createDepartment(data: DepartmentInput): Promise<ActionResult> {
  const context = await getAuthorizedClient(true)
  if ('error' in context) return context

  const validationError = validateDepartmentInput(data)
  if (validationError) return { error: validationError }

  const { error } = await context.client.from('departments').insert({
    ...data,
    name: data.name.trim(),
  })
  if (error) return { error: `تعذر إنشاء الجهة: ${error.message}` }
  return { success: true }
}

export async function updateDepartment(id: string, data: DepartmentInput): Promise<ActionResult> {
  const context = await getAuthorizedClient(true)
  if ('error' in context) return context

  const validationError = validateDepartmentInput(data)
  if (validationError) return { error: validationError }
  if (!id) return { error: 'معرّف الجهة مطلوب.' }
  if (data.parent_id === id) return { error: 'لا يمكن جعل الجهة أباً لنفسها.' }

  if (data.parent_id) {
    const { data: departments, error: departmentsError } = await context.client
      .from('departments')
      .select('id, parent_id')
    if (departmentsError) return { error: `تعذر التحقق من التسلسل الإداري: ${departmentsError.message}` }

    const parentById = new Map((departments ?? []).map((department) => [department.id, department.parent_id]))
    let ancestorId: string | null | undefined = data.parent_id
    const visited = new Set<string>()
    while (ancestorId) {
      if (ancestorId === id) return { error: 'لا يمكن وضع الجهة ضمن أحد فروعها التابعة.' }
      if (visited.has(ancestorId)) return { error: 'يوجد تسلسل دائري في الهيكل التنظيمي.' }
      visited.add(ancestorId)
      ancestorId = parentById.get(ancestorId)
    }
  }

  const { error } = await context.client
    .from('departments')
    .update({ ...data, name: data.name.trim() })
    .eq('id', id)
  if (error) return { error: `تعذر تعديل الجهة: ${error.message}` }
  return { success: true }
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  const context = await getAuthorizedClient(true)
  if ('error' in context) return context
  if (!id) return { error: 'معرّف الجهة مطلوب.' }

  const [{ count: childCount, error: childError }, { count: employeeCount, error: employeeError }] =
    await Promise.all([
      context.client.from('departments').select('id', { count: 'exact', head: true }).eq('parent_id', id),
      context.client.from('employees').select('id', { count: 'exact', head: true }).eq('department_id', id),
    ])
  if (childError) return { error: `تعذر التحقق من الجهات التابعة: ${childError.message}` }
  if (employeeError) return { error: `تعذر التحقق من الموظفين: ${employeeError.message}` }
  if ((childCount ?? 0) > 0) return { error: 'لا يمكن حذف الجهة لوجود جهات تابعة لها.' }
  if ((employeeCount ?? 0) > 0) return { error: 'لا يمكن حذف الجهة لوجود موظفين تابعين لها.' }

  const { error } = await context.client.from('departments').delete().eq('id', id)
  if (error) return { error: `تعذر حذف الجهة: ${error.message}` }
  return { success: true }
}

export async function assignEmployeeToDepartment(
  employeeId: string,
  departmentId: string | null,
  directManagerId: string | null,
): Promise<ActionResult> {
  const context = await getAuthorizedClient(true)
  if ('error' in context) return context
  if (!employeeId) return { error: 'الموظف مطلوب.' }
  if (directManagerId === employeeId) return { error: 'لا يمكن تعيين الموظف مديراً مباشراً لنفسه.' }

  const { error } = await context.client
    .from('employees')
    .update({ department_id: departmentId, direct_manager_id: directManagerId })
    .eq('id', employeeId)
  if (error) return { error: `تعذر ربط الموظف بالجهة: ${error.message}` }
  return { success: true }
}
