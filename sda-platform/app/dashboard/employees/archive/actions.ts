'use server'

import { getHrEmployeeId } from '@/app/actions/hr-session'
import { createSupabaseAdminClient } from '@/app/actions/server-auth'

const bucketName = 'employee-documents'
const allowedContentTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const maxFileSize = 15 * 1024 * 1024

export interface EmployeeDocument {
  id: string
  employee_id: string
  employee_name: string
  document_type: string
  file_name: string
  created_at: string
  download_url: string
}

export interface ArchiveEmployeeOption {
  id: string
  full_name: string
}

export async function getEmployeeArchiveData(): Promise<
  { documents: EmployeeDocument[]; employees: ArchiveEmployeeOption[] } | { error: string }
> {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const [documentsResult, employeesResult] = await Promise.all([
    adminResult.client.from('documents')
      .select('id, employee_id, document_type, file_url, file_name, created_at')
      .order('created_at', { ascending: false }),
    adminResult.client.from('employees')
      .select('id, full_name')
      .order('full_name'),
  ])
  if (documentsResult.error) return { error: `تعذر جلب الأرشيف: ${documentsResult.error.message}` }
  if (employeesResult.error) return { error: `تعذر جلب الموظفين: ${employeesResult.error.message}` }

  const employees = employeesResult.data ?? []
  const employeeNames = new Map(employees.map((employee) => [employee.id, employee.full_name]))
  const documents: EmployeeDocument[] = []
  for (const document of documentsResult.data ?? []) {
    const { data, error } = await adminResult.client.storage
      .from(bucketName)
      .createSignedUrl(document.file_url, 3600)
    if (error) return { error: `تعذر إنشاء رابط آمن للملف ${document.file_name}: ${error.message}` }
    documents.push({
      ...document,
      employee_name: employeeNames.get(document.employee_id) ?? 'موظف غير معروف',
      download_url: data.signedUrl,
    })
  }

  return { documents, employees }
}

export async function uploadEmployeeDocument(formData: FormData): Promise<
  { success: true } | { error: string }
> {
  const sessionEmployeeId = await getHrEmployeeId()
  if (!sessionEmployeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }

  const employeeId = formData.get('employee_id')
  const documentType = formData.get('document_type')
  const file = formData.get('file')
  if (
    typeof employeeId !== 'string'
    || !employeeId
    || typeof documentType !== 'string'
    || !documentType.trim()
    || documentType.trim().length > 100
    || !(file instanceof File)
    || file.size === 0
    || file.size > maxFileSize
    || !allowedContentTypes.has(file.type)
  ) return { error: 'اختر موظفاً ونوع مستند صالحاً وملف PDF أو صورة بحجم لا يتجاوز 15 ميغابايت.' }

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const { data: employee, error: employeeError } = await adminResult.client.from('employees')
    .select('id')
    .eq('id', employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'الموظف المحدد غير موجود.' }

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'file'
  const storagePath = `${employee.id}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await adminResult.client.storage.from(bucketName).upload(
    storagePath,
    file,
    { contentType: file.type, upsert: false },
  )
  if (uploadError) return { error: `تعذر رفع الملف إلى الأرشيف: ${uploadError.message}` }

  const { error: insertError } = await adminResult.client.from('documents').insert({
    employee_id: employee.id,
    document_type: documentType.trim(),
    file_url: storagePath,
    file_name: file.name.slice(0, 255),
  })
  if (insertError) {
    const { error: cleanupError } = await adminResult.client.storage.from(bucketName).remove([storagePath])
    return {
      error: cleanupError
        ? `تعذر حفظ بيانات المستند (${insertError.message})، كما تعذر تنظيف الملف المرفوع (${cleanupError.message}).`
        : `تعذر حفظ بيانات المستند وتم حذف الملف المرفوع: ${insertError.message}`,
    }
  }

  return { success: true }
}
