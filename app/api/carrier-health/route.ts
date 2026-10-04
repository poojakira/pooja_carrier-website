import { NextRequest, NextResponse } from 'next/server'
import { getCarrierHealth } from '@/lib/carrier-client'
import { enforceRateLimit, publicErrorStatus, requireSession } from '@/lib/security'

export async function GET(request: NextRequest) {
  try {
    requireSession(request)
    enforceRateLimit(request, 'carrier-health', 30, 60 * 1000)
    const upstream = await getCarrierHealth()
    return NextResponse.json(
      { status: 'ok', upstream },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const status = publicErrorStatus(error)
    return NextResponse.json(
      {
        status: 'unavailable',
        error: status === 500 ? 'Carrier integration check failed' : (error as Error).message,
      },
      { status: status === 500 ? 503 : status, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
