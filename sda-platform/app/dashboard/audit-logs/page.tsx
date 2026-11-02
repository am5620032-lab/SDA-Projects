import { redirect } from 'next/navigation'
import { getAuditLogs, type AuditLog } from '@/app/actions/get-audit-logs'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import AuditLogsClient from './audit-logs-client'

export default async function AuditLogsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  let logs: AuditLog[] = []
  try {
    const result = await getAuditLogs()
    if ('error' in result) {
      console.error('Failed to load audit logs:', result.error)
    } else {
      logs = result.logs
    }
  } catch (error) {
    console.error('Failed to load audit logs:', error)
  }
  return <AuditLogsClient initialLogs={logs} />
}
