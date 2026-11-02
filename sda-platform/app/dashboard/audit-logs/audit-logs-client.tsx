'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { getAuditLogs, type AuditLog } from '@/app/actions/get-audit-logs'

const actionLabels = { add: 'إضافة', update: 'تعديل', delete: 'حذف' } as const

export default function AuditLogsClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [logs, setLogs] = useState(initialLogs)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const applyFilters = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('')
    try {
      const result = await getAuditLogs({ from, to, search })
      if ('error' in result) setErrorMessage(result.error)
      else setLogs(result.logs)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر البحث في سجل العمليات.')
    } finally {
      setLoading(false)
    }
  }

  const exportLogs = () => {
    const rows = logs.map((log) => ({
      'التاريخ': new Date(log.created_at).toLocaleString('ar-LY'),
      'المستخدم': log.actor_name || log.actor_email || log.actor_id || '-',
      'نوع الحركة': actionLabels[log.action] ?? log.action,
      'التفاصيل': log.details,
      'عنوان IP': log.ip_address || '-',
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل العمليات')
    XLSX.writeFile(workbook, 'audit-logs.xlsx')
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between rounded-xl border-r-8 border-[#157A3F] bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-[#157A3F]">سجل العمليات</h1>
            <p className="mt-1 text-sm text-gray-500">سجل تدقيق للقراءة فقط ({logs.length} حركة معروضة)</p>
          </div>
          <Link href="/dashboard" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700">لوحة التحكم</Link>
        </header>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <form onSubmit={applyFilters} className="mb-5 grid gap-3 border-b pb-5 md:grid-cols-4">
            <label className="text-sm font-medium">
              من تاريخ
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <label className="text-sm font-medium">
              إلى تاريخ
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <label className="text-sm font-medium">
              اسم أو بريد المستخدم
              <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={loading} className="rounded-lg bg-[#157A3F] px-4 py-2 font-bold text-white disabled:opacity-60">
                {loading ? 'جارٍ البحث...' : 'تطبيق الفلاتر'}
              </button>
              <button type="button" onClick={exportLogs} disabled={!logs.length} className="rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-700 disabled:opacity-50">
                تصدير إلى Excel
              </button>
            </div>
          </form>

          {errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{errorMessage}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">المستخدم</th>
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3">التفاصيل</th>
                  <th className="p-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap p-3">{new Date(log.created_at).toLocaleString('ar-LY')}</td>
                    <td className="p-3">{log.actor_name || log.actor_email || log.actor_id || '-'}</td>
                    <td className="p-3">{actionLabels[log.action] ?? log.action}</td>
                    <td className="p-3">{log.details}</td>
                    <td className="p-3 font-mono" dir="ltr">{log.ip_address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!logs.length && <p className="py-8 text-center text-gray-500">لا توجد حركات مطابقة للفلاتر.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
