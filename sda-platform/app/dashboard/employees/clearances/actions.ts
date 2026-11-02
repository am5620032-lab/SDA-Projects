'use server'

import { getHrEmployeeId } from '@/app/actions/hr-session'
import { logAction } from '@/app/actions/log-action'
import {
  createSupabaseAdminClient,
  type AdminDatabase,
} from '@/app/actions/server-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ClearanceEmployee {
  id: string
  full_name: string
  employment_status: string | null
  clearance_id: string | null
  clearance_status: string | null
  request_date: string | null
}

export interface ClearanceRecord {
  id: string
  employee_id: string
  employee_name: string
  request_date: string
  status: string
  notes: string | null
}

type ClearanceResult<T> = { data: T } | { error: string }
type ClearanceContext = { client: SupabaseClient<AdminDatabase> } | { error: string }

async function getClearanceContext(): Promise<ClearanceContext> {
  const sessionEmployeeId = await getHrEmployeeId()
  if (!sessionEmployeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { client: adminResult.client }
}

export async function getClearancesData(): Promise<ClearanceResult<{
  employees: ClearanceEmployee[]
  clearances: ClearanceRecord[]
}>> {
  const context = await getClearanceContext()
  if ('error' in context) return { error: context.error }

  const [{ data: employees, error: employeeError }, { data: clearances, error: clearanceError }] = await Promise.all([
    context.client.from('employees')
      .select('id, full_name, employment_status')
      .in('employment_status', ['terminated', 'resigned'])
      .order('full_name'),
    context.client.from('clearances')
      .select('id, employee_id, request_date, status, notes')
      .order('request_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])
  if (employeeError) return { error: `تعذر جلب الموظفين المنتهية خدمتهم: ${employeeError.message}` }
  if (clearanceError) return { error: `تعذر جلب طلبات إخلاء الطرف: ${clearanceError.message}` }

  const employeeRows = employees ?? []
  const employeeNames = new Map(employeeRows.map((employee) => [employee.id, employee.full_name]))
  const latestClearanceByEmployee = new Map<string, NonNullable<typeof clearances>[number]>()
  for (const clearance of clearances ?? []) {
    if (!latestClearanceByEmployee.has(clearance.employee_id)) {
      latestClearanceByEmployee.set(clearance.employee_id, clearance)
    }
  }

  return {
    data: {
      employees: employeeRows.map((employee) => {
        const clearance = latestClearanceByEmployee.get(employee.id)
        return {
          ...employee,
          clearance_id: clearance?.id ?? null,
          clearance_status: clearance?.status ?? null,
          request_date: clearance?.request_date ?? null,
        }
      }),
      clearances: (clearances ?? []).map((clearance) => ({
        ...clearance,
        employee_name: employeeNames.get(clearance.employee_id) ?? 'موظف غير معروف',
      })),
    },
  }
}

export async function startClearance(employeeId: string): Promise<
  { clearanceId: string; alreadyCleared: boolean; warning?: string }
  | { blockedAssets: string[] }
  | { error: string }
> {
  const context = await getClearanceContext()
  if ('error' in context) return { error: context.error }
  if (typeof employeeId !== 'string' || !employeeId) return { error: 'الموظف المحدد غير صالح.' }

  const { data: employee, error: employeeError } = await context.client.from('employees')
    .select('id, full_name, employment_status')
    .eq('id', employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'الموظف المحدد غير موجود.' }
  if (!['terminated', 'resigned'].includes(employee.employment_status ?? '')) {
    return { error: 'لا يمكن بدء إخلاء الطرف إلا لموظف انتهت خدمته أو استقال.' }
  }

  const { data: assets, error: assetsError } = await context.client.from('assets')
    .select('asset_name')
    .eq('employee_id', employee.id)
    .eq('status', 'assigned')
  if (assetsError) return { error: `تعذر فحص عهد الموظف: ${assetsError.message}` }
  const blockedAssets = (assets ?? []).map((asset) => asset.asset_name)
  const { data: pendingClearance, error: pendingError } = await context.client.from('clearances')
    .select('id')
    .eq('employee_id', employee.id)
    .eq('status', 'pending')
    .order('request_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (pendingError) return { error: `تعذر التحقق من طلب إخلاء الطرف المعلق: ${pendingError.message}` }

  if (blockedAssets.length) {
    const notes = `بانتظار إعادة العهد التالية: ${blockedAssets.join('، ')}`
    if (pendingClearance) {
      const { error } = await context.client.from('clearances')
        .update({ notes })
        .eq('id', pendingClearance.id)
      if (error) return { error: `تعذر تحديث طلب إخلاء الطرف: ${error.message}` }
    } else {
      const { error } = await context.client.from('clearances').insert({
        employee_id: employee.id,
        request_date: new Date().toISOString().slice(0, 10),
        status: 'pending',
        notes,
      })
      if (error) return { error: `تعذر تسجيل طلب إخلاء الطرف المعلق: ${error.message}` }
    }
    return { blockedAssets }
  }

  const { data: previousClearance, error: previousError } = await context.client.from('clearances')
    .select('id, status')
    .eq('employee_id', employee.id)
    .eq('status', 'cleared')
    .order('request_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (previousError) return { error: `تعذر التحقق من إخلاء الطرف السابق: ${previousError.message}` }
  if (previousClearance) return { clearanceId: previousClearance.id, alreadyCleared: true }

  let clearanceId: string
  if (pendingClearance) {
    const { data: clearance, error: updateError } = await context.client.from('clearances')
      .update({ status: 'cleared', notes: 'تم التحقق من إرجاع جميع العهد المسجلة.' })
      .eq('id', pendingClearance.id)
      .select('id')
      .single()
    if (updateError) return { error: `تعذر إكمال إخلاء الطرف: ${updateError.message}` }
    clearanceId = clearance.id
  } else {
    const { data: clearance, error: insertError } = await context.client.from('clearances').insert({
      employee_id: employee.id,
      request_date: new Date().toISOString().slice(0, 10),
      status: 'cleared',
      notes: 'تم التحقق من إرجاع جميع العهد المسجلة.',
    }).select('id').single()
    if (insertError) return { error: `تعذر إصدار إخلاء الطرف: ${insertError.message}` }
    clearanceId = clearance.id
  }

  let warning: string | undefined
  try {
    const auditResult = await logAction('add', `إصدار إخلاء طرف للموظف ${employee.full_name}`)
    if ('error' in auditResult) warning = auditResult.error
  } catch (error) {
    warning = error instanceof Error ? error.message : 'تعذر تسجيل الحركة في سجل المراقبة.'
  }
  return { clearanceId, alreadyCleared: false, warning }
}

export async function getClearanceCertificate(id: string): Promise<
  { clearance: ClearanceRecord; employee_status: string | null } | { error: string }
> {
  const context = await getClearanceContext()
  if ('error' in context) return context
  if (typeof id !== 'string' || !id) return { error: 'معرّف إخلاء الطرف غير صالح.' }

  const { data: clearance, error } = await context.client.from('clearances')
    .select('id, employee_id, request_date, status, notes')
    .eq('id', id)
    .maybeSingle()
  if (error) return { error: `تعذر جلب شهادة إخلاء الطرف: ${error.message}` }
  if (!clearance) return { error: 'شهادة إخلاء الطرف غير موجودة.' }
  if (clearance.status !== 'cleared') return { error: 'لا يمكن طباعة شهادة إخلاء طرف غير مكتملة.' }

  const [{ data: employee, error: employeeError }, { data: outstandingAssets, error: assetsError }] = await Promise.all([
    context.client.from('employees')
      .select('id, full_name, employment_status')
      .eq('id', clearance.employee_id)
      .maybeSingle(),
    context.client.from('assets')
      .select('asset_name')
      .eq('employee_id', clearance.employee_id)
      .eq('status', 'assigned'),
  ])
  if (employeeError) return { error: `تعذر جلب بيانات الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'الموظف المرتبط بالشهادة غير موجود.' }
  if (assetsError) return { error: `تعذر إعادة فحص العهد: ${assetsError.message}` }
  if ((outstandingAssets ?? []).length) {
    return { error: `توجد عهد لم تُرجع، ولا يمكن طباعة الشهادة: ${(outstandingAssets ?? []).map((asset) => asset.asset_name).join('، ')}` }
  }

  return {
    clearance: {
      ...clearance,
      employee_name: employee.full_name,
    },
    employee_status: employee.employment_status,
  }
}
