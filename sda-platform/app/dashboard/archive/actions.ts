'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { logAction } from '@/app/actions/log-action'
import {
  createSupabaseAdminClient,
  getAuthenticatedActor,
  type AdminDatabase,
} from '@/app/actions/server-auth'
import { MODULE_ACCESS_COOKIES, verifyModuleAccessToken } from '@/app/archive/module-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

const archiveBucket = 'archive_files'
const managerRoles = new Set(['admin_manager', 'it_manager'])
const maxFileSize = 15 * 1024 * 1024
const maxFilesPerUpload = 10
const allowedFileTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const documentPrefixes: Record<string, string> = {
  incoming: 'IN',
  outgoing: 'OUT',
  decision: 'DEC',
  other: 'DOC',
}

export interface ArchiveDocument {
  id: string
  document_number: string
  document_name: string
  document_type: string
  classification: string
  employee_id: string | null
  file_url: string
  file_type: string
  source_entity: string | null
  destination_entity: string | null
  external_reference: string | null
  document_date: string | null
  status: string
  uploaded_by: string
  created_at: string
  download_url: string
}

export interface ArchiveEmployeeOption {
  id: string
  full_name: string
}

export interface ArchiveUploadTicket {
  fileIndex: number
  documentNumber: string
  documentName: string
  documentType: string
  classification: string
  employeeId: string | null
  filePath: string
  fileType: string
  sourceEntity: string
  destinationEntity: string
  externalReference: string | null
  documentDate: string | null
  token: string
  signature: string
}

export type ArchiveUploadedDocument = Omit<ArchiveUploadTicket, 'token'>

interface ArchiveUploadManifestItem {
  name: string
  type: string
  size: number
}

type ActionError = { error: string }
type ArchiveContext = {
  client: SupabaseClient<AdminDatabase>
  actorId: string
  actorName: string
  employeeId: string
  canManage: boolean
} | ActionError

async function getArchiveContext(): Promise<ArchiveContext> {
  const cookieStore = await cookies()
  const claims = verifyModuleAccessToken(
    cookieStore.get(MODULE_ACCESS_COOKIES.archive)?.value,
    'archive',
  )
  if (!claims) return { error: 'سجّل الدخول إلى منظومة الأرشيف أولاً.' }

  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  return {
    client: adminResult.client,
    actorId: actorResult.actor.id,
    actorName: actorResult.actor.fullName,
    employeeId: claims.employeeId,
    canManage: managerRoles.has(actorResult.actor.role),
  }
}

function getDocumentPrefix(type: string): string | null {
  if (typeof type !== 'string') return null
  return documentPrefixes[type] ?? (/^[a-zA-Z0-9]{2,8}$/.test(type) ? type.toUpperCase() : null)
}

function getUploadTicketSignature(actorId: string, ticket: ArchiveUploadedDocument): string | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return null
  const payload = JSON.stringify([
    actorId,
    ticket.fileIndex,
    ticket.documentNumber,
    ticket.documentName,
    ticket.documentType,
    ticket.classification,
    ticket.employeeId,
    ticket.filePath,
    ticket.fileType,
    ticket.sourceEntity,
    ticket.destinationEntity,
    ticket.externalReference,
    ticket.documentDate,
  ])
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export async function generateDocumentNumber(type: string): Promise<
  { documentNumber: string } | ActionError
> {
  const context = await getArchiveContext()
  if ('error' in context) return context
  const prefix = getDocumentPrefix(type)
  if (!prefix) return { error: 'نوع المستند غير صالح للترقيم.' }

  const { data, error } = await context.client.rpc('next_archive_document_number', {
    p_document_type: prefix,
    p_document_year: new Date().getFullYear(),
  })
  if (error) return { error: `تعذر إنشاء رقم المستند: ${error.message}` }
  return { documentNumber: data }
}

async function writeAudit(
  action: 'add' | 'update' | 'delete',
  details: string,
): Promise<string | undefined> {
  try {
    const result = await logAction(action, details)
    return 'error' in result ? result.error : undefined
  } catch (error) {
    return error instanceof Error ? error.message : 'تعذر تسجيل الحركة في سجل المراقبة.'
  }
}

export async function uploadArchiveDocument(formData: FormData): Promise<{
  uploads: ArchiveUploadTicket[]
  errors: string[]
} | ActionError> {
  const context = await getArchiveContext()
  if ('error' in context) return context

  const typeValue = formData.get('document_type')
  const classificationValue = formData.get('classification')
  const employeeValue = formData.get('employee_id')
  const manifestValue = formData.get('file_manifest')
  const sourceEntityValue = formData.get('source_entity')
  const destinationEntityValue = formData.get('destination_entity')
  const externalReferenceValue = formData.get('external_reference')
  const documentDateValue = formData.get('document_date')
  if (
    typeof typeValue !== 'string'
    || !Object.hasOwn(documentPrefixes, typeValue)
    || typeof classificationValue !== 'string'
    || !['normal', 'important', 'secret'].includes(classificationValue)
    || (employeeValue !== null && typeof employeeValue !== 'string')
    || typeof sourceEntityValue !== 'string'
    || typeof destinationEntityValue !== 'string'
    || (externalReferenceValue !== null && typeof externalReferenceValue !== 'string')
    || (documentDateValue !== null && typeof documentDateValue !== 'string')
    || typeof manifestValue !== 'string'
  ) return { error: 'يرجى اختيار نوع المستند وتصنيفه.' }
  const sourceEntity = sourceEntityValue.trim()
  const destinationEntity = destinationEntityValue.trim()
  const externalReference = typeof externalReferenceValue === 'string'
    ? externalReferenceValue.trim() || null
    : null
  const documentDate = typeof documentDateValue === 'string' ? documentDateValue.trim() || null : null
  if (!sourceEntity || !destinationEntity || sourceEntity.length > 255 || destinationEntity.length > 255) {
    return { error: 'يرجى إدخال الجهة المصدرة والجهة الموجه إليها بحد أقصى 255 حرفاً.' }
  }
  if (externalReference && externalReference.length > 100) {
    return { error: 'رقم الصادر/الوارد الخارجي يجب ألا يتجاوز 100 حرف.' }
  }
  if (documentDate) {
    const parsedDate = new Date(`${documentDate}T00:00:00.000Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(documentDate)
      || Number.isNaN(parsedDate.getTime())
      || parsedDate.toISOString().slice(0, 10) !== documentDate
    ) return { error: 'تاريخ المستند غير صالح.' }
  }

  let manifest: unknown
  try {
    manifest = JSON.parse(manifestValue)
  } catch {
    return { error: 'قائمة الملفات المحددة غير صالحة.' }
  }
  if (!Array.isArray(manifest) || !manifest.length || manifest.length > maxFilesPerUpload) {
    return { error: `اختر من ملف واحد إلى ${maxFilesPerUpload} ملفات.` }
  }

  const validManifest: ArchiveUploadManifestItem[] = []
  for (const [index, item] of manifest.entries()) {
    if (
      !item
      || typeof item !== 'object'
      || typeof item.name !== 'string'
      || !item.name.trim()
      || item.name.length > 255
      || typeof item.type !== 'string'
      || !allowedFileTypes.has(item.type)
      || typeof item.size !== 'number'
      || !Number.isInteger(item.size)
      || item.size <= 0
      || item.size > maxFileSize
    ) return { error: `بيانات الملف رقم ${index + 1} غير صالحة أو يتجاوز 15 ميغابايت.` }
    validManifest.push({ name: item.name, type: item.type, size: item.size })
  }

  let employeeId: string | null = typeof employeeValue === 'string' ? employeeValue || null : null
  if (!context.canManage) {
    if (employeeId && employeeId !== context.employeeId) {
      return { error: 'لا يمكنك ربط مستند بملف موظف آخر.' }
    }
    employeeId = context.employeeId
  }
  if (employeeId) {
    const { data: employee, error } = await context.client.from('employees')
      .select('id')
      .eq('id', employeeId)
      .maybeSingle()
    if (error) return { error: `تعذر التحقق من الموظف المرتبط: ${error.message}` }
    if (!employee) return { error: 'الموظف المرتبط بالمستند غير موجود.' }
  }

  const uploads: ArchiveUploadTicket[] = []
  const errors: string[] = []

  for (const [fileIndex, item] of validManifest.entries()) {
    const numberResult = await generateDocumentNumber(typeValue)
    if ('error' in numberResult) {
      errors.push(`تعذر تجهيز "${item.name}": ${numberResult.error}`)
      continue
    }

    const extension = item.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'file'
    const storagePath = `${context.actorId}/${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`
    const { data: signedUpload, error: signedUploadError } = await context.client.storage
      .from(archiveBucket)
      .createSignedUploadUrl(storagePath)
    if (signedUploadError) {
      errors.push(`تعذر تجهيز رفع "${item.name}": ${signedUploadError.message}`)
      continue
    }

    const ticket: ArchiveUploadedDocument = {
      fileIndex,
      documentNumber: numberResult.documentNumber,
      documentName: item.name,
      documentType: typeValue,
      classification: classificationValue,
      employeeId,
      filePath: signedUpload.path,
      fileType: item.type,
      sourceEntity,
      destinationEntity,
      externalReference,
      documentDate,
      signature: '',
    }
    const signature = getUploadTicketSignature(context.actorId, ticket)
    if (!signature) {
      errors.push('تعذر إنشاء تذكرة الرفع الآمنة بسبب إعدادات الخادم.')
      continue
    }
    uploads.push({ ...ticket, signature, token: signedUpload.token })
  }

  return { uploads, errors }
}

export async function completeArchiveDocumentUploads(
  uploadedItems: ArchiveUploadedDocument[],
): Promise<{
  uploaded: { documentNumber: string; documentName: string }[]
  errors: string[]
  warnings: string[]
} | ActionError> {
  const context = await getArchiveContext()
  if ('error' in context) return context
  if (!Array.isArray(uploadedItems) || !uploadedItems.length || uploadedItems.length > maxFilesPerUpload) {
    return { error: 'قائمة الملفات المرفوعة غير صالحة.' }
  }

  const uploaded: { documentNumber: string; documentName: string }[] = []
  const errors: string[] = []
  const warnings: string[] = []
  const allowedEmployeeId = context.canManage ? null : context.employeeId

  for (const item of uploadedItems) {
    if (
      !item
      || typeof item !== 'object'
      || !Number.isInteger(item.fileIndex)
      || item.fileIndex < 0
      || item.fileIndex >= maxFilesPerUpload
      || typeof item.documentNumber !== 'string'
      || !/^[A-Z0-9]{2,8}-\d{4}-\d{3,}$/.test(item.documentNumber)
      || typeof item.documentName !== 'string'
      || !item.documentName.trim()
      || item.documentName.length > 255
      || typeof item.documentType !== 'string'
      || !Object.hasOwn(documentPrefixes, item.documentType)
      || typeof item.classification !== 'string'
      || !['normal', 'important', 'secret'].includes(item.classification)
      || typeof item.fileType !== 'string'
      || !allowedFileTypes.has(item.fileType)
      || typeof item.filePath !== 'string'
      || typeof item.sourceEntity !== 'string'
      || typeof item.destinationEntity !== 'string'
      || (item.externalReference !== null && typeof item.externalReference !== 'string')
      || (item.documentDate !== null && typeof item.documentDate !== 'string')
      || typeof item.signature !== 'string'
      || typeof item.employeeId !== 'string' && item.employeeId !== null
    ) {
      errors.push('توجد بيانات غير صالحة في أحد المستندات المرفوعة.')
      continue
    }

    const expectedPrefix = getDocumentPrefix(item.documentType)
    const numberMatch = item.documentNumber.match(/^([A-Z0-9]{2,8})-(\d{4})-(\d{3,})$/)
    if (
      !expectedPrefix
      || !numberMatch
      || numberMatch[1] !== expectedPrefix
      || Number(numberMatch[2]) < 2000
      || Number(numberMatch[2]) > 9999
    ) {
      errors.push(`رقم المستند "${item.documentName}" لا يطابق نوعه.`)
      continue
    }

    const expectedSignature = getUploadTicketSignature(context.actorId, item)
    if (
      !expectedSignature
      || !/^[0-9a-f]{64}$/i.test(item.signature)
      || !timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(item.signature, 'hex'))
    ) {
      errors.push(`تذكرة رفع "${item.documentName}" غير صالحة أو منتهية.`)
      continue
    }

    const filePathPrefix = `${context.actorId}/${numberMatch[2]}/`
    const fileName = item.filePath.startsWith(filePathPrefix) ? item.filePath.slice(filePathPrefix.length) : ''
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[a-z0-9]{1,10}$/i.test(fileName)) {
      errors.push(`مسار الملف "${item.documentName}" غير صالح.`)
      continue
    }
    if (allowedEmployeeId && item.employeeId !== allowedEmployeeId) {
      errors.push(`لا تملك صلاحية ربط "${item.documentName}" بموظف آخر.`)
      continue
    }
    if (item.employeeId) {
      const { data: employee, error: employeeError } = await context.client.from('employees')
        .select('id')
        .eq('id', item.employeeId)
        .maybeSingle()
      if (employeeError) {
        errors.push(`تعذر التحقق من الموظف المرتبط بـ"${item.documentName}": ${employeeError.message}`)
        continue
      }
      if (!employee) {
        errors.push(`الموظف المرتبط بـ"${item.documentName}" غير موجود.`)
        continue
      }
    }

    const directory = filePathPrefix.slice(0, -1)
    const { data: objects, error: objectError } = await context.client.storage.from(archiveBucket)
      .list(directory, { search: fileName, limit: 10 })
    if (objectError) {
      errors.push(`تعذر التحقق من الملف "${item.documentName}": ${objectError.message}`)
      continue
    }
    const storedObject = objects?.find((object) => object.name === fileName)
    if (!storedObject) {
      errors.push(`لم يُعثر على الملف "${item.documentName}" في التخزين.`)
      continue
    }
    if (
      !storedObject.metadata
      || storedObject.metadata.size <= 0
      || storedObject.metadata.size > maxFileSize
      || storedObject.metadata.mimetype !== item.fileType
    ) {
      errors.push(`نوع الملف أو حجمه لا يطابق بيانات "${item.documentName}".`)
      continue
    }

    const { error: insertError } = await context.client.from('archive_documents').insert({
      document_number: item.documentNumber,
      document_name: item.documentName.trim(),
      document_type: item.documentType,
      classification: item.classification,
      employee_id: item.employeeId,
      file_url: item.filePath,
      file_type: item.fileType,
      source_entity: item.sourceEntity,
      destination_entity: item.destinationEntity,
      external_reference: item.externalReference,
      document_date: item.documentDate,
      status: 'pending',
      uploaded_by: context.actorId,
    })
    if (insertError) {
      const { data: existingDocument, error: existingDocumentError } = await context.client
        .from('archive_documents')
        .select('id')
        .eq('file_url', item.filePath)
        .maybeSingle()
      if (existingDocumentError) {
        errors.push(`تعذر حفظ "${item.documentName}" (${insertError.message}) والتحقق من ارتباط ملفه: ${existingDocumentError.message}`)
        continue
      }
      if (!existingDocument) {
        const { error: cleanupError } = await context.client.storage.from(archiveBucket).remove([item.filePath])
        errors.push(cleanupError
          ? `تعذر حفظ "${item.documentName}" (${insertError.message})، كما تعذر حذف الملف المرفوع (${cleanupError.message}).`
          : `تعذر حفظ "${item.documentName}" وتم حذف الملف المرفوع: ${insertError.message}`)
      } else {
        errors.push(`تعذر تسجيل "${item.documentName}"؛ الملف مرتبط مسبقاً بمستند محفوظ.`)
      }
      continue
    }

    uploaded.push({ documentNumber: item.documentNumber, documentName: item.documentName })
    const warning = await writeAudit('add', `رفع مستند أرشيف "${item.documentName}" برقم ${item.documentNumber}`)
    if (warning) warnings.push(`المستند ${item.documentNumber}: ${warning}`)
  }

  if (uploaded.length) {
    revalidatePath('/dashboard/archive')
    revalidatePath('/archive/dashboard')
  }
  return { uploaded, errors, warnings }
}

export async function searchDocuments(
  query = '',
  type = '',
  classification = '',
  date = '',
): Promise<{ documents: ArchiveDocument[]; employees: ArchiveEmployeeOption[]; canManage: boolean } | ActionError> {
  const context = await getArchiveContext()
  if ('error' in context) return context

  let request = context.client.from('archive_documents')
    .select('id, document_number, document_name, document_type, classification, employee_id, file_url, file_type, source_entity, destination_entity, external_reference, document_date, status, uploaded_by, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (!context.canManage) request = request.eq('uploaded_by', context.actorId)
  if (type) request = request.eq('document_type', type)
  if (classification && ['normal', 'important', 'secret'].includes(classification)) {
    request = request.eq('classification', classification)
  }
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const start = new Date(`${date}T00:00:00.000Z`)
    if (!Number.isNaN(start.getTime()) && start.toISOString().slice(0, 10) === date) {
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      request = request.gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
    }
  }
  const normalizedQuery = query.trim().replace(/[(),\\]/g, ' ').replace(/\s+/g, ' ').slice(0, 100)
  if (normalizedQuery) {
    request = request.or(
      `document_name.ilike.%${normalizedQuery}%,document_number.ilike.%${normalizedQuery}%,classification.ilike.%${normalizedQuery}%`,
    )
  }

  const { data, error } = await request
  if (error) return { error: `تعذر البحث في الأرشيف: ${error.message}` }
  const rows = data ?? []
  const signedUrlResults = await Promise.all(rows.map((document) => context.client.storage
    .from(archiveBucket)
    .createSignedUrl(document.file_url, 900)))
  const failedSignature = signedUrlResults.findIndex((result) => result.error)
  if (failedSignature >= 0) {
    const failedDocument = rows[failedSignature]
    return {
      error: `تعذر إنشاء رابط آمن للمستند ${failedDocument.document_number}: ${signedUrlResults[failedSignature].error?.message ?? 'خطأ غير معروف.'}`,
    }
  }
  const documents: ArchiveDocument[] = []
  for (const [index, document] of rows.entries()) {
    const signedUrl = signedUrlResults[index].data?.signedUrl
    if (!signedUrl) return { error: `تعذر إنشاء رابط آمن للمستند ${document.document_number}.` }
    documents.push({ ...document, download_url: signedUrl })
  }

  const employeeQuery = context.canManage
    ? context.client.from('employees').select('id, full_name').order('full_name').limit(1000)
    : context.client.from('employees').select('id, full_name').eq('id', context.employeeId)
  const { data: employeeOptions, error: employeesError } = await employeeQuery
  if (employeesError) return { error: `تعذر جلب قائمة الموظفين: ${employeesError.message}` }

  return { documents, employees: employeeOptions ?? [], canManage: context.canManage }
}

export async function approveDocument(
  id: string,
  status: 'approved' | 'rejected',
): Promise<{ success: true; warning?: string } | ActionError> {
  const context = await getArchiveContext()
  if ('error' in context) return context
  if (!context.canManage) return { error: 'اعتماد المستندات متاح لمدير النظام ومدير تقنية المعلومات فقط.' }
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { error: 'معرّف المستند غير صالح.' }
  }
  if (status !== 'approved' && status !== 'rejected') return { error: 'حالة الاعتماد غير صالحة.' }

  const { data: document, error: lookupError } = await context.client.from('archive_documents')
    .select('id, document_number')
    .eq('id', id)
    .maybeSingle()
  if (lookupError) return { error: `تعذر التحقق من المستند: ${lookupError.message}` }
  if (!document) return { error: 'المستند غير موجود.' }

  const { error } = await context.client.from('archive_documents').update({ status }).eq('id', document.id)
  if (error) return { error: `تعذر تحديث حالة المستند: ${error.message}` }
  const warning = await writeAudit('update', `تغيير حالة المستند ${document.document_number} إلى ${status === 'approved' ? 'معتمد' : 'مرفوض'} بواسطة ${context.actorName}`)
  revalidatePath('/dashboard/archive')
  revalidatePath('/archive/dashboard')
  return warning
    ? { success: true, warning }
    : { success: true }
}

export async function deleteArchiveDocument(id: string): Promise<
  { success: true; warning?: string } | ActionError
> {
  const context = await getArchiveContext()
  if ('error' in context) return context
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { error: 'معرّف المستند غير صالح.' }
  }

  let lookup = context.client.from('archive_documents')
    .select('id, document_number, file_url, status, uploaded_by')
    .eq('id', id)
  if (!context.canManage) lookup = lookup.eq('uploaded_by', context.actorId).eq('status', 'pending')
  const { data: document, error: lookupError } = await lookup.maybeSingle()
  if (lookupError) return { error: `تعذر التحقق من المستند: ${lookupError.message}` }
  if (!document) return { error: 'المستند غير موجود أو لا تملك صلاحية حذفه.' }

  const { error: deleteError } = await context.client.from('archive_documents').delete().eq('id', id)
  if (deleteError) return { error: `تعذر حذف سجل المستند: ${deleteError.message}` }

  const warnings: string[] = []
  const { error: storageError } = await context.client.storage.from(archiveBucket).remove([document.file_url])
  if (storageError) warnings.push(`تم حذف السجل، لكن تعذر حذف الملف من التخزين: ${storageError.message}`)
  const auditWarning = await writeAudit('delete', `حذف مستند الأرشيف ${document.document_number}`)
  if (auditWarning) warnings.push(`تعذر تسجيل الحركة: ${auditWarning}`)
  revalidatePath('/dashboard/archive')
  revalidatePath('/archive/dashboard')
  return { success: true, ...(warnings.length ? { warning: warnings.join(' ') } : {}) }
}

export async function getDocumentDownloadUrl(id: string): Promise<
  { downloadUrl: string } | ActionError
> {
  const context = await getArchiveContext()
  if ('error' in context) return context
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { error: 'معرّف المستند غير صالح.' }
  }

  let lookup = context.client.from('archive_documents')
    .select('file_url, document_name')
    .eq('id', id)
  if (!context.canManage) lookup = lookup.eq('uploaded_by', context.actorId)
  const { data: document, error } = await lookup.maybeSingle()
  if (error) return { error: `تعذر التحقق من صلاحية تحميل المستند: ${error.message}` }
  if (!document) return { error: 'المستند غير موجود أو لا تملك صلاحية تحميله.' }

  const { data, error: signedUrlError } = await context.client.storage
    .from(archiveBucket)
    .createSignedUrl(document.file_url, 300, { download: document.document_name })
  if (signedUrlError) return { error: `تعذر تجهيز رابط التحميل: ${signedUrlError.message}` }
  return { downloadUrl: data.signedUrl }
}
