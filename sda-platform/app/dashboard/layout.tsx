import type { ReactNode } from 'react'
import { cookies, headers } from 'next/headers'
import { MODULE_ACCESS_COOKIES, verifyModuleAccessToken } from '@/app/archive/module-auth'
import { getMyNotifications } from '@/app/actions/notifications'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const requestHeaders = await headers()
  const pathname = requestHeaders.get('x-app-pathname') ?? ''
  const hrClaims = verifyModuleAccessToken(cookieStore.get(MODULE_ACCESS_COOKIES.hr)?.value, 'hr')
  const initialNotifications = hrClaims ? await getMyNotifications() : []
  const isPrintPage = /^\/dashboard\/employees\/decisions\/[^/]+\/print$/.test(pathname)

  return (
    <div dir="rtl" className="min-h-screen md:flex">
      {!isPrintPage && (
        <Sidebar
          hasHrAccess={Boolean(hrClaims)}
          initialNotifications={initialNotifications}
        />
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
