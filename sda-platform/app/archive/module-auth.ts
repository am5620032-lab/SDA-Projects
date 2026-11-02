import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

export const MODULE_ACCESS_COOKIES = {
  archive: 'archive_access_token',
  hr: 'hr_access_token',
} as const
export const MODULE_ACCESS_COOKIE_MAX_AGE = 8 * 60 * 60

export interface ModuleAccessClaims {
  employeeId: string
  module: 'archive' | 'hr'
  exp: number
}

function getSigningSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('إعداد مفتاح توقيع جلسات المنظومات مفقود على الخادم.')
  return secret
}

export function createModuleAccessToken(employeeId: string, module: ModuleAccessClaims['module']) {
  const payload = Buffer.from(JSON.stringify({
    employeeId,
    module,
    exp: Math.floor(Date.now() / 1000) + MODULE_ACCESS_COOKIE_MAX_AGE,
  })).toString('base64url')
  const signature = createHmac('sha256', getSigningSecret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyModuleAccessToken(
  token: string | undefined,
  expectedModule: ModuleAccessClaims['module'],
): ModuleAccessClaims | null {
  if (!token) return null
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return null

  let expectedSignature: Buffer
  try {
    expectedSignature = createHmac('sha256', getSigningSecret()).update(payload).digest()
    const providedSignature = Buffer.from(signature, 'base64url')
    if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) {
      return null
    }

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ModuleAccessClaims
    if (
      typeof claims.employeeId !== 'string'
      || claims.module !== expectedModule
      || typeof claims.exp !== 'number'
      || claims.exp <= Math.floor(Date.now() / 1000)
    ) return null
    return claims
  } catch {
    return null
  }
}
