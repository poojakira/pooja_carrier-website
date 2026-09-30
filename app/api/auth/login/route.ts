import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  accessKeyMatches,
  clearRateLimit,
  configurationReady,
  createSessionToken,
  enforceRateLimit,
  publicErrorStatus,
  readJsonBody,
} from '@/lib/security'

export async function POST(request: NextRequest) {
  if (!configurationReady()) {
    return NextResponse.json(
      { error: 'Authentication is not configured' },
      { status: 503 },
    )
  }

  try {
    enforceRateLimit(request, 'login', 10, 5 * 60 * 1000)
    const body = await readJsonBody<{ accessKey?: unknown }>(request, 8 * 1024)
    const accessKey = typeof body.accessKey === 'string' ? body.accessKey : ''
    if (!accessKeyMatches(accessKey)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    clearRateLimit(request, 'login')
    const response = NextResponse.json({ ok: true })
    response.cookies.set({
      name: SESSION_COOKIE,
      value: createSessionToken(),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60,
    })
    return response
  } catch (error) {
    const status = publicErrorStatus(error)
    if (status === 429) {
      return NextResponse.json({ error: 'Too many login attempts' }, { status })
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: status === 500 ? 400 : status })
  }
}
