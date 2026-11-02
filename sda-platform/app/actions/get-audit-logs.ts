'use server'

import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'

export interface AuditLog {
  id: string
  created_at: string
  actor_id: string | null
  actor_name: string | null
  actor_email: string | null
  action: 'add' | 'update' | 'delete'
  details: string
  ip_address: string | null
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export async function getAuditLogs(filters: {
  from?: string
  to?: string
  search?: string
} = {}): Promise<{ logs: AuditLog[] } | { error: string }> {
  if (!filters || typeof filters !== 'object') return { error: 'فلاتر البحث غير صالحة.' }
  if (filters.from && !isValidDate(filters.from)) return { error: 'تاريخ البداية غير صالح.' }
  if (filters.to && !isValidDate(filters.to)) return { error: 'تاريخ النهاية غير صالح.' }
  if (filters.from && filters.to && filters.from > filters.to) {
    return { error: 'تاريخ البداية يجب ألا يتجاوز تاريخ النهاية.' }
  }

  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية عرض سجل الحركات.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  let query = adminResult.client
    .from('audit_logs')
    .select('id, created_at, actor_id, actor_name, actor_email, action, details, ip_address')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (filters.from) {
    query = query.gte('created_at', `${filters.from}T00:00:00.000Z`)
  }
  if (filters.to) {
    query = query.lte('created_at', `${filters.to}T23:59:59.999Z`)
  }

  const search = typeof filters.search === 'string'
    ? filters.search.trim().replace(/[^\p{L}\p{N}@._\-\s]/gu, '').slice(0, 100)
    : ''
  if (search) query = query.or(`actor_name.ilike.%${search}%,actor_email.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return { error: `تعذر جلب سجل الحركات: ${error.message}` }

  return { logs: (data ?? []) as AuditLog[] }
}
