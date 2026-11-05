import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getProjects } from '../actions'
import ProjectsCommandCenter from '../projects-command-center'

export const dynamic = 'force-dynamic'

export default async function ProjectsDatabasePage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }

  const result = await getProjects()
  return (
    <ProjectsCommandCenter
      initialProjects={'projects' in result ? result.projects : []}
      initialStats={null}
      canVerify={['admin_manager', 'it_manager'].includes(actorResult.actor.role)}
      initialError={'error' in result ? result.error : ''}
      view="database"
    />
  )
}
