import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getInvestmentOpportunities, getInvestments } from '../strategic-actions'
import InvestmentsWorkspace from './investments-workspace'
import InvestmentsCatalog from './investments-catalog'

export const dynamic = 'force-dynamic'

export default async function InvestmentOpportunitiesPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }
  const [result, investmentsResult] = await Promise.all([getInvestmentOpportunities(), getInvestments()])
  return (
    <div className="min-h-full bg-[#07111f] p-5 md:p-8">
      <InvestmentsCatalog
        rows={'rows' in investmentsResult ? investmentsResult.rows : []}
        canManage={['admin_manager', 'it_manager'].includes(actorResult.actor.role)}
        initialError={'error' in investmentsResult ? investmentsResult.error : ''}
      />
      <InvestmentsWorkspace
        rows={'rows' in result ? result.rows : []}
        initialName={actorResult.actor.fullName}
        initialEmail={actorResult.actor.email ?? ''}
        error={'error' in result ? result.error : ''}
      />
    </div>
  )
}
