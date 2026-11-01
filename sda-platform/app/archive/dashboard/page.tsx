import { redirect } from 'next/navigation'
import { createArchiveServerClient } from '@/app/archive/auth'
import { archiveLogout } from '@/app/archive/login/actions'
import ArchiveDashboard from './archive-dashboard'

export default async function ArchiveDashboardPage() {
  const supabase = await createArchiveServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email?.toLowerCase().endsWith('@archive.sda')) redirect('/archive/login')

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-[#F4B41A] bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-amber-700">منظومة الأرشيف</h1>
            <p className="mt-1 text-sm text-gray-500">البحث في الملفات والوثائق المؤرشفة</p>
          </div>
          <form action={archiveLogout}>
            <button type="submit" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100">
              تسجيل خروج
            </button>
          </form>
        </header>
        <ArchiveDashboard />
      </div>
    </main>
  )
}
