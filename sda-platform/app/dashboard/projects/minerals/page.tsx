import { redirect } from 'next/navigation'
import { CircleAlert, ShieldCheck } from 'lucide-react'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import EmptyState from '@/components/projects/EmptyState'
import SectorHero from '@/components/projects/SectorHero'
import SectorStats from '@/components/projects/SectorStats'
import { sectorConfig } from '../sector-config'
import { getMineralResources } from '../strategic-actions'

export const dynamic = 'force-dynamic'

export default async function MineralResourcesPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }

  const result = await getMineralResources()
  const rows = 'rows' in result ? result.rows : []
  const hasRestrictedAccess = ['president', 'it_manager'].includes(actorResult.actor.role)
  return (
    <main dir="rtl" className="min-h-full bg-[#0F172A] p-5 text-white md:p-8">
      <div className="mx-auto max-w-[1400px]">
        <SectorHero
          name={sectorConfig.minerals.nameAr}
          englishName={sectorConfig.minerals.nameEn}
          description={sectorConfig.minerals.description}
          icon={sectorConfig.minerals.icon}
          color={sectorConfig.minerals.color}
        />
        <SectorStats totalRecords={rows.length} locations={new Set(rows.map((row) => row.location)).size} lastUpdated="—" />
        {!hasRestrictedAccess && <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200"><ShieldCheck size={18} /> الموارد المصنفة سرية واليورانيوم محجوبة عن دورك.</p>}
        {'error' in result && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"><CircleAlert size={18} />{result.error}</p>}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-slate-950/60 text-xs text-slate-400"><tr>{['المورد', 'الموقع', 'الإحداثيات', 'المساحة', 'حالة الاستكشاف', 'التصنيف'].map((title) => <th key={title} className="px-4 py-3">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/[0.06]">
                {rows.map((row) => <tr key={row.id}>
                  <td className="px-4 py-4 font-bold text-white">{row.resource_name}</td>
                  <td className="px-4 py-4">{row.location}</td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-400" dir="ltr">{row.coordinates || '—'}</td>
                  <td className="px-4 py-4 tabular-nums">{new Intl.NumberFormat('ar-LY', { maximumFractionDigits: 2 }).format(Number(row.area_size))} كم²</td>
                  <td className="px-4 py-4">{row.exploration_status}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.classification === 'سري' ? 'bg-red-400/10 text-red-200' : 'bg-white/10 text-slate-300'}`}>{row.classification}</span></td>
                </tr>)}
              </tbody>
            </table>
            {!rows.length && !('error' in result) && <div className="p-4"><EmptyState icon={sectorConfig.minerals.icon} description="لا توجد موارد معدنية متاحة للعرض حالياً." /></div>}
          </div>
        </section>
      </div>
    </main>
  )
}
