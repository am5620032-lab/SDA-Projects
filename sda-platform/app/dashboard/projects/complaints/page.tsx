import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getComplaints } from './actions'
import ComplaintsWorkspace from './complaints-workspace'

export const dynamic = 'force-dynamic'

export default async function ComplaintsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  const result = await getComplaints()
  return <ComplaintsWorkspace
    rows={'rows' in result ? result.rows : []}
    canManage={['admin_manager', 'it_manager'].includes(actorResult.actor.role)}
    initialError={'error' in result ? result.error : ''}
  />
}
