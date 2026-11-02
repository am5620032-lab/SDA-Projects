'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Archive, Check, Download, Eye, FileUp, Search, ScanLine, Trash2, X } from 'lucide-react'
import { archiveLogout } from '@/app/archive/login/actions'
import { createClient } from '@/utils/supabase/client'
import {
  approveDocument,
  completeArchiveDocumentUploads,
  deleteArchiveDocument,
  getDocumentDownloadUrl,
  searchDocuments,
  uploadArchiveDocument,
  type ArchiveDocument,
  type ArchiveEmployeeOption,
  type ArchiveUploadedDocument,
} from './actions'
import type { ArchiveDepartmentOption } from './archive-departments'

interface ArchiveData {
  documents: ArchiveDocument[]
  employees: ArchiveEmployeeOption[]
  canManage: boolean
}

const documentTypes = [
  { value: 'incoming', label: 'وارد' },
  { value: 'outgoing', label: 'صادر' },
  { value: 'decision', label: 'قرار' },
  { value: 'other', label: 'أخرى' },
]

const classifications = [
  { value: 'normal', label: 'عادي' },
  { value: 'important', label: 'مهم' },
  { value: 'secret', label: 'سري' },
]

const mimeTypesByExtension: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const statusLabels: Record<string, string> = {
  pending: 'قيد المراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
}

function ArchiveHeader() {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-amber-600 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <Archive size={25} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-amber-800">الأرشيف الإلكتروني</h1>
          <p className="mt-1 text-sm text-gray-500">إدارة المستندات ومراجعتها بأمان</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href="/dashboard" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">بوابة المنظومات</Link>
        <form action={archiveLogout}>
          <button type="submit" className="rounded-lg bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100">تسجيل الخروج من الأرشيف</button>
        </form>
      </div>
    </header>
  )
}

export default function ArchiveClient({
  initialData,
  initialError,
  departments,
}: {
  initialData: ArchiveData | null
  initialError: string
  departments: ArchiveDepartmentOption[]
}) {
  const [data, setData] = useState<ArchiveData | null>(initialData)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [classification, setClassification] = useState('')
  const [date, setDate] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [isExternalSource, setIsExternalSource] = useState(false)
  const [isExternalDestination, setIsExternalDestination] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<ArchiveDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeDocumentId, setActiveDocumentId] = useState('')
  const [error, setError] = useState(initialError)
  const [notice, setNotice] = useState('')

  const refresh = async (filters = { query, type, classification, date }) => {
    setLoading(true)
    setError('')
    try {
      const result = await searchDocuments(filters.query, filters.type, filters.classification, filters.date)
      if ('error' in result) throw new Error(result.error)
      setData(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل مستندات الأرشيف.')
    } finally {
      setLoading(false)
    }
  }

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await refresh()
  }

  const submitUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setUploading(true)
    setError('')
    setNotice('')
    try {
      const files = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="file"]'))
        .flatMap((input) => Array.from(input.files ?? []))
      const documentType = form.querySelector<HTMLSelectElement>('select[name="document_type"]')?.value
      const classificationValue = form.querySelector<HTMLSelectElement>('select[name="classification"]')?.value
      const employeeId = form.querySelector<HTMLSelectElement>('select[name="employee_id"]')?.value
      const sourceEntity = form.querySelector<HTMLSelectElement>('select[name="source_entity"]')?.value
      const destinationEntity = form.querySelector<HTMLSelectElement>('select[name="destination_entity"]')?.value
      const externalSourceName = form.querySelector<HTMLInputElement>('input[name="external_source_name"]')?.value.trim()
      const externalDestinationName = form.querySelector<HTMLInputElement>('input[name="external_destination_name"]')?.value.trim()
      const externalReference = form.querySelector<HTMLInputElement>('input[name="external_reference"]')?.value.trim()
      const documentDate = form.querySelector<HTMLInputElement>('input[name="document_date"]')?.value
      if (!files.length || !documentType || !classificationValue) {
        throw new Error('اختر ملفاً واحداً على الأقل ونوع المستند وتصنيفه.')
      }
      if (!sourceEntity || !destinationEntity) {
        throw new Error('يرجى إدخال الجهة المصدرة والجهة الموجه إليها.')
      }

      const request = new FormData()
      request.set('document_type', documentType)
      request.set('classification', classificationValue)
      request.set('source_entity', sourceEntity)
      request.set('destination_entity', destinationEntity)
      request.set('external_source_name', externalSourceName ?? '')
      request.set('external_destination_name', externalDestinationName ?? '')
      request.set('external_reference', externalReference ?? '')
      request.set('document_date', documentDate ?? '')
      if (employeeId) request.set('employee_id', employeeId)
      request.set('file_manifest', JSON.stringify(files.map((file) => {
        const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
        return {
          name: file.name,
          type: file.type || mimeTypesByExtension[extension] || '',
          size: file.size,
        }
      })))

      const ticketResult = await uploadArchiveDocument(request)
      if ('error' in ticketResult) throw new Error(ticketResult.error)
      const messages = [...ticketResult.errors]
      let warnings: string[] = []
      const supabase = createClient()
      const completedTickets: ArchiveUploadedDocument[] = []

      const uploadResults = await Promise.all(ticketResult.uploads.map(async (ticket) => {
        const file = files[ticket.fileIndex]
        if (!file) return { error: `تعذر العثور على الملف "${ticket.documentName}" في النموذج.` }

        try {
          const { error: uploadError } = await supabase.storage
            .from('archive_files')
            .uploadToSignedUrl(ticket.filePath, ticket.token, file, {
              contentType: ticket.fileType,
              upsert: false,
            })
          if (uploadError) return { error: `تعذر رفع "${ticket.documentName}": ${uploadError.message}` }
            completedTickets.push({
              fileIndex: ticket.fileIndex,
              documentNumber: ticket.documentNumber,
              documentName: ticket.documentName,
              documentType: ticket.documentType,
              classification: ticket.classification,
              employeeId: ticket.employeeId,
              filePath: ticket.filePath,
              fileType: ticket.fileType,
              sourceEntity: ticket.sourceEntity,
              destinationEntity: ticket.destinationEntity,
              externalReference: ticket.externalReference,
              documentDate: ticket.documentDate,
              signature: ticket.signature,
            })
            return { error: '' }
        } catch (uploadError) {
          return {
            error: `تعذر رفع "${ticket.documentName}": ${
              uploadError instanceof Error ? uploadError.message : 'حدث خطأ في الاتصال بالتخزين.'
            }`,
          }
        }
      }))
      messages.push(...uploadResults.map((result) => result.error).filter(Boolean))

      let uploadedCount = 0
      if (completedTickets.length) {
        const completionResult = await completeArchiveDocumentUploads(completedTickets)
        if ('error' in completionResult) throw new Error(completionResult.error)
        uploadedCount = completionResult.uploaded.length
        warnings = completionResult.warnings
        messages.push(...completionResult.errors)
      }

      if (uploadedCount) {
        form.reset()
        await refresh()
        if (!messages.length) setModalOpen(false)
      }
      if (messages.length) setError(messages.join(' '))
      if (uploadedCount && warnings.length) {
        setNotice(`تم رفع ${uploadedCount} مستند/مستندات، مع تعذر تسجيل بعض الحركات.`)
      } else if (uploadedCount && !messages.length) {
        setNotice(`تم رفع ${uploadedCount} مستند/مستندات.`)
      } else if (!uploadedCount && !messages.length) {
        setNotice('لم يتم رفع أي مستند.')
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع المستندات.')
    } finally {
      setUploading(false)
    }
  }

  const review = async (document: ArchiveDocument, status: 'approved' | 'rejected') => {
    setActiveDocumentId(document.id)
    setError('')
    setNotice('')
    try {
      const result = await approveDocument(document.id, status)
      if ('error' in result) throw new Error(result.error)
      setNotice(result.warning
        ? `تم تحديث حالة المستند. تعذر تسجيل الحركة: ${result.warning}`
        : `تم ${status === 'approved' ? 'اعتماد' : 'رفض'} المستند ${document.document_number}.`)
      await refresh()
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'تعذر تحديث حالة المستند.')
    } finally {
      setActiveDocumentId('')
    }
  }

  const removeDocument = async (document: ArchiveDocument) => {
    if (!window.confirm(`هل تريد حذف المستند ${document.document_number}؟`)) return
    setActiveDocumentId(document.id)
    setError('')
    setNotice('')
    try {
      const result = await deleteArchiveDocument(document.id)
      if ('error' in result) throw new Error(result.error)
      setNotice(result.warning ?? `تم حذف المستند ${document.document_number}.`)
      if (previewDocument?.id === document.id) setPreviewDocument(null)
      await refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف المستند.')
    } finally {
      setActiveDocumentId('')
    }
  }

  const downloadDocument = async (document: ArchiveDocument) => {
    setActiveDocumentId(document.id)
    setError('')
    try {
      const result = await getDocumentDownloadUrl(document.id)
      if ('error' in result) throw new Error(result.error)
      window.location.assign(result.downloadUrl)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'تعذر تحميل المستند.')
    } finally {
      setActiveDocumentId('')
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <ArchiveHeader />

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

        <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <form onSubmit={submitSearch} className="grid gap-3 md:grid-cols-5">
            <label className="text-sm font-semibold md:col-span-2">بحث بالاسم أو الرقم أو التصنيف
              <span className="relative mt-1 block">
                <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في الأرشيف..." className="w-full rounded-lg border py-2.5 pl-3 pr-9" />
              </span>
            </label>
            <label className="text-sm font-semibold">نوع المستند
              <select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5">
                <option value="">كل الأنواع</option>
                {documentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">التصنيف
              <select value={classification} onChange={(event) => setClassification(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2.5">
                <option value="">كل التصنيفات</option>
                {classifications.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">التاريخ
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-5">
              <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-5 py-2.5 font-bold text-white disabled:opacity-50">
                <Search size={17} aria-hidden="true" />بحث
              </button>
              <button type="button" onClick={() => { setQuery(''); setType(''); setClassification(''); setDate(''); void refresh({ query: '', type: '', classification: '', date: '' }) }} className="rounded-lg bg-gray-100 px-4 py-2.5 font-semibold text-gray-700">مسح الفلاتر</button>
              <button type="button" onClick={() => { setError(''); setNotice(''); setIsExternalSource(false); setIsExternalDestination(false); setModalOpen(true) }} className="mr-auto inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 font-bold text-white hover:bg-amber-700">
                <FileUp size={18} aria-hidden="true" />رفع مستند جديد
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">المستندات ({data?.documents.length ?? 0})</h2>
            {data && <span className="text-xs text-gray-500">{data.canManage ? 'عرض جميع المستندات — صلاحية مدير' : 'تعرض مستندات حسابك فقط'}</span>}
          </div>
          {loading && !data ? <p className="py-8 text-center text-gray-500">جاري تحميل الأرشيف...</p> : !data?.documents.length ? (
            <p className="py-10 text-center text-gray-500">{loading ? 'جارٍ البحث...' : 'لا توجد مستندات مطابقة.'}</p>
          ) : (
            <table className="w-full min-w-[1150px] text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr><th className="p-3">الرقم</th><th className="p-3">اسم المستند</th><th className="p-3">المصدر</th><th className="p-3">الوجهة</th><th className="p-3">النوع</th><th className="p-3">التصنيف</th><th className="p-3">الحالة</th><th className="p-3">التاريخ</th><th className="p-3">الإجراءات</th></tr>
              </thead>
              <tbody>
                {data.documents.map((document) => (
                  <tr key={document.id} className="border-t align-middle">
                    <td className="p-3 font-semibold" dir="ltr">{document.document_number}</td>
                    <td className="max-w-xs truncate p-3" title={document.document_name}>{document.document_name}</td>
                    <td className="max-w-[180px] truncate p-3" title={document.source_entity ?? ''}>{document.source_entity || '—'}</td>
                    <td className="max-w-[180px] truncate p-3" title={document.destination_entity ?? ''}>{document.destination_entity || '—'}</td>
                    <td className="p-3">{documentTypes.find((option) => option.value === document.document_type)?.label ?? document.document_type}</td>
                    <td className="p-3">{classifications.find((option) => option.value === document.classification)?.label ?? document.classification}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${document.status === 'approved' ? 'bg-green-100 text-green-800' : document.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {statusLabels[document.status] ?? document.status}
                      </span>
                    </td>
                    <td className="p-3">{new Date(document.created_at).toLocaleDateString('ar-LY')}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => setPreviewDocument(document)} className="inline-flex items-center gap-1 rounded bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-100">
                          <Eye size={15} aria-hidden="true" />معاينة
                        </button>
                        <button type="button" disabled={activeDocumentId === document.id} onClick={() => void downloadDocument(document)} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2.5 py-1.5 font-semibold text-gray-700 disabled:opacity-50">
                          <Download size={15} aria-hidden="true" />تحميل
                        </button>
                        {data.canManage && document.status === 'pending' && (
                          <>
                            <button type="button" disabled={activeDocumentId === document.id} onClick={() => void review(document, 'approved')} className="inline-flex items-center gap-1 rounded bg-green-50 px-2.5 py-1.5 font-semibold text-green-700 disabled:opacity-50">
                              <Check size={15} aria-hidden="true" />اعتماد
                            </button>
                            <button type="button" disabled={activeDocumentId === document.id} onClick={() => void review(document, 'rejected')} className="inline-flex items-center gap-1 rounded bg-orange-50 px-2.5 py-1.5 font-semibold text-orange-700 disabled:opacity-50">
                              <X size={15} aria-hidden="true" />رفض
                            </button>
                          </>
                        )}
                        {(data.canManage || document.status === 'pending') && (
                          <button type="button" disabled={activeDocumentId === document.id} onClick={() => void removeDocument(document)} className="inline-flex items-center gap-1 rounded bg-red-50 px-2.5 py-1.5 font-semibold text-red-700 disabled:opacity-50">
                            <Trash2 size={15} aria-hidden="true" />حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="archive-upload-title" className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 id="archive-upload-title" className="text-xl font-bold text-amber-800">رفع مستند إلى الأرشيف</h2>
                <button type="button" onClick={() => setModalOpen(false)} aria-label="إغلاق" className="rounded-full bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"><X size={20} /></button>
              </div>
              <form onSubmit={submitUpload} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">اختيار الملفات (PDF، JPG، PNG — حتى 10 ملفات، 15MB لكل ملف)
                    <input name="files" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp" className="mt-1 w-full rounded-lg border p-3" />
                  </label>
                  <label className="block text-sm font-semibold">مسح ضوئي بالكاميرا
                    <span className="mt-1 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-bold text-amber-800 hover:bg-amber-100">
                      <ScanLine size={18} aria-hidden="true" />التقاط صورة أو مسح ضوئي
                      <input name="scan_file" type="file" accept="image/*" capture="environment" className="sr-only" />
                    </span>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">نوع المستند
                    <select name="document_type" required defaultValue="incoming" className="mt-1 w-full rounded-lg border px-3 py-2.5">
                      {documentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold">التصنيف
                    <select name="classification" required defaultValue="normal" className="mt-1 w-full rounded-lg border px-3 py-2.5">
                      {classifications.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <div>
                    <label className="block text-sm font-semibold">الإدارة/المكتب المصدر
                      <select
                        name="source_entity"
                        required
                        defaultValue=""
                        onChange={(event) => setIsExternalSource(event.target.value === 'جهة خارجية')}
                        className="mt-1 w-full rounded-lg border px-3 py-2.5"
                      >
                        <option value="" disabled>اختر الإدارة أو المكتب المصدر</option>
                        <option value="جهة خارجية">جهة خارجية</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.name}>
                            {department.name} - {department.type}
                          </option>
                        ))}
                      </select>
                    </label>
                    {isExternalSource && (
                      <input
                        name="external_source_name"
                        type="text"
                        required
                        maxLength={255}
                        placeholder="اكتب اسم الجهة الخارجية المصدرة..."
                        aria-label="اسم الجهة الخارجية المصدرة"
                        className="mt-2 w-full rounded-lg border px-3 py-2.5"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold">الإدارة/المكتب الموجه إليه
                      <select
                        name="destination_entity"
                        required
                        defaultValue=""
                        onChange={(event) => setIsExternalDestination(event.target.value === 'جهة خارجية')}
                        className="mt-1 w-full rounded-lg border px-3 py-2.5"
                      >
                        <option value="" disabled>اختر الإدارة أو المكتب الموجه إليه</option>
                        <option value="جهة خارجية">جهة خارجية</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.name}>
                            {department.name} - {department.type}
                          </option>
                        ))}
                      </select>
                    </label>
                    {isExternalDestination && (
                      <input
                        name="external_destination_name"
                        type="text"
                        required
                        maxLength={255}
                        placeholder="اكتب اسم الجهة الخارجية الموجه إليها..."
                        aria-label="اسم الجهة الخارجية الموجه إليها"
                        className="mt-2 w-full rounded-lg border px-3 py-2.5"
                      />
                    )}
                  </div>
                  <label className="block text-sm font-semibold">رقم الصادر/الوارد الخارجي (اختياري)
                    <input name="external_reference" type="text" maxLength={100} className="mt-1 w-full rounded-lg border px-3 py-2.5" />
                  </label>
                  <label className="block text-sm font-semibold">تاريخ المستند
                    <input name="document_date" type="date" className="mt-1 w-full rounded-lg border px-3 py-2.5" />
                  </label>
                  {data?.canManage && (
                    <label className="block text-sm font-semibold sm:col-span-2">ربط بموظف (اختياري)
                      <select name="employee_id" defaultValue="" className="mt-1 w-full rounded-lg border px-3 py-2.5">
                        <option value="">بدون ربط</option>
                        {data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">تُرفع الملفات في مخزن خاص، وتُعرض عبر روابط مؤقتة للمستخدمين المخولين فقط.</p>
                <div className="flex gap-3 border-t pt-4">
                  <button type="submit" disabled={uploading} className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 font-bold text-white disabled:opacity-50">
                    {uploading ? 'جارٍ رفع الملفات...' : 'حفظ المستندات'}
                  </button>
                  <button type="button" disabled={uploading} onClick={() => setModalOpen(false)} className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 font-bold text-gray-700">إلغاء</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {previewDocument && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 md:p-6">
            <section role="dialog" aria-modal="true" aria-labelledby="archive-preview-title" className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <header className="flex items-center justify-between gap-3 border-b p-4">
                <div className="min-w-0">
                  <h2 id="archive-preview-title" className="truncate font-bold">{previewDocument.document_name}</h2>
                  <p className="text-xs text-gray-500">{previewDocument.document_number}</p>
                </div>
                <button type="button" onClick={() => setPreviewDocument(null)} aria-label="إغلاق المعاينة" className="rounded-full bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"><X size={20} /></button>
              </header>
              <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 p-3">
                {previewDocument.file_type === 'application/pdf' ? (
                  <iframe title={`معاينة ${previewDocument.document_name}`} src={previewDocument.download_url} className="h-full w-full rounded border bg-white" />
                ) : previewDocument.file_type.startsWith('image/') ? (
                  <Image unoptimized width={1200} height={900} src={previewDocument.download_url} alt={previewDocument.document_name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center">
                    <p className="mb-3 text-gray-700">معاينة ملفات Word غير مدعومة داخل المتصفح.</p>
                    <button type="button" onClick={() => void downloadDocument(previewDocument)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-bold text-white"><Download size={17} />تحميل الملف</button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
