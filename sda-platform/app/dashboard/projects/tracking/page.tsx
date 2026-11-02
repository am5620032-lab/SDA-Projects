import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getProjects } from '../actions'
import { getProjectTracking } from '../strategic-actions'
import TrackingWorkspace from './tracking-workspace'

export const dynamic = 'force-dynamic'

export default async function ProjectTrackingPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }

  const [projectsResult, trackingResult] = await Promise.all([getProjects(), getProjectTracking()])
  return (
    <TrackingWorkspace
      projects={'projects' in projectsResult ? projectsResult.projects : []}
      rows={'rows' in trackingResult ? trackingResult.rows : []}
      initialError={[
        'error' in projectsResult ? projectsResult.error : '',
        'error' in trackingResult ? trackingResult.error : '',
      ].filter(Boolean).join(' ')}
    />
  )
}
