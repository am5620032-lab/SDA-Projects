'use server'

import { getHrEmployeeId } from '@/app/actions/hr-session'
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
