export default function ProjectsLoading() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <p role="status" className="mb-5 text-center text-slate-300">جاري تجهيز مركز المشروعات...</p>
        <div className="mb-6 h-32 animate-pulse rounded-2xl bg-slate-800" />
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-slate-800" />)}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-800" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-800" />
        </div>
      </div>
    </main>
  )
}
