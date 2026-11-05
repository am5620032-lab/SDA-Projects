import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'

export default function EmptyState({
  icon: Icon,
  title = 'لا توجد بيانات متاحة',
  description,
  actionLabel = 'إضافة سجل جديد',
  onAction,
}: {
  icon: LucideIcon
  title?: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center">
      <Icon size={52} strokeWidth={1.3} className="text-slate-500/50" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-bold text-slate-200">{title}</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">{description}</p>
      {onAction && (
        <button type="button" onClick={onAction} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-blue-500">
          <Plus size={17} aria-hidden="true" />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
