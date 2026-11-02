'use server'

import { createSupabaseAdminClient } from '@/app/actions/server-auth'
import { getHrEmployeeId } from '@/app/actions/hr-session'

export interface EmployeeNotification {
  id: string
  employee_id: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export interface CreateNotificationInput {
  employee_id: string
  title: string
  message: string
  link: string
}

type ActionResult = { success: true } | { error: string }

export async function createNotification(data: CreateNotificationInput): Promise<ActionResult> {
  const senderId = await getHrEmployeeId()
  if (!senderId) return { error: 'يجب تسجيل الدخول إلى منظومة شؤون الموظفين.' }
  if (!data || typeof data !== 'object') return { error: 'بيانات الإشعار غير صالحة.' }
  if (
    typeof data.employee_id !== 'string'
    || typeof data.title !== 'string'
    || typeof data.message !== 'string'
    || typeof data.link !== 'string'
    || !data.title.trim()
    || !data.message.trim()
    || !data.link.startsWith('/dashboard/')
  ) return { error: 'بيانات الإشعار غير مكتملة.' }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const [{ data: sender, error: senderError }, { data: recipient, error: recipientError }] = await Promise.all([
    adminResult.client.from('employees').select('id, direct_manager_id').eq('id', senderId).maybeSingle(),
    adminResult.client.from('employees').select('id, direct_manager_id').eq('id', data.employee_id).maybeSingle(),
  ])
  if (senderError) return { error: `تعذر التحقق من صاحب الجلسة: ${senderError.message}` }
  if (recipientError) return { error: `تعذر التحقق من مستلم الإشعار: ${recipientError.message}` }
  if (!sender || !recipient) return { error: 'تعذر العثور على الموظف أو المستلم.' }

  const isDirectManagerNotification = sender.direct_manager_id === recipient.id
  const isDirectReportNotification = recipient.direct_manager_id === sender.id
  if (!isDirectManagerNotification && !isDirectReportNotification) {
    return { error: 'لا يمكن إرسال إشعار إلا بين الموظف ومديره المباشر.' }
  }

  const { error } = await adminResult.client.from('notifications').insert({
    employee_id: recipient.id,
    title: data.title.trim().slice(0, 160),
    message: data.message.trim().slice(0, 1000),
    link: data.link,
    is_read: false,
  })
  if (error) return { error: `تعذر إنشاء الإشعار: ${error.message}` }
  return { success: true }
}

export async function getMyNotifications(): Promise<EmployeeNotification[]> {
  try {
    const employeeId = await getHrEmployeeId()
    if (!employeeId) return []
    const adminResult = createSupabaseAdminClient()
    if ('error' in adminResult) {
      console.error('Failed to initialize notification database client:', adminResult.error)
      return []
    }

    const { data, error } = await adminResult.client
      .from('notifications')
      .select('id, employee_id, title, message, link, is_read, created_at')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      console.error('Failed to fetch notifications:', error.message)
      return []
    }
    return data ?? []
  } catch (error) {
    console.error('Unexpected error while fetching notifications:', error)
    return []
  }
}

export async function markAsRead(notificationId: string): Promise<ActionResult> {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'يجب تسجيل الدخول إلى منظومة شؤون الموظفين.' }
  if (!notificationId) return { error: 'معرّف الإشعار مطلوب.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { data, error } = await adminResult.client
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('employee_id', employeeId)
    .select('id')
    .maybeSingle()
  if (error) return { error: `تعذر تحديث الإشعار: ${error.message}` }
  if (!data) return { error: 'الإشعار غير موجود أو لا يخص حسابك.' }
  return { success: true }
}

export async function markAllAsRead(): Promise<ActionResult> {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'يجب تسجيل الدخول إلى منظومة شؤون الموظفين.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { error } = await adminResult.client
    .from('notifications')
    .update({ is_read: true })
    .eq('employee_id', employeeId)
    .eq('is_read', false)
  if (error) return { error: `تعذر تحديث الإشعارات: ${error.message}` }
  return { success: true }
}
