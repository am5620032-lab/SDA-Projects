import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { MODULE_ACCESS_COOKIES, verifyModuleAccessToken } from '@/app/archive/module-auth'
import { getArchiveDepartments } from './archive-departments'
import { searchDocuments } from './actions'
import ArchiveClient from './archive-client'

export default async function ArchivePage() {
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
