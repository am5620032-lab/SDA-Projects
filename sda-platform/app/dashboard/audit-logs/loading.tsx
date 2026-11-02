export default function AuditLogsLoading() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 h-24 animate-pulse rounded-xl bg-white shadow-sm" />
        <p role="status" className="mb-4 text-center text-gray-600">جاري تحميل سجل العمليات...</p>
        <div className="h-20 animate-pulse rounded-xl bg-white shadow-sm" />
        <div className="mt-4 h-[32rem] animate-pulse rounded-xl bg-white shadow-sm" />
      </div>
    </main>
  )
}
