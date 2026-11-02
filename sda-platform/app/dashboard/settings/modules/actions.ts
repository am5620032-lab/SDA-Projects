'use server'

import bcrypt from 'bcryptjs'
import { createSupabaseAdminClient, getAuthenticatedActor } from '@/app/actions/server-auth'

export type ModuleName = 'archive' | 'hr'

export interface ModuleAccount {
  id: string
  employee_id: string
  employee_name: string
  module_name: ModuleName
  username: string
  is_active: boolean
  created_at: string
}

export interface ModuleEmployee {
  id: string
  full_name: string
}

type ModuleDataResult =
  | { accounts: ModuleAccount[]; employees: ModuleEmployee[] }
  | { error: string }
type ActionResult = { success: true } | { error: string }

async function getAdminClient() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية إدارة حسابات المنظومات.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { client: adminResult.client }
}

export async function getModuleAccessData(): Promise<ModuleDataResult> {
  const context = await getAdminClient()
  if ('error' in context) return context

  const [{ data: accounts, error: accountError }, { data: employees, error: employeeError }] = await Promise.all([
    context.client
      .from('module_access')
      .select('id, employee_id, module_name, username, is_active, created_at')
      .order('created_at', { ascending: false }),
    context.client.from('employees').select('id, full_name').order('full_name'),
  ])
  if (accountError) return { error: `تعذر جلب حسابات المنظومات: ${accountError.message}` }
  if (employeeError) return { error: `تعذر جلب الموظفين: ${employeeError.message}` }

  const employeeNames = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]))
  return {
    accounts: (accounts ?? []).map((account) => ({
      ...account,
      employee_name: employeeNames.get(account.employee_id) ?? 'موظف غير معروف',
    })),
    employees: employees ?? [],
  }
}

export async function createModuleAccess(input: {
  employeeId: string
  moduleName: ModuleName
  username: string
  password: string
}): Promise<{ success: true; account: ModuleAccount } | { error: string }> {
  const context = await getAdminClient()
  if ('error' in context) return context
  if (!input || typeof input !== 'object') return { error: 'بيانات الحساب غير صالحة.' }

  const employeeId = typeof input.employeeId === 'string' ? input.employeeId.trim() : ''
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  if (!employeeId) return { error: 'يرجى اختيار الموظف.' }
  if (input.moduleName !== 'archive' && input.moduleName !== 'hr') return { error: 'المنظومة المحددة غير صالحة.' }
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(username)) {
    return { error: 'اسم المستخدم يجب أن يتكون من 3 إلى 64 حرفاً أو رقماً.' }
  }
  if (password.length < 10 || password.length > 128) {
    return { error: 'يجب أن تكون كلمة المرور بين 10 و128 حرفاً.' }
  }

  const { data: employee, error: employeeError } = await context.client
    .from('employees')
    .select('full_name')
    .eq('id', employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'الموظف المحدد غير موجود.' }

  const passwordHash = await bcrypt.hash(password, 12)
  const { data: account, error } = await context.client.from('module_access').insert({
    employee_id: employeeId,
    module_name: input.moduleName,
    username,
    password_hash: passwordHash,
    is_active: true,
  }).select('id, employee_id, module_name, username, is_active, created_at').single()
  if (error) {
    if (error.code === '23505') return { error: 'اسم المستخدم مستخدم بالفعل.' }
    return { error: `تعذر إنشاء صلاحية المنظومة: ${error.message}` }
  }
  if (!account) return { error: 'لم تُرجع قاعدة البيانات بيانات الحساب الذي تم إنشاؤه.' }

  return {
    success: true,
    account: { ...account, employee_name: employee.full_name },
  }
}

export async function setModuleAccessActive(id: string, isActive: boolean): Promise<ActionResult> {
  const context = await getAdminClient()
  if ('error' in context) return context
  if (!id || typeof isActive !== 'boolean') return { error: 'بيانات تعديل الصلاحية غير صالحة.' }

  const { error } = await context.client.from('module_access').update({ is_active: isActive }).eq('id', id)
  if (error) return { error: `تعذر تعديل حالة الحساب: ${error.message}` }
  return { success: true }
}
