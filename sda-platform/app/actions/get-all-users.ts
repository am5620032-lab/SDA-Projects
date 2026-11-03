'use server'

import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'

export interface ManagedUser {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  national_id: string | null
  employee_id: string | null
  is_active: boolean
}

export async function getAllUsers(): Promise<{ users: ManagedUser[] } | { error: string }> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية عرض المستخدمين.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const perPage = 1000
  const authUsers = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await adminResult.client.auth.admin.listUsers({ page, perPage })
    if (error) return { error: `تعذر جلب حسابات المستخدمين: ${error.message}` }
    authUsers.push(...data.users)
    if (data.users.length < perPage) break
  }

  const { data: profiles, error: profilesError } = await adminResult.client
    .from('profiles')
    .select('id, full_name, role')
  if (profilesError) return { error: `تعذر جلب ملفات المستخدمين: ${profilesError.message}` }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const { data: employees, error: employeesError } = await adminResult.client
    .from('employees')
    .select('id, email, national_id')
  if (employeesError) return { error: `تعذر جلب الأرقام الوطنية: ${employeesError.message}` }

  const employeesById = new Map((employees ?? []).map((employee) => [employee.id, employee]))
  const employeesByEmail = new Map(
    (employees ?? [])
      .filter((employee) => employee.email)
      .map((employee) => [employee.email!.trim().toLowerCase(), employee]),
  )

  const users = authUsers.map((user) => {
    const profile = profilesById.get(user.id)
    const employee = employeesById.get(user.id)
      ?? (user.email ? employeesByEmail.get(user.email.trim().toLowerCase()) : undefined)
    return {
      id: user.id,
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
      email: user.email ?? null,
      role: profile?.role ?? null,
      national_id: employee?.national_id ?? null,
      employee_id: employee?.id ?? null,
      is_active: !user.banned_until || new Date(user.banned_until).getTime() <= Date.now(),
    }
  })

  users.sort((first, second) => (first.full_name ?? '').localeCompare(second.full_name ?? '', 'ar'))
  return { users }
}
