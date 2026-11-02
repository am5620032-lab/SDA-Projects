'use server'

import { getAuthenticatedActor, createSupabaseAdminClient } from '@/app/actions/server-auth'
import { getHrEmployeeId } from '@/app/actions/hr-session'
import type { DepartmentWithManager } from '@/types/department'

export interface EmployeeDashboardRecord {
  id: string
  full_name: string
  national_id: string
  employee_number: string
  work_start_date: string | null
  birth_date: string
  social_status: string
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
  address: string
  employment_status: string
  delegation_entity: string
  branch: string
  job_type: string
  notes: string
  photo_url: string | null
  delegation_start_date: string | null
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
}

type DashboardResult = { data: EmployeesDashboardData } | { error: string }

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
    ] = await Promise.all([
      adminResult.client.from('employees')
        .select('id, full_name, national_id, employee_number, work_start_date, birth_date, social_status, qualification, major, university, hire_date, job_title, department, grade, basic_salary, variable_salary, phone, address, employment_status, delegation_entity, branch, job_type, notes, photo_url, delegation_start_date, department_id, direct_manager_id, created_at')
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
    ])

    if (employeesResult.error) return { error: `تعذر تحميل بيانات الموظفين: ${employeesResult.error.message}` }
    if (departmentsResult.error) return { error: `تعذر تحميل الإدارات: ${departmentsResult.error.message}` }
    if (employeeCountResult.error) return { error: `تعذر إحصاء الموظفين: ${employeeCountResult.error.message}` }
    if (pendingCountResult.error) return { error: `تعذر إحصاء طلبات الإجازة: ${pendingCountResult.error.message}` }
    if (pendingLeavesResult.error) return { error: `تعذر تحميل طلبات الإجازة: ${pendingLeavesResult.error.message}` }

    const employeeRows = employeesResult.data ?? []
    const departmentRows = departmentsResult.data ?? []
    const employeeById = new Map(employeeRows.map((employee) => [employee.id, employee]))
    const departmentById = new Map(departmentRows.map((department) => [department.id, department]))

    const employees: EmployeeDashboardRecord[] = employeeRows.map((employee) => ({
      id: employee.id,
      full_name: employee.full_name,
      national_id: employee.national_id ?? '',
      employee_number: employee.employee_number ?? '',
      work_start_date: employee.work_start_date,
      birth_date: employee.birth_date ?? '',
      social_status: employee.social_status ?? '',
      qualification: employee.qualification ?? '',
      major: employee.major ?? '',
      university: employee.university ?? '',
      hire_date: employee.hire_date ?? '',
      job_title: employee.job_title ?? '',
      department: employee.department ?? '',
      grade: employee.grade ?? '',
      basic_salary: employee.basic_salary ?? 0,
      variable_salary: employee.variable_salary ?? 0,
      phone: employee.phone ?? '',
      address: employee.address ?? '',
      employment_status: employee.employment_status ?? '',
      delegation_entity: employee.delegation_entity ?? '',
      branch: employee.branch ?? '',
      job_type: employee.job_type ?? '',
      notes: employee.notes ?? '',
      photo_url: employee.photo_url,
      delegation_start_date: employee.delegation_start_date,
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
      },
    }
  } catch (error) {
    console.error('Fetch Error:', error)
    return {
      error: error instanceof Error ? error.message : 'تعذر تحميل بيانات منظومة شؤون الموظفين.',
    }
  }
}
