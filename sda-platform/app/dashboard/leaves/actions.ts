'use server'

import { createSupabaseAdminClient, type AdminDatabase } from '@/app/actions/server-auth'
import { getHrEmployeeId } from '@/app/actions/hr-session'
import { createNotification } from '@/app/actions/notifications'
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
  hasDirectReports: boolean
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

  const [{ data: myRows, error: myError }, approvalResult] = await Promise.all([
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
  ])
  if (myError) return { error: `تعذر جلب طلباتك: ${myError.message}` }
  if (approvalResult.error) return { error: `تعذر جلب طلبات الموافقة: ${approvalResult.error.message}` }

  const leaves = [...(myRows ?? []), ...(approvalResult.data ?? [])]
  const employeeIds = [...new Set(leaves.map((leave) => leave.employee_id))]
  const { data: leaveEmployees, error: leaveEmployeesError } = employeeIds.length
    ? await context.client.from('employees')
      .select('id, full_name, job_title, department, leave_balance')
      .in('id', employeeIds)
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
      myLeaves: (myRows ?? []).map(toRequest),
      approvals: (approvalResult.data ?? []).map(toRequest),
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
    || daysCount < 1
  ) return { error: 'تاريخ النهاية يجب أن يكون في يوم البداية أو بعده.' }
  if (!input.leave_type.trim() || input.leave_type.length > 100 || input.notes.length > 2000) {
    return { error: 'نوع الإجازة أو الملاحظات غير صالحة.' }
  }

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
  if ('error' in notificationResult) {
    return { success: true, warning: `تم تقديم الطلب، لكن تعذر إرسال التنبيه: ${notificationResult.error}` }
  }
  return { success: true }
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
    .eq('status', 'pending')
    .maybeSingle()
  if (leaveError) return { error: `تعذر جلب طلب الإجازة: ${leaveError.message}` }
  if (!leave) return { error: 'الطلب غير موجود أو لا يخص موظفاً تابعاً لك أو سبق اتخاذ قرار بشأنه.' }

  const { data: employee, error: employeeError } = await context.client
    .from('employees')
    .select('id, full_name, leave_balance, direct_manager_id')
    .eq('id', leave.employee_id)
    .eq('direct_manager_id', context.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'لم يعد الموظف تابعاً لك كمدير مباشر.' }

  if (status === 'approved') {
    const currentBalance = employee.leave_balance ?? 30
    if (currentBalance < leave.days_count) return { error: 'رصيد الإجازات غير كافٍ للموافقة على هذا الطلب.' }

    let balanceUpdate = context.client
      .from('employees')
      .update({ leave_balance: currentBalance - leave.days_count })
      .eq('id', employee.id)
    balanceUpdate = employee.leave_balance === null
      ? balanceUpdate.is('leave_balance', null)
      : balanceUpdate.eq('leave_balance', currentBalance)
    const { data: updatedEmployee, error: balanceError } = await balanceUpdate.select('id').maybeSingle()
    if (balanceError) return { error: `تعذر خصم رصيد الإجازات: ${balanceError.message}` }
    if (!updatedEmployee) return { error: 'تغير رصيد الموظف بالتزامن. حدّث الصفحة وحاول مجدداً.' }
  }

  const { data: updatedLeave, error: updateError } = await context.client
    .from('leaves')
    .update({ status, manager_notes: notes.trim() || null })
    .eq('id', leave.id)
    .eq('manager_id', context.employeeId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  if (updateError || !updatedLeave) {
    if (status === 'approved') {
      const { error: rollbackError } = await context.client
        .from('employees')
        .update({ leave_balance: (employee.leave_balance ?? 30) })
        .eq('id', employee.id)
        .eq('leave_balance', (employee.leave_balance ?? 30) - leave.days_count)
      if (rollbackError) {
        return { error: `تعذر تحديث الطلب (${updateError?.message ?? 'تم تحديثه بالتزامن'})، كما تعذر استعادة رصيد الموظف: ${rollbackError.message}` }
      }
    }
    return { error: updateError ? `تعذر تحديث الطلب: ${updateError.message}` : 'اتخذ مدير آخر قراراً بهذا الطلب. حدّث الصفحة.' }
  }

  const notificationResult = await createNotification({
    employee_id: employee.id,
    title: status === 'approved' ? 'تم قبول طلب الإجازة' : 'تم رفض طلب الإجازة',
    message: `تم ${status === 'approved' ? 'قبول' : 'رفض'} طلب إجازتك من قبل مديرك المباشر.`,
    link: '/dashboard/leaves',
  })
  if ('error' in notificationResult) {
    return { success: true, warning: `تم تحديث الطلب، لكن تعذر إرسال التنبيه: ${notificationResult.error}` }
  }
  return { success: true }
}
