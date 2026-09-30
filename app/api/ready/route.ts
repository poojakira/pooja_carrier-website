import { NextResponse } from 'next/server'
import { configurationReady } from '@/lib/security'

export async function GET() {
  if (!configurationReady()) {
    return NextResponse.json(
      { status: 'not_ready' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    { status: 'ready' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
