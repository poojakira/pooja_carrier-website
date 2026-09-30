import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { status: 'ok', service: 'career-os' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
