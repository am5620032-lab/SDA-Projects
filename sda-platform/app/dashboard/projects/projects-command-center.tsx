'use client'

import { useMemo, useState, type FormEvent } from 'react'
import {
  Activity,
  Banknote,
  Building2,
  Check,
  ChevronLeft,
  CircleAlert,
  FilePlus2,
  MapPinned,
  PauseCircle,
  Sprout,
  X,
} from 'lucide-react'
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
import {
  createProject,
  getProjects,
  getProjectsStats,
  type DevelopmentProject,
  type ProjectFilters,
  type ProjectInput,
  type ProjectStats,
} from './actions'
import { projectPriorities, projectSectors, projectStatuses } from './project-options'

const municipalities = [
  'سبها', 'مرزق', 'أوباري', 'غات', 'بنت بية', 'وادي عتبة', 'الشاطئ',
  'الجفرة', 'القطرون', 'تراغن', 'تازربو', 'الكفرة', 'ربيانة', 'العوينات',
]

const sectorsColors: Record<string, string> = {
  زراعة: '#84cc16',
  تعليم: '#38bdf8',
  صحة: '#f472b6',
  'بنية تحتية': '#fbbf24',
  إعمار: '#fb7185',
}

const priorityClasses: Record<string, string> = {
  حرجة: 'border-red-500/50 bg-red-500/15 text-red-300',
  عالية: 'border-orange-400/50 bg-orange-400/15 text-orange-300',
  متوسطة: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  منخفضة: 'border-slate-500/50 bg-slate-500/15 text-slate-300',
}

const statusClasses: Record<string, string> = {
  منجز: 'bg-emerald-400/10 text-emerald-300',
  'قيد التنفيذ': 'bg-sky-400/10 text-sky-300',
  'قيد الدراسة': 'bg-violet-400/10 text-violet-300',
  مقترح: 'bg-slate-400/10 text-slate-300',
  متوقف: 'bg-rose-400/10 text-rose-300',
}

const emptyStats: ProjectStats = {
  totalProjects: 0,
  agriculturalArea: 0,
  stoppedProjects: 0,
  totalBudget: 0,
}

const initialForm: ProjectInput = {
  project_name: '',
  sector: projectSectors[0],
  municipality: '',
  location_details: '',
  area_size: 0,
  estimated_budget: 0,
  funding_source: 'خزانة الدولة',
  priority_level: 'متوسطة',
  status: 'مقترح',
  required_intervention: '',
  description: '',
}

const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('ar-LY', { maximumFractionDigits }).format(value)

function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  accent,
  note,
}: {
  label: string
  value: string
  unit: string
  icon: typeof Building2
  accent: string
  note: string
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-xl shadow-black/10">
      <div className={`absolute inset-y-0 right-0 w-1 ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{unit}</p>
        </div>
        <span className="rounded-xl border border-white/10 bg-white/5 p-3 text-amber-300">
          <Icon size={22} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 border-t border-white/10 pt-3 text-xs text-slate-500">{note}</p>
    </article>
  )
}

export default function ProjectsCommandCenter({
  initialProjects,
  initialStats,
  initialError,
}: {
  initialProjects: DevelopmentProject[]
  initialStats: ProjectStats | null
  initialError: string
}) {
  const [projects, setProjects] = useState(initialProjects)
  const [stats, setStats] = useState(initialStats ?? emptyStats)
  const [filters, setFilters] = useState<ProjectFilters>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'finance' | 'needs'>('basic')
  const [form, setForm] = useState<ProjectInput>(initialForm)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialError)
  const [successMessage, setSuccessMessage] = useState('')

  const sectorData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const project of projects) counts.set(project.sector, (counts.get(project.sector) ?? 0) + 1)
    return [...counts.entries()].map(([name, value]) => ({ name, value }))
  }, [projects])

  const municipalityData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const project of projects) counts.set(project.municipality, (counts.get(project.municipality) ?? 0) + 1)
    return [...counts.entries()]
      .map(([name, count]) => ({ name, projects: count }))
      .sort((first, second) => second.projects - first.projects)
      .slice(0, 12)
  }, [projects])

  const municipalityOptions = useMemo(() => {
    const values = new Set([...municipalities, ...initialProjects.map((project) => project.municipality)])
    return [...values].sort((a, b) => a.localeCompare(b, 'ar'))
  }, [initialProjects])

  const applyFilters = async (nextFilters: ProjectFilters) => {
    setBusy(true)
    setErrorMessage('')
    setFilters(nextFilters)
    try {
      const result = await getProjects(nextFilters)
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      setProjects(result.projects)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل المشاريع.')
    } finally {
      setBusy(false)
    }
  }

  const onFilterChange = (key: keyof ProjectFilters, value: string) => {
    const nextFilters = { ...filters, [key]: value || undefined }
    void applyFilters(nextFilters)
  }

  const submitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await createProject(form)
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      setSuccessMessage(`أُضيف المشروع ${result.project.project_code} بنجاح.`)
      setForm(initialForm)
      setActiveTab('basic')
      setModalOpen(false)
      const [projectsResult, statsResult] = await Promise.all([getProjects(filters), getProjectsStats()])
      if ('error' in projectsResult) setErrorMessage(projectsResult.error)
      else setProjects(projectsResult.projects)
      if ('stats' in statsResult) setStats(statsResult.stats)
      else setErrorMessage((current) => [current, statsResult.error].filter(Boolean).join(' '))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر إضافة المشروع.')
    } finally {
      setBusy(false)
    }
  }

  const filtersView = (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <select aria-label="فلترة القطاع" value={filters.sector ?? ''} onChange={(event) => onFilterChange('sector', event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-200">
        <option value="">كل القطاعات</option>
        {projectSectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
      </select>
      <select aria-label="فلترة البلدية" value={filters.municipality ?? ''} onChange={(event) => onFilterChange('municipality', event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-200">
        <option value="">كل البلديات</option>
        {municipalityOptions.map((municipality) => <option key={municipality} value={municipality}>{municipality}</option>)}
      </select>
      <select aria-label="فلترة الحالة" value={filters.status ?? ''} onChange={(event) => onFilterChange('status', event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-200">
        <option value="">كل الحالات</option>
        {projectStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <select aria-label="فلترة الأولوية" value={filters.priority ?? ''} onChange={(event) => onFilterChange('priority', event.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-200">
        <option value="">كل الأولويات</option>
        {projectPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
      </select>
    </div>
  )

  const formField = (
    label: string,
    key: keyof ProjectInput,
    options?: readonly string[],
    type = 'text',
    required = false,
  ) => (
    <label key={key} className="block text-sm font-medium text-slate-300">
      {label}
      {options ? (
        <select
          required={required}
          value={String(form[key])}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white"
        >
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          required={required}
          type={type}
          min={type === 'number' ? 0 : undefined}
          step={type === 'number' ? 'any' : undefined}
          value={String(form[key])}
          onChange={(event) => setForm({
            ...form,
            [key]: type === 'number' ? Number(event.target.value) : event.target.value,
          })}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-amber-300"
        />
      )}
    </label>
  )

  return (
    <main dir="rtl" className="min-h-screen bg-[#07111f] p-4 font-sans text-white md:p-7 xl:p-9">
      <div className="mx-auto max-w-[1600px]">
        <header className="relative mb-6 overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-l from-[#172b39] via-[#10202d] to-[#0c1724] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold tracking-wide text-emerald-200">
                <Activity size={14} aria-hidden="true" /> مركز القيادة الاستراتيجي
              </div>
              <h1 className="text-3xl font-black leading-tight text-white md:text-4xl">منظومة المشروعات والاستثمار الوطنية</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                صورة تنفيذية موحّدة لمحفظة التنمية في الجنوب، لمتابعة الأولويات والاحتياجات والتمويل عبر البلديات والقطاعات.
              </p>
              <p className="mt-4 text-xs font-semibold tracking-widest text-amber-300/80">جهاز تنمية وتطوير الجنوب · لوحة الموقف التنفيذي</p>
            </div>
            <button
              type="button"
              onClick={() => { setErrorMessage(''); setModalOpen(true) }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-amber-300 to-yellow-500 px-5 py-3.5 font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5"
            >
              <FilePlus2 size={19} aria-hidden="true" /> إضافة مشروع جديد
            </button>
          </div>
          <div className="relative mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> لوحة المتابعة متصلة</span>
            <span>آخر تحديث: {new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}</span>
            <span>المشاريع المعروضة: {formatNumber(projects.length)}</span>
          </div>
        </header>

        {errorMessage && (
          <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200">
            <CircleAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />{errorMessage}
          </p>
        )}
        {successMessage && (
          <p role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
            <Check size={18} aria-hidden="true" />{successMessage}
          </p>
        )}

        <section aria-label="مؤشرات الأداء الرئيسية" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="إجمالي المشاريع" value={formatNumber(stats.totalProjects)} unit="مشروع ضمن المحفظة الوطنية" icon={Building2} accent="bg-sky-400" note="محفظة التنمية والاستثمار" />
          <KpiCard label="المساحات الزراعية" value={formatNumber(stats.agriculturalArea, 2)} unit="هكتار" icon={Sprout} accent="bg-lime-400" note="إجمالي المساحات المسجلة للقطاع الزراعي" />
          <KpiCard label="مشاريع متوقفة" value={formatNumber(stats.stoppedProjects)} unit="مشروع يحتاج إلى تدخل" icon={PauseCircle} accent="bg-rose-400" note="أولوية المعالجة وإعادة الإعمار" />
          <KpiCard label="الميزانيات التقديرية" value={formatNumber(stats.totalBudget)} unit="دينار ليبي" icon={Banknote} accent="bg-amber-300" note="إجمالي الاحتياج المالي للمحفظة" />
        </section>

        <section aria-label="تحليل توزيع المحفظة" className="mb-6 grid gap-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-xl shadow-black/10 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">توزيع المشاريع على البلديات</h2>
                <p className="mt-1 text-xs text-slate-500">أعلى 12 بلدية حسب عدد المشاريع</p>
              </div>
              <MapPinned className="text-sky-300" size={21} aria-hidden="true" />
            </div>
            <div className="h-72">
              {municipalityData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={municipalityData} margin={{ top: 5, right: 6, left: -18, bottom: 5 }}>
                    <CartesianGrid stroke="#ffffff12" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0f1d2b', border: '1px solid #334155', borderRadius: 12, color: '#fff' }} />
                    <Bar dataKey="projects" name="عدد المشاريع" fill="#38bdf8" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">لا توجد بيانات بلديات بعد.</div>}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-xl shadow-black/10 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">توزيع القطاعات</h2>
                <p className="mt-1 text-xs text-slate-500">تركيبة محفظة التنمية حسب القطاع</p>
              </div>
              <Building2 className="text-amber-300" size={21} aria-hidden="true" />
            </div>
            <div className="h-72">
              {sectorData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={62} outerRadius={100} paddingAngle={3} stroke="none">
                      {sectorData.map((entry) => <Cell key={entry.name} fill={sectorsColors[entry.name] ?? '#94a3b8'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f1d2b', border: '1px solid #334155', borderRadius: 12, color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value: string) => <span className="text-xs text-slate-300">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">لا توجد بيانات قطاعات بعد.</div>}
            </div>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl shadow-black/10">
          <div className="border-b border-white/10 p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">سجل محفظة المشروعات</h2>
                <p className="mt-1 text-sm text-slate-500">عرض ومقارنة المبادرات الاستراتيجية حسب الحالة والأولوية</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">{formatNumber(projects.length)} مشروع</span>
            </div>
            {filtersView}
          </div>
          {busy && <div className="h-1 animate-pulse bg-gradient-to-l from-amber-300 via-sky-400 to-emerald-400" />}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-right text-sm">
              <thead className="bg-slate-950/60 text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-4">المشروع</th>
                  <th className="px-4 py-4">القطاع / البلدية</th>
                  <th className="px-4 py-4">الأولوية</th>
                  <th className="px-4 py-4">الحالة</th>
                  <th className="px-4 py-4">المساحة</th>
                  <th className="px-4 py-4">الميزانية التقديرية</th>
                  <th className="px-4 py-4">مصدر التمويل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {projects.map((project) => (
                  <tr key={project.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-4">
                      <p className="font-bold text-white">{project.project_name}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500" dir="ltr">{project.project_code}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-200">{project.sector}</p>
                      <p className="mt-1 text-xs text-slate-500">{project.municipality}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${priorityClasses[project.priority_level] ?? priorityClasses['منخفضة']}`}>
                        <span className={`ml-1.5 mt-1 h-1.5 w-1.5 rounded-full ${project.priority_level === 'حرجة' ? 'bg-red-400' : project.priority_level === 'عالية' ? 'bg-orange-400' : 'bg-current'}`} />
                        {project.priority_level}
                      </span>
                    </td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[project.status] ?? statusClasses['مقترح']}`}>{project.status}</span></td>
                    <td className="px-4 py-4 tabular-nums text-slate-300">{formatNumber(Number(project.area_size) || 0, 2)} <span className="text-xs text-slate-500">هكتار</span></td>
                    <td className="px-4 py-4 tabular-nums font-semibold text-amber-200">{formatNumber(Number(project.estimated_budget) || 0)} <span className="text-xs font-normal text-slate-500">د.ل</span></td>
                    <td className="px-4 py-4 text-slate-400">{project.funding_source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!projects.length && (
              <div className="px-6 py-14 text-center">
                <Building2 className="mx-auto mb-3 text-slate-600" size={32} aria-hidden="true" />
                <p className="font-semibold text-slate-300">لا توجد مشاريع مطابقة</p>
                <p className="mt-1 text-sm text-slate-500">أضف مشروعاً جديداً أو غيّر معايير التصفية.</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-slate-950/40 px-5 py-3 text-xs text-slate-500">
            <span>يعرض السجل المحفظة المتاحة حسب الفلاتر المختارة</span>
            <span>بيانات للمراجعة الاستراتيجية واتخاذ القرار</span>
          </div>
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6">
          <section role="dialog" aria-modal="true" aria-labelledby="new-project-title" className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0c1724] shadow-2xl shadow-black/50">
            <header className="flex items-start justify-between border-b border-white/10 bg-gradient-to-l from-[#172b39] to-[#0c1724] p-5 sm:p-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-amber-300"><FilePlus2 size={15} /> محفظة التنمية الوطنية</div>
                <h2 id="new-project-title" className="text-xl font-black sm:text-2xl">تسجيل مشروع استراتيجي</h2>
                <p className="mt-1 text-sm text-slate-400">سيُنشأ كود المشروع تلقائياً عند الحفظ.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="إغلاق" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={20} /></button>
            </header>

            <div className="grid grid-cols-3 gap-1 border-b border-white/10 bg-slate-950/60 p-2">
              {([
                ['basic', 'البيانات الأساسية', '01'],
                ['finance', 'البيانات المالية', '02'],
                ['needs', 'الاحتياجات', '03'],
              ] as const).map(([tab, title, number]) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-2 py-3 text-center transition sm:px-4 ${activeTab === tab ? 'bg-amber-300/10 text-amber-200 ring-1 ring-amber-300/20' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'}`}>
                  <span className="block text-[10px] font-bold tracking-widest opacity-60">{number}</span>
                  <span className="mt-1 block text-xs font-bold sm:text-sm">{title}</span>
                </button>
              ))}
            </div>

            <form onSubmit={submitProject}>
              <div className="max-h-[55vh] min-h-64 overflow-y-auto p-5 sm:p-6">
                {activeTab === 'basic' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {formField('اسم المشروع', 'project_name', undefined, 'text', true)}
                    {formField('القطاع', 'sector', projectSectors, 'text', true)}
                    {formField('البلدية', 'municipality', municipalityOptions, 'text', true)}
                    {formField('الأولوية', 'priority_level', projectPriorities, 'text', true)}
                    {formField('الحالة', 'status', projectStatuses, 'text', true)}
                    {formField('المساحة (هكتار)', 'area_size', undefined, 'number')}
                    <label className="block text-sm font-medium text-slate-300 sm:col-span-2">
                      الوصف الجغرافي
                      <textarea rows={2} maxLength={1000} value={form.location_details} onChange={(event) => setForm({ ...form, location_details: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-amber-300" />
                    </label>
                    <label className="block text-sm font-medium text-slate-300 sm:col-span-2">
                      وصف المشروع
                      <textarea rows={3} maxLength={3000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-amber-300" />
                    </label>
                  </div>
                )}
                {activeTab === 'finance' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {formField('الميزانية التقديرية (دينار ليبي)', 'estimated_budget', undefined, 'number')}
                    {formField('مصدر التمويل', 'funding_source', ['خزانة الدولة', 'استثمار أجنبي', 'شراكة', 'مصادر أخرى'], 'text', true)}
                    <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-7 text-slate-300 sm:col-span-2">
                      <Banknote className="mb-2 text-amber-300" size={20} aria-hidden="true" />
                      أدخل القيمة التقديرية بالدينار الليبي. ستُحتسب ضمن المؤشر الإجمالي للمحفظة فور تسجيل المشروع.
                    </div>
                  </div>
                )}
                {activeTab === 'needs' && (
                  <div className="grid gap-4">
                    {formField('التدخل المطلوب', 'required_intervention', ['تمويل', 'إخلاء ملكية', 'دراسات', 'تمويل وإخلاء ملكية', 'تمويل ودراسات', 'إخلاء ملكية ودراسات', 'تمويل وإخلاء ملكية ودراسات', 'أخرى'])}
                    <label className="block text-sm font-medium text-slate-300">
                      تفاصيل التدخل والاحتياجات
                      <textarea rows={5} maxLength={2000} value={form.required_intervention} onChange={(event) => setForm({ ...form, required_intervention: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-amber-300" />
                    </label>
                    <p className="text-xs leading-6 text-slate-500">وضّح متطلبات التمكين، أو تسوية الملكية، أو الدراسات الفنية اللازمة للبدء أو استئناف التنفيذ.</p>
                  </div>
                )}
              </div>

              {errorMessage && <p role="alert" className="mx-5 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200 sm:mx-6">{errorMessage}</p>}
              <footer className="flex items-center justify-between gap-3 border-t border-white/10 p-5 sm:p-6">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-400 hover:bg-white/5 hover:text-white">إلغاء</button>
                <div className="flex gap-2">
                  {activeTab !== 'basic' && (
                    <button type="button" onClick={() => setActiveTab(activeTab === 'needs' ? 'finance' : 'basic')} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5">
                      <ChevronLeft size={16} /> السابق
                    </button>
                  )}
                  {activeTab !== 'needs' ? (
                    <button type="button" onClick={() => setActiveTab(activeTab === 'basic' ? 'finance' : 'needs')} className="rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-200">
                      التالي
                    </button>
                  ) : (
                    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-amber-300 to-yellow-500 px-5 py-2.5 text-sm font-black text-slate-950 disabled:cursor-wait disabled:opacity-60">
                      {busy ? 'جارٍ تسجيل المشروع...' : <><Check size={17} /> حفظ المشروع</>}
                    </button>
                  )}
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
