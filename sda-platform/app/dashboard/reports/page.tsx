import { redirect } from 'next/navigation'
import { getAdminReports } from '@/app/actions/admin-reports'
import { emptyAdminReportsData } from '@/app/actions/admin-reports-types'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import ReportsClient from './reports-client'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  let data = emptyAdminReportsData
  try {
    const result = await getAdminReports()
    if ('error' in result) {
      console.error('Failed to load administrative reports:', result.error)
    } else {
      data = result.data
    }
  } catch (error) {
    console.error('Failed to load administrative reports:', error)
  }
  return <ReportsClient data={data} />
}
