import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'

const archiveRoles = ['it_manager', 'president', 'vice_president', 'admin_manager']

export default async function ArchivePage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!archiveRoles.includes(actorResult.actor.role)) redirect('/dashboard')

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-2xl border-r-8 border-[#F4B41A] bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-amber-700">منظومة الأرشيف</h1>
          <p className="mt-3 leading-7 text-gray-600">منظومة حفظ الوثائق والمراسلات الإدارية.</p>
          <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">أقسام الأرشيف غير متاحة حالياً.</p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة إلى بوابة المنظومات</Link>
        </section>
      </div>
    </main>
  )
}
