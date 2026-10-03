type CarrierHealth = {
  status: 'ok'
  service: 'carrier'
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function carrierBaseUrl(): URL {
  const raw = (process.env.CARRIER_API_BASE_URL || '').trim()
  if (!raw) throw Object.assign(new Error('Carrier API is not configured'), { status: 503 })

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw Object.assign(new Error('Carrier API URL is invalid'), { status: 503 })
  }

  if (url.username || url.password || url.hash || url.search) {
    throw Object.assign(new Error('Carrier API URL contains unsupported components'), { status: 503 })
  }

  const production = process.env.NODE_ENV === 'production'
  if (production && url.protocol !== 'https:') {
    throw Object.assign(new Error('Carrier API must use HTTPS in production'), { status: 503 })
  }
  if (!production && url.protocol === 'http:' && !isLoopback(url.hostname)) {
    throw Object.assign(
      new Error('Plain HTTP Carrier API is allowed only on loopback in development'),
      { status: 503 },
    )
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw Object.assign(new Error('Carrier API URL must use HTTP(S)'), { status: 503 })
  }

  url.pathname = url.pathname.replace(/\/+$/, '')
  return url
}

export async function getCarrierHealth(): Promise<CarrierHealth> {
  const base = carrierBaseUrl()
  const healthUrl = new URL(base.toString())
  healthUrl.pathname = `${base.pathname}/api/health`.replace(/\/+/g, '/')

  const response = await fetch(healthUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
    redirect: 'error',
  })

  if (!response.ok) {
    throw Object.assign(new Error('Carrier API health check failed'), { status: 503 })
  }

  const data = await response.json() as Partial<CarrierHealth>
  if (data.status !== 'ok' || data.service !== 'carrier') {
    throw Object.assign(new Error('Carrier API returned an invalid health contract'), { status: 503 })
  }
  return data as CarrierHealth
}
