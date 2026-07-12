import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fdfd88837332d96c810a9b2b528b9cc674ee6f06a1fbd7c372f88cf5d9f10a8c'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('session')?.value

  let isAuth = false
  if (session) {
    try {
      const { payload } = await jwtVerify(session, JWT_SECRET)
      isAuth = !!payload.authenticated
    } catch (err) {
      // Session cookie is invalid or expired
    }
  }

  // Guard dashboard page: redirect to login if not authenticated
  if (pathname.startsWith('/my-dashboard')) {
    if (!isAuth) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Guard login page: redirect to dashboard if already authenticated
  if (pathname === '/') {
    if (isAuth) {
      return NextResponse.redirect(new URL('/my-dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/my-dashboard/:path*'],
}
