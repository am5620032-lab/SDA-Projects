'use server'

import { getHrEmployeeId } from '@/app/actions/hr-session'
import { createSupabaseAdminClient } from '@/app/actions/server-auth'
import { getPromotionEligibilityDate } from '../promotion-eligibility'

export type HrReportKind = 'employees' | 'attendance' | 'leaves'
export type HrReportRow = Record<string, string | number | null>
export interface PromotionEligibleEmployee {
  id: string
  full_name: string
  job_title: string | null
  hire_date: string | null
  last_promotion_date: string | null
  eligible_since: string
  latest_evaluation_score: number | null
}

export async function getPromotionEligibleEmployees(): Promise<
  { data: PromotionEligibleEmployee[] } | { error: string }
> {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { data, error } = await adminResult.client.from('employees')
    .select('id, full_name, job_title, hire_date, last_promotion_date, employment_status')
    .neq('employment_status', 'terminated')
    .order('full_name')
  if (error) return { error: `تعذر جلب قائمة المستحقين للترقية: ${error.message}` }

  const today = new Date().toISOString().slice(0, 10)
  const eligible = (data ?? []).flatMap((employee) => {
    const eligibleSince = getPromotionEligibilityDate(employee.hire_date, employee.last_promotion_date, today)
    if (!eligibleSince) return []

    return [{
      id: employee.id,
      full_name: employee.full_name,
      job_title: employee.job_title,
      hire_date: employee.hire_date,
      last_promotion_date: employee.last_promotion_date,
      eligible_since: eligibleSince,
      latest_evaluation_score: null,
    }]
  })

  if (eligible.length === 0) return { data: eligible }

  const eligibleIds = eligible.map((employee) => employee.id)
  const latestScores = new Map<string, number>()
  for (let index = 0; index < eligibleIds.length; index += 500) {
    const { data: evaluations, error: evaluationError } = await adminResult.client.from('evaluations')
      .select('employee_id, year, score, created_at')
      .eq('status', 'approved')
      .in('employee_id', eligibleIds.slice(index, index + 500))
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })
    if (evaluationError) return { error: `تعذر جلب درجات التقييم للمستحقين: ${evaluationError.message}` }
    for (const evaluation of evaluations ?? []) {
      if (!latestScores.has(evaluation.employee_id)) latestScores.set(evaluation.employee_id, evaluation.score)
    }
  }

  return {
    data: eligible.map((employee) => ({
      ...employee,
      latest_evaluation_score: latestScores.get(employee.id) ?? null,
    })),
  }
}

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
