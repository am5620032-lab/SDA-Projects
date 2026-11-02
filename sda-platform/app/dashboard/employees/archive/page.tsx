'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  getEmployeeArchiveData,
  uploadEmployeeDocument,
  type ArchiveEmployeeOption,
  type EmployeeDocument,
} from './actions'

export default function EmployeeArchivePage() {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([])
  const [employees, setEmployees] = useState<ArchiveEmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    const result = await getEmployeeArchiveData()
    if ('error' in result) throw new Error(result.error)
    setDocuments(result.documents)
    setEmployees(result.employees)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        await refresh()
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل أرشيف الموظفين.')
      } finally {
        setLoading(false)
      }
    })
  }, [refresh])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!employeeId || !documentType.trim() || !file) {
      setError('يرجى استكمال الموظف ونوع المستند واختيار الملف.')
      return
    }
    setUploading(true)
    setError('')
    setNotice('')
    try {
      const formData = new FormData()
      formData.set('employee_id', employeeId)
      formData.set('document_type', documentType)
      formData.set('file', file)
      const result = await uploadEmployeeDocument(formData)
      if ('error' in result) throw new Error(result.error)
      setEmployeeId('')
      setDocumentType('')
      setFile(null)
      const fileInput = document.getElementById('employee-document-file')
      if (fileInput instanceof HTMLInputElement) fileInput.value = ''
      await refresh()
      setNotice('تم رفع المستند وربطه بملف الموظف بنجاح.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع المستند.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-violet-700 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-violet-800">أرشيف ملفات الموظفين</h1>
            <p className="mt-1 text-sm text-gray-500">مستندات PDF والصور محفوظة في مخزن خاص ومرتبطة بملف الموظف</p>
          </div>
          <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة للموظفين</Link>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">رفع مستند للموظف</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">الموظف
              <select required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
                <option value="">اختر الموظف</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">نوع المستند
              <input required maxLength={100} value={documentType} onChange={(event) => setDocumentType(event.target.value)} placeholder="قرار تعيين، مؤهل علمي..." className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm font-semibold md:col-span-2">ملف PDF أو صورة (حتى 15 ميغابايت)
              <input id="employee-document-file" required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-1 w-full rounded-lg border p-2" />
            </label>
            <button disabled={uploading} className="rounded-lg bg-violet-700 px-5 py-3 font-bold text-white disabled:opacity-50 md:col-span-2">
              {uploading ? 'جارٍ رفع المستند...' : 'رفع وربط بالموظف'}
            </button>
          </form>
        </section>

        <section className="overflow-x-auto rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">المستندات المؤرشفة ({documents.length})</h2>
          {loading ? <p className="py-8 text-center text-gray-500">جاري تحميل الأرشيف...</p> : documents.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا توجد مستندات مؤرشفة بعد.</p>
          ) : (
            <table className="w-full min-w-[650px] text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr><th className="p-3">الموظف</th><th className="p-3">نوع المستند</th><th className="p-3">اسم الملف</th><th className="p-3">تاريخ الرفع</th><th className="p-3">الملف</th></tr>
              </thead>
              <tbody>{documents.map((document) => (
                <tr key={document.id} className="border-t">
                  <td className="p-3 font-semibold">{document.employee_name}</td>
                  <td className="p-3">{document.document_type}</td>
                  <td className="p-3">{document.file_name}</td>
                  <td className="p-3">{new Date(document.created_at).toLocaleDateString('ar-LY')}</td>
                  <td className="p-3"><a href={document.download_url} target="_blank" rel="noreferrer" className="font-bold text-violet-700 hover:underline">عرض / تحميل</a></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  )
}
