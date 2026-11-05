'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient, getAuthenticatedActor } from '@/app/actions/server-auth'

const authorizedRoles = ['president', 'vice_president', 'admin_manager', 'it_manager']

async function getContractsContext() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!authorizedRoles.includes(actorResult.actor.role)) return { error: 'ليس لديك صلاحية الوصول إلى العقود.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult
  return { client: adminResult.client }
}

export interface ContractRow {
  id: string
  contract_number: string
  contractor_name: string
  project_id: string | null
  value: number
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
  project_name: string | null
  project_code: string | null
}

export async function getContracts(): Promise<{ rows: ContractRow[] } | { error: string }> {
  const context = await getContractsContext()
  if ('error' in context) return context

  const [contractsResult, projectsResult] = await Promise.all([
    context.client.from('contracts').select('*').order('created_at', { ascending: false }),
    context.client.from('development_projects').select('id, project_name, project_code'),
  ])
  if (contractsResult.error) return { error: `تعذر جلب العقود: ${contractsResult.error.message}` }
  if (projectsResult.error) return { error: `تعذر جلب المشاريع المرتبطة بالعقود: ${projectsResult.error.message}` }

  const projectsById = new Map((projectsResult.data ?? []).map((project) => [project.id, project]))
  return {
    rows: (contractsResult.data ?? []).map((contract) => {
      const project = contract.project_id ? projectsById.get(contract.project_id) : undefined
      return {
        ...contract,
        project_name: project?.project_name ?? null,
        project_code: project?.project_code ?? null,
      }
    }),
  }
}

export async function createContract(formData: FormData): Promise<{ success: true } | { error: string }> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['admin_manager', 'it_manager'].includes(actorResult.actor.role)) {
    return { error: 'يقتصر تسجيل العقود على مديري النظام.' }
  }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return adminResult

  const contractNumber = String(formData.get('contract_number') ?? '').trim()
  const contractorName = String(formData.get('contractor_name') ?? '').trim()
  const projectId = String(formData.get('project_id') ?? '')
  const value = Number(formData.get('value'))
  const startDate = String(formData.get('start_date') ?? '')
  const endDate = String(formData.get('end_date') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!contractNumber || contractNumber.length > 100) return { error: 'رقم العقد مطلوب ولا يتجاوز 100 حرف.' }
  if (!contractorName || contractorName.length > 200) return { error: 'اسم المقاول أو الشركة مطلوب ولا يتجاوز 200 حرف.' }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
    return { error: 'اختر مشروعاً صالحاً.' }
  }
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000_000_000) {
    return { error: 'قيمة العقد غير صالحة.' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    || Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate)) || endDate < startDate) {
    return { error: 'تاريخا البداية والنهاية غير صالحين.' }
  }
  if (!['مسودة', 'قيد التنفيذ', 'مكتمل', 'ملغي'].includes(status)) return { error: 'حالة العقد غير صالحة.' }

  const { data: project, error: projectError } = await adminResult.client
    .from('development_projects')
    .select('id')
    .eq('id', projectId)
    .maybeSingle()
  if (projectError) return { error: `تعذر التحقق من المشروع: ${projectError.message}` }
  if (!project) return { error: 'المشروع المحدد غير موجود.' }

  const { error } = await adminResult.client.from('contracts').insert({
    contract_number: contractNumber,
    contractor_name: contractorName,
    project_id: projectId,
    value,
    start_date: startDate,
    end_date: endDate,
    status,
  })
  if (error) return { error: `تعذر تسجيل العقد: ${error.message}` }
  revalidatePath('/dashboard/projects/contracts')
  return { success: true }
}
