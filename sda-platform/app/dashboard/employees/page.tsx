'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { logAction } from '@/app/actions/log-action'
import { getEmployeesDashboardData } from '@/app/dashboard/employees/actions'
import type {
  EmployeeDashboardLeave as PendingLeave,
  EmployeeDashboardRecord as Employee,
} from '@/app/dashboard/employees/actions'
import type { DepartmentWithManager } from '@/types/department'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<DepartmentWithManager[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [employeeCount, setEmployeeCount] = useState<number | null>(null)
  const [pendingLeaveCount, setPendingLeaveCount] = useState<number | null>(null)
  const [onDutyCount, setOnDutyCount] = useState<number | null>(null)
  const [onLeaveCount, setOnLeaveCount] = useState<number | null>(null)
  const [delegatedCount, setDelegatedCount] = useState<number | null>(null)
  const [unreturnedAssetsCount, setUnreturnedAssetsCount] = useState<number | null>(null)
  const [pendingClearanceCount, setPendingClearanceCount] = useState<number | null>(null)
  const [terminatedUnreturnedAssetsCount, setTerminatedUnreturnedAssetsCount] = useState<number | null>(null)
  const [promotionEligibleEmployees, setPromotionEligibleEmployees] = useState<
    { id: string; full_name: string; eligible_since: string }[]
  >([])
  const [branchCounts, setBranchCounts] = useState<{ branch: string; count: number }[]>([])
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([])
  const [dashboardError, setDashboardError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [isFlipped, setIsFlipped] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basic')

  const [formData, setFormData] = useState({ 
    full_name: '', national_id: '', employee_number: '', work_start_date: '', birth_date: '', birth_place: '', nationality: '', social_status: '', gender: '',
    qualification: '', major: '', university: '', hire_date: '', job_title: '', department: '', 
    grade: '', category: '', rank: '', last_promotion_date: '', basic_salary: '', variable_salary: '', phone: '', email: '', address: '',
    employment_status: 'on_duty', delegation_entity: '', branch: 'الإدارة الرئيسيه / طرابلس',
    department_id: '', direct_manager_id: '',
    job_type: 'دائم', notes: '', photo_url: '', delegation_start_date: '', delegation_end_date: ''
  })

  const supabase = useMemo(() => createClient(), [])

  const fetchEmployees = useCallback(async () => {
    setDashboardError('')
    try {
      const result = await getEmployeesDashboardData()
      if ('error' in result) throw new Error(result.error)

      const dashboard = result.data
      setUserRole(dashboard.userRole)
      setEmployees(dashboard.employees)
      setDepartments(dashboard.departments)
      setEmployeeCount(dashboard.employeeCount)
      setOnDutyCount(dashboard.onDutyCount)
      setOnLeaveCount(dashboard.onLeaveCount)
      setDelegatedCount(dashboard.delegatedCount)
      setUnreturnedAssetsCount(dashboard.unreturnedAssetsCount)
      setPendingClearanceCount(dashboard.pendingClearanceCount)
      setTerminatedUnreturnedAssetsCount(dashboard.terminatedUnreturnedAssetsCount)
      setPromotionEligibleEmployees(dashboard.promotionEligibleEmployees)

      const counts = new Map<string, number>([
        ['الإدارة الرئيسيه / طرابلس', 0],
        ['سبها', 0],
        ['أوباري', 0],
        ['الجفرة', 0],
        ['غات', 0],
        ['براك الشاطئ', 0],
        ['حوض مرزق', 0],
      ])
      for (const employee of dashboard.employees) {
        const branch = employee.branch?.trim() || 'غير محدد'
        counts.set(branch, (counts.get(branch) ?? 0) + 1)
      }
      setBranchCounts([...counts].map(([branch, count]) => ({ branch, count })))
      setPendingLeaveCount(dashboard.pendingLeaveCount)
      setPendingLeaves(dashboard.pendingLeaves)
    } catch (error) {
      console.error('Fetch Error:', error)
      setEmployees([])
      setDepartments([])
      setEmployeeCount(0)
      setOnDutyCount(0)
      setOnLeaveCount(0)
      setDelegatedCount(0)
      setUnreturnedAssetsCount(0)
      setPendingClearanceCount(0)
      setTerminatedUnreturnedAssetsCount(0)
      setPromotionEligibleEmployees([])
      setPendingLeaveCount(0)
      setBranchCounts([])
      setPendingLeaves([])
      setDashboardError(error instanceof Error ? error.message : 'تعذر تحميل بيانات منظومة شؤون الموظفين.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(fetchEmployees) }, [fetchEmployees])

  useEffect(() => {
    document.body.classList.toggle('printing-employee-card', isCardModalOpen)
    return () => document.body.classList.remove('printing-employee-card')
  }, [isCardModalOpen])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح.')
      input.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يتجاوز الحد المسموح (5 ميغابايت).')
      input.value = ''
      return
    }

    setUploading(true)
    try {
      const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'image'
      const filePath = `${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { contentType: file.type, upsert: false })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setFormData((current) => ({ ...current, photo_url: data.publicUrl }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر رفع الصورة.'
      alert(`حدث خطأ أثناء رفع الصورة: ${message}`)
    } finally {
      setUploading(false)
      input.value = ''
    }
  }

  const handleDeletePhoto = async () => {
    const photoUrl = formData.photo_url
    if (!photoUrl || !window.confirm('هل تريد حذف الصورة الشخصية؟')) return

    let filePath: string
    try {
      const url = new URL(photoUrl)
      const bucketPath = '/storage/v1/object/public/avatars/'
      const bucketPathIndex = url.pathname.indexOf(bucketPath)
      if (bucketPathIndex < 0) throw new Error('رابط الصورة لا يعود إلى مخزن الصور avatars.')
      filePath = decodeURIComponent(url.pathname.slice(bucketPathIndex + bucketPath.length))
      if (!filePath) throw new Error('تعذر تحديد مسار الصورة في مخزن الصور.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'رابط الصورة غير صالح.'
      alert(`تعذر حذف الصورة: ${message}`)
      return
    }

    setUploading(true)
    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ photo_url: null })
          .eq('id', editingId)
        if (updateError) throw updateError
      }

      setFormData((current) => ({ ...current, photo_url: '' }))
      if (editingId) {
        setEmployees((current) => current.map((employee) =>
          employee.id === editingId ? { ...employee, photo_url: null } : employee
        ))
        try {
          const auditResult = await logAction('update', `حذف الصورة الشخصية للموظف: ${employees.find((employee) => employee.id === editingId)?.full_name ?? editingId}`)
          if ('error' in auditResult) alert(`تم حذف الصورة، لكن تعذر تسجيل الحركة: ${auditResult.error}`)
        } catch (auditError) {
          console.error('Failed to audit employee photo deletion:', auditError)
          alert('تم حذف الصورة، لكن تعذر تسجيل الحركة في سجل المراقبة.')
        }
      }

      const { error: removeError } = await supabase.storage.from('avatars').remove([filePath])
      if (removeError) {
        alert(`تم حذف ارتباط الصورة من بيانات الموظف، لكن تعذر حذف الملف من التخزين: ${removeError.message}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حذف الصورة.'
      alert(`حدث خطأ أثناء حذف الصورة: ${message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const dataToSave = { 
      ...formData, 
      basic_salary: parseFloat(formData.basic_salary) || 0, 
      variable_salary: parseFloat(formData.variable_salary) || 0,
      birth_date: formData.birth_date === '' ? null : formData.birth_date,
      last_promotion_date: formData.last_promotion_date || null,
      hire_date: formData.hire_date === '' ? null : formData.hire_date,
      work_start_date: formData.work_start_date || null,
      delegation_start_date: ['delegated', 'seconded'].includes(formData.employment_status)
        ? formData.delegation_start_date || null
        : null,
      delegation_end_date: ['delegated', 'seconded'].includes(formData.employment_status)
        ? formData.delegation_end_date || null
        : null,
      department_id: formData.department_id || null,
      direct_manager_id: formData.direct_manager_id || null,
    };

    let saveError: { code: string; message: string } | null = null
    if (editingId) {
      const { error } = await supabase.from('employees').update(dataToSave).eq('id', editingId)
      saveError = error
    } else {
      const newEmployeeData = Object.fromEntries(
        Object.entries(dataToSave).filter(([field]) => field !== 'employee_number'),
      )
      const { error } = await supabase.from('employees').insert([newEmployeeData])
      saveError = error
    }
    if (saveError) {
      if (saveError.code === '23505') {
        alert('الرقم الوطني مسجل بالفعل لموظف آخر.')
        setLoading(false)
        return
      }
      alert(`تعذر حفظ بيانات الموظف: ${saveError.message}`)
      setLoading(false)
      return
    }

    try {
      const auditResult = await logAction(
        editingId ? 'update' : 'add',
        `${editingId ? 'تعديل' : 'إضافة'} بيانات الموظف: ${formData.full_name.trim()}`,
      )
      if ('error' in auditResult) {
        alert(`تم حفظ بيانات الموظف، لكن تعذر تسجيل الحركة: ${auditResult.error}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر تسجيل الحركة.'
      alert(`تم حفظ بيانات الموظف، لكن تعذر تسجيل الحركة: ${message}`)
    }
    setIsModalOpen(false)
    setLoading(false)
    await fetchEmployees()
  }

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!importFile) {
      setImportError('يرجى اختيار ملف CSV أو Excel.')
      return
    }
    if (importFile.size > 10 * 1024 * 1024) {
      setImportError('حجم الملف يتجاوز الحد المسموح (10 ميغابايت).')
      return
    }

    setIsImporting(true)
    setImportError('')
    setImportMessage('')
    let importedCount = 0

    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await importFile.arrayBuffer(), {
        type: 'array',
        cellDates: true,
        dateNF: 'yyyy-mm-dd',
      })
      const firstSheetName = workbook.SheetNames[0]
      if (!firstSheetName) throw new Error('الملف لا يحتوي على أوراق بيانات.')

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
        defval: '',
        raw: false,
      })
      if (rows.length === 0) throw new Error('الملف لا يحتوي على صفوف بيانات.')

      const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, '')
      const readValue = (row: Record<string, unknown>, aliases: string[]) => {
        const values = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]))
        for (const alias of aliases) {
          const value = values.get(normalizeHeader(alias))
          if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim()
        }
        return ''
      }
      const readDate = (value: string, rowNumber: number) => {
        if (!value) return null
        const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(value)
        const parsed = isIsoDate ? new Date(`${value}T00:00:00Z`) : new Date(value)
        if (Number.isNaN(parsed.getTime())) throw new Error(`التاريخ غير صالح في الصف ${rowNumber}.`)
        if (isIsoDate) {
          if (parsed.toISOString().slice(0, 10) !== value) throw new Error(`التاريخ غير صالح في الصف ${rowNumber}.`)
          return value
        }
        const year = parsed.getFullYear()
        const month = String(parsed.getMonth() + 1).padStart(2, '0')
        const day = String(parsed.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      const readSalary = (value: string, rowNumber: number, field: string) => {
        if (!value) return 0
        const parsed = Number(value.replace(/,/g, ''))
        if (!Number.isFinite(parsed)) throw new Error(`${field} غير صالح في الصف ${rowNumber}.`)
        return parsed
      }

      const employeesToImport = rows.flatMap((row, index) => {
        const rowNumber = index + 2
        const fullName = readValue(row, ['full_name', 'الاسم الرباعي', 'الاسم', 'اسم الموظف'])
        if (!fullName && Object.values(row).every((value) => String(value).trim() === '')) return []
        if (!fullName) throw new Error(`الاسم الرباعي مطلوب في الصف ${rowNumber}.`)

        return [{
          full_name: fullName,
          national_id: readValue(row, ['national_id', 'الرقم الوطني']),
          work_start_date: readDate(readValue(row, ['work_start_date', 'تاريخ مباشرة العمل']), rowNumber),
          birth_date: readDate(readValue(row, ['birth_date', 'تاريخ الميلاد']), rowNumber),
          social_status: readValue(row, ['social_status', 'الحالة الاجتماعية']),
          qualification: readValue(row, ['qualification', 'المؤهل العلمي']),
          major: readValue(row, ['major', 'التخصص']),
          university: readValue(row, ['university', 'جهة التخرج', 'الجامعة']),
          hire_date: readDate(readValue(row, ['hire_date', 'تاريخ التعيين']), rowNumber),
          job_title: readValue(row, ['job_title', 'الوظيفة', 'المسمى الوظيفي']),
          department: readValue(row, ['department', 'الإدارة/القسم', 'القسم', 'الإدارة']),
          grade: readValue(row, ['grade', 'الدرجة']),
          basic_salary: readSalary(readValue(row, ['basic_salary', 'المرتب الأساسي']), rowNumber, 'المرتب الأساسي'),
          variable_salary: readSalary(readValue(row, ['variable_salary', 'المرتب المتغير']), rowNumber, 'المرتب المتغير'),
          phone: readValue(row, ['phone', 'رقم الهاتف', 'الهاتف']),
          address: readValue(row, ['address', 'مكان الإقامة', 'العنوان']),
          employment_status: readValue(row, ['employment_status', 'الحالة الوظيفية']) || 'on_duty',
          delegation_entity: readValue(row, ['delegation_entity', 'جهة الندب/الإعارة', 'جهة الندب']),
          branch: readValue(row, ['branch', 'الفرع']) || 'الإدارة الرئيسيه / طرابلس',
          job_type: readValue(row, ['job_type', 'نوع الوظيفة']) || 'دائم',
          notes: readValue(row, ['notes', 'ملاحظات عامة', 'ملاحظات']),
          delegation_start_date: readDate(readValue(row, ['delegation_start_date', 'تاريخ بداية الندب/الإعارة']), rowNumber),
        }]
      })

      if (employeesToImport.length === 0) throw new Error('لم يتم العثور على موظفين صالحين للاستيراد.')

      for (let start = 0; start < employeesToImport.length; start += 100) {
        const batch = employeesToImport.slice(start, start + 100)
        const { error } = await supabase.from('employees').insert(batch)
        if (error) {
          throw new Error(`تعذر إدخال الدفعة بعد استيراد ${importedCount} من ${employeesToImport.length} موظفًا: ${error.message}`)
        }
        importedCount += batch.length
      }

      let auditWarning = ''
      try {
        const auditResult = await logAction('add', `استيراد دفعي لبيانات ${importedCount} موظفًا`)
        if ('error' in auditResult) auditWarning = ` تعذر تسجيل الحركة: ${auditResult.error}`
      } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تسجيل الحركة.'
        auditWarning = ` تعذر تسجيل الحركة: ${message}`
      }

      setImportMessage(`تم استيراد ${importedCount} موظفًا بنجاح.${auditWarning}`)
      setIsImportModalOpen(false)
      setImportFile(null)
      await fetchEmployees()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'تعذر قراءة ملف الموظفين أو استيراده.')
      if (importedCount > 0) await fetchEmployees()
    } finally {
      setIsImporting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const employee = employees.find((item) => item.id === id)
    if (!window.confirm(`هل أنت متأكد من حذف الموظف ${employee?.full_name || ''}؟`)) return
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (error) {
      alert(`تعذر حذف الموظف: ${error.message}`)
      return
    }

    try {
      const auditResult = await logAction('delete', `حذف بيانات الموظف: ${employee?.full_name || id}`)
      if ('error' in auditResult) {
        alert(`تم حذف الموظف، لكن تعذر تسجيل الحركة: ${auditResult.error}`)
      }
    } catch (auditError) {
      const message = auditError instanceof Error ? auditError.message : 'تعذر تسجيل الحركة.'
      alert(`تم حذف الموظف، لكن تعذر تسجيل الحركة: ${message}`)
    }
    await fetchEmployees()
  }

  const openEdit = (emp: Employee) => {
    setEditingId(emp.id)
    setFormData({ 
      full_name: emp.full_name,
      national_id: emp.national_id,
      employee_number: emp.employee_number,
      work_start_date: emp.work_start_date || '',
      birth_date: emp.birth_date,
      birth_place: emp.birth_place,
      nationality: emp.nationality,
      social_status: emp.social_status,
      gender: emp.gender,
      qualification: emp.qualification,
      major: emp.major,
      university: emp.university,
      hire_date: emp.hire_date,
      job_title: emp.job_title,
      department: emp.department,
      grade: emp.grade,
      category: emp.category,
      rank: emp.rank,
      last_promotion_date: emp.last_promotion_date || '',
      basic_salary: String(emp.basic_salary || 0), 
      variable_salary: String(emp.variable_salary || 0),
      phone: emp.phone,
      email: emp.email,
      address: emp.address,
      employment_status: emp.employment_status,
      delegation_entity: emp.delegation_entity,
      branch: emp.branch || 'الإدارة الرئيسيه / طرابلس',
      job_type: emp.job_type || 'دائم',
      notes: emp.notes || '',
      photo_url: emp.photo_url || '',
      delegation_start_date: emp.delegation_start_date || '',
      delegation_end_date: emp.delegation_end_date || '',
      department_id: emp.department_id || '',
      direct_manager_id: emp.direct_manager_id || '',
    })
    setIsModalOpen(true)
    setActiveTab('basic')
  }

  const openView = (emp: Employee) => {
    setSelectedEmp(emp)
    setIsViewModalOpen(true)
  }

  const openCard = (emp: Employee) => {
    setSelectedEmp(emp)
    setIsFlipped(false)
    setIsCardModalOpen(true)
  }

  const openAdd = () => {
    setEditingId(null)
    setFormData({ 
      full_name: '', national_id: '', employee_number: '', work_start_date: '', birth_date: '', birth_place: '', nationality: '', social_status: '', gender: '',
      qualification: '', major: '', university: '', hire_date: '', job_title: '', department: '', 
      grade: '', category: '', rank: '', last_promotion_date: '', basic_salary: '', variable_salary: '', phone: '', email: '', address: '',
      employment_status: 'on_duty', delegation_entity: '', branch: 'الإدارة الرئيسيه / طرابلس',
      department_id: '', direct_manager_id: '',
      job_type: 'دائم', notes: '', photo_url: '', delegation_start_date: '', delegation_end_date: ''
    })
    setIsModalOpen(true)
    setActiveTab('basic')
  }

  const filtered = employees.filter((emp) => 
    emp.full_name?.includes(searchQuery) || emp.department?.includes(searchQuery) || emp.branch?.includes(searchQuery)
  )

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delegated': return 'ندب'
      case 'seconded': return 'إعارة'
      case 'transferred': return 'نقل'
      case 'terminated': return 'انتهاء خدمة'
      default: return 'تعيين'
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 flex items-center justify-between rounded-xl border-r-8 border-[#157A3F] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="Logo" className="h-12 w-auto object-contain" />
            <h1 className="text-2xl font-bold text-[#157A3F]">منظومة شؤون الموظفين</h1>
          </div>
          <Link href="/dashboard" className="bg-gray-100 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200">العودة للوحة التحكم</Link>
        </header>

        <section aria-labelledby="employee-quick-links" className="mb-8">
          <h2 id="employee-quick-links" className="mb-4 text-xl font-bold text-gray-800">روابط سريعة</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Link href="#employee-directory" className="rounded-xl border-r-4 border-[#157A3F] bg-white p-4 font-bold text-[#157A3F] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">إدارة الموظفين</Link>
            <Link href="/dashboard/employees/attendance" className="rounded-xl border-r-4 border-blue-600 bg-white p-4 font-bold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">الحضور والانصراف</Link>
            <Link href="/dashboard/leaves" className="rounded-xl border-r-4 border-purple-600 bg-white p-4 font-bold text-purple-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">الإجازات</Link>
            <Link href="/dashboard/employees/promotions" className="rounded-xl border-r-4 border-amber-500 bg-white p-4 font-bold text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">الترقيات والقرارات</Link>
          </div>
        </section>

        {dashboardError && <p role="alert" className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{dashboardError}</p>}

        <section aria-label="مؤشرات منظومة شؤون الموظفين" className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border-r-8 border-[#157A3F] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500">إجمالي عدد الموظفين</h2>
            <p className="mt-2 text-3xl font-bold text-[#157A3F]">{employeeCount ?? '—'}</p>
          </article>
          <article className="rounded-xl border-r-8 border-emerald-500 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500">على رأس العمل</h2>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{onDutyCount ?? '—'}</p>
          </article>
          <article className="rounded-xl border-r-8 border-purple-500 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500">في إجازة حالياً</h2>
            <p className="mt-2 text-3xl font-bold text-purple-700">{onLeaveCount ?? '—'}</p>
          </article>
          <article className="rounded-xl border-r-8 border-indigo-500 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500">منتدبون ومعارون</h2>
            <p className="mt-2 text-3xl font-bold text-indigo-700">{delegatedCount ?? '—'}</p>
          </article>
          <article className="rounded-xl border-r-8 border-[#F4B41A] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500">طلبات الإجازة قيد الانتظار</h2>
            <p className="mt-2 text-3xl font-bold text-amber-700">{pendingLeaveCount ?? '—'}</p>
          </article>
          <article className="rounded-xl border-r-8 border-red-500 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500">عهد غير معادة</h2>
            <p className="mt-2 text-3xl font-bold text-red-700">{unreturnedAssetsCount ?? '—'}</p>
          </article>
          <article className="rounded-xl border-r-8 border-blue-600 bg-white p-5 shadow-sm md:col-span-2 xl:col-span-2">
            <h2 className="text-sm font-semibold text-gray-500">عدد الموظفين في كل فرع</h2>
            {branchCounts.length > 0 ? (
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {branchCounts.map(({ branch, count }) => (
                  <li key={branch} className="flex justify-between gap-2">
                    <span className="text-gray-700">{branch}</span>
                    <span className="font-bold text-blue-700">{count}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-gray-500">{loading ? 'جاري التحميل...' : 'لا توجد بيانات للفروع.'}</p>}
          </article>
        </section>

        <section aria-labelledby="employee-leave-alerts" className="mb-8 rounded-xl border-r-8 border-red-500 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="employee-leave-alerts" className="text-lg font-bold text-gray-800">المهام والتنبيهات</h2>
            <Link href="/dashboard/leaves" className="text-sm font-bold text-[#157A3F] hover:underline">عرض الطلبات</Link>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Link href="/dashboard/employees/assets" className="rounded-lg border bg-red-50 p-4 text-sm font-semibold text-red-800 hover:bg-red-100">
              عهد تحتاج إلى متابعة: {unreturnedAssetsCount ?? '—'}
            </Link>
            <Link href="/dashboard/employees/clearances" className="rounded-lg border bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
              طلبات إخلاء الطرف المعلقة: {pendingClearanceCount ?? '—'}
            </Link>
            <Link href="/dashboard/employees/assets" className="rounded-lg border bg-orange-50 p-4 text-sm font-semibold text-orange-800 hover:bg-orange-100">
              عهد غير معادة لموظفين منتهية خدمتهم: {terminatedUnreturnedAssetsCount ?? '—'}
            </Link>
            <Link href="/dashboard/employees/reports" className="rounded-lg border bg-amber-50 p-4 text-sm font-semibold text-amber-800 hover:bg-amber-100">
              موظفون مستحقون للترقية وفق معيار 4 سنوات: {promotionEligibleEmployees.length}
            </Link>
          </div>
          {pendingLeaves.length ? (
            <ul className="divide-y">
              {pendingLeaves.map((leave) => (
                <li key={leave.id} className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center">
                  <span className="font-semibold text-gray-800">{(Array.isArray(leave.employees) ? leave.employees[0]?.full_name : leave.employees?.full_name) || 'موظف غير محدد'} — إجازة {leave.leave_type}</span>
                  <span className="text-sm text-gray-500">تاريخ البداية: {leave.start_date}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-gray-500">{pendingLeaveCount === null ? 'جاري تحميل التنبيهات...' : 'لا توجد طلبات إجازة بانتظار الاعتماد.'}</p>
          )}
          {promotionEligibleEmployees.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h3 className="mb-2 font-semibold text-gray-700">قائمة أولية للمستحقين للترقية</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {promotionEligibleEmployees.slice(0, 5).map((eligible) => (
                  <li key={eligible.id} className="rounded-lg bg-amber-50 p-3 text-sm">
                    <span className="font-semibold">{eligible.full_name}</span>
                    <span className="mr-2 text-gray-600">منذ {eligible.eligible_since}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section id="employee-directory" className="min-w-0 rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 border-b pb-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <h2 className="text-lg font-bold">قائمة الموظفين ({filtered.length})</h2>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={openAdd} className="rounded-lg bg-[#157A3F] px-4 py-2 text-sm font-bold text-white hover:bg-green-800">+ إضافة موظف</button>
                  <button type="button" onClick={() => { setImportError(''); setIsImportModalOpen(true) }} className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-[#157A3F] hover:bg-emerald-100">استيراد من Excel</button>
                </div>
              </div>
              <input
                type="text"
                placeholder="بحث بالاسم، القسم، أو الفرع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:ring-[#157A3F] md:w-80"
              />
            </div>

            {importMessage && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{importMessage}</p>}

            {loading ? <p className="py-8 text-center">جاري التحميل...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="p-3">الاسم</th>
                      <th className="p-3">الوظيفة</th>
                      <th className="p-3">الفرع</th>
                      <th className="p-3">الإدارة/المكتب</th>
                      <th className="p-3">المدير المباشر</th>
                      <th className="p-3">الدرجة</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp) => (
                      <tr key={emp.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{emp.full_name}</td>
                        <td className="p-3">{emp.job_title || '-'}</td>
                        <td className="p-3 font-bold text-blue-700">{emp.branch || 'الإدارة الرئيسيه / طرابلس'}</td>
                        <td className="p-3">
                          {(Array.isArray(emp.department_info) ? emp.department_info[0]?.name : emp.department_info?.name) || '-'}
                        </td>
                        <td className="p-3">
                          {(Array.isArray(emp.direct_manager_info) ? emp.direct_manager_info[0]?.full_name : emp.direct_manager_info?.full_name) || '-'}
                        </td>
                        <td className="p-3 font-bold text-[#157A3F]">{emp.grade || '-'}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{getStatusText(emp.employment_status)}</span>
                        </td>
                        <td className="flex justify-center gap-2 p-3 text-center">
                          <button onClick={() => openView(emp)} className="rounded-lg bg-gray-100 px-3 py-1 text-gray-600">عرض</button>
                          <button onClick={() => openCard(emp)} className="rounded-lg bg-teal-50 px-3 py-1 text-teal-600 hover:bg-teal-100">بطاقة</button>
                          <button onClick={() => openEdit(emp)} className="rounded-lg bg-blue-50 px-3 py-1 text-blue-600">تعديل</button>
                          {userRole !== 'employee' && <button onClick={() => handleDelete(emp.id)} className="rounded-lg bg-red-50 px-3 py-1 text-red-600">حذف</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>

        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div className="my-8 w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-[#157A3F]">استيراد الموظفين من Excel</h2>
                <button type="button" onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportError('') }} disabled={isImporting} aria-label="إغلاق" className="text-xl font-bold text-gray-500 hover:text-red-500 disabled:opacity-50">✕</button>
              </div>
              <p className="mb-4 text-sm text-gray-600">اختر ملف CSV أو Excel. يجب أن يحتوي الصف الأول على أسماء الأعمدة، والاسم الرباعي مطلوب. يتم إنشاء الرقم الوظيفي تلقائيًا من قاعدة البيانات.</p>
              <p className="mb-4 text-xs leading-6 text-gray-500">الأعمدة المدعومة تشمل: الاسم الرباعي، الرقم الوطني، تاريخ الميلاد، الحالة الاجتماعية، المؤهل العلمي، التخصص، جهة التخرج، الوظيفة، القسم، الفرع، الدرجة، الرواتب، الهاتف، العنوان، والحالة الوظيفية. يمكن استخدام أسماء الحقول الإنجليزية مثل full_name وbranch أيضًا.</p>
              <form onSubmit={handleImport} className="space-y-4">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(event) => { setImportFile(event.target.files?.[0] ?? null); setImportError('') }}
                  disabled={isImporting}
                  required
                  className="w-full rounded-lg border p-3 text-sm disabled:opacity-60"
                />
                {importError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{importError}</p>}
                <div className="flex gap-3 border-t pt-4">
                  <button type="submit" disabled={isImporting || !importFile} className="flex-1 rounded-lg bg-[#157A3F] py-3 font-bold text-white disabled:cursor-wait disabled:opacity-60">
                    {isImporting ? 'جارٍ الاستيراد...' : 'استيراد الموظفين'}
                  </button>
                  <button type="button" onClick={() => { setIsImportModalOpen(false); setImportFile(null); setImportError('') }} disabled={isImporting} className="flex-1 rounded-lg bg-gray-200 py-3 font-bold disabled:opacity-60">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {isViewModalOpen && selectedEmp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto print:bg-white print:p-0 print:static">
            <div className="employee-file-print-sheet bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 md:p-8 relative my-8 print:shadow-none print:w-full print:max-w-none print:p-0 print:m-0 print:border-none">
              
              {/* أزرار التحكم (تختفي عند الطباعة) */}
              <div className="flex justify-between items-center mb-6 print:hidden border-b pb-4">
                <h2 className="text-2xl font-bold text-[#157A3F]">الملف الشامل: {selectedEmp.full_name}</h2>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="bg-[#157A3F] hover:bg-green-800 text-white px-4 py-2 rounded-lg font-bold shadow-md transition">طباعة الملف الشامل</button>
                  <button onClick={() => setIsViewModalOpen(false)} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold transition">إغلاق</button>
                </div>
              </div>

              {/* ترويسة تظهر فقط عند الطباعة */}
              <div className="hidden print:flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#157A3F]">جهاز تنمية وتطوير الجنوب</h1>
                  <p className="text-gray-600">الملف الشامل للموظف</p>
                </div>
                <img src="/logo.jpg" alt="Logo" className="h-16 w-auto" />
              </div>
              
              <div className="space-y-6 print:space-y-4">
                <div className="print:break-inside-avoid">
                  <h3 className="text-lg font-bold text-[#157A3F] border-b pb-2 mb-3">البيانات الأساسية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm print:gap-2">
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">الرقم الوطني:</span>{selectedEmp.national_id || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">الرقم الوظيفي:</span>{selectedEmp.employee_number || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">تاريخ الميلاد:</span>{selectedEmp.birth_date || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">مكان الميلاد:</span>{selectedEmp.birth_place || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">الجنسية:</span>{selectedEmp.nationality || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">الجنس:</span>{selectedEmp.gender || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">الحالة الاجتماعية:</span>{selectedEmp.social_status || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">رقم الهاتف:</span><span dir="ltr">{selectedEmp.phone || '-'}</span></div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">البريد الإلكتروني:</span>{selectedEmp.email || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">مكان الإقامة:</span>{selectedEmp.address || '-'}</div>
                  </div>
                </div>

                <div className="print:break-inside-avoid">
                  <h3 className="text-lg font-bold text-[#F4B41A] border-b pb-2 mb-3">المؤهلات العلمية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm print:gap-2">
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">المؤهل:</span>{selectedEmp.qualification || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">التخصص:</span>{selectedEmp.major || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">جهة التخرج:</span>{selectedEmp.university || '-'}</div>
                  </div>
                </div>

                <div className="print:break-inside-avoid">
                  <h3 className="text-lg font-bold text-blue-600 border-b pb-2 mb-3">البيانات الوظيفية</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm print:gap-2">
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">الوظيفة:</span>{selectedEmp.job_title || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">القسم:</span>{selectedEmp.department || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">الفرع:</span><span className="font-bold text-blue-700">{selectedEmp.branch || 'الإدارة الرئيسيه / طرابلس'}</span></div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">الدرجة:</span>{selectedEmp.grade || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">الفئة:</span>{selectedEmp.category || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">الرتبة:</span>{selectedEmp.rank || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">تاريخ آخر ترقية:</span>{selectedEmp.last_promotion_date || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">نوع الوظيفة:</span>{selectedEmp.job_type || 'دائم'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">تاريخ التعيين:</span>{selectedEmp.hire_date || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">تاريخ مباشرة العمل:</span>{selectedEmp.work_start_date || '-'}</div>
                    <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">جهة الندب/الإعارة:</span>{selectedEmp.delegation_entity || 'لا يوجد'}</div>
                    {['delegated', 'seconded'].includes(selectedEmp.employment_status) && (
                      <>
                        <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">تاريخ بداية الندب/الإعارة:</span>{selectedEmp.delegation_start_date || '-'}</div>
                        <div className="bg-gray-50 p-3 rounded print:border print:bg-white"><span className="text-gray-500 block text-xs print:inline print:ml-1">تاريخ نهاية الندب/الإعارة:</span>{selectedEmp.delegation_end_date || 'مستمر'}</div>
                      </>
                    )}
                  </div>
                </div>

                {selectedEmp.notes && (
                  <div className="print:break-inside-avoid">
                    <h3 className="text-lg font-bold text-gray-700 border-b pb-2 mb-3">بيانات إضافية</h3>
                    <div className="bg-gray-50 p-3 rounded text-sm print:border print:bg-white">{selectedEmp.notes}</div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {isCardModalOpen && selectedEmp && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-black/50 p-4 print:static print:bg-white print:p-0">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl print:hidden">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">بطاقة الموظف</h2>
                <div className="flex gap-2">
                  <button onClick={() => setIsFlipped((flipped) => !flipped)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200">قلب البطاقة</button>
                  <button onClick={() => window.print()} className="rounded-lg bg-[#157A3F] px-4 py-2 text-sm font-bold text-white">طباعة البطاقة</button>
                  <button onClick={() => setIsCardModalOpen(false)} className="rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600">إغلاق</button>
                </div>
              </div>
            </div>

            <article className="employee-id-card relative h-[200px] w-[350px] shrink-0 overflow-hidden rounded-xl border-2 border-[#157A3F] bg-white shadow-sm">
              {!isFlipped ? (
                <div className="flex h-full flex-col">
                  <header className="flex items-center justify-between bg-[#157A3F] px-3 py-1 text-white">
                    <div>
                      <h2 className="text-sm font-bold leading-tight">جهاز تنمية وتطوير الجنوب</h2>
                      <p className="mt-1 text-[10px] text-green-100">بطاقة تعريف موظف</p>
                    </div>
                    <img src="/logo.jpg" alt="شعار الجهاز" className="h-16 w-16 shrink-0 rounded-full border-2 border-white bg-white object-cover p-1" />
                  </header>

                  <div className="flex min-h-0 flex-1 gap-3 p-2">
                    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border bg-gray-100 text-gray-400" aria-label="صورة الموظف">
                      {selectedEmp.photo_url ? (
                        <img src={selectedEmp.photo_url} alt={`صورة ${selectedEmp.full_name}`} className="h-full w-full object-cover" />
                      ) : (
                        <>
                          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span className="mt-1 text-[8px] font-semibold">صورة شخصية</span>
                        </>
                      )}
                    </div>
                    <div className="min-w-0 space-y-1 text-xs">
                      <p><span className="block text-[10px] text-gray-500">الاسم الرباعي</span><span className="font-bold">{selectedEmp.full_name}</span></p>
                      <p><span className="text-gray-500">الوظيفة: </span><span className="font-semibold">{selectedEmp.job_title || 'غير محدد'}</span></p>
                      <p><span className="text-gray-500">القسم: </span><span className="font-semibold">{selectedEmp.department || 'غير محدد'}</span></p>
                    </div>
                  </div>

                  <footer className="border-t bg-gray-50 px-2 py-1 text-[9px]">
                    <div className="flex justify-between">
                      <p><span className="text-gray-500">الرقم الوظيفي: </span><span className="font-bold" dir="ltr">{selectedEmp.employee_number || '---'}</span></p>
                      <p><span className="text-gray-500">الفرع: </span><span className="font-bold">{selectedEmp.branch || 'الإدارة الرئيسيه / طرابلس'}</span></p>
                    </div>
                    <p className="mt-1 text-center text-[8px] text-gray-500">هذه البطاقة تخضع لشروط الاستخدام</p>
                  </footer>
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <header className="bg-[#157A3F] px-3 py-2 text-center text-white">
                    <h2 className="text-sm font-bold">شروط الاستخدام</h2>
                    <p className="text-[10px] text-green-100">جهاز تنمية وتطوير الجنوب</p>
                  </header>
                  <div className="flex min-h-0 flex-1 items-center justify-between gap-3 p-3">
                    <div className="text-[10px] leading-relaxed text-gray-700">
                      <p>هذه البطاقة ملك لجهاز تنمية وتطوير الجنوب. يرجى تسهيل مهام حاملها وتقديم المساعدة اللازمة له.</p>
                    </div>
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-dashed border-gray-400 bg-white p-1" aria-label="مكان مخصص للباركود">
                      <div className="h-full w-full border border-gray-200" />
                    </div>
                  </div>
                  <footer className="border-t bg-gray-50 px-3 py-1 text-center text-[9px] text-gray-500">
                    في حال العثور عليها، يرجى إعادتها إلى أقرب مكتب للجهاز.
                  </footer>
                </div>
              )}
            </article>
          </div>
        )}

        {/* Edit/Add Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 relative my-8">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 left-4 text-gray-500 hover:text-red-500 font-bold text-xl">✕</button>
              <h2 className="text-xl font-bold mb-4">{editingId ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h2>
              
              <div className="flex border-b mb-4 text-sm font-semibold">
                <button type="button" onClick={() => setActiveTab('basic')} className={`px-4 py-2 ${activeTab === 'basic' ? 'text-[#157A3F] border-b-2 border-[#157A3F]' : 'text-gray-500'}`}>البيانات الأساسية</button>
                <button type="button" onClick={() => setActiveTab('academic')} className={`px-4 py-2 ${activeTab === 'academic' ? 'text-[#157A3F] border-b-2 border-[#157A3F]' : 'text-gray-500'}`}>المؤهلات العلمية</button>
                <button type="button" onClick={() => setActiveTab('job')} className={`px-4 py-2 ${activeTab === 'job' ? 'text-[#157A3F] border-b-2 border-[#157A3F]' : 'text-gray-500'}`}>البيانات الوظيفية</button>
                <button type="button" onClick={() => setActiveTab('additional')} className={`px-4 py-2 ${activeTab === 'additional' ? 'text-[#157A3F] border-b-2 border-[#157A3F]' : 'text-gray-500'}`}>بيانات إضافية</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm mb-1">الاسم الرباعي *</label><input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">الرقم الوطني</label><input type="text" value={formData.national_id} onChange={(e) => setFormData({...formData, national_id: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">تاريخ الميلاد</label><input type="date" value={formData.birth_date} onChange={(e) => setFormData({...formData, birth_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">مكان الميلاد</label><input type="text" value={formData.birth_place} onChange={(e) => setFormData({...formData, birth_place: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">الجنسية</label><input type="text" value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div>
                      <label className="block text-sm mb-1">الجنس</label>
                      <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full rounded-lg border px-4 py-2">
                        <option value="">غير محدد</option>
                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                      </select>
                    </div>
                    <div><label className="block text-sm mb-1">الحالة الاجتماعية</label><input type="text" value={formData.social_status} onChange={(e) => setFormData({...formData, social_status: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">رقم الهاتف</label><input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">البريد الإلكتروني</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div className="md:col-span-2"><label className="block text-sm mb-1">مكان الإقامة</label><input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm">الصورة الشخصية للبطاقة</label>
                      <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="w-full rounded-lg border px-4 py-2 disabled:cursor-wait disabled:opacity-60" />
                      {uploading && <p className="mt-1 text-xs text-gray-500">جارٍ رفع الصورة...</p>}
                      {formData.photo_url && (
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-xs text-green-700">تم رفع الصورة بنجاح.</p>
                          <button type="button" onClick={handleDeletePhoto} disabled={uploading} className="rounded-md bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100 disabled:cursor-wait disabled:opacity-60">حذف الصورة</button>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {activeTab === 'academic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm mb-1">المؤهل العلمي</label><input type="text" value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">التخصص</label><input type="text" value={formData.major} onChange={(e) => setFormData({...formData, major: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div className="md:col-span-2"><label className="block text-sm mb-1">جهة التخرج</label><input type="text" value={formData.university} onChange={(e) => setFormData({...formData, university: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                  </div>
                )}

                {activeTab === 'job' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm mb-1">الوظيفة</label><input type="text" value={formData.job_title} onChange={(e) => setFormData({...formData, job_title: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">الإدارة/القسم</label><input type="text" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div>
                      <label className="mb-1 block text-sm">الإدارة/المكتب</label>
                      <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} className="w-full rounded-lg border px-4 py-2">
                        <option value="">غير محددة</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.type ? `${department.name} - ${department.type}` : department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">المدير المباشر</label>
                      <select value={formData.direct_manager_id} onChange={(e) => setFormData({ ...formData, direct_manager_id: e.target.value })} className="w-full rounded-lg border px-4 py-2">
                        <option value="">غير محدد</option>
                        {employees.filter((employee) => employee.id !== editingId).map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.full_name}{employee.job_title ? ` - ${employee.job_title}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1 font-bold text-blue-700">الفرع</label>
                      <select value={formData.branch} onChange={(e) => setFormData({...formData, branch: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                        <option value="الإدارة الرئيسيه / طرابلس">الإدارة الرئيسيه / طرابلس</option>
                        <option value="سبها">سبها</option>
                        <option value="أوباري">أوباري</option>
                        <option value="الجفرة">الجفرة</option>
                        <option value="غات">غات</option>
                        <option value="براك الشاطئ">براك الشاطئ</option>
                        <option value="حوض مرزق">حوض مرزق</option>
                      </select>
                    </div>
                    <div><label className="block text-sm mb-1">الدرجة</label><input type="text" value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">الفئة</label><input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">الرتبة</label><input type="text" value={formData.rank} onChange={(e) => setFormData({...formData, rank: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">تاريخ آخر ترقية</label><input type="date" value={formData.last_promotion_date} onChange={(e) => setFormData({...formData, last_promotion_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div>
                      <label className="block text-sm mb-1">نوع الوظيفة</label>
                      <select value={formData.job_type} onChange={(e) => setFormData({...formData, job_type: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                        <option value="دائم">دائم</option>
                        <option value="عقد">عقد</option>
                        <option value="مؤقت">مؤقت</option>
                      </select>
                    </div>
                    <div><label className="block text-sm mb-1">تاريخ التعيين</label><input type="date" value={formData.hire_date} onChange={(e) => setFormData({...formData, hire_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm mb-1">تاريخ مباشرة العمل</label><input type="date" value={formData.work_start_date} onChange={(e) => setFormData({...formData, work_start_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div>
                      <label className="block text-sm mb-1">الحالة الوظيفية</label>
                      <select value={formData.employment_status} onChange={(e) => setFormData({
                        ...formData,
                        employment_status: e.target.value,
                        delegation_start_date: ['delegated', 'seconded'].includes(e.target.value) ? formData.delegation_start_date : ''
                      })} className="w-full px-4 py-2 border rounded-lg">
                        <option value="on_duty">تعيين</option>
                        <option value="delegated">ندب</option>
                        <option value="seconded">إعارة</option>
                        <option value="transferred">نقل</option>
                        <option value="terminated">انتهاء خدمة</option>
                      </select>
                    </div>
                    <div><label className="block text-sm mb-1">جهة الندب/الإعارة</label><input type="text" value={formData.delegation_entity} onChange={(e) => setFormData({...formData, delegation_entity: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    {['delegated', 'seconded'].includes(formData.employment_status) && (
                      <>
                        <div>
                          <label className="block text-sm mb-1">تاريخ بداية الندب/الإعارة</label>
                          <input type="date" value={formData.delegation_start_date} onChange={(e) => setFormData({...formData, delegation_start_date: e.target.value})} className="w-full rounded-lg border px-4 py-2" />
                        </div>
                        <div>
                          <label className="block text-sm mb-1">تاريخ نهاية الندب/الإعارة</label>
                          <input type="date" value={formData.delegation_end_date} min={formData.delegation_start_date || undefined} onChange={(e) => setFormData({...formData, delegation_end_date: e.target.value})} className="w-full rounded-lg border px-4 py-2" />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'additional' && (
                  <div>
                    <label className="block text-sm mb-1">ملاحظات عامة</label>
                    <textarea
                      rows={6}
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="أدخل أي ملاحظات إضافية عن الموظف..."
                    />
                  </div>
                )}

                <div className="pt-6 flex gap-4 border-t mt-4">
                  <button type="submit" disabled={uploading} className="flex-1 bg-[#157A3F] text-white py-3 rounded-lg font-bold disabled:cursor-wait disabled:opacity-60">حفظ البيانات</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-200 py-3 rounded-lg font-bold">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}