'use server'

import { createSupabaseAdminClient, type AdminDatabase } from '@/app/actions/server-auth'
import { getHrEmployeeId } from '@/app/actions/hr-session'
import { createNotification } from '@/app/actions/notifications'
import { logAction, type AuditAction } from '@/app/actions/log-action'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface LeaveEmployee {
  id: string
  full_name: string
  job_title: string | null
  department: string | null
  leave_balance: number | null
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  days_count: number
  notes: string | null
  manager_notes: string | null
  status: string
  manager_id: string | null
  created_at: string
  employees: Pick<LeaveEmployee, 'full_name' | 'job_title' | 'department'> | null
}

export interface LeaveDashboardData {
  employee: LeaveEmployee
  myLeaves: LeaveRequest[]
  approvals: LeaveRequest[]
  leaveTypes: LeaveType[]
  myPermissions: PermissionRequest[]
  permissionApprovals: PermissionRequest[]
  hasDirectReports: boolean
}

export interface LeaveType {
  id: string
  name: string
  max_days_per_year: number
}

export interface PermissionRequest {
  id: string
  employee_id: string
  employee_name: string
  date: string
  duration_hours: number
  reason: string
  status: string
  manager_notes: string | null
  created_at: string
}

type DataResult<T> = { data: T } | { error: string }
type MutationResult = { success: true; warning?: string } | { error: string }
type LeaveContext =
  | { error: string }
  | { employeeId: string; client: SupabaseClient<AdminDatabase> }

async function getContext(): Promise<LeaveContext> {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { employeeId, client: adminResult.client }
}

async function writeAudit(action: AuditAction, details: string): Promise<string | null> {
  try {
    const result = await logAction(action, details)
    return 'error' in result ? result.error : null
  } catch (error) {
    return error instanceof Error ? error.message : 'تعذر تسجيل الحركة في سجل المراقبة.'
  }
}

export async function getLeaveDashboardData(): Promise<DataResult<LeaveDashboardData>> {
  const context = await getContext()
  if ('error' in context) return context

  const { data: employee, error: employeeError } = await context.client
    .from('employees')
    .select('id, full_name, job_title, department, leave_balance')
    .eq('id', context.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر جلب بيانات الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'حساب منظومة الموظفين غير مرتبط بموظف.' }

  const { data: reports, error: reportsError } = await context.client
    .from('employees')
    .select('id')
    .eq('direct_manager_id', context.employeeId)
  if (reportsError) return { error: `تعذر جلب الموظفين التابعين: ${reportsError.message}` }

  const [myResult, approvalResult, typeResult, myPermissionResult, permissionApprovalResult] = await Promise.all([
    context.client
      .from('leaves')
      .select('*')
      .eq('employee_id', context.employeeId)
      .order('created_at', { ascending: false }),
    reports?.length
      ? context.client.from('leaves')
        .select('*')
        .in('employee_id', reports.map((report) => report.id))
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    context.client.from('leave_types').select('id, name, max_days_per_year').order('name'),
    context.client.from('permissions')
      .select('id, employee_id, date, duration_hours, reason, status, manager_notes, created_at')
      .eq('employee_id', context.employeeId)
      .order('created_at', { ascending: false }),
    context.client.from('permissions')
      .select('id, employee_id, date, duration_hours, reason, status, manager_notes, created_at')
      .eq('manager_id', context.employeeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])
  if (myResult.error) return { error: `تعذر جلب طلباتك: ${myResult.error.message}` }
  if (approvalResult.error) return { error: `تعذر جلب طلبات الموافقة: ${approvalResult.error.message}` }
  if (typeResult.error) return { error: `تعذر جلب أنواع الإجازات: ${typeResult.error.message}` }
  if (myPermissionResult.error) return { error: `تعذر جلب الأذونات: ${myPermissionResult.error.message}` }
  if (permissionApprovalResult.error) return { error: `تعذر جلب أذونات الموافقة: ${permissionApprovalResult.error.message}` }

  const myRows = myResult.data ?? []
  const leaves = [...myRows, ...(approvalResult.data ?? [])]
  const permissionRows = [...(myPermissionResult.data ?? []), ...(permissionApprovalResult.data ?? [])]
  const employeeIds = [...new Set(leaves.map((leave) => leave.employee_id))]
  const allEmployeeIds = [...new Set([...employeeIds, ...permissionRows.map((permission) => permission.employee_id)])]
  const { data: leaveEmployees, error: leaveEmployeesError } = allEmployeeIds.length
    ? await context.client.from('employees')
      .select('id, full_name, job_title, department, leave_balance')
      .in('id', allEmployeeIds)
    : { data: [], error: null }
  if (leaveEmployeesError) return { error: `تعذر جلب أسماء الموظفين في الطلبات: ${leaveEmployeesError.message}` }

  const employeeById = new Map((leaveEmployees ?? []).map((item) => [item.id, item]))
  const toRequest = (leave: (typeof leaves)[number]): LeaveRequest => ({
    ...leave,
    employees: employeeById.get(leave.employee_id) ?? null,
  })

  return {
    data: {
      employee,
      myLeaves: myRows.map(toRequest),
      approvals: (approvalResult.data ?? []).map(toRequest),
      leaveTypes: typeResult.data ?? [],
      myPermissions: (myPermissionResult.data ?? []).map((permission) => ({
        ...permission,
        employee_name: employeeById.get(permission.employee_id)?.full_name ?? 'موظف غير معروف',
      })),
      permissionApprovals: (permissionApprovalResult.data ?? []).map((permission) => ({
        ...permission,
        employee_name: employeeById.get(permission.employee_id)?.full_name ?? 'موظف غير معروف',
      })),
      hasDirectReports: (reports ?? []).length > 0,
    },
  }
}

export async function requestLeave(input: {
  leave_type: string
  start_date: string
  end_date: string
  notes: string
}): Promise<MutationResult> {
  const context = await getContext()
  if ('error' in context) return context
  if (!input || typeof input !== 'object') return { error: 'بيانات طلب الإجازة غير صالحة.' }
  if (
    typeof input.leave_type !== 'string'
    || typeof input.start_date !== 'string'
    || typeof input.end_date !== 'string'
    || typeof input.notes !== 'string'
  ) return { error: 'يرجى تعبئة بيانات طلب الإجازة.' }

  const start = Date.parse(`${input.start_date}T00:00:00Z`)
  const end = Date.parse(`${input.end_date}T00:00:00Z`)
  const daysCount = Math.floor((end - start) / 86_400_000) + 1
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.start_date)
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.end_date)
    || !Number.isFinite(start)
    || !Number.isFinite(end)
    || new Date(start).toISOString().slice(0, 10) !== input.start_date
    || new Date(end).toISOString().slice(0, 10) !== input.end_date
    || daysCount < 1
  ) return { error: 'تاريخ النهاية يجب أن يكون في يوم البداية أو بعده.' }
  if (!input.leave_type.trim() || input.leave_type.length > 100 || input.notes.length > 2000) {
    return { error: 'نوع الإجازة أو الملاحظات غير صالحة.' }
  }

  const { data: leaveType, error: typeError } = await context.client.from('leave_types')
    .select('name, max_days_per_year')
    .eq('name', input.leave_type.trim())
    .maybeSingle()
  if (typeError) return { error: `تعذر التحقق من نوع الإجازة: ${typeError.message}` }
  if (!leaveType) return { error: 'نوع الإجازة المحدد غير موجود.' }
  if (daysCount > leaveType.max_days_per_year) return { error: `المدة تتجاوز الحد السنوي لهذا النوع (${leaveType.max_days_per_year} يوماً).` }

  const { data: employee, error: employeeError } = await context.client
    .from('employees')
    .select('id, full_name, direct_manager_id')
    .eq('id', context.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'حساب منظومة الموظفين غير مرتبط بموظف.' }
  if (!employee.direct_manager_id) return { error: 'لا يمكن إرسال الطلب قبل تحديد المدير المباشر للموظف.' }

  const { error } = await context.client.from('leaves').insert({
    employee_id: employee.id,
    manager_id: employee.direct_manager_id,
    leave_type: input.leave_type.trim(),
    start_date: input.start_date,
    end_date: input.end_date,
    days_count: daysCount,
    notes: input.notes.trim() || null,
    status: 'pending',
  })
  if (error) return { error: `تعذر حفظ طلب الإجازة: ${error.message}` }

  const notificationResult = await createNotification({
    employee_id: employee.direct_manager_id,
    title: 'طلب إجازة جديد',
    message: `لديك طلب إجازة جديد من ${employee.full_name} بانتظار اعتمادك.`,
    link: '/dashboard/leaves',
  })
  const warnings: string[] = []
  if ('error' in notificationResult) warnings.push(`تعذر إرسال التنبيه: ${notificationResult.error}`)
  const auditError = await writeAudit('add', `تقديم طلب إجازة من الموظف ${employee.full_name} (${daysCount} يوماً)`)
  if (auditError) warnings.push(`تعذر تسجيل الحركة: ${auditError}`)
  return { success: true, ...(warnings.length ? { warning: `تم تقديم الطلب. ${warnings.join(' ')}` } : {}) }
}

export async function approveLeave(
  leaveId: string,
  status: 'approved' | 'rejected',
  notes: string,
): Promise<MutationResult> {
  const context = await getContext()
  if ('error' in context) return context
  if (!leaveId || !['approved', 'rejected'].includes(status) || typeof notes !== 'string' || notes.length > 2000) {
    return { error: 'بيانات قرار الإجازة غير صالحة.' }
  }

  const { data: leave, error: leaveError } = await context.client
    .from('leaves')
    .select('id, employee_id, leave_type, days_count, status, manager_id')
    .eq('id', leaveId)
    .eq('manager_id', context.employeeId)
    .maybeSingle()
  if (leaveError) return { error: `تعذر جلب طلب الإجازة: ${leaveError.message}` }
  if (!leave || !['pending', 'approved'].includes(leave.status)) {
    return { error: 'الطلب غير موجود أو لا يخص موظفاً تابعاً لك أو سبق رفضه.' }
  }
  if (status === 'approved' && leave.status !== 'pending') return { error: 'الطلب مقبول بالفعل.' }

  const { data: employee, error: employeeError } = await context.client
    .from('employees')
    .select('id, full_name, leave_balance, direct_manager_id')
    .eq('id', leave.employee_id)
    .eq('direct_manager_id', context.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'لم يعد الموظف تابعاً لك كمدير مباشر.' }

  const reversingApproval = status === 'rejected' && leave.status === 'approved'
  const currentBalance = employee.leave_balance ?? 30
  const nextBalance = reversingApproval ? currentBalance + leave.days_count : currentBalance - leave.days_count
  if (status === 'approved' && currentBalance < leave.days_count) {
    return { error: 'رصيد الإجازات غير كافٍ للموافقة على هذا الطلب.' }
  }

  if (status === 'approved' || reversingApproval) {
    let balanceUpdate = context.client.from('employees')
      .update({ leave_balance: nextBalance })
      .eq('id', employee.id)
    balanceUpdate = employee.leave_balance === null
      ? balanceUpdate.is('leave_balance', null)
      : balanceUpdate.eq('leave_balance', currentBalance)
    const { data: updatedEmployee, error: balanceError } = await balanceUpdate.select('id').maybeSingle()
    if (balanceError) return { error: `تعذر ${reversingApproval ? 'إعادة' : 'خصم'} رصيد الإجازات: ${balanceError.message}` }
    if (!updatedEmployee) return { error: 'تغير رصيد الموظف بالتزامن. حدّث الصفحة وحاول مجدداً.' }
  }

  const { data: updatedLeave, error: updateError } = await context.client
    .from('leaves')
    .update({ status, manager_notes: notes.trim() || null })
    .eq('id', leave.id)
    .eq('manager_id', context.employeeId)
    .eq('status', leave.status)
    .select('id')
    .maybeSingle()
  if (updateError || !updatedLeave) {
    if (status === 'approved' || reversingApproval) {
      const { error: rollbackError } = await context.client
        .from('employees')
        .update({ leave_balance: currentBalance })
        .eq('id', employee.id)
        .eq('leave_balance', nextBalance)
      if (rollbackError) {
        return { error: `تعذر تحديث الطلب (${updateError?.message ?? 'تم تحديثه بالتزامن'})، كما تعذر التراجع عن تعديل الرصيد: ${rollbackError.message}` }
      }
    }
    return { error: updateError ? `تعذر تحديث الطلب: ${updateError.message}` : 'اتخذ مدير آخر قراراً بهذا الطلب. حدّث الصفحة.' }
  }

  const notificationResult = await createNotification({
    employee_id: employee.id,
    title: status === 'approved' ? 'تم قبول طلب الإجازة' : 'تم رفض طلب الإجازة',
    message: reversingApproval
      ? 'تم رفض طلب إجازتك بعد تعديل القرار، وأُعيدت الأيام إلى رصيدك.'
      : `تم ${status === 'approved' ? 'قبول' : 'رفض'} طلب إجازتك من قبل مديرك المباشر.`,
    link: '/dashboard/leaves',
  })
  const warnings: string[] = []
  if ('error' in notificationResult) warnings.push(`تعذر إرسال التنبيه: ${notificationResult.error}`)
  const auditError = await writeAudit('update', `${status === 'approved' ? 'قبول' : 'رفض'} طلب إجازة للموظف ${employee.full_name} (${leave.id})`)
  if (auditError) warnings.push(`تعذر تسجيل الحركة: ${auditError}`)
  return { success: true, ...(warnings.length ? { warning: `تم تحديث الطلب. ${warnings.join(' ')}` } : {}) }
}

export async function requestPermission(input: {
  date: string
  durationHours: number
  reason: string
}): Promise<MutationResult> {
  const context = await getContext()
  if ('error' in context) return context
  if (
    !input
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
    || Number.isNaN(Date.parse(`${input.date}T00:00:00Z`))
    || new Date(`${input.date}T00:00:00Z`).toISOString().slice(0, 10) !== input.date
    || !Number.isFinite(input.durationHours)
    || input.durationHours <= 0
    || input.durationHours > 24
    || typeof input.reason !== 'string'
    || !input.reason.trim()
    || input.reason.length > 1000
  ) return { error: 'بيانات طلب الإذن غير صالحة (المدة من 0 إلى 24 ساعة).' }

  const { data: employee, error: employeeError } = await context.client
    .from('employees')
    .select('id, full_name, direct_manager_id')
    .eq('id', context.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee?.direct_manager_id) return { error: 'يجب تحديد المدير المباشر قبل طلب الإذن.' }

  const { error } = await context.client.from('permissions').insert({
    employee_id: employee.id,
    manager_id: employee.direct_manager_id,
    date: input.date,
    duration_hours: input.durationHours,
    reason: input.reason.trim(),
    status: 'pending',
  })
  if (error) return { error: `تعذر حفظ طلب الإذن: ${error.message}` }

  const notificationResult = await createNotification({
    employee_id: employee.direct_manager_id,
    title: 'طلب إذن جديد',
    message: `لديك طلب إذن جديد من ${employee.full_name} بانتظار اعتمادك.`,
    link: '/dashboard/leaves',
  })
  const warnings: string[] = []
  if ('error' in notificationResult) warnings.push(`تعذر إرسال التنبيه: ${notificationResult.error}`)
  const auditError = await writeAudit('add', `تقديم طلب إذن للموظف ${employee.full_name} (${input.durationHours} ساعة)`)
  if (auditError) warnings.push(`تعذر تسجيل الحركة: ${auditError}`)
  return { success: true, ...(warnings.length ? { warning: `تم تقديم الطلب. ${warnings.join(' ')}` } : {}) }
}

export async function approvePermission(
  permissionId: string,
  status: 'approved' | 'rejected',
  notes: string,
): Promise<MutationResult> {
  const context = await getContext()
  if ('error' in context) return context
  if (!permissionId || !['approved', 'rejected'].includes(status) || typeof notes !== 'string' || notes.length > 2000) {
    return { error: 'بيانات قرار الإذن غير صالحة.' }
  }

  const { data: permission, error } = await context.client.from('permissions')
    .select('id, employee_id, manager_id')
    .eq('id', permissionId)
    .eq('manager_id', context.employeeId)
    .eq('status', 'pending')
    .maybeSingle()
  if (error) return { error: `تعذر جلب طلب الإذن: ${error.message}` }
  if (!permission) return { error: 'طلب الإذن غير موجود أو لا يخص موظفاً تابعاً لك.' }

  const { data: updated, error: updateError } = await context.client.from('permissions')
    .update({ status, manager_notes: notes.trim() || null })
    .eq('id', permission.id)
    .eq('manager_id', context.employeeId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  if (updateError) return { error: `تعذر تحديث طلب الإذن: ${updateError.message}` }
  if (!updated) return { error: 'اتخذ مدير آخر قراراً بهذا الطلب.' }

  const notificationResult = await createNotification({
    employee_id: permission.employee_id,
    title: status === 'approved' ? 'تم قبول طلب الإذن' : 'تم رفض طلب الإذن',
    message: `تم ${status === 'approved' ? 'قبول' : 'رفض'} طلب إذنك من قبل مديرك المباشر.`,
    link: '/dashboard/leaves',
  })
  const warnings: string[] = []
  if ('error' in notificationResult) warnings.push(`تعذر إرسال التنبيه: ${notificationResult.error}`)
  const auditError = await writeAudit('update', `${status === 'approved' ? 'قبول' : 'رفض'} طلب إذن (${permission.id})`)
  if (auditError) warnings.push(`تعذر تسجيل الحركة: ${auditError}`)
  return { success: true, ...(warnings.length ? { warning: `تم تحديث الطلب. ${warnings.join(' ')}` } : {}) }
}
