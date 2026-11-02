import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getInvestmentOpportunities } from '../strategic-actions'
import InvestmentsWorkspace from './investments-workspace'

export const dynamic = 'force-dynamic'

export default async function InvestmentOpportunitiesPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }
  const result = await getInvestmentOpportunities()
  return (
    <InvestmentsWorkspace
      rows={'rows' in result ? result.rows : []}
      initialName={actorResult.actor.fullName}
      initialEmail={actorResult.actor.email ?? ''}
      error={'error' in result ? result.error : ''}
    />
  )
}
