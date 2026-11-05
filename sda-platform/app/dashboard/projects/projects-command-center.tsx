'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  Banknote,
  Building2,
  Check,
  ChevronLeft,
  Clock3,
  CircleAlert,
  FilePlus2,
  MapPinned,
  PauseCircle,
  Search,
  Sprout,
  TriangleAlert,
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
  verifyProject,
  type DevelopmentProject,
  type ProjectFilters,
  type ProjectInput,
  type ProjectStats,
} from './actions'
import { projectPriorities, projectSectors, projectStatuses } from './project-options'
import type { InvestmentOpportunityRow } from './strategic-actions'

const municipalities = [
  'سبها', 'مرزق', 'أوباري', 'غات', 'بنت بية', 'وادي عتبة', 'الشاطئ',
  'الجفرة', 'القطرون', 'تراغن', 'تازربو', 'الكفرة', 'ربيانة', 'العوينات',
]

const sectorColors: Record<string, string> = {
  زراعة: '#10B981',
  تعليم: '#A855F7',
  صحة: '#F43F5E',
  'بنية تحتية': '#8B5CF6',
  إعمار: '#2563EB',
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
  inProgressProjects: 0,
  overdueProjects: 0,
  completedProjects: 0,
  overallCompletionPercentage: 0,
  agriculturalLandCount: 0,
  investmentOpportunitiesCount: 0,
  geographicDistribution: 0,
  projectsByStatus: projectStatuses.map((status) => ({ status, count: 0 })),
  budgetBySector: projectSectors.map((sector) => ({ sector, budget: 0 })),
  municipalitiesRanked: [],
  latestProjects: [],
  urgentProjects: [],
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
  completion_percentage: 0,
  start_date: '',
  end_date: '',
  contractor_name: '',
  contractor_company: '',
  supervising_entity: '',
  engineer_name: '',
  planned_completion_percentage: 0,
  actual_completion_percentage: 0,
  financial_completion_percentage: 0,
  delay_reasons: '',
  latitude: null,
  longitude: null,
}

const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('ar-LY', { maximumFractionDigits }).format(value)

function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  accent,
  gradient,
  valueTone,
  iconTone,
  note,
}: {
  label: string
  value: string
  unit: string
  icon: typeof Building2
  accent: string
  gradient: string
  valueTone: string
  iconTone: string
  note: string
}) {
  return (
    <article className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-5 shadow-[0_0_30px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-white/20`}>
      <div className={`pointer-events-none absolute -left-12 -top-14 h-36 w-36 rounded-full ${accent} opacity-[0.08] blur-3xl transition-opacity duration-300 group-hover:opacity-20`} />
      <div className={`absolute inset-y-0 right-0 w-1 ${accent} shadow-[0_0_12px_currentColor]`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className={`mt-4 bg-gradient-to-l bg-clip-text font-black tracking-tight text-transparent ${value.startsWith('لم ') ? 'from-slate-300 to-slate-500' : valueTone} ${value.length > 12 ? 'text-sm leading-6 sm:text-base' : 'text-3xl sm:text-4xl'}`}>{value}</p>
          <p className="mt-2 text-xs text-slate-500">{unit}</p>
        </div>
        <span className="rounded-xl border border-white/10 bg-white/5 p-3 transition-colors duration-300 group-hover:bg-white/10">
          <Icon size={22} className={iconTone} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 border-t border-white/10 pt-3 text-xs text-slate-500">{note}</p>
    </article>
  )
}

export default function ProjectsCommandCenter({
  initialProjects,
  initialStats,
  canVerify,
  initialError,
  initialOpportunities = [],
  view = 'dashboard',
}: {
  initialProjects: DevelopmentProject[]
  initialStats: ProjectStats | null
  canVerify: boolean
  initialError: string
  initialOpportunities?: InvestmentOpportunityRow[]
  view?: 'dashboard' | 'database'
}) {
  const [projects, setProjects] = useState(initialProjects)
  const [stats, setStats] = useState(initialStats ?? emptyStats)
  const [opportunities] = useState(initialOpportunities)
  const [filters, setFilters] = useState<ProjectFilters>({})
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'finance' | 'needs'>('basic')
  const [form, setForm] = useState<ProjectInput>(initialForm)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialError)
  const [successMessage, setSuccessMessage] = useState('')
  const [verifyingProjectId, setVerifyingProjectId] = useState<string | null>(null)

  const municipalityOptions = useMemo(() => {
    const values = new Set([...municipalities, ...initialProjects.map((project) => project.municipality)])
    return [...values].sort((a, b) => a.localeCompare(b, 'ar'))
  }, [initialProjects])
  const visibleProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ar')
    if (!query) return projects
    return projects.filter((project) =>
      project.project_name.toLocaleLowerCase('ar').includes(query)
      || project.project_code.toLocaleLowerCase('ar').includes(query),
    )
  }, [projects, search])
  const projectsBySector = useMemo(() => {
    const counts = new Map<string, number>()
    for (const project of projects) counts.set(project.sector, (counts.get(project.sector) ?? 0) + 1)
    return projectSectors
      .map((sector) => ({ sector, count: counts.get(sector) ?? 0 }))
      .filter((entry) => entry.count > 0)
  }, [projects])

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
      const projectsResult = await getProjects(filters)
      if ('error' in projectsResult) setErrorMessage(projectsResult.error)
      else setProjects(projectsResult.projects)
      if (view === 'dashboard') {
        const statsResult = await getProjectsStats()
        if ('stats' in statsResult) setStats(statsResult.stats)
        else setErrorMessage((current) => [current, statsResult.error].filter(Boolean).join(' '))
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر إضافة المشروع.')
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyProject = async (project: DevelopmentProject) => {
    setVerifyingProjectId(project.id)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const result = await verifyProject(project.id)
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }

      setProjects((current) => current.map((item) => item.id === project.id ? result.project : item))
      if (view === 'dashboard') {
        const statsResult = await getProjectsStats()
        if ('stats' in statsResult) setStats(statsResult.stats)
        else setErrorMessage(statsResult.error)
      }
      setSuccessMessage(`تم توثيق بيانات المشروع ${project.project_code}.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر توثيق بيانات المشروع.')
    } finally {
      setVerifyingProjectId(null)
    }
  }

  const filtersView = (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <label className="relative block text-sm">
        <Search size={16} aria-hidden="true" className="absolute right-3 top-3 text-slate-500" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث باسم المشروع أو رقمه"
          aria-label="البحث عن مشروع"
          className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 pe-9 ps-3 text-sm text-slate-200 placeholder:text-slate-500"
        />
      </label>
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
          max={type === 'number' && String(key).includes('percentage') ? 100 : undefined}
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
    <main dir="rtl" className="min-h-screen bg-[#0F172A] p-4 font-sans text-white md:p-7 xl:p-9">
      <div className="mx-auto max-w-[1600px]">
        <header className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-l from-blue-950/70 via-slate-900 to-[#0c1724] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold tracking-wide text-emerald-200">
                <Activity size={14} aria-hidden="true" /> {view === 'dashboard' ? 'مركز القيادة الاستراتيجي' : 'قاعدة بيانات المشاريع'}
              </div>
              <h1 className="text-3xl font-black leading-tight text-white md:text-4xl">{view === 'dashboard' ? 'منظومة المشروعات والاستثمار الوطنية' : 'قاعدة بيانات المشاريع'}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                {view === 'dashboard'
                  ? 'صورة تنفيذية موحّدة لمحفظة التنمية في الجنوب، لمتابعة الأولويات والاحتياجات والتمويل عبر البلديات والقطاعات.'
                  : 'استعرض بيانات المشاريع وابحث عنها وصفّها حسب القطاع والبلدية والحالة والأولوية.'}
              </p>
              {view === 'dashboard' && <p className="mt-4 text-xs font-semibold tracking-widest text-emerald-300/80">جهاز تنمية وتطوير الجنوب · لوحة الموقف التنفيذي</p>}
            </div>
            <button
              type="button"
              onClick={() => { setErrorMessage(''); setModalOpen(true) }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-black text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] hover:bg-blue-500"
            >
              <FilePlus2 size={19} aria-hidden="true" /> إضافة مشروع جديد
            </button>
          </div>
          <div className="relative mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> {view === 'dashboard' ? 'لوحة المتابعة متصلة' : 'قاعدة المشاريع متصلة'}</span>
            <span>آخر تحديث: {new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}</span>
            <span>المشاريع المعروضة: {formatNumber(visibleProjects.length)}</span>
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

        {view === 'dashboard' && <>
        <section aria-label="مؤشرات الأداء الرئيسية" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="إجمالي المشاريع" value={formatNumber(stats.totalProjects)} unit="مشروع في المحفظة" icon={Building2} accent="bg-blue-400" gradient="from-blue-500/20 via-slate-900/90 to-slate-900" valueTone="from-blue-200 to-cyan-400" iconTone="text-blue-300" note="المشاريع الموثقة" />
          <KpiCard label="المشاريع قيد التنفيذ" value={stats.inProgressProjects ? formatNumber(stats.inProgressProjects) : 'لم يتم إدخال بيانات بعد'} unit="مشروع" icon={Activity} accent="bg-sky-400" gradient="from-sky-500/20 via-slate-900/90 to-slate-900" valueTone="from-sky-200 to-cyan-400" iconTone="text-sky-300" note="من المشاريع الموثقة" />
          <KpiCard label="المشاريع المتأخرة" value={stats.overdueProjects ? formatNumber(stats.overdueProjects) : 'لم يتم إدخال بيانات بعد'} unit="تجاوزت تاريخ الانتهاء المخطط" icon={Clock3} accent="bg-rose-400" gradient="from-rose-500/20 via-slate-900/90 to-slate-900" valueTone="from-rose-200 to-red-400" iconTone="text-rose-300" note="من المشاريع الموثقة" />
          <KpiCard label="المشاريع المتوقفة" value={stats.stoppedProjects ? formatNumber(stats.stoppedProjects) : 'لم يتم إدخال بيانات بعد'} unit="مشروع يحتاج إلى تدخل" icon={PauseCircle} accent="bg-rose-400" gradient="from-rose-500/20 via-slate-900/90 to-slate-900" valueTone="from-rose-200 to-red-400" iconTone="text-rose-300" note="من المشاريع الموثقة" />
          <KpiCard label="المشاريع المنجزة" value={stats.completedProjects ? formatNumber(stats.completedProjects) : 'لم يتم إدخال بيانات بعد'} unit="مشروع مكتمل" icon={Check} accent="bg-emerald-400" gradient="from-emerald-500/20 via-slate-900/90 to-slate-900" valueTone="from-emerald-200 to-green-400" iconTone="text-emerald-300" note="من المشاريع الموثقة" />
          <KpiCard label="إجمالي الميزانيات التقديرية" value={stats.totalBudget ? formatNumber(stats.totalBudget) : 'لم يتم إدخال بيانات بعد'} unit="دينار ليبي" icon={Banknote} accent="bg-blue-400" gradient="from-blue-500/20 via-slate-900/90 to-slate-900" valueTone="from-blue-200 to-cyan-400" iconTone="text-blue-300" note="للمشاريع الموثقة" />
          <KpiCard label="نسبة الإنجاز العام" value={stats.overallCompletionPercentage ? `${formatNumber(stats.overallCompletionPercentage, 1)}٪` : 'لم يتم إدخال بيانات بعد'} unit="متوسط إنجاز المحفظة" icon={Activity} accent="bg-violet-400" gradient="from-violet-500/20 via-slate-900/90 to-slate-900" valueTone="from-violet-200 to-fuchsia-400" iconTone="text-violet-300" note="للمشاريع الموثقة" />
          <KpiCard label="الأراضي الزراعية" value={stats.agriculturalLandCount ? formatNumber(stats.agriculturalLandCount) : 'لم يتم إدخال بيانات بعد'} unit="قطعة مسجلة" icon={Sprout} accent="bg-lime-400" gradient="from-lime-500/20 via-slate-900/90 to-slate-900" valueTone="from-lime-200 to-emerald-400" iconTone="text-lime-300" note="من قاعدة الأراضي" />
          <KpiCard label="الفرص الاستثمارية" value={stats.investmentOpportunitiesCount ? formatNumber(stats.investmentOpportunitiesCount) : 'لم يتم إدخال بيانات بعد'} unit="فرصة متاحة" icon={Building2} accent="bg-amber-400" gradient="from-amber-500/20 via-slate-900/90 to-slate-900" valueTone="from-amber-200 to-yellow-400" iconTone="text-amber-300" note="فرص مفتوحة للاستثمار" />
          <KpiCard label="التوزيع الجغرافي" value={stats.geographicDistribution ? formatNumber(stats.geographicDistribution) : 'لم يتم إدخال بيانات بعد'} unit="بلدية ضمن المحفظة" icon={MapPinned} accent="bg-cyan-400" gradient="from-cyan-500/20 via-slate-900/90 to-slate-900" valueTone="from-cyan-200 to-teal-400" iconTone="text-cyan-300" note="بلديات بها مشاريع موثقة" />
        </section>

        <section aria-label="التحليل التنفيذي للمحفظة" className="mb-6 grid gap-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-slate-900/90 p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">توزيع المشاريع حسب القطاع</h2>
                <p className="mt-1 text-xs text-slate-500">عدد المشاريع المسجلة في كل قطاع</p>
              </div>
              <Check className="text-emerald-300" size={21} aria-hidden="true" />
            </div>
            <div className="h-72">
              {projectsBySector.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectsBySector}
                      dataKey="count"
                      nameKey="sector"
                      cx="50%"
                      cy="46%"
                      innerRadius={62}
                      outerRadius={100}
                      paddingAngle={4}
                      stroke="rgba(255,255,255,0.12)"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {projectsBySector.map((entry) => (
                        <Cell
                          key={entry.sector}
                          fill={sectorColors[entry.sector] ?? '#94a3b8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f1d2b', border: '1px solid #334155', borderRadius: 12, color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={32} formatter={(value: string) => <span className="text-xs text-slate-300">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">لا توجد مشاريع لعرض توزيع القطاعات.</div>}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-slate-900/90 p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">الميزانيات حسب القطاع</h2>
                <p className="mt-1 text-xs text-slate-500">القيم التقديرية للمشاريع الموثقة · دينار ليبي</p>
              </div>
              <Banknote className="text-amber-300" size={21} aria-hidden="true" />
            </div>
            <div className="h-72">
              {stats.budgetBySector.some((entry) => entry.budget > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.budgetBySector} margin={{ top: 12, right: 5, left: -8, bottom: 5 }}>
                    <defs>
                      <linearGradient id="sectorBudgetGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#67e8f9" stopOpacity={1} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.45} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#ffffff12" vertical={false} />
                    <XAxis dataKey="sector" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => formatNumber(value)} />
                    <Tooltip contentStyle={{ background: '#0f1d2b', border: '1px solid #334155', borderRadius: 12, color: '#fff' }} />
                    <Bar dataKey="budget" name="الميزانية التقديرية" fill="url(#sectorBudgetGradient)" radius={[6, 6, 0, 0]} maxBarSize={46} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex h-full items-center justify-center text-sm text-slate-500">لا توجد ميزانيات موثقة لعرضها.</div>}
            </div>
          </article>
        </section>

        <section aria-label="الفرص الاستثمارية والخريطة" className="mb-6 grid gap-5 xl:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] md:p-6">
            <header className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">أحدث الفرص الاستثمارية</h2>
                <p className="mt-1 text-xs text-slate-400">الفرص المتاحة حالياً للمستثمرين</p>
              </div>
              <Building2 className="text-emerald-300" size={21} aria-hidden="true" />
            </header>
            <div className="divide-y divide-white/[0.06]">
              {opportunities.slice(0, 5).map((opportunity) => (
                <div key={opportunity.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200">{opportunity.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{opportunity.sector} · {opportunity.estimated_cost ? `${formatNumber(Number(opportunity.estimated_cost))} د.ل` : 'التكلفة تحدد لاحقاً'}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-500">{new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium' }).format(new Date(opportunity.created_at))}</span>
                </div>
              ))}
              {!opportunities.length && <p className="py-8 text-center text-sm text-slate-500">لا توجد فرص استثمارية متاحة حالياً.</p>}
            </div>
          </article>
          <Link href="/dashboard/projects/gis" className="group flex min-h-56 items-center justify-between gap-5 overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-l from-blue-600/20 via-blue-950/40 to-slate-900 p-6 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-blue-300/40 md:p-8">
            <div>
              <p className="text-xs font-bold tracking-wider text-blue-200">نظم المعلومات الجغرافية</p>
              <h2 className="mt-2 text-2xl font-black text-white">الخريطة التفاعلية للمشاريع</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">استكشف مواقع المشاريع ومؤشرات التوزيع الجغرافي في بلديات الجنوب.</p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-blue-500">
                فتح الخريطة <ArrowUpRight size={16} aria-hidden="true" />
              </span>
            </div>
            <MapPinned size={64} strokeWidth={1.2} className="shrink-0 text-blue-300/70" aria-hidden="true" />
          </Link>
        </section>

        <section aria-label="القوائم التحليلية" className="mb-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]">
            <header className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white">ترتيب البلديات</h2>
                <p className="mt-1 text-xs text-slate-500">حصة المشاريع الموثقة من الإجمالي</p>
              </div>
              <MapPinned className="text-sky-300" size={20} aria-hidden="true" />
            </header>
            <div className="space-y-4">
              {stats.municipalitiesRanked.slice(0, 8).map((entry, index) => {
                const share = stats.totalProjects
                  ? Math.min(100, (entry.count / stats.totalProjects) * 100)
                  : 0
                return (
                  <div key={entry.municipality}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span className="font-mono text-xs text-slate-600">{String(index + 1).padStart(2, '0')}</span>
                        {entry.municipality}
                      </span>
                      <span className="font-bold tabular-nums text-sky-200">{formatNumber(entry.count)}</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`حصة بلدية ${entry.municipality}`}
                      aria-valuenow={Math.round(share)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1.5 overflow-hidden rounded-full bg-white/5"
                    >
                      <div className="h-full rounded-full bg-gradient-to-l from-cyan-300 to-sky-500 shadow-[0_0_12px_rgba(56,189,248,0.55)]" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                )
              })}
              {!stats.municipalitiesRanked.length && <p className="py-10 text-center text-sm text-slate-500">لا توجد بيانات بلديات موثقة.</p>}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]">
            <header className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white">أحدث المشاريع</h2>
                <p className="mt-1 text-xs text-slate-500">آخر خمسة مشاريع أُضيفت للمحفظة</p>
              </div>
              <Clock3 className="text-violet-300" size={20} aria-hidden="true" />
            </header>
            <div className="divide-y divide-white/[0.06]">
              {stats.latestProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200">{project.project_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{project.sector} <span className="px-1 text-slate-700">·</span>{project.municipality}</p>
                    <p className="mt-1 text-[11px] text-slate-600">{new Intl.DateTimeFormat('ar-LY', { dateStyle: 'medium' }).format(new Date(project.created_at))}</p>
                  </div>
                  <a
                    href={`#project-${project.id}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-300/15 bg-violet-300/5 px-2.5 py-1.5 text-[11px] font-bold text-violet-200 transition hover:bg-violet-300/10"
                  >
                    عرض <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                </div>
              ))}
              {!stats.latestProjects.length && <p className="py-10 text-center text-sm text-slate-500">لم تُضف مشاريع بعد.</p>}
            </div>
          </article>

          <article className="rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-950/30 via-slate-900/95 to-slate-900 p-5 shadow-xl shadow-rose-950/10 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]">
            <header className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-rose-100">تدخل عاجل</h2>
                <p className="mt-1 text-xs text-rose-200/50">مشاريع حرجة أو متوقفة · جميع حالات التوثيق</p>
              </div>
              <TriangleAlert className="animate-pulse text-rose-400" size={21} aria-hidden="true" />
            </header>
            <div className="space-y-2.5">
              {stats.urgentProjects.map((project) => (
                <div key={project.id} className="flex items-center justify-between gap-3 rounded-xl border border-rose-300/10 bg-rose-400/[0.04] p-3 transition hover:border-rose-300/20 hover:bg-rose-400/[0.07]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200">{project.project_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{project.municipality} <span className="px-1 text-slate-700">·</span>{project.project_code}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {project.priority_level === 'حرجة' && <span className="rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">أولوية حرجة</span>}
                    {project.status === 'متوقف' && <span className="rounded-full bg-orange-400/10 px-2 py-0.5 text-[10px] font-bold text-orange-300">متوقف</span>}
                    <a href={`#project-${project.id}`} aria-label={`عرض ${project.project_name}`} className="text-xs font-bold text-rose-200 hover:text-white">عرض المشروع ←</a>
                  </div>
                </div>
              ))}
              {!stats.urgentProjects.length && <p className="py-10 text-center text-sm text-slate-500">لا توجد مشاريع حرجة أو متوقفة.</p>}
            </div>
          </article>
        </section>
        </>}

        {view === 'database' && <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl shadow-black/10">
          <div className="border-b border-white/10 p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">سجل المشاريع</h2>
                <p className="mt-1 text-sm text-slate-500">البحث في المشاريع وتصفية بياناتها حسب معايير المحفظة</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">{formatNumber(visibleProjects.length)} مشروع</span>
            </div>
            {filtersView}
          </div>
          {busy && <div className="h-1 animate-pulse bg-gradient-to-l from-amber-300 via-sky-400 to-emerald-400" />}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-right text-sm">
              <thead className="bg-slate-950/60 text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-4">المشروع</th>
                  <th className="px-4 py-4">القطاع / البلدية</th>
                  <th className="px-4 py-4">الأولوية</th>
                  <th className="px-4 py-4">الحالة</th>
                  <th className="px-4 py-4">نسبة الإنجاز</th>
                  <th className="px-4 py-4">المساحة</th>
                  <th className="px-4 py-4">الميزانية التقديرية</th>
                  <th className="px-4 py-4">مصدر التمويل</th>
                  <th className="px-4 py-4">حالة البيانات</th>
                  {canVerify && <th className="px-4 py-4">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {visibleProjects.map((project) => (
                  <tr id={`project-${project.id}`} key={project.id} className="transition hover:bg-white/[0.03]">
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
                    <td className="px-4 py-4">
                      <div className="min-w-24">
                        <div className="mb-1 flex justify-between text-xs tabular-nums">
                          <span className="text-slate-300">{formatNumber(Number(project.completion_percentage) || 0)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-gradient-to-l from-emerald-300 to-cyan-400" style={{ width: `${Math.min(100, Math.max(0, Number(project.completion_percentage) || 0))}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 tabular-nums text-slate-300">{formatNumber(Number(project.area_size) || 0, 2)} <span className="text-xs text-slate-500">هكتار</span></td>
                    <td className="px-4 py-4 tabular-nums font-semibold text-amber-200">{formatNumber(Number(project.estimated_budget) || 0)} <span className="text-xs font-normal text-slate-500">د.ل</span></td>
                    <td className="px-4 py-4 text-slate-400">{project.funding_source}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${project.is_verified ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-400/10 text-slate-400'}`}>
                        {project.is_verified && <Check size={13} aria-hidden="true" />}
                        {project.is_verified ? 'موثق' : 'غير موثق'}
                      </span>
                    </td>
                    {canVerify && (
                      <td className="px-4 py-4">
                        {!project.is_verified ? (
                          <button
                            type="button"
                            onClick={() => void handleVerifyProject(project)}
                            disabled={verifyingProjectId === project.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-50"
                          >
                            <Check size={14} aria-hidden="true" />
                            {verifyingProjectId === project.id ? 'جارٍ التحقق...' : 'التحقق'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">مكتمل</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!visibleProjects.length && (
              <div className="px-6 py-14 text-center">
                <Building2 className="mx-auto mb-3 text-slate-600" size={32} aria-hidden="true" />
                <p className="font-semibold text-slate-300">{search ? 'لا توجد مشاريع تطابق البحث' : 'لا توجد مشاريع مطابقة'}</p>
                <p className="mt-1 text-sm text-slate-500">أضف مشروعاً جديداً أو غيّر معايير التصفية.</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-slate-950/40 px-5 py-3 text-xs text-slate-500">
            <span>يعرض السجل المحفظة المتاحة حسب الفلاتر المختارة</span>
            <span>بيانات للمراجعة الاستراتيجية واتخاذ القرار</span>
          </div>
        </section>}
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
                    <label className="block text-sm font-medium text-slate-300">
                      خط العرض (Latitude)
                      <input
                        type="number"
                        min={-90}
                        max={90}
                        step="any"
                        value={form.latitude ?? ''}
                        onChange={(event) => setForm({ ...form, latitude: event.target.value === '' ? null : Number(event.target.value) })}
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-amber-300"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-300">
                      خط الطول (Longitude)
                      <input
                        type="number"
                        min={-180}
                        max={180}
                        step="any"
                        value={form.longitude ?? ''}
                        onChange={(event) => setForm({ ...form, longitude: event.target.value === '' ? null : Number(event.target.value) })}
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-amber-300"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-300">
                      نسبة الإنجاز الحالية (%)
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={form.completion_percentage}
                        onChange={(event) => setForm({ ...form, completion_percentage: Number(event.target.value) })}
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-amber-300"
                      />
                    </label>
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
                    {formField('تاريخ بداية المشروع', 'start_date', undefined, 'date')}
                    {formField('تاريخ الانتهاء المخطط', 'end_date', undefined, 'date')}
                    <label className="block text-sm font-medium text-slate-300 sm:col-span-2">
                      اسم المقاول
                      <input maxLength={200} value={form.contractor_name} onChange={(event) => setForm({ ...form, contractor_name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-amber-300" />
                    </label>
                    {formField('الشركة المنفذة', 'contractor_company')}
                    {formField('الجهة المشرفة', 'supervising_entity')}
                    {formField('اسم المهندس المشرف', 'engineer_name')}
                    {formField('نسبة الإنجاز المخطط (%)', 'planned_completion_percentage', undefined, 'number')}
                    {formField('نسبة الإنجاز الفعلي (%)', 'actual_completion_percentage', undefined, 'number')}
                    {formField('نسبة الإنجاز المالي (%)', 'financial_completion_percentage', undefined, 'number')}
                    <label className="block text-sm font-medium text-slate-300 sm:col-span-2">
                      أسباب التأخير
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={form.delay_reasons}
                        onChange={(event) => setForm({ ...form, delay_reasons: event.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-amber-300"
                      />
                    </label>
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
