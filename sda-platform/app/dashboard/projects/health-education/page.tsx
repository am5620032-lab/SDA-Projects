import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getSectorProjects } from '../strategic-actions'
import SectorProjectsWorkspace from '../sector-projects-workspace'

export const dynamic = 'force-dynamic'

export default async function HealthEducationPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  const result = await getSectorProjects(['صحي', 'تعليمي'])
  return (
    <SectorProjectsWorkspace
      title="التنمية الصحية والتعليمية"
      subtitle="قاعدة مشروعات المرافق الصحية والتعليمية ونسب إنجازها."
      sectors={['صحي', 'تعليمي']}
      rows={'rows' in result ? result.rows : []}
      initialError={'error' in result ? result.error : ''}
    />
  )
}
