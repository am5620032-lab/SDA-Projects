import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import Sidebar from '@/components/layout/Sidebar'
import './dashboard-theme.css'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers()
  const pathname = requestHeaders.get('x-app-pathname') ?? ''
  const isPrintPage = /^\/dashboard\/employees\/decisions\/[^/]+\/print$/.test(pathname)

  return (
    <div dir="rtl" className={`${isPrintPage ? '' : 'dashboard-theme'} min-h-screen md:flex`}>
      {!isPrintPage && (
        <Sidebar />
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
