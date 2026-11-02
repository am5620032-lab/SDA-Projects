'use server'

import { createSupabaseAdminClient, getAuthenticatedActor } from './server-auth'
import { emptyAdminReportsData, type AdminReportsData } from './admin-reports-types'

async function fetchAllPages<T extends object>(
  fetchPage: (from: number, to: number) => Promise<{
    data: T[] | null
    error: { message: string } | null
  }>,
): Promise<{ data: T[] } | { error: string }> {
  const rows: T[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await fetchPage(offset, offset + 999)
    if (error) return { error: error.message }
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return { data: rows }
}

export async function getAdminReports(): Promise<
  { data: AdminReportsData } | { error: string }
> {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) return actorResult
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) {
    return { error: 'ليس لديك صلاحية عرض التقارير الإدارية.' }
  }

  try {
    const adminResult = createSupabaseAdminClient()
    if ('error' in adminResult) throw new Error(adminResult.error)

    const end = new Date()
    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - 29)
    start.setUTCHours(0, 0, 0, 0)
    const [employeesResult, departmentsResult, attendanceResult, leavesResult] = await Promise.all([
      fetchAllPages(async (from, to) => await adminResult.client
        .from('employees').select('department_id, department').order('id').range(from, to)),
      fetchAllPages(async (from, to) => await adminResult.client
        .from('departments').select('id, name').order('id').range(from, to)),
      fetchAllPages(async (from, to) => await adminResult.client
        .from('attendance').select('check_in, status')
        .gte('check_in', start.toISOString())
        .lte('check_in', end.toISOString())
        .order('id')
        .range(from, to)),
      fetchAllPages(async (from, to) => await adminResult.client
        .from('leaves').select('status').order('id').range(from, to)),
    ])
    if ('error' in employeesResult) throw new Error(`تعذر جلب بيانات الموظفين: ${employeesResult.error}`)
    if ('error' in departmentsResult) throw new Error(`تعذر جلب الإدارات: ${departmentsResult.error}`)
    if ('error' in attendanceResult) throw new Error(`تعذر جلب بيانات الحضور: ${attendanceResult.error}`)
    if ('error' in leavesResult) throw new Error(`تعذر جلب بيانات الإجازات: ${leavesResult.error}`)

    const departmentNames = new Map(departmentsResult.data.map((department) => [department.id, department.name]))
    const employeeCounts = new Map<string, number>()
    for (const employee of employeesResult.data) {
      const name = (employee.department_id ? departmentNames.get(employee.department_id) : null)
        || employee.department
        || 'غير محددة'
      employeeCounts.set(name, (employeeCounts.get(name) ?? 0) + 1)
    }

    const attendanceByDay = new Map<string, { present: number; absent: number }>()
    for (let offset = 0; offset < 30; offset += 1) {
      const day = new Date(start)
      day.setUTCDate(day.getUTCDate() + offset)
      attendanceByDay.set(day.toISOString().slice(0, 10), { present: 0, absent: 0 })
    }
    for (const record of attendanceResult.data) {
      const day = record.check_in.slice(0, 10)
      const counts = attendanceByDay.get(day)
      if (!counts) continue
      const normalizedStatus = (record.status ?? '').trim().toLowerCase()
      const isAbsent = normalizedStatus.includes('absent')
        || normalizedStatus.includes('absence')
        || normalizedStatus.includes('غياب')
      if (isAbsent) counts.absent += 1
      else counts.present += 1
    }

    const leaveCounts = new Map<string, number>([
      ['approved', 0],
      ['rejected', 0],
      ['pending', 0],
    ])
    for (const leave of leavesResult.data) {
      const status = (leave.status ?? '').trim().toLowerCase()
      const bucket = ['approved', 'accepted', 'مقبولة', 'مقبول'].includes(status)
        ? 'approved'
        : ['rejected', 'مرفوضة', 'مرفوض'].includes(status)
          ? 'rejected'
          : 'pending'
      leaveCounts.set(bucket, (leaveCounts.get(bucket) ?? 0) + 1)
    }

    return {
      data: {
        employeesByDepartment: [...employeeCounts.entries()]
          .map(([name, employees]) => ({ name, employees }))
          .sort((first, second) => second.employees - first.employees),
        attendanceByDay: [...attendanceByDay.entries()].map(([date, counts]) => ({ date, ...counts })),
        leaveStatuses: [
          { name: 'مقبولة', value: leaveCounts.get('approved') ?? 0, status: 'مقبولة' },
          { name: 'مرفوضة', value: leaveCounts.get('rejected') ?? 0, status: 'مرفوضة' },
          { name: 'معلقة', value: leaveCounts.get('pending') ?? 0, status: 'معلقة' },
        ],
      },
    }
  } catch (error) {
    console.error('Failed to load administrative report data:', error)
    return { data: emptyAdminReportsData }
  }
}
