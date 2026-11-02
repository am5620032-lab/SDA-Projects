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
}

export interface ProjectStats {
  totalProjects: number
  agriculturalArea: number
  stoppedProjects: number
  totalBudget: number
}

const emptyStats: ProjectStats = {
  totalProjects: 0,
  agriculturalArea: 0,
  stoppedProjects: 0,
  totalBudget: 0,
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

async function fetchAllProjects() {
  const context = await getAuthorizedAdminClient()
  if ('error' in context) return context

  const projects: DevelopmentProject[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await context.client
      .from('development_projects')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id')
      .range(offset, offset + 999)
    if (error) return { error: `تعذر جلب المشاريع: ${error.message}` }
    projects.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return { projects }
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
  if (input.area_size > 1_000_000_000 || input.estimated_budget > 1_000_000_000_000_000) {
    return { error: 'المساحة أو الميزانية تتجاوز الحد المسموح.' }
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
  const result = await fetchAllProjects()
  if ('error' in result) return result
  const stats = result.projects.reduce<ProjectStats>((total, project) => {
    total.totalProjects += 1
    if (project.sector === 'زراعة') total.agriculturalArea += Number(project.area_size) || 0
    if (project.status === 'متوقف') total.stoppedProjects += 1
    total.totalBudget += Number(project.estimated_budget) || 0
    return total
  }, { ...emptyStats })
  return { stats }
}
