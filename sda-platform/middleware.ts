import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasArchiveSession = request.cookies.getAll().some(({ name }) => name.startsWith('sda-archive-auth-token'))

  if (pathname.startsWith('/archive/dashboard') && !hasArchiveSession) {
    return NextResponse.redirect(new URL('/archive/login', request.url))
  }

  if (!request.cookies.has('sb-wwkqubtedygxwmjhhoza-auth-token') && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*', '/archive/dashboard/:path*'] }