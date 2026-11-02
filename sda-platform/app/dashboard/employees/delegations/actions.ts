'use server'

import { getHrEmployeeId } from '@/app/actions/hr-session'
import { logAction } from '@/app/actions/log-action'
import { createSupabaseAdminClient } from '@/app/actions/server-auth'

export interface DelegatedEmployee {
  id: string
  full_name: string
  employee_number: string | null
  job_title: string | null
  department: string | null
  branch: string | null
  employment_status: 'delegated' | 'seconded'
  delegation_entity: string | null
  delegation_start_date: string | null
  delegation_end_date: string | null
  phone: string | null
}

export async function getDelegations(): Promise<
  { data: DelegatedEmployee[] } | { error: string }
> {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { data, error } = await adminResult.client
    .from('employees')
    .select('id, full_name, employee_number, job_title, department, branch, employment_status, delegation_entity, delegation_start_date, delegation_end_date, phone')
    .in('employment_status', ['delegated', 'seconded'])
    .order('full_name')

  if (error) return { error: `تعذر تحميل بيانات الندب والإعارة: ${error.message}` }

  const employees: DelegatedEmployee[] = []
  for (const employee of data ?? []) {
    const status = employee.employment_status
    if (status !== 'delegated' && status !== 'seconded') continue
    employees.push({ ...employee, employment_status: status })
  }

  return { data: employees }
}

export async function updateDelegationDates(input: {
  employeeId: string
  startDate: string
  endDate: string
}): Promise<{ success: true; warning?: string } | { error: string }> {
  const sessionEmployeeId = await getHrEmployeeId()
  if (!sessionEmployeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }
  if (!input || typeof input.employeeId !== 'string'
    || typeof input.startDate !== 'string' || typeof input.endDate !== 'string') {
    return { error: 'بيانات مدة الندب غير صالحة.' }
  }

  const isValidDate = (value: string) => {
    if (!value) return true
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const parsed = Date.parse(`${value}T00:00:00Z`)
    return !Number.isNaN(parsed) && new Date(parsed).toISOString().slice(0, 10) === value
  }
  if (!input.employeeId || !isValidDate(input.startDate) || !isValidDate(input.endDate)) {
    return { error: 'يرجى إدخال تواريخ صحيحة.' }
  }
  if (input.endDate && (!input.startDate || input.endDate < input.startDate)) {
    return { error: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية أو مساوياً له.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { data: employee, error: employeeError } = await adminResult.client.from('employees')
    .select('id, full_name, employment_status')
    .eq('id', input.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee || !['delegated', 'seconded'].includes(employee.employment_status ?? '')) {
    return { error: 'الموظف المحدد ليس ضمن سجلات الندب أو الإعارة.' }
  }

  const { error } = await adminResult.client.from('employees')
    .update({
      delegation_start_date: input.startDate || null,
      delegation_end_date: input.endDate || null,
    })
    .eq('id', employee.id)
  if (error) return { error: `تعذر تحديث مدة الندب: ${error.message}` }

  try {
    const auditResult = await logAction('update', `تعديل مدة الندب/الإعارة للموظف ${employee.full_name}`)
    if ('error' in auditResult) return { success: true, warning: auditResult.error }
  } catch (error) {
    return { success: true, warning: error instanceof Error ? error.message : 'تعذر تسجيل الحركة.' }
  }
  return { success: true }
}
