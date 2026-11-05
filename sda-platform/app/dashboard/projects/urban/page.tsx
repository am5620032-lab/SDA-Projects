import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { sectorConfig } from '../sector-config'
import { getSectorProjects } from '../strategic-actions'
import SectorProjectsWorkspace from '../sector-projects-workspace'

export const dynamic = 'force-dynamic'

export default async function UrbanDevelopmentPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  const result = await getSectorProjects(['بنية تحتية'])
  return (
    <SectorProjectsWorkspace
      title="التنمية العمرانية والبنية التحتية"
      subtitle="متابعة مشروعات الطرق والمرافق والبنية التحتية في بلديات الجنوب."
      sectors={['بنية تحتية']}
      rows={'rows' in result ? result.rows : []}
      initialError={'error' in result ? result.error : ''}
      sectorAppearance={{
        nameEn: sectorConfig.urban.nameEn,
        icon: sectorConfig.urban.icon,
        color: sectorConfig.urban.color,
      }}
    />
  )
}
