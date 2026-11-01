import type { ReactNode } from 'react'
import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
