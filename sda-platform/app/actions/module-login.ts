'use server'

import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseAdminClient, getAuthenticatedActor } from '@/app/actions/server-auth'
import {
  MODULE_ACCESS_COOKIES,
  createModuleAccessToken,
} from '@/app/archive/module-auth'

export type ModuleName = 'archive' | 'hr'

export async function moduleLogin(
  moduleName: ModuleName,
  username: string,
  password: string,
): Promise<{ success: true } | { error: string }> {
  if (
    (moduleName !== 'archive' && moduleName !== 'hr')
    || typeof username !== 'string'
    || typeof password !== 'string'
  ) return { error: 'يرجى التحقق من بيانات الدخول.' }

  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return { error: 'سجّل الدخول إلى المنصة بالبريد الإلكتروني أولاً.' }

  const normalizedUsername = username.trim().toLowerCase()
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(normalizedUsername) || !password || password.length > 128) {
    return { error: 'يرجى التحقق من بيانات الدخول.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { data: account, error: accountError } = await adminResult.client
    .from('module_access')
    .select('employee_id, password_hash, is_active')
    .eq('username', normalizedUsername)
    .eq('module_name', moduleName)
    .maybeSingle()
  if (accountError) return { error: `تعذر التحقق من حساب المنظومة: ${accountError.message}` }
  if (!account?.is_active || !(await bcrypt.compare(password, account.password_hash))) {
    return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' }
  }

  let token: string
  try {
    token = createModuleAccessToken(account.employee_id, moduleName)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'تعذر إنشاء جلسة المنظومة.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(MODULE_ACCESS_COOKIES[moduleName], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60,
  })
  return { success: true }
}

export async function logoutFromModule(moduleName: ModuleName) {
  if (moduleName !== 'archive' && moduleName !== 'hr') {
    throw new Error('المنظومة المطلوبة غير صالحة.')
  }
  const cookieStore = await cookies()
  cookieStore.delete(MODULE_ACCESS_COOKIES[moduleName])
  redirect(moduleName === 'archive' ? '/archive/login' : '/hr/login')
}
