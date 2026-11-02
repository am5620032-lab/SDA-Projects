'use client'

import * as XLSX from 'xlsx'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AdminReportsData } from '@/app/actions/admin-reports-types'

const leaveColors = ['#15803d', '#dc2626', '#d97706']

export default function ReportsClient({ data }: { data: AdminReportsData }) {
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(data.employeesByDepartment),
      'الموظفون حسب الإدارة',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(data.attendanceByDay),
      'الحضور والغياب',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(data.leaveStatuses),
      'الإجازات',
    )
    XLSX.writeFile(workbook, 'administrative-reports.xlsx')
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border-r-8 border-[#157A3F] bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-[#157A3F]">التقارير والإحصائيات</h1>
            <p className="mt-1 text-sm text-gray-500">بيانات إدارية مجمعة ومحدّثة من قاعدة البيانات</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button type="button" onClick={exportExcel} className="rounded-lg bg-[#157A3F] px-4 py-2 font-bold text-white">تصدير Excel</button>
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-700">تصدير PDF</button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">توزيع الموظفين على الإدارات</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.employeesByDepartment} margin={{ top: 10, right: 12, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="employees" name="عدد الموظفين" fill="#157A3F" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold">حالة الإجازات</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.leaveStatuses} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={105} label>
                    {data.leaveStatuses.map((entry, index) => <Cell key={entry.status} fill={leaveColors[index]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-1 text-lg font-bold">الحضور والغياب - آخر 30 يوماً</h2>
            <p className="mb-4 text-xs text-gray-500">يُحتسب الغياب عند وجود سجل حالة غياب صريح فقط.</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.attendanceByDay} margin={{ top: 10, right: 12, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={20} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" name="الحضور المسجل" fill="#15803d" />
                  <Bar dataKey="absent" name="الغياب المسجل" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
