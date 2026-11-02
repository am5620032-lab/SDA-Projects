'use server'

import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'

export interface AuditLog {
  id: string
  created_at: string
  actor_email: string | null
  action: 'add' | 'update' | 'delete'
  details: string
}

export async function getAuditLogs(): Promise<{ logs: AuditLog[] } | { error: string }> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية عرض سجل الحركات.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { data, error } = await adminResult.client
    .from('audit_logs')
    .select('id, created_at, actor_email, action, details')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { error: `تعذر جلب سجل الحركات: ${error.message}` }

  return { logs: (data ?? []) as AuditLog[] }
}
