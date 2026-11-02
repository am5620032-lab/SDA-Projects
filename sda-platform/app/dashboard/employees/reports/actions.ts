'use server'

import { getHrEmployeeId } from '@/app/actions/hr-session'
import { createSupabaseAdminClient } from '@/app/actions/server-auth'

export type HrReportKind = 'employees' | 'attendance' | 'leaves'
export type HrReportRow = Record<string, string | number | null>

async function getAllPages<T>(load: (from: number, to: number) => PromiseLike<{
  data: T[] | null
  error: { message: string } | null
}>): Promise<{ data: T[] } | { error: string }> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const result = await load(from, from + 999)
    if (result.error) return { error: result.error.message }
    const page = result.data ?? []
    rows.push(...page)
    if (page.length < 1000) return { data: rows }
  }
}

export async function getHrReportData(kind: HrReportKind): Promise<
  { title: string; rows: HrReportRow[] } | { error: string }
> {
  if (!['employees', 'attendance', 'leaves'].includes(kind)) return { error: 'نوع التقرير غير صالح.' }
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  if (kind === 'employees') {
    const result = await getAllPages((from, to) => adminResult.client.from('employees')
      .select('full_name, employee_number, national_id, job_title, department, branch, employment_status, hire_date')
      .order('full_name')
      .range(from, to))
    if ('error' in result) return { error: `تعذر جلب تقرير الموظفين: ${result.error}` }
    return {
      title: 'كشف الموظفين',
      rows: result.data.map((employee) => ({
        'الاسم': employee.full_name,
        'الرقم الوظيفي': employee.employee_number,
        'الرقم الوطني': employee.national_id,
        'المسمى الوظيفي': employee.job_title,
        'الإدارة': employee.department,
        'الفرع': employee.branch,
        'الحالة الوظيفية': employee.employment_status,
        'تاريخ التعيين': employee.hire_date,
      })),
    }
  }

  if (kind === 'attendance') {
    const result = await getAllPages((from, to) => adminResult.client.from('attendance')
      .select('employee_id, check_in, check_out, status, late_minutes')
      .order('check_in', { ascending: false })
      .range(from, to))
    if ('error' in result) return { error: `تعذر جلب تقرير الحضور: ${result.error}` }

    const employeeIds = [...new Set(result.data.map((record) => record.employee_id))]
    const names = new Map<string, string>()
    for (let index = 0; index < employeeIds.length; index += 500) {
      const { data, error } = await adminResult.client.from('employees')
        .select('id, full_name')
        .in('id', employeeIds.slice(index, index + 500))
      if (error) return { error: `تعذر جلب أسماء الموظفين: ${error.message}` }
      for (const employee of data ?? []) names.set(employee.id, employee.full_name)
    }
    return {
      title: 'كشف الحضور والانصراف',
      rows: result.data.map((record) => ({
        'الموظف': names.get(record.employee_id) ?? 'غير معروف',
        'وقت الحضور': record.check_in,
        'وقت الانصراف': record.check_out,
        'الحالة': record.status,
        'دقائق التأخير': record.late_minutes ?? 0,
      })),
    }
  }

  const result = await getAllPages((from, to) => adminResult.client.from('leaves')
    .select('employee_id, leave_type, start_date, end_date, days_count, status, manager_notes')
    .order('created_at', { ascending: false })
    .range(from, to))
  if ('error' in result) return { error: `تعذر جلب تقرير الإجازات: ${result.error}` }

  const employeeIds = [...new Set(result.data.map((leave) => leave.employee_id))]
  const names = new Map<string, string>()
  for (let index = 0; index < employeeIds.length; index += 500) {
    const { data, error } = await adminResult.client.from('employees')
      .select('id, full_name')
      .in('id', employeeIds.slice(index, index + 500))
    if (error) return { error: `تعذر جلب أسماء الموظفين: ${error.message}` }
    for (const employee of data ?? []) names.set(employee.id, employee.full_name)
  }
  return {
    title: 'كشف الإجازات',
    rows: result.data.map((leave) => ({
      'الموظف': names.get(leave.employee_id) ?? 'غير معروف',
      'نوع الإجازة': leave.leave_type,
      'من تاريخ': leave.start_date,
      'إلى تاريخ': leave.end_date,
      'عدد الأيام': leave.days_count,
      'الحالة': leave.status,
      'ملاحظات المدير': leave.manager_notes,
    })),
  }
}
