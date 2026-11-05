'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient, getAuthenticatedActor } from '@/app/actions/server-auth'

const authorizedRoles = ['president', 'vice_president', 'admin_manager', 'it_manager']

async function getComplaintsContext() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!authorizedRoles.includes(actorResult.actor.role)) return { error: 'ليس لديك صلاحية الوصول إلى الشكاوى.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { client: adminResult.client }
}

export interface ComplaintRow {
  id: string
  citizen_name: string
  phone: string | null
  complaint_type: string
  description: string
  status: string
  created_at: string
}

export async function getComplaints(): Promise<{ rows: ComplaintRow[] } | { error: string }> {
  const context = await getComplaintsContext()
  if ('error' in context) return context
  const { data, error } = await context.client
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return { error: `تعذر جلب الشكاوى: ${error.message}` }
  return { rows: data ?? [] }
}

export async function createComplaint(formData: FormData): Promise<{ success: true } | { error: string }> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    return { error: 'يقتصر تسجيل الشكاوى على مديري النظام.' }
  }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const citizenName = String(formData.get('citizen_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const complaintType = String(formData.get('complaint_type') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  if (!citizenName || citizenName.length > 200) return { error: 'اسم المواطن مطلوب ولا يتجاوز 200 حرف.' }
  if (phone.length > 30) return { error: 'رقم الهاتف لا يتجاوز 30 حرفاً.' }
  if (!complaintType || complaintType.length > 150) return { error: 'نوع الشكوى مطلوب ولا يتجاوز 150 حرفاً.' }
  if (!description || description.length > 5000) return { error: 'وصف الشكوى مطلوب ولا يتجاوز 5000 حرف.' }

  const { error } = await adminResult.client.from('complaints').insert({
    citizen_name: citizenName,
    phone: phone || null,
    complaint_type: complaintType,
    description,
    status: 'قيد المراجعة',
  })
  if (error) return { error: `تعذر تسجيل الشكوى: ${error.message}` }
  revalidatePath('/dashboard/projects/complaints')
  return { success: true }
}

export async function resolveComplaint(complaintId: string): Promise<{ success: true } | { error: string }> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    return { error: 'يقتصر تحديث حالة الشكوى على مديري النظام.' }
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(complaintId)) {
    return { error: 'معرّف الشكوى غير صالح.' }
  }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  const { data, error } = await adminResult.client.from('complaints')
    .update({ status: 'تم الحل' })
    .eq('id', complaintId)
    .eq('status', 'قيد المراجعة')
    .select('id')
    .maybeSingle()
  if (error) return { error: `تعذر تحديث حالة الشكوى: ${error.message}` }
  if (!data) return { error: 'الشكوى غير موجودة أو لم تعد قيد المراجعة.' }
  revalidatePath('/dashboard/projects/complaints')
  return { success: true }
}
