import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getProjectFinance } from '../strategic-actions'
import FinanceView from './finance-view'

export const dynamic = 'force-dynamic'

export default async function ProjectFinancePage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }
  const result = await getProjectFinance()

  return <FinanceView rows={'rows' in result ? result.rows : []} error={'error' in result ? result.error : ''} />
}
