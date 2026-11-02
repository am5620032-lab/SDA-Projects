'use server'

import { getHrEmployeeId } from '@/app/actions/hr-session'
import { logAction } from '@/app/actions/log-action'
import {
  createSupabaseAdminClient,
  type AdminDatabase,
} from '@/app/actions/server-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

const certificateBucket = 'employee-training-certificates'
const allowedCertificateTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const maxCertificateSize = 15 * 1024 * 1024

export interface HrEmployeeOption {
  id: string
  full_name: string
}

export interface PenaltyRecord {
  id: string
  employee_id: string
  employee_name: string
  violation_type: string
  description: string
  decision_number: string
  decision_date: string
  penalty_type: string
  status: string
}

export interface TrainingRecord {
  id: string
  employee_id: string
  employee_name: string
  course_name: string
  provider: string | null
  start_date: string
  end_date: string | null
  notes: string | null
  certificate_url: string | null
  certificate_download_url: string | null
}

export interface EvaluationRecord {
  id: string
  employee_id: string
  employee_name: string
  year: number
  evaluator_id: string | null
  evaluator_name: string
  score: number
  notes: string | null
  status: string
  created_at: string
}

export interface CorrespondenceRecord {
  id: string
  type: 'incoming' | 'outgoing'
  reference_number: string
  subject: string
  date: string
  related_employee_id: string | null
  related_employee_name: string
  notes: string | null
}

type ActionResult<T> = { data: T } | { error: string }
type HrContext = { employeeId: string; client: SupabaseClient<AdminDatabase> } | { error: string }

async function getHrContext(): Promise<HrContext> {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { employeeId, client: adminResult.client }
}

async function getAuditWarning(action: 'add' | 'update' | 'delete', details: string) {
  try {
    const result = await logAction(action, details)
    return 'error' in result ? result.error : undefined
  } catch (error) {
    return error instanceof Error ? error.message : 'تعذر تسجيل الحركة في سجل المراقبة.'
  }
}

export async function getPenaltiesData(): Promise<ActionResult<{
  penalties: PenaltyRecord[]
  employees: HrEmployeeOption[]
}>> {
  const context = await getHrContext()
  if ('error' in context) return context

  const [penaltiesResult, employeesResult] = await Promise.all([
    context.client.from('penalties')
      .select('id, employee_id, violation_type, description, decision_number, decision_date, penalty_type, status')
      .order('decision_date', { ascending: false }),
    context.client.from('employees')
      .select('id, full_name')
      .order('full_name'),
  ])
  if (penaltiesResult.error) return { error: `تعذر جلب سجل الجزاءات: ${penaltiesResult.error.message}` }
  if (employeesResult.error) return { error: `تعذر جلب الموظفين: ${employeesResult.error.message}` }

  const employeeNames = new Map((employeesResult.data ?? []).map((employee) => [employee.id, employee.full_name]))
  return {
    data: {
      employees: employeesResult.data ?? [],
      penalties: (penaltiesResult.data ?? []).map((penalty) => ({
        ...penalty,
        employee_name: employeeNames.get(penalty.employee_id) ?? 'موظف غير معروف',
      })),
    },
  }
}

export async function createPenalty(input: {
  employeeId: string
  violationType: string
  description: string
  decisionNumber: string
  decisionDate: string
  penaltyType: string
}): Promise<{ success: true; warning?: string } | { error: string }> {
  const context = await getHrContext()
  if ('error' in context) return context
  if (
    !input
    || typeof input.employeeId !== 'string'
    || typeof input.violationType !== 'string'
    || typeof input.description !== 'string'
    || typeof input.decisionNumber !== 'string'
    || typeof input.decisionDate !== 'string'
    || typeof input.penaltyType !== 'string'
  ) return { error: 'بيانات الجزاء غير مكتملة.' }

  const violationType = input.violationType.trim()
  const description = input.description.trim()
  const decisionNumber = input.decisionNumber.trim()
  const penaltyType = input.penaltyType.trim()
  const dateTimestamp = Date.parse(`${input.decisionDate}T00:00:00Z`)
  if (!input.employeeId || !violationType || !description || !decisionNumber || !penaltyType) {
    return { error: 'يرجى استكمال بيانات الجزاء.' }
  }
  if (
    violationType.length > 200
    || description.length > 4000
    || decisionNumber.length > 100
    || penaltyType.length > 200
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.decisionDate)
    || Number.isNaN(dateTimestamp)
    || new Date(dateTimestamp).toISOString().slice(0, 10) !== input.decisionDate
  ) return { error: 'تحقق من نوع المخالفة والتفاصيل ورقم القرار وتاريخه ونوع العقوبة.' }

  const { data: employee, error: employeeError } = await context.client.from('employees')
    .select('id, full_name')
    .eq('id', input.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'الموظف المحدد غير موجود.' }

  const { error } = await context.client.from('penalties').insert({
    employee_id: employee.id,
    violation_type: violationType,
    description,
    decision_number: decisionNumber,
    decision_date: input.decisionDate,
    penalty_type: penaltyType,
    status: 'active',
  })
  if (error) return { error: `تعذر حفظ الجزاء: ${error.message}` }

  const warning = await getAuditWarning('add', `تسجيل جزاء للموظف ${employee.full_name}: ${penaltyType}`)
  return { success: true, warning }
}

export async function getTrainingsData(): Promise<ActionResult<{
  trainings: TrainingRecord[]
  employees: HrEmployeeOption[]
}>> {
  const context = await getHrContext()
  if ('error' in context) return context

  const [trainingsResult, employeesResult] = await Promise.all([
    context.client.from('trainings')
      .select('id, employee_id, course_name, provider, start_date, end_date, certificate_url, notes')
      .order('start_date', { ascending: false }),
    context.client.from('employees')
      .select('id, full_name')
      .order('full_name'),
  ])
  if (trainingsResult.error) return { error: `تعذر جلب سجل التدريب: ${trainingsResult.error.message}` }
  if (employeesResult.error) return { error: `تعذر جلب الموظفين: ${employeesResult.error.message}` }

  const employeeNames = new Map((employeesResult.data ?? []).map((employee) => [employee.id, employee.full_name]))
  const trainings: TrainingRecord[] = []
  for (const training of trainingsResult.data ?? []) {
    let certificateDownloadUrl: string | null = null
    if (training.certificate_url) {
      const { data, error } = await context.client.storage.from(certificateBucket)
        .createSignedUrl(training.certificate_url, 3600)
      if (error) return { error: `تعذر إنشاء رابط آمن لشهادة ${training.course_name}: ${error.message}` }
      certificateDownloadUrl = data.signedUrl
    }
    trainings.push({
      ...training,
      employee_name: employeeNames.get(training.employee_id) ?? 'موظف غير معروف',
      certificate_download_url: certificateDownloadUrl,
    })
  }

  return { data: { trainings, employees: employeesResult.data ?? [] } }
}

export async function createTraining(formData: FormData): Promise<
  { success: true; warning?: string } | { error: string }
> {
  const context = await getHrContext()
  if ('error' in context) return context

  const employeeId = formData.get('employee_id')
  const courseName = formData.get('course_name')
  const provider = formData.get('provider')
  const startDate = formData.get('start_date')
  const endDate = formData.get('end_date')
  const notes = formData.get('notes')
  const certificate = formData.get('certificate')
  if (
    typeof employeeId !== 'string'
    || typeof courseName !== 'string'
    || typeof provider !== 'string'
    || typeof startDate !== 'string'
    || typeof endDate !== 'string'
    || typeof notes !== 'string'
    || !(certificate instanceof File)
    || !employeeId
    || !courseName.trim()
    || courseName.trim().length > 250
    || provider.trim().length > 250
    || notes.trim().length > 4000
  ) return { error: 'يرجى إدخال الموظف واسم الدورة والتحقق من بياناتها.' }

  const validDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const timestamp = Date.parse(`${value}T00:00:00Z`)
    return !Number.isNaN(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
  }
  if (!validDate(startDate) || (endDate && (!validDate(endDate) || endDate < startDate))) {
    return { error: 'تاريخ بداية الدورة أو نهايتها غير صالح.' }
  }
  if (
    certificate.size > 0
    && (certificate.size > maxCertificateSize || !allowedCertificateTypes.has(certificate.type))
  ) return { error: 'الشهادة يجب أن تكون PDF أو صورة بحجم لا يتجاوز 15 ميغابايت.' }

  const { data: employee, error: employeeError } = await context.client.from('employees')
    .select('id, full_name')
    .eq('id', employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'الموظف المحدد غير موجود.' }

  let certificatePath: string | null = null
  if (certificate.size > 0) {
    const extension = certificate.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'file'
    certificatePath = `${employee.id}/${crypto.randomUUID()}.${extension}`
    const { error } = await context.client.storage.from(certificateBucket).upload(
      certificatePath,
      certificate,
      { contentType: certificate.type, upsert: false },
    )
    if (error) return { error: `تعذر رفع الشهادة: ${error.message}` }
  }

  const { error: insertError } = await context.client.from('trainings').insert({
    employee_id: employee.id,
    course_name: courseName.trim(),
    provider: provider.trim() || null,
    start_date: startDate,
    end_date: endDate || null,
    certificate_url: certificatePath,
    notes: notes.trim() || null,
  })
  if (insertError) {
    if (certificatePath) {
      const { error: cleanupError } = await context.client.storage.from(certificateBucket).remove([certificatePath])
      return {
        error: cleanupError
          ? `تعذر حفظ التدريب (${insertError.message})، كما تعذر تنظيف الشهادة (${cleanupError.message}).`
          : `تعذر حفظ التدريب وتم حذف الشهادة المرفوعة: ${insertError.message}`,
      }
    }
    return { error: `تعذر حفظ سجل التدريب: ${insertError.message}` }
  }

  const warning = await getAuditWarning('add', `تسجيل دورة "${courseName.trim()}" للموظف ${employee.full_name}`)
  return { success: true, warning }
}

export async function getEvaluationsData(): Promise<ActionResult<{
  evaluations: EvaluationRecord[]
  employees: HrEmployeeOption[]
}>> {
  const context = await getHrContext()
  if ('error' in context) return context

  const [{ data: evaluations, error: evaluationError }, { data: employees, error: employeeError }] = await Promise.all([
    context.client.from('evaluations')
      .select('id, employee_id, year, evaluator_id, score, notes, status, created_at')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false }),
    context.client.from('employees')
      .select('id, full_name')
      .order('full_name'),
  ])
  if (evaluationError) return { error: `تعذر جلب التقييمات: ${evaluationError.message}` }
  if (employeeError) return { error: `تعذر جلب الموظفين: ${employeeError.message}` }

  const employeeNames = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]))
  return {
    data: {
      employees: employees ?? [],
      evaluations: (evaluations ?? []).map((evaluation) => ({
        ...evaluation,
        employee_name: employeeNames.get(evaluation.employee_id) ?? 'موظف غير معروف',
        evaluator_name: evaluation.evaluator_id
          ? employeeNames.get(evaluation.evaluator_id) ?? 'مقيّم غير معروف'
          : 'غير محدد',
      })),
    },
  }
}

export async function createEvaluation(input: {
  employeeId: string
  year: number
  score: number
  notes: string
}): Promise<{ success: true; warning?: string } | { error: string }> {
  const context = await getHrContext()
  if ('error' in context) return context
  const currentYear = new Date().getFullYear()
  if (
    !input
    || typeof input.employeeId !== 'string'
    || !Number.isInteger(input.year)
    || input.year < 1900
    || input.year > currentYear
    || typeof input.score !== 'number'
    || !Number.isFinite(input.score)
    || input.score < 0
    || input.score > 100
    || typeof input.notes !== 'string'
    || input.notes.trim().length > 4000
  ) return { error: 'بيانات التقييم غير صالحة؛ الدرجة من 100 والسنة يجب ألا تتجاوز السنة الحالية.' }

  const { data: employee, error: employeeError } = await context.client.from('employees')
    .select('id, full_name')
    .eq('id', input.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر التحقق من الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'الموظف المحدد غير موجود.' }

  const { error } = await context.client.from('evaluations').insert({
    employee_id: employee.id,
    year: input.year,
    evaluator_id: context.employeeId,
    score: input.score,
    notes: input.notes.trim() || null,
    status: 'draft',
  })
  if (error) return { error: `تعذر حفظ التقييم: ${error.message}` }

  const warning = await getAuditWarning('add', `تسجيل تقييم وظيفي للموظف ${employee.full_name} لسنة ${input.year}`)
  return { success: true, warning }
}

export async function updateEvaluationStatus(
  evaluationId: string,
  status: 'draft' | 'approved',
): Promise<{ success: true; warning?: string } | { error: string }> {
  const context = await getHrContext()
  if ('error' in context) return context
  if (typeof evaluationId !== 'string' || !evaluationId || !['draft', 'approved'].includes(status)) {
    return { error: 'بيانات اعتماد التقييم غير صالحة.' }
  }

  const { data: evaluation, error: lookupError } = await context.client.from('evaluations')
    .select('id, employee_id, year')
    .eq('id', evaluationId)
    .maybeSingle()
  if (lookupError) return { error: `تعذر التحقق من التقييم: ${lookupError.message}` }
  if (!evaluation) return { error: 'التقييم المطلوب غير موجود.' }

  const { error } = await context.client.from('evaluations').update({ status }).eq('id', evaluation.id)
  if (error) return { error: `تعذر تحديث حالة التقييم: ${error.message}` }

  const warning = await getAuditWarning('update', `تغيير حالة تقييم الموظف ${evaluation.employee_id} لسنة ${evaluation.year} إلى ${status}`)
  return { success: true, warning }
}

export async function getCorrespondencesData(): Promise<ActionResult<{
  correspondences: CorrespondenceRecord[]
  employees: HrEmployeeOption[]
}>> {
  const context = await getHrContext()
  if ('error' in context) return context

  const [{ data: correspondences, error: correspondenceError }, { data: employees, error: employeeError }] = await Promise.all([
    context.client.from('correspondences')
      .select('id, type, reference_number, subject, date, related_employee_id, notes')
      .order('date', { ascending: false }),
    context.client.from('employees')
      .select('id, full_name')
      .order('full_name'),
  ])
  if (correspondenceError) return { error: `تعذر جلب سجل المراسلات: ${correspondenceError.message}` }
  if (employeeError) return { error: `تعذر جلب الموظفين: ${employeeError.message}` }

  const employeeNames = new Map((employees ?? []).map((employee) => [employee.id, employee.full_name]))
  return {
    data: {
      employees: employees ?? [],
      correspondences: (correspondences ?? []).map((correspondence) => ({
        ...correspondence,
        type: correspondence.type === 'outgoing' ? 'outgoing' : 'incoming',
        related_employee_name: correspondence.related_employee_id
          ? employeeNames.get(correspondence.related_employee_id) ?? 'موظف غير معروف'
          : '—',
      })),
    },
  }
}

export async function createCorrespondence(input: {
  type: 'incoming' | 'outgoing'
  referenceNumber: string
  subject: string
  date: string
  relatedEmployeeId: string
  notes: string
}): Promise<{ success: true; warning?: string } | { error: string }> {
  const context = await getHrContext()
  if ('error' in context) return context
  if (
    !input
    || !['incoming', 'outgoing'].includes(input.type)
    || typeof input.referenceNumber !== 'string'
    || typeof input.subject !== 'string'
    || typeof input.date !== 'string'
    || typeof input.relatedEmployeeId !== 'string'
    || typeof input.notes !== 'string'
  ) return { error: 'بيانات المراسلة غير مكتملة.' }

  const referenceNumber = input.referenceNumber.trim()
  const subject = input.subject.trim()
  const dateTimestamp = Date.parse(`${input.date}T00:00:00Z`)
  if (
    !referenceNumber
    || referenceNumber.length > 100
    || !subject
    || subject.length > 500
    || input.notes.trim().length > 4000
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)
    || Number.isNaN(dateTimestamp)
    || new Date(dateTimestamp).toISOString().slice(0, 10) !== input.date
  ) return { error: 'تحقق من رقم المراسلة وموضوعها وتاريخها.' }

  let employeeName: string | null = null
  if (input.relatedEmployeeId) {
    const { data: employee, error } = await context.client.from('employees')
      .select('id, full_name')
      .eq('id', input.relatedEmployeeId)
      .maybeSingle()
    if (error) return { error: `تعذر التحقق من الموظف المرتبط: ${error.message}` }
    if (!employee) return { error: 'الموظف المرتبط غير موجود.' }
    employeeName = employee.full_name
  }

  const { error } = await context.client.from('correspondences').insert({
    type: input.type,
    reference_number: referenceNumber,
    subject,
    date: input.date,
    related_employee_id: input.relatedEmployeeId || null,
    notes: input.notes.trim() || null,
  })
  if (error) return { error: `تعذر تسجيل المراسلة: ${error.message}` }

  const typeLabel = input.type === 'incoming' ? 'واردة' : 'صادرة'
  const warning = await getAuditWarning('add', `تسجيل مراسلة ${typeLabel} رقم ${referenceNumber}${employeeName ? ` مرتبطة بالموظف ${employeeName}` : ''}`)
  return { success: true, warning }
}
