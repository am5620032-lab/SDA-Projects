import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const archiveCookieName = 'archive_access_token'
const hrCookieName = 'hr_access_token'

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

async function hasValidModuleCookie(token: string | undefined, expectedModule: 'archive' | 'hr') {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || !token) return false

  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return false

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const signatureIsValid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(signature),
      new TextEncoder().encode(payload),
    )
    if (!signatureIsValid) return false

    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as {
      employeeId?: unknown
      module?: unknown
      exp?: unknown
    }
    return typeof claims.employeeId === 'string'
      && claims.module === expectedModule
      && typeof claims.exp === 'number'
      && claims.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasPlatformSession = request.cookies.getAll().some(({ name }) => (
    name.startsWith('sb-wwkqubtedygxwmjhhoza-auth-token')
  ))
  const isModulePath = pathname.startsWith('/archive/') || pathname.startsWith('/hr/')
  if (
    (isModulePath || pathname.startsWith('/dashboard/employees') || pathname.startsWith('/dashboard/leaves') || pathname.startsWith('/dashboard/attendance'))
    && !hasPlatformSession
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/archive/dashboard')) {
    if (!(await hasValidModuleCookie(request.cookies.get(archiveCookieName)?.value, 'archive'))) {
      return NextResponse.redirect(new URL('/archive/login', request.url))
    }
  }

  const isHrModulePath = pathname.startsWith('/dashboard/employees')
    || pathname.startsWith('/dashboard/leaves')
    || pathname.startsWith('/dashboard/attendance')
  if (isHrModulePath && !(await hasValidModuleCookie(request.cookies.get(hrCookieName)?.value, 'hr'))) {
    return NextResponse.redirect(new URL('/hr/login', request.url))
  }

  if (!hasPlatformSession && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/archive/:path*',
    '/hr/:path*',
  ],
}