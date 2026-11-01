'use server'

import { createSupabaseAdminClient } from '@/app/actions/server-auth'
import { createArchiveServerClient } from '@/app/archive/auth'
import { redirect } from 'next/navigation'

export async function archiveLogin(
  nationalId: string,
  password: string,
): Promise<{ success: true } | { error: string }> {
  if (typeof nationalId !== 'string' || typeof password !== 'string') {
    return { error: 'يرجى إدخال الرقم الوطني وكلمة المرور.' }
  }

  const normalizedNationalId = nationalId.trim()
  if (!/^\d{1,32}$/.test(normalizedNationalId) || !password) {
    return { error: 'يرجى التحقق من بيانات الدخول.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { data: employee, error: employeeError } = await adminResult.client
    .from('employees')
    .select('id')
    .eq('national_id', normalizedNationalId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الرقم الوطني: ${employeeError.message}` }
  if (!employee) return { error: 'الرقم الوطني غير مسجل' }

  const supabase = await createArchiveServerClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: `${normalizedNationalId}@archive.sda`,
    password,
  })
  if (signInError) return { error: 'بيانات الدخول غير صحيحة أو لم يتم تفعيل حساب الأرشيف.' }

  return { success: true }
}

export async function archiveLogout() {
  const supabase = await createArchiveServerClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(`تعذر تسجيل الخروج من الأرشيف: ${error.message}`)
  redirect('/archive/login')
}
