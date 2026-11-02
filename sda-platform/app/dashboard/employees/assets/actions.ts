'use server'

import { getHrEmployeeId } from '@/app/actions/hr-session'
import { logAction } from '@/app/actions/log-action'
import { createSupabaseAdminClient } from '@/app/actions/server-auth'

export interface EmployeeAsset {
  id: string
  employee_id: string
  employee_name: string
  asset_name: string
  serial_number: string | null
  status: string
  delivered_date: string
  returned_date: string | null
}

export interface AssetEmployeeOption {
  id: string
  full_name: string
}

type AssetActionResult<T> = { data: T } | { error: string }

export async function getAssetsData(): Promise<AssetActionResult<{
  assets: EmployeeAsset[]
  employees: AssetEmployeeOption[]
}>> {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const [assetsResult, employeesResult] = await Promise.all([
    adminResult.client.from('assets')
      .select('id, employee_id, asset_name, serial_number, status, delivered_date, returned_date')
      .order('delivered_date', { ascending: false }),
    adminResult.client.from('employees')
      .select('id, full_name')
      .order('full_name'),
  ])
  if (assetsResult.error) return { error: `تعذر جلب سجل العهد: ${assetsResult.error.message}` }
  if (employeesResult.error) return { error: `تعذر جلب قائمة الموظفين: ${employeesResult.error.message}` }

  const employees = employeesResult.data ?? []
  const employeeNames = new Map(employees.map((employee) => [employee.id, employee.full_name]))
  return {
    data: {
      employees,
      assets: (assetsResult.data ?? []).map((asset) => ({
        ...asset,
        employee_name: employeeNames.get(asset.employee_id) ?? 'موظف غير معروف',
      })),
    },
  }
}

export async function assignAsset(input: {
  employeeId: string
  assetName: string
  serialNumber: string
}): Promise<{ success: true; warning?: string } | { error: string }> {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }
  if (
    !input
    || typeof input.employeeId !== 'string'
    || typeof input.assetName !== 'string'
    || typeof input.serialNumber !== 'string'
    || !input.employeeId
    || !input.assetName.trim()
    || input.assetName.trim().length > 200
    || input.serialNumber.trim().length > 100
  ) return { error: 'يرجى تحديد الموظف واسم العهدة، والتحقق من الرقم التسلسلي.' }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { data: employee, error: employeeError } = await adminResult.client.from('employees')
    .select('id, full_name')
    .eq('id', input.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'الموظف المحدد غير موجود.' }

  const { error } = await adminResult.client.from('assets').insert({
    employee_id: employee.id,
    asset_name: input.assetName.trim(),
    serial_number: input.serialNumber.trim() || null,
    status: 'assigned',
    delivered_date: new Date().toISOString().slice(0, 10),
  })
  if (error) return { error: `تعذر تسجيل تسليم العهدة: ${error.message}` }

  try {
    const auditResult = await logAction('add', `تسليم عهدة "${input.assetName.trim()}" للموظف ${employee.full_name}`)
    if ('error' in auditResult) return { success: true, warning: auditResult.error }
  } catch (error) {
    return {
      success: true,
      warning: error instanceof Error ? error.message : 'تعذر تسجيل الحركة في سجل المراقبة.',
    }
  }
  return { success: true }
}
