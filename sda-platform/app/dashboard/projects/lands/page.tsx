import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getAgriculturalLands } from '../strategic-actions'
import LandsWorkspace from './lands-workspace'

export const dynamic = 'force-dynamic'

export default async function AgriculturalLandsPage({
  searchParams,
}: {
  searchParams: Promise<{ municipality?: string }>
}) {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }
  const { municipality = '' } = await searchParams
  const result = await getAgriculturalLands(municipality)
  return <LandsWorkspace initialRows={'rows' in result ? result.rows : []} initialSearch={municipality} error={'error' in result ? result.error : ''} />
}
