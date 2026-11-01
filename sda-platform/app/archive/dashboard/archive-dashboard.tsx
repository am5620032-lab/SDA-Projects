'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

export default function ArchiveDashboard() {
  const [query, setQuery] = useState('')

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm">
      <label className="block max-w-xl text-sm font-semibold text-gray-700">
        البحث بالاسم أو الرقم الوطني
        <span className="relative mt-2 block">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="اكتب الاسم أو الرقم الوطني..."
            className="w-full rounded-lg border py-3 pl-4 pr-10"
          />
        </span>
      </label>
      <div className="mt-6 rounded-lg border border-dashed bg-gray-50 p-8 text-center text-sm text-gray-500">
        {query ? 'لا توجد ملفات مؤرشفة مطابقة لبحثك.' : 'لا توجد ملفات مؤرشفة للعرض حالياً.'}
      </div>
    </section>
  )
}
