import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getFieldVisits } from '../strategic-actions'
import FieldVisitsWorkspace from './field-visits-workspace'

export const dynamic = 'force-dynamic'

export default async function FieldVisitsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  const result = await getFieldVisits()
  return <FieldVisitsWorkspace rows={'rows' in result ? result.rows : []} initialError={'error' in result ? result.error : ''} />
}
