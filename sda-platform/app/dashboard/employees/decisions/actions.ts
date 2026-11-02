'use server'

import { createSupabaseAdminClient, getAuthenticatedActor, type AdminDatabase } from '@/app/actions/server-auth'
import { logAction } from '@/app/actions/log-action'
import type { SupabaseClient } from '@supabase/supabase-js'

const authorizedRoles = ['it_manager', 'admin_manager']
const decisionTargets = {
  appointment: { column: 'employment_status', value: 'on_duty' },
  promotion: { column: 'grade' },
  job_title: { column: 'job_title' },
  transfer: { column: 'branch' },
  delegation: { column: 'employment_status', value: 'delegated' },
  secondment: { column: 'employment_status', value: 'seconded' },
  allowance: { column: 'variable_salary', numeric: true },
  termination: { column: 'employment_status', value: 'terminated' },
} as const

export type DecisionType = keyof typeof decisionTargets

export interface HrDecision {
  id: string
  employee_id: string
  employee_name: string
  decision_type: DecisionType
  decision_number: string
  decision_date: string
  details: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

export interface DecisionEmployee {
  id: string
  full_name: string
  job_title: string | null
  grade: string | null
  employment_status: string | null
  branch: string | null
  variable_salary: number | null
}

type AdminContext = { client: SupabaseClient<AdminDatabase> } | { error: string }

async function getAuthorizedContext(): Promise<AdminContext> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!authorizedRoles.includes(actorResult.actor.role)) return { error: 'ليس لديك صلاحية إصدار القرارات الإدارية.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { client: adminResult.client }
}

export async function getDecisionData(): Promise<
  { decisions: HrDecision[]; employees: DecisionEmployee[] } | { error: string }
> {
  const context = await getAuthorizedContext()
  if ('error' in context) return context

  const [{ data: decisions, error: decisionError }, { data: employees, error: employeeError }] = await Promise.all([
    context.client.from('hr_decisions')
      .select('id, employee_id, decision_type, decision_number, decision_date, details, old_value, new_value, created_at')
      .order('decision_date', { ascending: false }),
    context.client.from('employees')
      .select('id, full_name, job_title, grade, employment_status, branch, variable_salary')
      .order('full_name'),
  ])
  if (decisionError) return { error: `تعذر جلب القرارات: ${decisionError.message}` }
  if (employeeError) return { error: `تعذر جلب الموظفين: ${employeeError.message}` }

  const employeeById = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]))
  const validTypes = Object.keys(decisionTargets) as DecisionType[]
  return {
    decisions: (decisions ?? []).map((decision) => ({
      ...decision,
      decision_type: validTypes.includes(decision.decision_type as DecisionType)
        ? decision.decision_type as DecisionType
        : 'job_title',
      employee_name: employeeById.get(decision.employee_id) ?? 'موظف غير معروف',
    })),
    employees: employees ?? [],
  }
}

export async function createDecision(input: {
  employeeId: string
  decisionType: DecisionType
  decisionNumber: string
  decisionDate: string
  details: string
  newValue?: string
}): Promise<{ success: true; decisionId: string; warning?: string } | { error: string }> {
  const context = await getAuthorizedContext()
  if ('error' in context) return context
  if (!input || typeof input !== 'object') return { error: 'بيانات القرار غير صالحة.' }
  if (
    typeof input.employeeId !== 'string'
    || typeof input.decisionType !== 'string'
    || !Object.hasOwn(decisionTargets, input.decisionType)
    || typeof input.decisionNumber !== 'string'
    || typeof input.decisionDate !== 'string'
    || typeof input.details !== 'string'
    || typeof input.newValue !== 'string'
  ) return { error: 'يرجى استكمال بيانات القرار.' }

  const decisionNumber = input.decisionNumber.trim()
  const details = input.details.trim()
  const newValueText = input.newValue.trim()
  if (!decisionNumber || decisionNumber.length > 100 || !details || details.length > 4000) {
    return { error: 'رقم القرار أو تفاصيله غير صالحة.' }
  }
  const parsedDate = Date.parse(`${input.decisionDate}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.decisionDate)
    || Number.isNaN(parsedDate)
    || new Date(parsedDate).toISOString().slice(0, 10) !== input.decisionDate
  ) {
    return { error: 'تاريخ القرار غير صالح.' }
  }

  const target = decisionTargets[input.decisionType]
  if (!('value' in target) && !newValueText) return { error: 'القيمة الجديدة مطلوبة لهذا النوع من القرارات.' }
  const nextValueText = 'value' in target ? target.value : newValueText
  if ('numeric' in target && target.numeric && (!Number.isFinite(Number(nextValueText)) || Number(nextValueText) < 0)) {
    return { error: 'قيمة العلاوة يجب أن تكون رقماً غير سالب.' }
  }

  const { data: employee, error: employeeError } = await context.client
    .from('employees')
    .select('id, full_name, job_title, grade, employment_status, branch, variable_salary')
    .eq('id', input.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'الموظف المحدد غير موجود.' }

  const oldValue = String(employee[target.column] ?? '')
  const nextValue = 'numeric' in target && target.numeric ? Number(nextValueText) : nextValueText
  const { data: decision, error: insertError } = await context.client.from('hr_decisions').insert({
    employee_id: employee.id,
    decision_type: input.decisionType,
    decision_number: decisionNumber,
    decision_date: input.decisionDate,
    details,
    old_value: oldValue || null,
    new_value: nextValueText,
  }).select('id').single()
  if (insertError) return { error: `تعذر حفظ القرار: ${insertError.message}` }

  const employeeUpdate: AdminDatabase['public']['Tables']['employees']['Update'] = {}
  switch (input.decisionType) {
    case 'appointment':
      employeeUpdate.employment_status = 'on_duty'
      break
    case 'delegation':
      employeeUpdate.employment_status = 'delegated'
      break
    case 'secondment':
      employeeUpdate.employment_status = 'seconded'
      break
    case 'termination':
      employeeUpdate.employment_status = 'terminated'
      break
    case 'promotion':
      employeeUpdate.grade = String(nextValue)
      employeeUpdate.last_promotion_date = input.decisionDate
      break
    case 'job_title':
      employeeUpdate.job_title = String(nextValue)
      break
    case 'transfer':
      employeeUpdate.branch = String(nextValue)
      break
    case 'allowance':
      employeeUpdate.variable_salary = Number(nextValue)
      break
  }
  const { error: updateError } = await context.client.from('employees')
    .update(employeeUpdate)
    .eq('id', employee.id)
  if (updateError) {
    const { error: rollbackError } = await context.client.from('hr_decisions').delete().eq('id', decision.id)
    return {
      error: rollbackError
        ? `تعذر تحديث ملف الموظف (${updateError.message})، كما تعذر التراجع عن القرار (${rollbackError.message}).`
        : `تعذر تحديث ملف الموظف ولم يُسجل القرار: ${updateError.message}`,
    }
  }

  let warning: string | undefined
  try {
    const auditResult = await logAction('add', `إصدار القرار رقم ${decisionNumber} للموظف ${employee.full_name}`)
    if ('error' in auditResult) warning = `تم تطبيق القرار، لكن تعذر تسجيله في سجل المراقبة: ${auditResult.error}`
  } catch (error) {
    warning = `تم تطبيق القرار، لكن تعذر تسجيله في سجل المراقبة: ${error instanceof Error ? error.message : 'حدث خطأ غير متوقع.'}`
  }
  return { success: true, decisionId: decision.id, ...(warning ? { warning } : {}) }
}

export async function getDecisionForPrint(id: string): Promise<
  { decision: Omit<HrDecision, 'employee_name'>; employee: DecisionEmployee } | { error: string }
> {
  const context = await getAuthorizedContext()
  if ('error' in context) return context
  if (!id) return { error: 'معرّف القرار مطلوب.' }

  const { data: decision, error: decisionError } = await context.client
    .from('hr_decisions')
    .select('id, employee_id, decision_type, decision_number, decision_date, details, old_value, new_value, created_at')
    .eq('id', id)
    .maybeSingle()
  if (decisionError) return { error: `تعذر جلب القرار: ${decisionError.message}` }
  if (!decision) return { error: 'القرار المطلوب غير موجود.' }

  const { data: employee, error: employeeError } = await context.client
    .from('employees')
    .select('id, full_name, job_title, grade, employment_status, branch, variable_salary')
    .eq('id', decision.employee_id)
    .maybeSingle()
  if (employeeError) return { error: `تعذر جلب بيانات الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'الموظف المرتبط بالقرار غير موجود.' }
  return { decision: { ...decision, decision_type: decision.decision_type as DecisionType }, employee }
}
