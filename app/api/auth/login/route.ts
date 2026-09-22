import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  accessKeyMatches,
  configurationReady,
  createSessionToken,
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
    const body = await readJsonBody<{ accessKey?: unknown }>(request, 8 * 1024)
    const accessKey = typeof body.accessKey === 'string' ? body.accessKey : ''
    if (!accessKeyMatches(accessKey)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

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
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
