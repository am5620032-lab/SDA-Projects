import 'server-only'

import { createSupabaseAdminClient } from '@/app/actions/server-auth'

export interface ArchiveDepartmentOption {
  id: string
  name: string
  type: string
}

export async function getArchiveDepartments(): Promise<{
  departments: ArchiveDepartmentOption[]
  error?: string
}> {
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return { departments: [], error: adminResult.error }

  const { data, error } = await adminResult.client
    .from('departments')
    .select('id, name, type')
    .order('name')
  if (error) {
    return { departments: [], error: `تعذر جلب الإدارات والمكاتب: ${error.message}` }
  }

  return { departments: data ?? [] }
}
