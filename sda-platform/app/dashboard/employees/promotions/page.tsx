 'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Employee {
  id: string
  full_name: string
  grade: string | null
}

interface Promotion {
  id: string
  employees: { full_name: string } | { full_name: string }[] | null
  old_grade: string | null
  new_grade: string
  promotion_date: string
  notes: string | null
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ employee_id: '', old_grade: '', new_grade: '', promotion_date: '', notes: '' })

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return null
    }

    const { data: emps } = await supabase.from('employees').select('id, full_name, grade')
    const { data: proms } = await supabase.from('promotions').select('*, employees(full_name)').order('promotion_date', { ascending: false })
    return { employees: emps ?? [], promotions: proms ?? [] }
  }, [router, supabase])

  useEffect(() => {
    let active = true

    void fetchData().then((data) => {
      if (!active) return
      if (data) {
        setEmployees(data.employees)
        setPromotions(data.promotions)
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const { error } = await supabase.from('promotions').insert([formData])

    if (error) { alert('خطأ: ' + error.message) }
    else {
      await supabase.from('employees').update({ grade: formData.new_grade }).eq('id', formData.employee_id)
      setFormData({ employee_id: '', old_grade: '', new_grade: '', promotion_date: '', notes: '' })
      setIsModalOpen(false)
      const data = await fetchData()
      if (data) {
        setEmployees(data.employees)
        setPromotions(data.promotions)
      }
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm mb-8 border-r-8 border-[#F4B41A]">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="شعار" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-[#F4B41A]">إدارة الترقيات والعلاوات</h1>
              <p className="text-gray-500 text-sm">سجل الترقيات لجميع الموظفين</p>
            </div>
          </div>
          <Link href="/dashboard/employees" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-semibold">العودة للموظفين</Link>
        </header>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">سجل الترقيات ({promotions.length})</h2>
            <button onClick={() => setIsModalOpen(true)} className="bg-[#F4B41A] text-white px-6 py-2 rounded-lg font-bold shadow-md">+ تسجيل ترقية جديدة</button>
          </div>

          {loading ? ( <p className="text-center py-8">جاري التحميل...</p> ) : promotions.length === 0 ? (
            <p className="text-center py-8 text-gray-500">لا توجد ترقيات مسجلة.</p>
          ) : (
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-600">
                  <th className="p-3">الموظف</th>
                  <th className="p-3">الدرجة السابقة</th>
                  <th className="p-3">الدرجة الجديدة</th>
                  <th className="p-3">تاريخ الترقية</th>
                  <th className="p-3">الملاحظات / القرار</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-800">
                      {Array.isArray(p.employees) ? p.employees[0]?.full_name : p.employees?.full_name}
                    </td>
                    <td className="p-3 text-gray-600">{p.old_grade}</td>
                    <td className="p-3 font-bold text-[#157A3F]">{p.new_grade}</td>
                    <td className="p-3 text-gray-600">{p.promotion_date}</td>
                    <td className="p-3 text-gray-500">{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8 relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 left-4 text-gray-500 hover:text-red-500 font-bold text-xl">✕</button>
              <h2 className="text-2xl font-bold text-[#F4B41A] mb-6 text-center">تسجيل ترقية جديدة</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">الموظف *</label>
                  <select value={formData.employee_id} onChange={(e) => {
                    const emp = employees.find(x => x.id === e.target.value)
                    setFormData({...formData, employee_id: e.target.value, old_grade: emp?.grade || ''})
                  }} required className="w-full px-4 py-2 border rounded-lg">
                    <option value="">-- اختر الموظف --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} (الدرجة الحالية: {e.grade || 'غير محدد'})</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-bold mb-1">الدرجة السابقة</label><input type="text" value={formData.old_grade} onChange={(e) => setFormData({...formData, old_grade: e.target.value})} required className="w-full px-4 py-2 border rounded-lg bg-gray-100" readOnly /></div>
                <div><label className="block text-sm font-bold mb-1">الدرجة الجديدة</label><input type="text" value={formData.new_grade} onChange={(e) => setFormData({...formData, new_grade: e.target.value})} required className="w-full px-4 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-bold mb-1">تاريخ الترقية</label><input type="date" value={formData.promotion_date} onChange={(e) => setFormData({...formData, promotion_date: e.target.value})} required className="w-full px-4 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-bold mb-1">ملاحظات / رقم القرار</label><input type="text" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                <button type="submit" className="w-full bg-[#F4B41A] text-white font-bold py-3 rounded-lg shadow-md hover:bg-yellow-600 transition">حفظ الترقية وتحديث الدرجة</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}