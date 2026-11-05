import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getProjects } from '../actions'
import { getFieldVisits } from '../strategic-actions'
import FieldVisitsWorkspace from './field-visits-workspace'

export const dynamic = 'force-dynamic'

export default async function FieldVisitsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  const [visitsResult, projectsResult] = await Promise.all([getFieldVisits(), getProjects()])
  const errors = [
    'error' in visitsResult ? visitsResult.error : '',
    'error' in projectsResult ? projectsResult.error : '',
  ].filter(Boolean)

  return (
    <FieldVisitsWorkspace
      rows={'rows' in visitsResult ? visitsResult.rows : []}
      projects={'projects' in projectsResult ? projectsResult.projects : []}
      initialError={errors.join(' ')}
    />
  )
}
