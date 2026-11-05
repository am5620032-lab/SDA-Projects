import type { LucideIcon } from 'lucide-react'

export default function SectorHero({
  name,
  description,
  icon: Icon,
  color,
  englishName,
}: {
  name: string
  description: string
  icon: LucideIcon
  color: string
  englishName?: string
}) {
  return (
    <header
      className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8"
    >
      <div className="pointer-events-none absolute -left-12 -top-20 h-64 w-64 rounded-full opacity-15 blur-3xl" style={{ backgroundColor: color }} />
      <div className="relative flex items-center gap-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 md:h-20 md:w-20">
          <Icon size={38} strokeWidth={1.6} style={{ color }} aria-hidden="true" />
        </span>
        <div>
          {englishName && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{englishName}</p>}
          <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">{name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">{description}</p>
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 w-1" style={{ backgroundColor: color }} />
    </header>
  )
}
