'use server'

import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'
import { logAction } from './log-action'

export async function deleteUser(id: string): Promise<{ success: true; warning?: string } | { error: string }> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية حذف المستخدمين.' }
  }
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { error: 'معرّف المستخدم غير صالح.' }
  }
  if (id === actorResult.actor.id) return { error: 'لا يمكنك حذف حسابك الحالي.' }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { data: targetResult, error: targetError } = await adminResult.client.auth.admin.getUserById(id)
  if (targetError) return { error: `تعذر العثور على المستخدم: ${targetError.message}` }
  if (!targetResult.user) return { error: 'المستخدم المطلوب غير موجود.' }

  const { error: deleteError } = await adminResult.client.auth.admin.deleteUser(id)
  if (deleteError) return { error: `تعذر حذف حساب المستخدم: ${deleteError.message}` }

  const { error: profileDeleteError } = await adminResult.client.from('profiles').delete().eq('id', id)
  const warnings: string[] = []
  if (profileDeleteError) warnings.push(`تم حذف الحساب، لكن تعذر حذف ملفه الشخصي: ${profileDeleteError.message}`)

  const email = targetResult.user.email ?? id
  try {
    const auditResult = await logAction('delete', `حذف حساب المستخدم ${email}`)
    if ('error' in auditResult) warnings.push(auditResult.error)
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : 'تعذر تسجيل حركة حذف المستخدم.')
  }

  return { success: true, ...(warnings.length ? { warning: warnings.join(' ') } : {}) }
}
