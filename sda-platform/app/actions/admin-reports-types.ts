export interface AdminReportsData {
  employeesByDepartment: { name: string; employees: number }[]
  attendanceByDay: { date: string; present: number; absent: number }[]
  leaveStatuses: { name: string; value: number; status: string }[]
}

export const emptyAdminReportsData: AdminReportsData = {
  employeesByDepartment: [],
  attendanceByDay: [],
  leaveStatuses: [
    { name: 'مقبولة', value: 0, status: 'مقبولة' },
    { name: 'مرفوضة', value: 0, status: 'مرفوضة' },
    { name: 'معلقة', value: 0, status: 'معلقة' },
  ],
}
