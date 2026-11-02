'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient, getAuthenticatedActor } from '@/app/actions/server-auth'

const authorizedRoles = ['president', 'vice_president', 'admin_manager', 'it_manager']
const photoBucket = 'project-field-photos'

async function getStrategicClient() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!authorizedRoles.includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية الوصول إلى منظومة المشروعات.' }
  }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { actor: actorResult.actor, client: adminResult.client }
}

export interface TrackingRow {
  id: string
  project_id: string
  update_date: string
  completion_percentage: number
  contractor_name: string | null
  delay_reasons: string | null
  field_photos_url: string | null
  project_code: string
  project_name: string
  project_status: string
}

export interface FinanceRow {
  project_id: string
  project_code: string
  project_name: string
  approved_budget: number
  contract_value: number
  amount_spent: number
  financial_obligations: number
  technical_completion: number
}

export interface AgriculturalLandRow {
  id: string
  land_name: string
  area_size: number
  municipality: string
  soil_type: string | null
  water_source: string | null
  status: string
  is_available_for_investment: boolean
  created_at: string
}

export interface MineralResourceRow {
  id: string
  resource_name: string
  location: string
  coordinates: string | null
  area_size: number
  exploration_status: string
  classification: string
}

export interface InvestmentOpportunityRow {
  id: string
  title: string
  sector: string
  description: string
  estimated_cost: number
  target_investor: string | null
  status: string
  created_at: string
}

export async function getProjectTracking(): Promise<{ rows: TrackingRow[] } | { error: string }> {
  const context = await getStrategicClient()
  if ('error' in context) return context

  const [updatesResult, projectsResult] = await Promise.all([
    context.client
      .from('project_tracking')
      .select('id, project_id, update_date, completion_percentage, contractor_name, delay_reasons, field_photos_url')
      .order('update_date', { ascending: false }),
    context.client
      .from('development_projects')
      .select('id, project_code, project_name, status')
      .order('project_name'),
  ])
  if (updatesResult.error) return { error: `تعذر جلب التحديثات الميدانية: ${updatesResult.error.message}` }
  if (projectsResult.error) return { error: `تعذر جلب المشاريع: ${projectsResult.error.message}` }

  const projectById = new Map((projectsResult.data ?? []).map((project) => [project.id, project]))
  const rows: TrackingRow[] = []
  for (const update of updatesResult.data ?? []) {
    const project = projectById.get(update.project_id)
    if (!project) continue
    let photoUrl: string | null = null
    if (update.field_photos_url) {
      const { data, error } = await context.client.storage
        .from(photoBucket)
        .createSignedUrl(update.field_photos_url, 60 * 60)
      if (error) return { error: `تعذر تجهيز رابط صورة المتابعة: ${error.message}` }
      photoUrl = data.signedUrl
    }
    rows.push({
      ...update,
      field_photos_url: photoUrl,
      project_code: project.project_code,
      project_name: project.project_name,
      project_status: project.status,
    })
  }
  return { rows }
}

export async function addProjectTracking(formData: FormData): Promise<{ success: true } | { error: string }> {
  const context = await getStrategicClient()
  if ('error' in context) return context

  const projectId = formData.get('project_id')
  const completionValue = Number(formData.get('completion_percentage'))
  const contractorName = String(formData.get('contractor_name') ?? '').trim()
  const delayReasons = String(formData.get('delay_reasons') ?? '').trim()
  const photoValue = formData.get('field_photo')
  if (typeof projectId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
    return { error: 'يجب اختيار مشروع صالح.' }
  }
  if (!Number.isFinite(completionValue) || completionValue < 0 || completionValue > 100) {
    return { error: 'نسبة الإنجاز يجب أن تكون بين 0 و100.' }
  }
  if (contractorName.length > 200 || delayReasons.length > 2000) {
    return { error: 'اسم المقاول أو أسباب التأخير تتجاوز الحد المسموح.' }
  }

  let uploadedPath: string | null = null
  if (photoValue instanceof File && photoValue.size > 0) {
    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const extension = extensionByType[photoValue.type]
    if (!extension) return { error: 'صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.' }
    if (photoValue.size > 5 * 1024 * 1024) return { error: 'حجم الصورة يتجاوز 5 ميغابايت.' }

    uploadedPath = `${projectId}/${randomUUID()}.${extension}`
    const { error } = await context.client.storage
      .from(photoBucket)
      .upload(uploadedPath, photoValue, { contentType: photoValue.type, upsert: false })
    if (error) return { error: `تعذر رفع الصورة الميدانية: ${error.message}` }
  } else if (photoValue !== null && !(photoValue instanceof File)) {
    return { error: 'ملف الصورة المرفق غير صالح.' }
  }

  const { error } = await context.client
    .from('project_tracking')
    .insert({
      project_id: projectId,
      completion_percentage: completionValue,
      contractor_name: contractorName || null,
      delay_reasons: delayReasons || null,
      field_photos_url: uploadedPath,
    })
  if (error) {
    if (uploadedPath) {
      const { error: cleanupError } = await context.client.storage.from(photoBucket).remove([uploadedPath])
      if (cleanupError) {
        return { error: `تعذر حفظ تحديث المشروع (${error.message}) وتعذر حذف الصورة المرفوعة (${cleanupError.message}).` }
      }
    }
    return { error: `تعذر حفظ التحديث الميداني: ${error.message}` }
  }

  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard/projects/tracking')
  return { success: true }
}

export async function getProjectFinance(): Promise<{ rows: FinanceRow[] } | { error: string }> {
  const context = await getStrategicClient()
  if ('error' in context) return context

  const [financialsResult, projectsResult] = await Promise.all([
    context.client
      .from('project_financials')
      .select('project_id, approved_budget, contract_value, amount_spent, financial_obligations'),
    context.client
      .from('development_projects')
      .select('id, project_code, project_name, completion_percentage')
      .order('project_name'),
  ])
  if (financialsResult.error) return { error: `تعذر جلب البيانات المالية: ${financialsResult.error.message}` }
  if (projectsResult.error) return { error: `تعذر جلب المشاريع: ${projectsResult.error.message}` }

  const financeByProject = new Map<string, Omit<FinanceRow, 'project_code' | 'project_name' | 'technical_completion'>>()
  for (const item of financialsResult.data ?? []) {
    const current = financeByProject.get(item.project_id) ?? {
      project_id: item.project_id,
      approved_budget: 0,
      contract_value: 0,
      amount_spent: 0,
      financial_obligations: 0,
    }
    current.approved_budget += Number(item.approved_budget) || 0
    current.contract_value += Number(item.contract_value) || 0
    current.amount_spent += Number(item.amount_spent) || 0
    current.financial_obligations += Number(item.financial_obligations) || 0
    financeByProject.set(item.project_id, current)
  }

  const rows: FinanceRow[] = (projectsResult.data ?? [])
    .filter((project) => financeByProject.has(project.id))
    .map((project) => ({
      ...financeByProject.get(project.id)!,
      project_code: project.project_code,
      project_name: project.project_name,
      technical_completion: Number(project.completion_percentage) || 0,
    }))
  return { rows }
}

export async function getAgriculturalLands(
  municipalitySearch = '',
): Promise<{ rows: AgriculturalLandRow[] } | { error: string }> {
  const context = await getStrategicClient()
  if ('error' in context) return context

  const search = municipalitySearch.trim().slice(0, 100)
  let query = context.client
    .from('agricultural_lands')
    .select('*')
    .order('municipality')
    .order('land_name')
  if (search) query = query.ilike('municipality', `%${search}%`)
  const { data, error } = await query
  if (error) return { error: `تعذر جلب الأراضي الزراعية: ${error.message}` }
  return { rows: data ?? [] }
}

export async function createAgriculturalLand(formData: FormData): Promise<{ success: true } | { error: string }> {
  const context = await getStrategicClient()
  if ('error' in context) return context

  const landName = String(formData.get('land_name') ?? '').trim()
  const municipality = String(formData.get('municipality') ?? '').trim()
  const soilType = String(formData.get('soil_type') ?? '').trim()
  const waterSource = String(formData.get('water_source') ?? '').trim()
  const status = String(formData.get('status') ?? '')
  const areaSize = Number(formData.get('area_size'))
  const available = formData.get('is_available_for_investment') === 'on'
  if (!landName || landName.length > 200) return { error: 'اسم الأرض مطلوب ولا يتجاوز 200 حرف.' }
  if (!municipality || municipality.length > 150) return { error: 'البلدية مطلوبة.' }
  if (!Number.isFinite(areaSize) || areaSize < 0 || areaSize > 1_000_000_000) {
    return { error: 'المساحة المدخلة غير صالحة.' }
  }
  if (!['صالحة', 'تحتاج استصلاح'].includes(status)) return { error: 'حالة الأرض غير صالحة.' }

  const { error } = await context.client.from('agricultural_lands').insert({
    land_name: landName,
    municipality,
    area_size: areaSize,
    soil_type: soilType || null,
    water_source: waterSource || null,
    status,
    is_available_for_investment: available,
  })
  if (error) return { error: `تعذر إضافة الأرض الزراعية: ${error.message}` }
  revalidatePath('/dashboard/projects/lands')
  revalidatePath('/dashboard/projects')
  return { success: true }
}

export async function getMineralResources(): Promise<{ rows: MineralResourceRow[] } | { error: string }> {
  const context = await getStrategicClient()
  if ('error' in context) return context

  const { data, error } = await context.client
    .from('mineral_resources')
    .select('id, resource_name, location, coordinates, area_size, exploration_status, classification')
    .order('resource_name')
  if (error) return { error: `تعذر جلب الموارد المعدنية: ${error.message}` }

  const mayViewRestricted = ['it_manager', 'president'].includes(context.actor.role)
  const rows = (data ?? []).filter((resource) => {
    const restrictedResource = resource.resource_name.toLocaleLowerCase('ar').includes('يورانيوم')
    const classifiedSecret = resource.classification === 'سري'
    return mayViewRestricted || (!restrictedResource && !classifiedSecret)
  })
  return { rows }
}

export async function getInvestmentOpportunities(): Promise<
  { rows: InvestmentOpportunityRow[] } | { error: string }
> {
  const context = await getStrategicClient()
  if ('error' in context) return context

  const { data, error } = await context.client
    .from('investment_opportunities')
    .select('*')
    .eq('status', 'متاحة')
    .order('created_at', { ascending: false })
  if (error) return { error: `تعذر جلب الفرص الاستثمارية: ${error.message}` }
  return { rows: data ?? [] }
}

export async function submitInvestmentApplication(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const context = await getStrategicClient()
  if ('error' in context) return context

  const opportunityId = String(formData.get('opportunity_id') ?? '')
  const applicantName = String(formData.get('applicant_name') ?? '').trim()
  const applicantEmail = String(formData.get('applicant_email') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(opportunityId)) {
    return { error: 'الفرصة الاستثمارية المختارة غير صالحة.' }
  }
  if (!applicantName || applicantName.length > 200) return { error: 'اسم مقدم الطلب مطلوب.' }
  if (applicantEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail)) {
    return { error: 'البريد الإلكتروني غير صالح.' }
  }
  if (note.length > 2000) return { error: 'تفاصيل الطلب تتجاوز الحد المسموح.' }

  const { data: opportunity, error: opportunityError } = await context.client
    .from('investment_opportunities')
    .select('id')
    .eq('id', opportunityId)
    .eq('status', 'متاحة')
    .maybeSingle()
  if (opportunityError) return { error: `تعذر التحقق من حالة الفرصة: ${opportunityError.message}` }
  if (!opportunity) return { error: 'هذه الفرصة غير متاحة لاستقبال الطلبات حالياً.' }

  const { error } = await context.client.from('investment_applications').insert({
    opportunity_id: opportunityId,
    applicant_id: context.actor.id,
    applicant_name: applicantName,
    applicant_email: applicantEmail,
    note: note || null,
  })
  if (error) return { error: `تعذر تسجيل طلب الاستثمار: ${error.message}` }
  revalidatePath('/dashboard/projects/investments')
  return { success: true }
}
