'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient, getAuthenticatedActor } from '@/app/actions/server-auth'
import { projectPriorities, projectSectors, projectStatuses } from './project-options'

export interface DevelopmentProject {
  id: string
  project_code: string
  project_name: string
  sector: string
  municipality: string
  location_details: string | null
  area_size: number
  estimated_budget: number
  funding_source: string
  priority_level: string
  status: string
  required_intervention: string | null
  description: string | null
  created_at: string
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  completion_percentage: number
  start_date: string | null
  end_date: string | null
  contractor_name: string | null
  contractor_company: string | null
  supervising_entity: string | null
  engineer_name: string | null
  planned_completion_percentage: number | null
  actual_completion_percentage: number | null
  financial_completion_percentage: number | null
  delay_reasons: string | null
  latitude: number | null
  longitude: number | null
}

export interface ProjectFilters {
  sector?: string
  municipality?: string
  status?: string
  priority?: string
}

export interface ProjectInput {
  project_name: string
  sector: string
  municipality: string
  location_details: string
  area_size: number
  estimated_budget: number
  funding_source: string
  priority_level: string
  status: string
  required_intervention: string
  description: string
  completion_percentage: number
  start_date: string
  end_date: string
  contractor_name: string
  contractor_company: string
  supervising_entity: string
  engineer_name: string
  planned_completion_percentage: number
  actual_completion_percentage: number
  financial_completion_percentage: number
  delay_reasons: string
  latitude: number | null
  longitude: number | null
}

export interface ProjectStatusCount {
  status: string
  count: number
}

export interface ProjectSectorBudget {
  sector: string
  budget: number
}

export interface MunicipalityProjectCount {
  municipality: string
  count: number
}

export interface ProjectStats {
  totalProjects: number
  agriculturalArea: number
  stoppedProjects: number
  totalBudget: number
  inProgressProjects: number
  overdueProjects: number
  completedProjects: number
  overallCompletionPercentage: number
  agriculturalLandCount: number
  investmentOpportunitiesCount: number
  geographicDistribution: number
  projectsByStatus: ProjectStatusCount[]
  budgetBySector: ProjectSectorBudget[]
  municipalitiesRanked: MunicipalityProjectCount[]
  latestProjects: DevelopmentProject[]
  urgentProjects: DevelopmentProject[]
}

const emptyStats: ProjectStats = {
  totalProjects: 0,
  agriculturalArea: 0,
  stoppedProjects: 0,
  totalBudget: 0,
  inProgressProjects: 0,
  overdueProjects: 0,
  completedProjects: 0,
  overallCompletionPercentage: 0,
  agriculturalLandCount: 0,
  investmentOpportunitiesCount: 0,
  geographicDistribution: 0,
  projectsByStatus: projectStatuses.map((status) => ({ status, count: 0 })),
  budgetBySector: projectSectors.map((sector) => ({ sector, budget: 0 })),
  municipalitiesRanked: [],
  latestProjects: [],
  urgentProjects: [],
}

async function getAuthorizedAdminClient() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['president', 'vice_president', 'admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية الوصول إلى منظومة المشروعات.' }
  }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { client: adminResult.client }
}

function isValidChoice(value: string, choices: readonly string[]): boolean {
  return choices.some((choice) => choice === value)
}

async function getProjectManagerContext() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    return { error: 'يقتصر التحقق الميداني على مديري النظام.' }
  }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { actor: actorResult.actor, client: adminResult.client }
}

export async function verifyProject(
  projectId: string,
): Promise<{ success: true; project: DevelopmentProject } | { error: string }> {
  if (typeof projectId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
    return { error: 'معرّف المشروع غير صالح.' }
  }

  const context = await getProjectManagerContext()
  if ('error' in context) return context

  const { data, error } = await context.client
    .from('development_projects')
    .update({
      is_verified: true,
      verified_by: context.actor.id,
      verified_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select('*')
    .single()

  if (error) return { error: `تعذر توثيق المشروع: ${error.message}` }
  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard/projects/database')
  return { success: true, project: data }
}

export async function createProject(
  input: ProjectInput,
): Promise<{ success: true; project: DevelopmentProject } | { error: string }> {
  const context = await getAuthorizedAdminClient()
  if ('error' in context) return context
  if (!input || typeof input !== 'object') return { error: 'بيانات المشروع غير صالحة.' }

  const projectName = typeof input.project_name === 'string' ? input.project_name.trim() : ''
  const municipality = typeof input.municipality === 'string' ? input.municipality.trim() : ''
  const fundingSource = typeof input.funding_source === 'string' ? input.funding_source.trim() : ''
  if (!projectName || projectName.length > 200) return { error: 'اسم المشروع مطلوب (حتى 200 حرف).' }
  if (!municipality || municipality.length > 150) return { error: 'البلدية مطلوبة (حتى 150 حرفاً).' }
  if (!fundingSource || fundingSource.length > 150) return { error: 'مصدر التمويل مطلوب (حتى 150 حرفاً).' }
  if (!isValidChoice(input.sector, projectSectors)) return { error: 'قطاع المشروع غير صالح.' }
  if (!isValidChoice(input.priority_level, projectPriorities)) return { error: 'مستوى الأولوية غير صالح.' }
  if (!isValidChoice(input.status, projectStatuses)) return { error: 'حالة المشروع غير صالحة.' }
  if (!Number.isFinite(input.area_size) || input.area_size < 0) return { error: 'المساحة يجب أن تكون رقماً موجباً أو صفراً.' }
  if (!Number.isFinite(input.estimated_budget) || input.estimated_budget < 0) {
    return { error: 'الميزانية يجب أن تكون رقماً موجباً أو صفراً.' }
  }
  if (!Number.isFinite(input.completion_percentage)
    || input.completion_percentage < 0
    || input.completion_percentage > 100) {
    return { error: 'نسبة الإنجاز يجب أن تكون بين 0 و100.' }
  }
  if (typeof input.start_date !== 'string'
    || typeof input.end_date !== 'string'
    || typeof input.contractor_name !== 'string'
    || typeof input.contractor_company !== 'string'
    || typeof input.supervising_entity !== 'string'
    || typeof input.engineer_name !== 'string'
    || typeof input.delay_reasons !== 'string') {
    return { error: 'بيانات المقاول أو الإشراف أو التواريخ غير صالحة.' }
  }
  const startDate = input.start_date || null
  const endDate = input.end_date || null
  if ((startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
    || (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
    || (startDate && Number.isNaN(Date.parse(startDate)))
    || (endDate && Number.isNaN(Date.parse(endDate)))) {
    return { error: 'تاريخ بداية المشروع أو نهايته غير صالح.' }
  }
  if (startDate && endDate && endDate < startDate) {
    return { error: 'تاريخ نهاية المشروع يجب أن يأتي بعد تاريخ البداية.' }
  }
  const contractorName = input.contractor_name.trim()
  const contractorCompany = input.contractor_company.trim()
  const supervisingEntity = input.supervising_entity.trim()
  const engineerName = input.engineer_name.trim()
  const delayReasons = input.delay_reasons.trim()
  if ([contractorName, contractorCompany, supervisingEntity, engineerName].some((value) => value.length > 200)) {
    return { error: 'أسماء المقاول والجهة المشرفة والمهندس لا تتجاوز 200 حرف.' }
  }
  if (delayReasons.length > 2000) return { error: 'أسباب التأخير لا تتجاوز 2000 حرف.' }
  for (const [label, value] of [
    ['المخطط', input.planned_completion_percentage],
    ['الفعلي', input.actual_completion_percentage],
    ['المالي', input.financial_completion_percentage],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return { error: `نسبة الإنجاز ${label} يجب أن تكون بين 0 و100.` }
    }
  }
  if (input.area_size > 1_000_000_000 || input.estimated_budget > 1_000_000_000_000_000) {
    return { error: 'المساحة أو الميزانية تتجاوز الحد المسموح.' }
  }
  if ((input.latitude !== null && (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90))
    || (input.longitude !== null && (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180))
    || ((input.latitude === null) !== (input.longitude === null))) {
    return { error: 'أدخل خطي عرض وطول صالحين معاً، أو اتركهما فارغين.' }
  }

  const { data: projectCode, error: codeError } = await context.client.rpc(
    'next_development_project_code',
    { p_year: new Date().getFullYear() },
  )
  if (codeError) return { error: `تعذر إنشاء كود المشروع: ${codeError.message}` }

  const { data, error } = await context.client
    .from('development_projects')
    .insert({
      project_code: projectCode,
      project_name: projectName,
      sector: input.sector,
      municipality,
      location_details: typeof input.location_details === 'string' ? input.location_details.trim() || null : null,
      area_size: input.area_size,
      estimated_budget: input.estimated_budget,
      completion_percentage: input.completion_percentage,
      start_date: startDate,
      end_date: endDate,
      contractor_name: contractorName || null,
      contractor_company: contractorCompany || null,
      supervising_entity: supervisingEntity || null,
      engineer_name: engineerName || null,
      planned_completion_percentage: input.planned_completion_percentage,
      actual_completion_percentage: input.actual_completion_percentage,
      financial_completion_percentage: input.financial_completion_percentage,
      delay_reasons: delayReasons || null,
      latitude: input.latitude,
      longitude: input.longitude,
      funding_source: fundingSource,
      priority_level: input.priority_level,
      status: input.status,
      required_intervention: typeof input.required_intervention === 'string' ? input.required_intervention.trim() || null : null,
      description: typeof input.description === 'string' ? input.description.trim() || null : null,
    })
    .select('*')
    .single()

  if (error) return { error: `تعذر حفظ المشروع: ${error.message}` }
  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard/projects/database')
  return { success: true, project: data }
}

export async function getProjects(
  filters: ProjectFilters = {},
): Promise<{ projects: DevelopmentProject[] } | { error: string }> {
  if (!filters || typeof filters !== 'object') return { error: 'فلاتر المشاريع غير صالحة.' }
  if (filters.sector && !isValidChoice(filters.sector, projectSectors)) return { error: 'فلتر القطاع غير صالح.' }
  if (filters.status && !isValidChoice(filters.status, projectStatuses)) return { error: 'فلتر الحالة غير صالح.' }
  if (filters.priority && !isValidChoice(filters.priority, projectPriorities)) return { error: 'فلتر الأولوية غير صالح.' }
  if (filters.municipality && (typeof filters.municipality !== 'string' || filters.municipality.length > 150)) {
    return { error: 'فلتر البلدية غير صالح.' }
  }

  const context = await getAuthorizedAdminClient()
  if ('error' in context) return context
  let query = context.client
    .from('development_projects')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id')
  if (filters.sector) query = query.eq('sector', filters.sector)
  if (filters.municipality) query = query.eq('municipality', filters.municipality)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority_level', filters.priority)

  const projects: DevelopmentProject[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await query.range(offset, offset + 999)
    if (error) return { error: `تعذر جلب المشاريع: ${error.message}` }
    projects.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return { projects }
}

export async function getProjectsStats(): Promise<
  { stats: ProjectStats } | { error: string }
> {
  const context = await getAuthorizedAdminClient()
  if ('error' in context) return context

  const stats: ProjectStats = {
    ...emptyStats,
    projectsByStatus: emptyStats.projectsByStatus.map((item) => ({ ...item })),
    budgetBySector: emptyStats.budgetBySector.map((item) => ({ ...item })),
    municipalitiesRanked: [],
    latestProjects: [],
    urgentProjects: [],
  }
  const statusCounts = new Map(stats.projectsByStatus.map((item) => [item.status, item]))
  const sectorBudgets = new Map(stats.budgetBySector.map((item) => [item.sector, item]))
  const municipalityCounts = new Map<string, number>()
  let totalCompletionPercentage = 0

  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await context.client
      .from('development_projects')
      .select('sector, area_size, estimated_budget, status, municipality, completion_percentage, end_date')
      .eq('is_verified', true)
      .order('id')
      .range(offset, offset + 999)
    if (error) return { error: `تعذر جلب إحصاءات المشاريع الموثقة: ${error.message}` }

    for (const project of data ?? []) {
      stats.totalProjects += 1
      if (project.sector === 'زراعة') stats.agriculturalArea += Number(project.area_size) || 0
      if (project.status === 'متوقف') stats.stoppedProjects += 1
      const budget = Number(project.estimated_budget) || 0
      stats.totalBudget += budget
      const sectorBudget = sectorBudgets.get(project.sector)
      if (sectorBudget) sectorBudget.budget += budget
      const statusCount = statusCounts.get(project.status)
      if (statusCount) statusCount.count += 1
      if (project.status === 'قيد التنفيذ') stats.inProgressProjects += 1
      if (project.status === 'منجز') stats.completedProjects += 1
      if (project.end_date && project.status !== 'منجز' && project.end_date < new Date().toISOString().slice(0, 10)) {
        stats.overdueProjects += 1
      }
      totalCompletionPercentage += Number(project.completion_percentage) || 0
      municipalityCounts.set(project.municipality, (municipalityCounts.get(project.municipality) ?? 0) + 1)
    }
    if (!data || data.length < 1000) break
  }

  const [latestResult, urgentResult, landsResult, opportunitiesResult] = await Promise.all([
    context.client
      .from('development_projects')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id')
      .limit(5),
    context.client
      .from('development_projects')
      .select('*')
      .or('priority_level.eq.حرجة,status.eq.متوقف')
      .order('created_at', { ascending: false })
      .limit(50),
    context.client
      .from('agricultural_lands')
      .select('id', { count: 'exact', head: true }),
    context.client
      .from('investment_opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'متاحة'),
  ])
  if (latestResult.error) return { error: `تعذر جلب أحدث المشاريع: ${latestResult.error.message}` }
  if (urgentResult.error) return { error: `تعذر جلب المشاريع العاجلة: ${urgentResult.error.message}` }
  if (landsResult.error) return { error: `تعذر جلب عدد الأراضي الزراعية: ${landsResult.error.message}` }
  if (opportunitiesResult.error) return { error: `تعذر جلب فرص الاستثمار: ${opportunitiesResult.error.message}` }

  stats.municipalitiesRanked = [...municipalityCounts.entries()]
    .map(([municipality, count]) => ({ municipality, count }))
    .sort((first, second) => second.count - first.count || first.municipality.localeCompare(second.municipality, 'ar'))
  stats.latestProjects = latestResult.data ?? []
  stats.agriculturalLandCount = landsResult.count ?? 0
  stats.investmentOpportunitiesCount = opportunitiesResult.count ?? 0
  stats.geographicDistribution = municipalityCounts.size
  stats.overallCompletionPercentage = stats.totalProjects
    ? totalCompletionPercentage / stats.totalProjects
    : 0
  stats.urgentProjects = (urgentResult.data ?? [])
    .sort((first, second) => {
      const priorityDifference = Number(second.priority_level === 'حرجة') - Number(first.priority_level === 'حرجة')
      if (priorityDifference) return priorityDifference
      const stoppedDifference = Number(second.status === 'متوقف') - Number(first.status === 'متوقف')
      if (stoppedDifference) return stoppedDifference
      return Date.parse(second.created_at) - Date.parse(first.created_at)
    })
    .slice(0, 8)
  return { stats }
}
