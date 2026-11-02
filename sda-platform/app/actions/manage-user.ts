'use server'

import { logAction } from './log-action'
import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'

const allowedRoles = ['president', 'admin_manager', 'it_manager', 'employee'] as const
type ManagedRole = (typeof allowedRoles)[number]

function isManagedRole(role: string): role is ManagedRole {
  return allowedRoles.some((allowedRole) => allowedRole === role)
}

async function getManagerClient() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية إدارة المستخدمين.' }
  }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { actor: actorResult.actor, client: adminResult.client }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<{ success: true; warning?: string } | { error: string }> {
  const context = await getManagerClient()
  if ('error' in context) return context
  if (!isUuid(userId) || !isManagedRole(role)) return { error: 'بيانات الدور أو المستخدم غير صالحة.' }
  if (userId === context.actor.id) return { error: 'لا يمكنك تغيير صلاحية حسابك الحالي.' }

  const { error } = await context.client.from('profiles').update({ role }).eq('id', userId)
  if (error) return { error: `تعذر تحديث دور المستخدم: ${error.message}` }

  const audit = await logAction('update', `تغيير دور المستخدم ${userId} إلى ${role}`)
  return { success: true, ...('error' in audit ? { warning: audit.error } : {}) }
}

export async function setUserBanned(
  userId: string,
  banned: boolean,
): Promise<{ success: true; warning?: string } | { error: string }> {
  const context = await getManagerClient()
  if ('error' in context) return context
  if (!isUuid(userId) || typeof banned !== 'boolean') return { error: 'بيانات حالة المستخدم غير صالحة.' }
  if (userId === context.actor.id) return { error: 'لا يمكنك إيقاف حسابك الحالي.' }

  const { error } = await context.client.auth.admin.updateUserById(userId, {
    ban_duration: banned ? '876000h' : 'none',
  })
  if (error) return { error: `تعذر ${banned ? 'إيقاف' : 'تفعيل'} الحساب: ${error.message}` }

  const audit = await logAction('update', `${banned ? 'إيقاف' : 'تفعيل'} حساب المستخدم ${userId}`)
  return { success: true, ...('error' in audit ? { warning: audit.error } : {}) }
}
