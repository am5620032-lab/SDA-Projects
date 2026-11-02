'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { exportAdminBackup } from '@/app/actions/admin-backup'

interface ExportMetadata {
  exportedAt: string
  sizeBytes: number
}

const storageKey = 'sda-admin-last-backup-export'

export default function BackupClient() {
  const [metadata, setMetadata] = useState<ExportMetadata | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedMetadata = window.localStorage.getItem(storageKey)
      if (!savedMetadata) return
      try {
        const parsed = JSON.parse(savedMetadata) as ExportMetadata
        if (typeof parsed.exportedAt === 'string' && typeof parsed.sizeBytes === 'number') {
          setMetadata(parsed)
        }
      } catch (error) {
        console.error('Could not read backup export metadata:', error)
        window.localStorage.removeItem(storageKey)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const exportBackup = async () => {
    setExporting(true)
    setErrorMessage('')
    try {
      const result = await exportAdminBackup()
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      const json = JSON.stringify(result.data, null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sda-backup-${result.data.exported_at.slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      const nextMetadata = { exportedAt: result.data.exported_at, sizeBytes: blob.size }
      setMetadata(nextMetadata)
      window.localStorage.setItem(storageKey, JSON.stringify(nextMetadata))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تصدير النسخة الاحتياطية.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between rounded-xl border-r-8 border-[#157A3F] bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-[#157A3F]">النسخ الاحتياطي</h1>
            <p className="mt-1 text-sm text-gray-500">تصدير بيانات المنظومة الأساسية</p>
          </div>
          <Link href="/dashboard" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700">لوحة التحكم</Link>
        </header>

        <section className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
          <p className="rounded-lg border border-blue-200 bg-blue-50 p-4 leading-7 text-blue-900">
            يتم أخذ نسخة احتياطية كاملة يومياً تلقائياً من قبل Supabase (Point-in-Time Recovery).
          </p>
          <p className="text-sm leading-6 text-gray-600">
            النسخة اليدوية تتضمن بيانات الموظفين والإجازات والحضور ووثائق الأرشيف، وتُنزّل على جهازك بصيغة JSON.
            احفظ الملف في موقع آمن ومقيّد الوصول.
          </p>
          <button
            type="button"
            onClick={exportBackup}
            disabled={exporting}
            className="rounded-lg bg-[#157A3F] px-5 py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {exporting ? 'جارٍ تجهيز النسخة...' : 'تصدير نسخة احتياطية يدوية (JSON)'}
          </button>
          {errorMessage && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{errorMessage}</p>}
          <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">آخر عملية تصدير على هذا الجهاز</p>
              <p className="mt-1 font-semibold">{metadata ? new Date(metadata.exportedAt).toLocaleString('ar-LY') : 'لا توجد عملية تصدير محفوظة'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">حجم آخر ملف مُصدّر</p>
              <p className="mt-1 font-semibold">{metadata ? `${(metadata.sizeBytes / 1024).toFixed(1)} KB` : '-'}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
