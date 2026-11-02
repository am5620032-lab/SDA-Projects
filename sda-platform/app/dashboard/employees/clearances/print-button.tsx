'use client'

export default function ClearancePrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-lg bg-emerald-700 px-5 py-2 font-bold text-white print:hidden">
      طباعة شهادة إخلاء الطرف
    </button>
  )
}
