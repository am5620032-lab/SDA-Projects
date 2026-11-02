import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getModuleAccessData } from './actions'
import ModulesClient from './modules-client'

export default async function ModuleSettingsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  const result = await getModuleAccessData()
  if ('error' in result) throw new Error(result.error)

  return <ModulesClient accounts={result.accounts} employees={result.employees} />
}
