import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getMineralResources } from '../strategic-actions'

export const dynamic = 'force-dynamic'

export default async function ProjectsMapPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }
  const result = await getMineralResources()
  const resources = 'rows' in result ? result.rows.filter((resource) => resource.coordinates) : []

  return (
    <main dir="rtl" className="min-h-full p-5 md:p-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <p className="text-sm font-bold text-emerald-700">منظومة الجنوب الاستراتيجية</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">الخريطة الجغرافية GIS</h1>
          <p className="mt-2 text-sm text-slate-500">معاينة مؤقتة للمواقع لحين ربط مزود نظم المعلومات الجغرافية.</p>
        </header>
        {'error' in result && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{result.error}</p>}
        <section aria-label="معاينة الخريطة" className="relative mb-6 flex min-h-80 items-center justify-center overflow-hidden rounded-2xl border border-emerald-200 bg-[#e7f2eb]">
          <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(rgba(16, 110, 67, .1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 110, 67, .1) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
          <div className="relative rounded-xl border border-white/80 bg-white/80 px-6 py-5 text-center shadow-lg backdrop-blur">
            <p className="font-black text-emerald-900">خريطة الجنوب الليبي</p>
            <p className="mt-2 text-sm text-slate-600">سيتم عرض الطبقات والإحداثيات بعد التكامل مع GIS.</p>
            <p className="mt-1 text-xs text-slate-500">{resources.length} مواقع ذات إحداثيات مسجلة</p>
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 p-5 font-bold text-slate-900">سجل الإحداثيات</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">المورد</th><th className="px-4 py-3">الموقع</th><th className="px-4 py-3">الإحداثيات</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{resources.map((resource) => <tr key={resource.id}><td className="px-4 py-4 font-bold">{resource.resource_name}</td><td className="px-4 py-4">{resource.location}</td><td className="px-4 py-4 font-mono text-xs" dir="ltr">{resource.coordinates}</td></tr>)}</tbody>
            </table>
            {!resources.length && <p className="p-10 text-center text-sm text-slate-500">لا توجد إحداثيات مسجلة في الموارد المتاحة لدورك.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
