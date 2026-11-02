import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { MODULE_ACCESS_COOKIES, verifyModuleAccessToken } from '@/app/archive/module-auth'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const hrClaims = verifyModuleAccessToken(cookieStore.get(MODULE_ACCESS_COOKIES.hr)?.value, 'hr')

  return (
    <div dir="rtl" className="min-h-screen md:flex">
      <Sidebar hasHrAccess={Boolean(hrClaims)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
