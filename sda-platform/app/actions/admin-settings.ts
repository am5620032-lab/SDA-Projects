'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'

export interface SystemSettingsInput {
  id: string
  system_name: string
  system_logo_url: string
  contact_email: string
  contact_phone: string
  address: string
}

export async function updateSystemSettings(
  input: SystemSettingsInput,
): Promise<{ success: true } | { error: string }> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية تعديل إعدادات النظام.' }
  }

  if (!input || typeof input !== 'object' || !/^[0-9a-f-]{36}$/i.test(input.id)) {
    return { error: 'بيانات الإعدادات غير صالحة.' }
  }

  const systemName = typeof input.system_name === 'string' ? input.system_name.trim() : ''
  if (!systemName || systemName.length > 200) {
    return { error: 'اسم الجهاز مطلوب ويجب ألا يتجاوز 200 حرف.' }
  }

  const optionalValues = [
    input.system_logo_url,
    input.contact_email,
    input.contact_phone,
    input.address,
  ]
  if (optionalValues.some((value) => typeof value !== 'string')) {
    return { error: 'بيانات الإعدادات غير صالحة.' }
  }

  const logoUrl = input.system_logo_url.trim()
  if (logoUrl) {
    try {
      const parsedUrl = new URL(logoUrl)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Invalid protocol')
    } catch {
      return { error: 'يرجى إدخال رابط صالح للشعار يبدأ بـ https:// أو http://.' }
    }
  }

  const email = input.contact_email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'يرجى إدخال بريد إلكتروني صالح.' }
  }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { error } = await adminResult.client
    .from('system_settings')
    .update({
      system_name: systemName,
      system_logo_url: logoUrl || null,
      contact_email: email || null,
      contact_phone: input.contact_phone.trim() || null,
      address: input.address.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('id')
    .single()

  if (error) return { error: `تعذر حفظ إعدادات النظام: ${error.message}` }
  revalidatePath('/dashboard/settings')
  return { success: true }
}
