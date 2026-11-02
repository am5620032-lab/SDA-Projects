import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { MODULE_ACCESS_COOKIES, verifyModuleAccessToken } from '@/app/archive/module-auth'
import ArchiveClient from '@/app/dashboard/archive/archive-client'
import { getArchiveDepartments } from '@/app/dashboard/archive/archive-departments'
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

  const [initialData, departmentResult] = await Promise.all([
    searchDocuments(),
    getArchiveDepartments(),
  ])
  const initialError = 'error' in initialData
    ? initialData.error
    : departmentResult.error ?? ''
  if ('error' in initialData) {
    return (
      <ArchiveClient
        initialData={null}
        initialError={initialError}
        departments={departmentResult.departments}
      />
    )
  }

  return (
    <ArchiveClient
      initialData={initialData}
      initialError={initialError}
      departments={departmentResult.departments}
    />
  )
}
