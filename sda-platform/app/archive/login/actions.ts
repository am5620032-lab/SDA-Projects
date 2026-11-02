'use server'

import { logoutFromModule, moduleLogin } from '@/app/actions/module-login'

export async function archiveLogin(
  username: string,
  password: string,
): Promise<{ success: true } | { error: string }> {
  return moduleLogin('archive', username, password)
}

export async function archiveLogout() {
  await logoutFromModule('archive')
}
