import { redirect } from 'next/navigation'
import { getAuditLogs } from '@/app/actions/get-audit-logs'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import AuditLogsClient from './audit-logs-client'

export default async function AuditLogsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  const result = await getAuditLogs()
  if ('error' in result) throw new Error(result.error)
  return <AuditLogsClient initialLogs={result.logs} />
}
