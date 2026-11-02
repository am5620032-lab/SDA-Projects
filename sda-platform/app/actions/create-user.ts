'use server'

import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'
import { logAction } from './log-action'

const allowedRoles = ['president', 'vice_president', 'admin_manager', 'employee'] as const
type UserRole = (typeof allowedRoles)[number]

interface CreateUserInput {
  email: string
  password: string
  fullName: string
  role: UserRole
}

export async function createUser(input: CreateUserInput): Promise<{ success: true; warning?: string } | { error: string }> {
  if (!input || typeof input !== 'object') {
    return { error: 'بيانات المستخدم غير صالحة.' }
  }

  if (
    typeof input.email !== 'string'
    || typeof input.password !== 'string'
    || typeof input.fullName !== 'string'
    || typeof input.role !== 'string'
  ) {
    return { error: 'يرجى تعبئة جميع بيانات المستخدم المطلوبة.' }
  }

  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()
  const role = input.role

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'يرجى إدخال بريد إلكتروني صالح.' }
  }
  if (fullName.length < 2 || fullName.length > 150) {
    return { error: 'يجب أن يكون الاسم الكامل بين حرفين و150 حرفاً.' }
  }
  if (input.password.length < 8 || input.password.length > 128) {
    return { error: 'يجب أن تكون كلمة المرور بين 8 و128 حرفاً.' }
  }
  if (!allowedRoles.includes(role)) {
    return { error: 'الصلاحية المحددة غير صالحة.' }
  }

  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية إنشاء المستخدمين.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  const adminClient = adminResult.client

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (createError) return { error: createError.message }
  if (!createdUser.user) return { error: 'لم يُرجع Supabase حساب المستخدم بعد الإنشاء.' }

  const { error: insertProfileError } = await adminClient
    .from('profiles')
    .insert({ id: createdUser.user.id, full_name: fullName, role })

  if (insertProfileError) {
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(createdUser.user.id)
    if (rollbackError) {
      return { error: `تعذر إنشاء الملف الشخصي (${insertProfileError.message})، كما تعذر حذف الحساب اليتيم (${rollbackError.message}).` }
    }
    return { error: `تعذر إنشاء الملف الشخصي: ${insertProfileError.message}` }
  }

  let auditWarning: string | undefined
  try {
    const auditResult = await logAction('add', `إنشاء حساب المستخدم ${email} (${fullName})`)
    if ('error' in auditResult) auditWarning = auditResult.error
  } catch (error) {
    auditWarning = error instanceof Error ? error.message : 'تعذر تسجيل حركة إنشاء المستخدم.'
  }

  return {
    success: true,
    ...(auditWarning ? { warning: auditWarning } : {}),
  }
}
