export default function ReportsLoading() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 h-24 animate-pulse rounded-xl bg-white shadow-sm" />
        <p role="status" className="mb-4 text-center text-gray-600">جاري تحميل التقارير...</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 animate-pulse rounded-xl bg-white shadow-sm" />
          <div className="h-96 animate-pulse rounded-xl bg-white shadow-sm" />
          <div className="h-96 animate-pulse rounded-xl bg-white shadow-sm lg:col-span-2" />
        </div>
      </div>
    </main>
  )
}
