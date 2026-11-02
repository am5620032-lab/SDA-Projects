import 'server-only'

import { cookies } from 'next/headers'
import { MODULE_ACCESS_COOKIES, verifyModuleAccessToken } from '@/app/archive/module-auth'

export async function getHrEmployeeId() {
  const cookieStore = await cookies()
  const claims = verifyModuleAccessToken(cookieStore.get(MODULE_ACCESS_COOKIES.hr)?.value, 'hr')
  return claims?.employeeId ?? null
}
