import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import SectorHero from '@/components/projects/SectorHero'
import SectorStats from '@/components/projects/SectorStats'
import { sectorConfig } from '../sector-config'
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
  const opportunityRows = 'rows' in result ? result.rows : []
  const investmentRows = 'rows' in investmentsResult ? investmentsResult.rows : []
  const allDates = [...opportunityRows, ...investmentRows].map((row) => row.created_at)
  const latestDate = allDates.reduce<string | null>((latest, date) => (
    !latest || Date.parse(date) > Date.parse(latest) ? date : latest
  ), null)
  return (
    <div dir="rtl" className="min-h-full bg-[#0F172A] p-5 text-white md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <SectorHero
          name={sectorConfig.investment.nameAr}
          englishName={sectorConfig.investment.nameEn}
          description={sectorConfig.investment.description}
          icon={sectorConfig.investment.icon}
          color={sectorConfig.investment.color}
        />
        <SectorStats
          totalRecords={opportunityRows.length + investmentRows.length}
          locations={new Set([...opportunityRows, ...investmentRows].map((row) => row.sector)).size}
          locationLabel="القطاعات الاستثمارية"
          lastUpdated={latestDate ? new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium' }).format(new Date(latestDate)) : '—'}
        />
      </div>
      <InvestmentsCatalog
        rows={investmentRows}
        canManage={['admin_manager', 'it_manager'].includes(actorResult.actor.role)}
        initialError={'error' in investmentsResult ? investmentsResult.error : ''}
      />
      <InvestmentsWorkspace
        rows={opportunityRows}
        initialName={actorResult.actor.fullName}
        initialEmail={actorResult.actor.email ?? ''}
        error={'error' in result ? result.error : ''}
      />
    </div>
  )
}
