'use client'

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-lg bg-[#157A3F] px-5 py-2 font-bold text-white">
      طباعة القرار
    </button>
  )
}
