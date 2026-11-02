'use server'

import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'

export interface AdminBackup {
  exported_at: string
  tables: {
    employees: object[]
    leaves: object[]
    attendance: object[]
    archive_documents: object[]
  }
}

async function fetchAllPages<T extends object>(
  fetchPage: (from: number, to: number) => Promise<{
    data: T[] | null
    error: { message: string } | null
  }>,
): Promise<{ data: T[] } | { error: string }> {
  const rows: T[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await fetchPage(offset, offset + 999)
    if (error) return { error: error.message }
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return { data: rows }
}

export async function exportAdminBackup(): Promise<
  { data: AdminBackup } | { error: string }
> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية تصدير النسخة الاحتياطية.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  const client = adminResult.client

  const [employees, leaves, attendance, archiveDocuments] = await Promise.all([
    fetchAllPages(async (from, to) => await client.from('employees').select('*').order('id').range(from, to)),
    fetchAllPages(async (from, to) => await client.from('leaves').select('*').order('id').range(from, to)),
    fetchAllPages(async (from, to) => await client.from('attendance').select('*').order('id').range(from, to)),
    fetchAllPages(async (from, to) => await client.from('archive_documents').select('*').order('id').range(from, to)),
  ])
  if ('error' in employees) return { error: `تعذر تصدير الموظفين: ${employees.error}` }
  if ('error' in leaves) return { error: `تعذر تصدير الإجازات: ${leaves.error}` }
  if ('error' in attendance) return { error: `تعذر تصدير الحضور: ${attendance.error}` }
  if ('error' in archiveDocuments) return { error: `تعذر تصدير وثائق الأرشيف: ${archiveDocuments.error}` }

  return {
    data: {
      exported_at: new Date().toISOString(),
      tables: {
        employees: employees.data,
        leaves: leaves.data,
        attendance: attendance.data,
        archive_documents: archiveDocuments.data,
      },
    },
  }
}
