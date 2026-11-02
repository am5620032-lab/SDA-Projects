'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getHrReportData,
  getPromotionEligibleEmployees,
  type HrReportKind,
  type HrReportRow,
  type PromotionEligibleEmployee,
} from './actions'

const reports: { value: HrReportKind; label: string }[] = [
  { value: 'employees', label: 'كشف الموظفين' },
  { value: 'attendance', label: 'كشف الحضور' },
  { value: 'leaves', label: 'كشف الإجازات' },
]

export default function EmployeesReportsPage() {
  const [kind, setKind] = useState<HrReportKind>('employees')
  const [title, setTitle] = useState('كشف الموظفين')
  const [rows, setRows] = useState<HrReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [eligibleEmployees, setEligibleEmployees] = useState<PromotionEligibleEmployee[]>([])
  const [eligibilityLoading, setEligibilityLoading] = useState(true)
  const [eligibilityError, setEligibilityError] = useState('')

  const loadEligibility = useCallback(async () => {
    try {
      const result = await getPromotionEligibleEmployees()
      if ('error' in result) throw new Error(result.error)
      setEligibleEmployees(result.data)
    } catch (loadError) {
      setEligibilityError(loadError instanceof Error ? loadError.message : 'تعذر تحميل قائمة المستحقين للترقية.')
    } finally {
      setEligibilityLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(loadEligibility) }, [loadEligibility])

  const loadReport = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getHrReportData(kind)
      if ('error' in result) throw new Error(result.error)
      setTitle(result.title)
      setRows(result.rows)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل التقرير.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const exportExcel = async () => {
    if (rows.length === 0) return
    const XLSX = await import('xlsx')
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31))
    XLSX.writeFile(workbook, `${title}.xlsx`)
  }

  const printPdf = async () => {
    if (rows.length === 0) return
    window.print()
  }

  const columns = rows[0] ? Object.keys(rows[0]) : []

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-blue-700 bg-white p-6 shadow-sm print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">تقارير شؤون الموظفين</h1>
            <p className="mt-1 text-sm text-gray-500">عرض وتصدير كشوف الموظفين والحضور والإجازات</p>
          </div>
          <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة للموظفين</Link>
        </header>

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm print:hidden">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <label className="text-sm font-bold">نوع التقرير
              <select value={kind} onChange={(event) => { setKind(event.target.value as HrReportKind); setRows([]); setError('') }} className="mt-1 w-full rounded-lg border p-3">
                {reports.map((report) => <option key={report.value} value={report.value}>{report.label}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void loadReport()} disabled={loading} className="self-end rounded-lg bg-blue-700 px-6 py-3 font-bold text-white disabled:opacity-50">
              {loading ? 'جارٍ التحميل...' : 'عرض التقرير'}
            </button>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void exportExcel()} disabled={loading || rows.length === 0} className="rounded-lg bg-emerald-700 px-5 py-2 font-bold text-white disabled:opacity-50">تصدير Excel</button>
            <button type="button" onClick={() => void printPdf()} disabled={loading || rows.length === 0} className="rounded-lg bg-gray-800 px-5 py-2 font-bold text-white disabled:opacity-50">طباعة / حفظ PDF</button>
          </div>
          <p className="mt-2 text-xs text-gray-500">يستخدم PDF نافذة الطباعة في المتصفح للحفاظ على ظهور النص العربي بشكل صحيح.</p>
        </section>

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-amber-700">المستحقون للترقية</h2>
          <p className="mb-4 text-sm text-gray-500">استحقاق أولي بعد إكمال أربع سنوات من التعيين أو آخر ترقية؛ يخضع للمراجعة وفق اللوائح المعتمدة.</p>
          {eligibilityError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{eligibilityError}</p>}
          {eligibilityLoading ? <p className="py-4 text-gray-500">جارٍ فحص مدد الخدمة...</p> : eligibleEmployees.length === 0 ? (
            <p className="py-4 text-gray-500">لا يوجد موظفون مستحقون وفق معيار السنوات الأربع حالياً.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-right text-sm">
                <thead className="bg-amber-50 text-gray-700">
                  <tr><th className="p-3">الموظف</th><th className="p-3">المسمى الوظيفي</th><th className="p-3">تاريخ التعيين</th><th className="p-3">آخر ترقية</th><th className="p-3">تاريخ الاستحقاق</th><th className="p-3">آخر تقييم معتمد</th></tr>
                </thead>
                <tbody>{eligibleEmployees.map((employee) => (
                  <tr key={employee.id} className="border-t">
                    <td className="p-3 font-semibold">{employee.full_name}</td>
                    <td className="p-3">{employee.job_title || '—'}</td>
                    <td className="p-3">{employee.hire_date || '—'}</td>
                    <td className="p-3">{employee.last_promotion_date || 'لا توجد ترقية سابقة'}</td>
                    <td className="p-3">{employee.eligible_since}</td>
                    <td className="p-3">{employee.latest_evaluation_score === null ? 'لا يوجد تقييم معتمد' : `${employee.latest_evaluation_score} / 100`}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm print:rounded-none print:p-0 print:shadow-none">
          <div className="mb-5 hidden text-center print:block">
            <p className="font-bold">دولة ليبيا — جهاز تنمية وتطوير الجنوب</p>
            <h2 className="mt-2 text-xl font-black">{title}</h2>
            <p className="mt-1 text-sm">{new Date().toLocaleDateString('ar-LY')}</p>
          </div>
          <h2 className="mb-4 text-lg font-bold print:hidden">{title} ({rows.length})</h2>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-gray-500">{loading ? 'جارٍ تحميل التقرير...' : 'اختر نوع التقرير ثم اضغط «عرض التقرير».'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-right text-sm">
                <thead><tr className="bg-gray-50 print:bg-gray-100">{columns.map((column) => <th key={column} className="border p-2">{column}</th>)}</tr></thead>
                <tbody>{rows.map((row, index) => (
                  <tr key={index} className="odd:bg-white even:bg-gray-50 print:break-inside-avoid">
                    {columns.map((column) => <td key={column} className="border p-2">{row[column] ?? '-'}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <style jsx global>{`
        @media print {
          aside, nav, header a, button { display: none !important; }
          main { background: white !important; }
        }
      `}</style>
    </main>
  )
}
