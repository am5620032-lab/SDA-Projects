'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { assignAsset, getAssetsData, type AssetEmployeeOption, type EmployeeAsset } from './actions'

export default function EmployeeAssetsPage() {
  const [assets, setAssets] = useState<EmployeeAsset[]>([])
  const [employees, setEmployees] = useState<AssetEmployeeOption[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [assetName, setAssetName] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    const result = await getAssetsData()
    if ('error' in result) throw new Error(result.error)
    setAssets(result.data.assets)
    setEmployees(result.data.employees)
  }, [])

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        await refresh()
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل بيانات العهد.')
      } finally {
        setLoading(false)
      }
    })
  }, [refresh])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await assignAsset({ employeeId, assetName, serialNumber })
      if ('error' in result) throw new Error(result.error)
      setModalOpen(false)
      setEmployeeId('')
      setAssetName('')
      setSerialNumber('')
      await refresh()
      setNotice(result.warning ? `تم تسليم العهدة. تنبيه: ${result.warning}` : 'تم تسجيل تسليم العهدة بنجاح.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر تسجيل تسليم العهدة.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-r-8 border-amber-600 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-amber-700">العهد والأصول</h1>
            <p className="mt-1 text-sm text-gray-500">سجل العهد المسلمة لموظفي الجهاز</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/employees" className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-200">العودة للموظفين</Link>
            <button type="button" onClick={() => { setError(''); setNotice(''); setModalOpen(true) }} className="rounded-lg bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700">تسليم عهدة جديدة</button>
          </div>
        </header>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
        <section className="overflow-x-auto rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">سجل العهد ({assets.length})</h2>
          {loading ? <p className="py-8 text-center text-gray-500">جاري تحميل البيانات...</p> : assets.length === 0 ? (
            <p className="py-8 text-center text-gray-500">لا توجد عهد مسجلة.</p>
          ) : (
            <table className="w-full min-w-[700px] text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">اسم العهدة</th>
                  <th className="p-3">الرقم التسلسلي</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">تاريخ التسليم</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-t">
                    <td className="p-3 font-semibold">{asset.employee_name}</td>
                    <td className="p-3">{asset.asset_name}</td>
                    <td className="p-3">{asset.serial_number || '—'}</td>
                    <td className="p-3">{asset.status === 'assigned' ? 'مسلمة' : asset.status}</td>
                    <td className="p-3">{asset.delivered_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <section role="dialog" aria-modal="true" aria-labelledby="asset-dialog-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <h2 id="asset-dialog-title" className="mb-5 text-xl font-bold text-amber-700">تسليم عهدة جديدة</h2>
              <form onSubmit={submit} className="space-y-4">
                <label className="block text-sm font-semibold">الموظف
                  <select required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="">اختر الموظف</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold">اسم العهدة
                  <input required maxLength={200} value={assetName} onChange={(event) => setAssetName(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="block text-sm font-semibold">الرقم التسلسلي
                  <input maxLength={100} value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <div className="flex gap-3 border-t pt-4">
                  <button disabled={saving} className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? 'جارٍ الحفظ...' : 'تأكيد التسليم'}</button>
                  <button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="flex-1 rounded-lg bg-gray-100 px-4 py-2 font-bold text-gray-700">إلغاء</button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
