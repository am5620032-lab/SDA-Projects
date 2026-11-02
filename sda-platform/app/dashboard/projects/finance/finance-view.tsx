'use client'

import { Banknote, CircleAlert, Wallet } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FinanceRow } from '../strategic-actions'

const formatNumber = (value: number) => new Intl.NumberFormat('ar-LY', { maximumFractionDigits: 1 }).format(value)

export default function FinanceView({ rows, error }: { rows: FinanceRow[]; error: string }) {
  const chartData = rows.map((row) => ({
    name: row.project_code,
    'الإنجاز المالي': row.approved_budget ? Math.round((row.amount_spent / row.approved_budget) * 1000) / 10 : 0,
    'الإنجاز الفني': row.technical_completion,
  }))
  const totals = rows.reduce((summary, row) => ({
    approved: summary.approved + row.approved_budget,
    spent: summary.spent + row.amount_spent,
    obligations: summary.obligations + row.financial_obligations,
  }), { approved: 0, spent: 0, obligations: 0 })

  return (
    <main dir="rtl" className="min-h-full p-5 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6">
          <p className="text-sm font-bold text-emerald-700">منظومة الجنوب الاستراتيجية</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">إدارة الميزانيات والتمويل</h1>
          <p className="mt-2 text-sm text-slate-500">مقارنة الاعتمادات المالية بالصرف والإنجاز الفني للمشاريع.</p>
        </header>
        {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><CircleAlert size={18} />{error}</p>}
        <section aria-label="ملخص مالي" className="mb-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'الميزانية المعتمدة', value: totals.approved, icon: Banknote },
            { label: 'المصروف الفعلي', value: totals.spent, icon: Wallet },
            { label: 'الالتزامات المالية', value: totals.obligations, icon: Banknote },
          ].map(({ label, value, icon: Icon }) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-500">{label}<Icon size={19} className="text-emerald-700" aria-hidden="true" /></div>
              <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{value ? formatNumber(value) : 'لم يتم إدخال بيانات بعد'} <span className="text-sm font-medium text-slate-400">{value ? 'د.ل' : ''}</span></p>
            </article>
          ))}
        </section>
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-bold text-slate-900">الإنجاز المالي والفني</h2>
          <p className="mb-4 text-xs text-slate-500">نسبة المصروف إلى الميزانية المعتمدة مقارنة بنسبة الإنجاز الفني.</p>
          <div className="h-80">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 8 }}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip formatter={(value) => `${formatNumber(Number(value))}%`} />
                  <Legend />
                  <Bar dataKey="الإنجاز المالي" fill="#0ea5e9" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="الإنجاز الفني" fill="#10b981" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">لا توجد سجلات مالية مرتبطة بالمشاريع.</div>}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 p-5 font-bold text-slate-900">تفاصيل الميزانيات</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['المشروع', 'المعتمد', 'قيمة العقد', 'المصروف الفعلي', 'الالتزامات', 'المتبقي'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const remaining = row.approved_budget - row.amount_spent
                  return <tr key={row.project_id}>
                    <td className="px-4 py-4"><p className="font-bold text-slate-800">{row.project_name}</p><p className="mt-1 font-mono text-xs text-slate-400" dir="ltr">{row.project_code}</p></td>
                    <td className="px-4 py-4 tabular-nums">{formatNumber(row.approved_budget)}</td>
                    <td className="px-4 py-4 tabular-nums">{formatNumber(row.contract_value)}</td>
                    <td className="px-4 py-4 tabular-nums">{formatNumber(row.amount_spent)}</td>
                    <td className="px-4 py-4 tabular-nums">{formatNumber(row.financial_obligations)}</td>
                    <td className={`px-4 py-4 font-bold tabular-nums ${remaining < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatNumber(remaining)}</td>
                  </tr>
                })}
              </tbody>
            </table>
            {!rows.length && <p className="p-12 text-center text-sm text-slate-500">لم يتم إدخال بيانات مالية بعد.</p>}
          </div>
        </section>
      </div>
    </main>
  )
}
