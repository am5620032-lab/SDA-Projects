import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getProjects } from '../actions'
import ProjectsMapLoader from './projects-map-loader'

export const dynamic = 'force-dynamic'

export default async function ProjectsMapPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }

  const result = await getProjects()
  const projects = 'projects' in result
    ? result.projects.filter((project) => project.latitude !== null && project.longitude !== null)
    : []

  return (
    <main dir="rtl" className="min-h-full p-5 text-white md:p-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <p className="text-sm font-bold text-emerald-300">منظومة الجنوب الاستراتيجية</p>
          <h1 className="mt-1 text-2xl font-black md:text-3xl">الخريطة الجغرافية للمشروعات</h1>
          <p className="mt-2 text-sm text-slate-400">مواقع المشاريع المسجلة بإحداثيات جغرافية في جنوب ليبيا.</p>
        </header>
        {'error' in result && <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{result.error}</p>}
        <section aria-label="خريطة المشروعات" className="project-map mb-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-xl">
          <ProjectsMapLoader projects={projects} />
        </section>
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="font-bold text-white">المشروعات ذات الإحداثيات</h2>
            <span className="text-sm tabular-nums text-slate-400">{projects.length}</span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-right text-sm">
              <thead className="bg-slate-950/70 text-xs text-slate-400">
                <tr><th className="px-4 py-3">المشروع</th><th className="px-4 py-3">القطاع</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">الميزانية</th><th className="px-4 py-3">الإحداثيات</th></tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td className="px-4 py-3 font-semibold">{project.project_name}</td>
                    <td className="px-4 py-3 text-slate-300">{project.sector}</td>
                    <td className="px-4 py-3 text-slate-300">{project.status}</td>
                    <td className="px-4 py-3 tabular-nums text-amber-200">{new Intl.NumberFormat('ar-LY').format(project.estimated_budget)} د.ل</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400" dir="ltr">{project.latitude}, {project.longitude}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!projects.length && <p className="p-8 text-center text-sm text-slate-500">لا توجد مشروعات بإحداثيات مسجلة.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
