import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { MODULE_ACCESS_COOKIES, verifyModuleAccessToken } from '@/app/archive/module-auth'
import ArchiveClient from '@/app/dashboard/archive/archive-client'
import { searchDocuments } from '@/app/dashboard/archive/actions'

export default async function ArchiveDashboard() {
  const cookieStore = await cookies()
  const claims = verifyModuleAccessToken(
    cookieStore.get(MODULE_ACCESS_COOKIES.archive)?.value,
    'archive',
  )
  if (!claims) redirect('/archive/login')

  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')

  const initialData = await searchDocuments()
  if ('error' in initialData) {
    return <ArchiveClient initialData={null} initialError={initialData.error} />
  }

  return <ArchiveClient initialData={initialData} initialError="" />
}
