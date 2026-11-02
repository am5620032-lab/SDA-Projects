import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import DecisionsClient from './decisions-client'

export default async function DecisionsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) redirect('/dashboard/employees')
  return <DecisionsClient />
}
