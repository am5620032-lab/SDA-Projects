'use server'

import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'

export type AuditAction = 'add' | 'update' | 'delete'

export async function logAction(
  action: AuditAction,
  details: string,
): Promise<{ success: true } | { error: string }> {
  if (!['add', 'update', 'delete'].includes(action)) return { error: 'نوع الحركة غير صالح.' }
  if (typeof details !== 'string' || !details.trim() || details.trim().length > 1000) {
    return { error: 'تفاصيل الحركة غير صالحة.' }
  }

  try {
    const actorResult = await getAuthenticatedActor()
    if ('error' in actorResult) return actorResult

    const adminResult = createSupabaseAdminClient()
    if ('error' in adminResult) return adminResult

    const { error } = await adminResult.client.from('audit_logs').insert({
      actor_id: actorResult.actor.id || null,
      actor_name: actorResult.actor.fullName || null,
      actor_email: actorResult.actor.email,
      action,
      details: details.trim(),
    })
    if (error) {
      console.error('Audit log insert failed:', error)
      return { error: `تعذر تسجيل الحركة: ${error.message}` }
    }

    return { success: true }
  } catch (error) {
    console.error('Audit log failed:', error)
    return {
      error: `تعذر تسجيل الحركة: ${error instanceof Error ? error.message : 'خطأ غير معروف.'}`,
    }
  }
}
