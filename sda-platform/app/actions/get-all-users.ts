'use server'

import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'

export interface ManagedUser {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
}

export async function getAllUsers(): Promise<{ users: ManagedUser[] } | { error: string }> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (actorResult.actor.role !== 'it_manager') return { error: 'ليس لديك صلاحية عرض المستخدمين.' }

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
  const users = authUsers.map((user) => {
    const profile = profilesById.get(user.id)
    return {
      id: user.id,
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
      email: user.email ?? null,
      role: profile?.role ?? null,
    }
  })

  users.sort((first, second) => (first.full_name ?? '').localeCompare(second.full_name ?? '', 'ar'))
  return { users }
}
