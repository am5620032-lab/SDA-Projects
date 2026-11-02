'use server'

import { getHrEmployeeId } from '@/app/actions/hr-session'
import { createSupabaseAdminClient, type AdminDatabase } from '@/app/actions/server-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AttendanceEmployee {
  id: string
  full_name: string
}

export interface AttendanceRecord {
  id: string
  employee_id: string
  check_in: string
  check_out: string | null
  status: string | null
  late_minutes: number
  employees: { full_name: string } | null
}

type AttendanceResult<T> = { data: T } | { error: string }

function getTripoliDayRange() {
  const timeZone = 'Africa/Tripoli'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const midnightUtc = (date: string) => {
    const utcGuess = new Date(`${date}T00:00:00Z`)
    const localParts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(utcGuess)
    const value = (type: string) => Number(localParts.find((item) => item.type === type)?.value)
    const localAsUtc = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'))
    return new Date(utcGuess.getTime() - (localAsUtc - utcGuess.getTime()))
  }
  const nextDay = new Date(`${today}T00:00:00Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  return {
    start: midnightUtc(today).toISOString(),
    end: midnightUtc(nextDay.toISOString().slice(0, 10)).toISOString(),
  }
}

function getLateMinutes(checkIn: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Tripoli',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(checkIn)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return Math.max(0, hour * 60 + minute - 8 * 60)
}

type AttendanceContext = { employeeId: string; client: SupabaseClient<AdminDatabase> } | { error: string }

async function getContext(): Promise<AttendanceContext> {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) return { error: 'سجّل الدخول إلى منظومة شؤون الموظفين أولاً.' }
  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) return { error: adminResult.error }
  return { employeeId, client: adminResult.client }
}

export async function getAttendanceDashboardData(): Promise<AttendanceResult<{
  employee: AttendanceEmployee
  todayRecord: AttendanceRecord | null
  attendance: AttendanceRecord[]
}>> {
  const context = await getContext()
  if ('error' in context) return context

  const { data: employee, error: employeeError } = await context.client.from('employees')
    .select('id, full_name')
    .eq('id', context.employeeId)
    .maybeSingle()
  if (employeeError) return { error: `تعذر جلب بيانات الموظف: ${employeeError.message}` }
  if (!employee) return { error: 'حساب منظومة الموظفين غير مرتبط بموظف.' }

  const { start, end } = getTripoliDayRange()
  const [todayResult, firstPage] = await Promise.all([
    context.client.from('attendance')
      .select('id, employee_id, check_in, check_out, status, late_minutes')
      .eq('employee_id', employee.id)
      .gte('check_in', start)
      .lt('check_in', end)
      .order('check_in', { ascending: false })
      .limit(1)
      .maybeSingle(),
    context.client.from('attendance')
      .select('id, employee_id, check_in, check_out, status, late_minutes')
      .order('check_in', { ascending: false })
      .range(0, 999),
  ])
  if (todayResult.error) return { error: `تعذر جلب حضور اليوم: ${todayResult.error.message}` }
  if (firstPage.error) return { error: `تعذر جلب سجل الحضور: ${firstPage.error.message}` }

  const records = firstPage.data ?? []
  for (let from = 1000; records.length >= from; from += 1000) {
    const { data, error } = await context.client.from('attendance')
      .select('id, employee_id, check_in, check_out, status, late_minutes')
      .order('check_in', { ascending: false })
      .range(from, from + 999)
    if (error) return { error: `تعذر استكمال سجل الحضور: ${error.message}` }
    records.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  const employeeIds = [...new Set(records.map((record) => record.employee_id))]
  const employeeNames = new Map<string, string>([[employee.id, employee.full_name]])
  for (let index = 0; index < employeeIds.length; index += 500) {
    const { data, error } = await context.client.from('employees')
      .select('id, full_name')
      .in('id', employeeIds.slice(index, index + 500))
    if (error) return { error: `تعذر جلب أسماء الموظفين للحضور: ${error.message}` }
    for (const row of data ?? []) employeeNames.set(row.id, row.full_name)
  }
  const toRecord = (record: (typeof records)[number]): AttendanceRecord => ({
    ...record,
    late_minutes: record.late_minutes ?? 0,
    employees: { full_name: employeeNames.get(record.employee_id) ?? 'غير محدد' },
  })

  return {
    data: {
      employee,
      todayRecord: todayResult.data ? toRecord(todayResult.data) : null,
      attendance: records.map(toRecord),
    },
  }
}

export async function recordAttendance(): Promise<{ success: true } | { error: string }> {
  const context = await getContext()
  if ('error' in context) return context
  const { start, end } = getTripoliDayRange()
  const { data: existing, error: lookupError } = await context.client.from('attendance')
    .select('id')
    .eq('employee_id', context.employeeId)
    .gte('check_in', start)
    .lt('check_in', end)
    .limit(1)
    .maybeSingle()
  if (lookupError) return { error: `تعذر التحقق من حضور اليوم: ${lookupError.message}` }
  if (existing) return { error: 'لقد سجلت حضورك اليوم بالفعل.' }

  const checkIn = new Date()
  const { error } = await context.client.from('attendance').insert({
    employee_id: context.employeeId,
    check_in: checkIn.toISOString(),
    status: 'present',
    late_minutes: getLateMinutes(checkIn),
  })
  if (error) return { error: `تعذر تسجيل الحضور: ${error.message}` }
  return { success: true }
}

export async function recordAttendanceCheckout(attendanceId: string): Promise<{ success: true } | { error: string }> {
  const context = await getContext()
  if ('error' in context) return context
  if (!attendanceId) return { error: 'سجل الحضور غير محدد.' }
  const { start, end } = getTripoliDayRange()
  const { data, error } = await context.client.from('attendance')
    .update({ check_out: new Date().toISOString() })
    .eq('id', attendanceId)
    .eq('employee_id', context.employeeId)
    .gte('check_in', start)
    .lt('check_in', end)
    .is('check_out', null)
    .select('id')
    .maybeSingle()
  if (error) return { error: `تعذر تسجيل الانصراف: ${error.message}` }
  if (!data) return { error: 'تم تسجيل الانصراف مسبقاً أو أن السجل غير تابع لحسابك.' }
  return { success: true }
}
