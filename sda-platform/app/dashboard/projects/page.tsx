import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getProjects, getProjectsStats } from './actions'
import { getInvestmentOpportunities } from './strategic-actions'
import ProjectsCommandCenter from './projects-command-center'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }

  const [projectsResult, statsResult, opportunitiesResult] = await Promise.all([
    getProjects(),
    getProjectsStats(),
    getInvestmentOpportunities(),
  ])
  return (
    <ProjectsCommandCenter
      initialProjects={'projects' in projectsResult ? projectsResult.projects : []}
      initialStats={'stats' in statsResult ? statsResult.stats : null}
      initialOpportunities={'rows' in opportunitiesResult ? opportunitiesResult.rows : []}
      canVerify={['admin_manager', 'it_manager'].includes(actorResult.actor.role)}
      initialError={([
        'error' in projectsResult ? projectsResult.error : '',
        'error' in statsResult ? statsResult.error : '',
        'error' in opportunitiesResult ? opportunitiesResult.error : '',
      ]).filter(Boolean).join(' ')}
    />
  )
}
