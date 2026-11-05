import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getProjects } from '../actions'
import { getContracts } from './actions'
import ContractsWorkspace from './contracts-workspace'

export const dynamic = 'force-dynamic'

export default async function ContractsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  const [contractsResult, projectsResult] = await Promise.all([getContracts(), getProjects()])
  const errors = [
    'error' in contractsResult ? contractsResult.error : '',
    'error' in projectsResult ? projectsResult.error : '',
  ].filter(Boolean)

  return <ContractsWorkspace
    rows={'rows' in contractsResult ? contractsResult.rows : []}
    projects={'projects' in projectsResult ? projectsResult.projects : []}
    canManage={['admin_manager', 'it_manager'].includes(actorResult.actor.role)}
    initialError={errors.join(' ')}
  />
}
