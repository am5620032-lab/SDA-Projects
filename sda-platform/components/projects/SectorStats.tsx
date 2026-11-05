import { Clock3, MapPinned, Rows3 } from 'lucide-react'

export default function SectorStats({
  totalRecords,
  locations,
  locationLabel = 'المواقع والبلديات',
  lastUpdated,
}: {
  totalRecords: number
  locations: number
  locationLabel?: string
  lastUpdated: string
}) {
  const stats = [
    { label: 'إجمالي السجلات', value: totalRecords, icon: Rows3 },
    { label: locationLabel, value: locations, icon: MapPinned },
    { label: 'آخر تحديث', value: lastUpdated, icon: Clock3 },
  ]

  return (
    <section aria-label="إحصائيات القطاع" className="mb-6 grid gap-3 sm:grid-cols-3">
      {stats.map(({ label, value, icon: Icon }) => (
        <article key={label} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all duration-300 hover:scale-[1.02]">
          <span className="rounded-xl border border-white/10 bg-white/5 p-3 text-blue-300">
            <Icon size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 truncate text-lg font-black text-white">{value}</p>
          </div>
        </article>
      ))}
    </section>
  )
}
