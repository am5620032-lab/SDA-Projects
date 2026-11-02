import { redirect } from 'next/navigation'
import { getAdminReports } from '@/app/actions/admin-reports'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import ReportsClient from './reports-client'

export default async function ReportsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  const result = await getAdminReports()
  if ('error' in result) throw new Error(result.error)
  return <ReportsClient data={result.data} />
}
