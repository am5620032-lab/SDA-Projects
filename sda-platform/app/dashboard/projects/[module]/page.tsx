import { notFound, redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'

const plannedModules: Record<string, { title: string; description: string }> = {
  'urban-development': {
    title: 'التنمية العمرانية والبنية التحتية',
    description: 'سيتم ربط هذا القسم بقاعدة بيانات المشروعات العمرانية ومؤشرات البنية التحتية.',
  },
  'health-education': {
    title: 'التنمية الصحية والتعليمية',
    description: 'سيتم ربط هذا القسم بمشروعات ومؤشرات قطاعي الصحة والتعليم.',
  },
  'field-visits': {
    title: 'الزيارات والمتابعة الميدانية',
    description: 'سيتم ربط هذا القسم بجدولة الزيارات ومحاضر المتابعة الميدانية.',
  },
}

export default async function StrategicModulePage({
  params,
}: {
  params: Promise<{ module: string }>
}) {
  const { module } = await params
  if (module === 'database') redirect('/dashboard/projects')

  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    redirect('/dashboard')
  }

  const page = plannedModules[module]
  if (!page) notFound()

  return (
    <main dir="rtl" className="min-h-full p-5 md:p-8">
      <section className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-bold text-emerald-700">منظومة الجنوب الاستراتيجية</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">{page.title}</h1>
        <p className="mt-4 leading-7 text-slate-600">{page.description}</p>
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          هذا القسم غير مفعّل بعد. لن تظهر فيه بيانات حتى يُستكمل ربط قاعدة البيانات والإجراءات الخاصة به.
        </p>
      </section>
    </main>
  )
}
