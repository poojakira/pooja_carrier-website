import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'career_os_session'

function fromBase64Url(value: string): string {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return atob(padded)
}

async function validSession(token: string | undefined): Promise<boolean> {
  const secret = process.env.CAREER_OS_SESSION_SECRET || ''
  if (!token || secret.length < 32) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, suppliedSignature] = parts

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const rawSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(payload),
    )
    const expectedSignature = Array.from(new Uint8Array(rawSignature))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')

    if (expectedSignature.length !== suppliedSignature.length) return false
    let mismatch = 0
    for (let i = 0; i < expectedSignature.length; i += 1) {
      mismatch |= expectedSignature.charCodeAt(i) ^ suppliedSignature.charCodeAt(i)
    }
    if (mismatch !== 0) return false

    const claims = JSON.parse(fromBase64Url(payload)) as { iat?: number; exp?: number }
    const now = Math.floor(Date.now() / 1000)
    return (
      Number.isInteger(claims.iat) &&
      Number.isInteger(claims.exp) &&
      Number(claims.iat) <= now + 60 &&
      Number(claims.exp) > now
    )
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublic =
    path === '/login' ||
    path === '/api/auth/login' ||
    path === '/api/auth/logout'

  if (isPublic) return NextResponse.next()

  const token = request.cookies.get(COOKIE)?.value
  if (await validSession(token)) return NextResponse.next()

  if (path.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const login = new URL('/login', request.url)
  login.searchParams.set('next', path)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
