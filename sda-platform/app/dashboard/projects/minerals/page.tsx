import { redirect } from 'next/navigation'
import { CircleAlert, Mountain, ShieldCheck } from 'lucide-react'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
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
    <main dir="rtl" className="min-h-full p-5 md:p-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <p className="text-sm font-bold text-emerald-700">منظومة الجنوب الاستراتيجية</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900 md:text-3xl"><Mountain aria-hidden="true" /> قاعدة بيانات الموارد الطبيعية والمعادن</h1>
          <p className="mt-2 text-sm text-slate-500">سجل الموارد ومواقعها وحالة الاستكشاف والتصنيف الأمني.</p>
        </header>
        {!hasRestrictedAccess && <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldCheck size={18} /> الموارد المصنفة سرية واليورانيوم محجوبة عن دورك.</p>}
        {'error' in result && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={18} />{result.error}</p>}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['المورد', 'الموقع', 'الإحداثيات', 'المساحة', 'حالة الاستكشاف', 'التصنيف'].map((title) => <th key={title} className="px-4 py-3">{title}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => <tr key={row.id}>
                  <td className="px-4 py-4 font-bold text-slate-800">{row.resource_name}</td>
                  <td className="px-4 py-4">{row.location}</td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-600" dir="ltr">{row.coordinates || '—'}</td>
                  <td className="px-4 py-4 tabular-nums">{new Intl.NumberFormat('ar-LY', { maximumFractionDigits: 2 }).format(Number(row.area_size))} كم²</td>
                  <td className="px-4 py-4">{row.exploration_status}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.classification === 'سري' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{row.classification}</span></td>
                </tr>)}
              </tbody>
            </table>
            {!rows.length && !('error' in result) && <p className="p-12 text-center text-sm text-slate-500">لا توجد موارد معدنية متاحة للعرض.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
