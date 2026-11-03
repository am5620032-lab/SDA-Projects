'use server'

import { getAuthenticatedActor, createSupabaseAdminClient } from '@/app/actions/server-auth'
import { getHrEmployeeId } from '@/app/actions/hr-session'
import type { DepartmentWithManager } from '@/types/department'
import { getPromotionEligibilityDate } from './promotion-eligibility'

export interface EmployeeDashboardRecord {
  id: string
  full_name: string
  national_id: string
  employee_number: string
  work_start_date: string | null
  birth_date: string
  birth_place: string
  nationality: string
  social_status: string
  gender: string
  qualification: string
  major: string
  university: string
  hire_date: string
  job_title: string
  department: string
  grade: string
  basic_salary: number
  variable_salary: number
  phone: string
  email: string
  address: string
  category: string
  rank: string
  last_promotion_date: string | null
  employment_status: string
  delegation_entity: string
  branch: string
  job_type: string
  notes: string
  photo_url: string | null
  delegation_start_date: string | null
  delegation_end_date: string | null
  department_id: string | null
  direct_manager_id: string | null
  department_info: { name: string } | null
  direct_manager_info: { full_name: string } | null
}

export interface EmployeeDashboardLeave {
  id: string
  leave_type: string
  start_date: string
  employees: { full_name: string } | null
}

export interface EmployeesDashboardData {
  employees: EmployeeDashboardRecord[]
  departments: DepartmentWithManager[]
  userRole: string
  employeeCount: number
  pendingLeaveCount: number
  pendingLeaves: EmployeeDashboardLeave[]
  onDutyCount: number
  onLeaveCount: number
  delegatedCount: number
  unreturnedAssetsCount: number
  pendingClearanceCount: number
  terminatedUnreturnedAssetsCount: number
  promotionEligibleEmployees: { id: string; full_name: string; eligible_since: string }[]
}

type DashboardResult = { data: EmployeesDashboardData } | { error: string }

export async function deleteEmployee(
  employeeId: string,
): Promise<{ success: true; warning?: string } | { error: string }> {
  if (typeof employeeId !== 'string' || !employeeId.trim()) {
    return { error: 'معرّف الموظف غير صالح.' }
  }

  const moduleEmployeeId = await getHrEmployeeId()
  if (!moduleEmployeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }

  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية حذف بيانات الموظفين.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  let deletedEmployee: { id: string; full_name: string } | null
  try {
    const { data, error } = await adminResult.client
      .from('employees')
      .delete()
      .eq('id', employeeId.trim())
      .select('id, full_name')
      .maybeSingle()

    if (error) {
      if (error.code === '23503') {
        return { error: 'لا يمكن حذف الموظف لوجود سجلات مرتبطة به (إجازات، عهد، حضور). يرجى حذفها أولاً.' }
      }
      return { error: `تعذر حذف الموظف: ${error.message}` }
    }
    deletedEmployee = data
  } catch (error) {
    return { error: `تعذر حذف الموظف: ${error instanceof Error ? error.message : 'خطأ غير معروف.'}` }
  }
  if (!deletedEmployee) return { error: 'الموظف غير موجود أو تم حذفه مسبقاً.' }

  try {
    const { error: auditError } = await adminResult.client.from('audit_logs').insert({
      actor_id: actorResult.actor.id,
      actor_name: actorResult.actor.fullName || null,
      actor_email: actorResult.actor.email,
      action: 'delete',
      details: `حذف بيانات الموظف: ${deletedEmployee.full_name || deletedEmployee.id}`,
    })
    if (auditError) {
      console.error('Employee deletion audit log insert failed:', auditError)
      return { success: true, warning: `تعذر تسجيل حركة الحذف: ${auditError.message}` }
    }
  } catch (error) {
    console.error('Employee deletion audit log failed:', error)
    return {
      success: true,
      warning: `تعذر تسجيل حركة الحذف: ${error instanceof Error ? error.message : 'خطأ غير معروف.'}`,
    }
  }
  return { success: true }
}

export async function getEmployeesDashboardData(): Promise<DashboardResult> {
  try {
    const employeeId = await getHrEmployeeId()
    if (!employeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }

    let userRole = 'employee'
    try {
      const actorResult = await getAuthenticatedActor()
      if ('actor' in actorResult) userRole = actorResult.actor.role
      else console.error('Unable to load platform role for employee dashboard:', actorResult.error)
    } catch (error) {
      console.error('Unable to load platform role for employee dashboard:', error)
    }

    const adminResult = createSupabaseAdminClient()
    if ('error' in adminResult) return adminResult

    const [
      employeesResult,
      departmentsResult,
      employeeCountResult,
      pendingCountResult,
      pendingLeavesResult,
      onLeaveCountResult,
      assetCountResult,
      pendingClearanceCountResult,
      terminatedEmployeesResult,
    ] = await Promise.all([
      adminResult.client.from('employees')
        .select('id, full_name, national_id, employee_number, work_start_date, birth_date, birth_place, nationality, social_status, gender, qualification, major, university, hire_date, job_title, department, grade, category, rank, last_promotion_date, basic_salary, variable_salary, phone, email, address, employment_status, delegation_entity, branch, job_type, notes, photo_url, delegation_start_date, delegation_end_date, department_id, direct_manager_id, created_at')
        .order('created_at', { ascending: false }),
      adminResult.client.from('departments')
        .select('id, name, type, parent_id, manager_id, created_at')
        .order('name'),
      adminResult.client.from('employees').select('id', { count: 'exact', head: true }),
      adminResult.client.from('leaves').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      adminResult.client.from('leaves')
        .select('id, employee_id, leave_type, start_date')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(3),
      adminResult.client.from('leaves')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved')
        .lte('start_date', new Date().toISOString().slice(0, 10))
        .gte('end_date', new Date().toISOString().slice(0, 10)),
      adminResult.client.from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'assigned'),
      adminResult.client.from('clearances')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      adminResult.client.from('employees')
        .select('id')
        .in('employment_status', ['terminated', 'resigned']),
    ])

    if (employeesResult.error) return { error: `تعذر تحميل بيانات الموظفين: ${employeesResult.error.message}` }
    if (departmentsResult.error) return { error: `تعذر تحميل الإدارات: ${departmentsResult.error.message}` }
    if (employeeCountResult.error) return { error: `تعذر إحصاء الموظفين: ${employeeCountResult.error.message}` }
    if (pendingCountResult.error) return { error: `تعذر إحصاء طلبات الإجازة: ${pendingCountResult.error.message}` }
    if (pendingLeavesResult.error) return { error: `تعذر تحميل طلبات الإجازة: ${pendingLeavesResult.error.message}` }
    if (onLeaveCountResult.error) return { error: `تعذر إحصاء الموظفين في إجازة: ${onLeaveCountResult.error.message}` }
    if (assetCountResult.error) return { error: `تعذر إحصاء العهد غير المعادة: ${assetCountResult.error.message}` }
    if (pendingClearanceCountResult.error) return { error: `تعذر إحصاء طلبات إخلاء الطرف: ${pendingClearanceCountResult.error.message}` }
    if (terminatedEmployeesResult.error) return { error: `تعذر جلب الموظفين المنتهية خدمتهم: ${terminatedEmployeesResult.error.message}` }

    const employeeRows = employeesResult.data ?? []
    const departmentRows = departmentsResult.data ?? []
    const employeeById = new Map(employeeRows.map((employee) => [employee.id, employee]))
    const departmentById = new Map(departmentRows.map((department) => [department.id, department]))
    const today = new Date().toISOString().slice(0, 10)
    const terminatedEmployeeIds = (terminatedEmployeesResult.data ?? []).map((employee) => employee.id)
    let terminatedUnreturnedAssetsCount = 0
    for (let index = 0; index < terminatedEmployeeIds.length; index += 500) {
      const { count, error } = await adminResult.client.from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'assigned')
        .in('employee_id', terminatedEmployeeIds.slice(index, index + 500))
      if (error) return { error: `تعذر إحصاء عهد الموظفين المنتهية خدمتهم: ${error.message}` }
      terminatedUnreturnedAssetsCount += count ?? 0
    }

    const promotionEligibleEmployees = employeeRows.flatMap((employee) => {
      if (employee.employment_status === 'terminated') return []
      const eligibleSince = getPromotionEligibilityDate(employee.hire_date, employee.last_promotion_date, today)
      return eligibleSince
        ? [{ id: employee.id, full_name: employee.full_name, eligible_since: eligibleSince }]
        : []
    })

    const employees: EmployeeDashboardRecord[] = employeeRows.map((employee) => ({
      id: employee.id,
      full_name: employee.full_name,
      national_id: employee.national_id ?? '',
      employee_number: employee.employee_number ?? '',
      work_start_date: employee.work_start_date,
      birth_date: employee.birth_date ?? '',
      birth_place: employee.birth_place ?? '',
      nationality: employee.nationality ?? '',
      social_status: employee.social_status ?? '',
      gender: employee.gender ?? '',
      qualification: employee.qualification ?? '',
      major: employee.major ?? '',
      university: employee.university ?? '',
      hire_date: employee.hire_date ?? '',
      job_title: employee.job_title ?? '',
      department: employee.department ?? '',
      grade: employee.grade ?? '',
      category: employee.category ?? '',
      rank: employee.rank ?? '',
      last_promotion_date: employee.last_promotion_date,
      basic_salary: employee.basic_salary ?? 0,
      variable_salary: employee.variable_salary ?? 0,
      phone: employee.phone ?? '',
      email: employee.email ?? '',
      address: employee.address ?? '',
      employment_status: employee.employment_status ?? '',
      delegation_entity: employee.delegation_entity ?? '',
      branch: employee.branch ?? '',
      job_type: employee.job_type ?? '',
      notes: employee.notes ?? '',
      photo_url: employee.photo_url,
      delegation_start_date: employee.delegation_start_date,
      delegation_end_date: employee.delegation_end_date,
      department_id: employee.department_id,
      direct_manager_id: employee.direct_manager_id,
      department_info: employee.department_id
        ? { name: departmentById.get(employee.department_id)?.name ?? '' }
        : null,
      direct_manager_info: employee.direct_manager_id
        ? { full_name: employeeById.get(employee.direct_manager_id)?.full_name ?? '' }
        : null,
    }))

    const pendingLeaves: EmployeeDashboardLeave[] = (pendingLeavesResult.data ?? []).map((leave) => ({
      id: leave.id,
      leave_type: leave.leave_type,
      start_date: leave.start_date,
      employees: { full_name: employeeById.get(leave.employee_id)?.full_name ?? 'موظف غير محدد' },
    }))

    return {
      data: {
        employees,
        departments: departmentRows,
        userRole,
        employeeCount: employeeCountResult.count ?? employees.length,
        pendingLeaveCount: pendingCountResult.count ?? 0,
        pendingLeaves,
        onDutyCount: employeeRows.filter((employee) => employee.employment_status === 'on_duty').length,
        onLeaveCount: onLeaveCountResult.count ?? 0,
        delegatedCount: employeeRows.filter((employee) => ['delegated', 'seconded'].includes(employee.employment_status ?? '')).length,
        unreturnedAssetsCount: assetCountResult.count ?? 0,
        pendingClearanceCount: pendingClearanceCountResult.count ?? 0,
        terminatedUnreturnedAssetsCount,
        promotionEligibleEmployees,
      },
    }
  } catch (error) {
    console.error('Fetch Error:', error)
    return {
      error: error instanceof Error ? error.message : 'تعذر تحميل بيانات منظومة شؤون الموظفين.',
    }
  }
}
