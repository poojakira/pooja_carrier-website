import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'career_os_session'
const SESSION_TTL_SECONDS = 8 * 60 * 60

type RateLimitEntry = { count: number; resetAt: number }
const rateLimitBuckets = new Map<string, RateLimitEntry>()
const MAX_RATE_LIMIT_BUCKETS = 2048

function clientKey(request: NextRequest): string {
  // Forwarded address headers are attacker-controlled unless a trusted reverse
  // proxy overwrites them. Default to one conservative bucket for this
  // single-user product; operators may opt in only behind a trusted proxy.
  if (process.env.CAREER_OS_TRUST_PROXY !== 'true') return 'direct-client'

  const forwarded = request.headers.get('x-forwarded-for')
  const address = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim()
  return address || 'unknown-proxied-client'
}

export function enforceRateLimit(
  request: NextRequest,
  namespace: string,
  limit: number,
  windowMs: number,
): void {
  const now = Date.now()
  const key = `${namespace}:${clientKey(request)}`
  const existing = rateLimitBuckets.get(key)

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs })
  } else {
    if (existing.count >= limit) {
      const error = new Error('Too many requests')
      ;(error as Error & { status?: number }).status = 429
      throw error
    }
    existing.count += 1
  }

  if (rateLimitBuckets.size > MAX_RATE_LIMIT_BUCKETS) {
    for (const [bucketKey, entry] of rateLimitBuckets) {
      if (entry.resetAt <= now) rateLimitBuckets.delete(bucketKey)
    }
  }
}

export function clearRateLimit(request: NextRequest, namespace: string): void {
  rateLimitBuckets.delete(`${namespace}:${clientKey(request)}`)
}

function requiredSecret(name: 'CAREER_OS_ACCESS_KEY' | 'CAREER_OS_SESSION_SECRET'): string {
  const value = process.env[name] || ''
  if (value.length < 32) {
    throw new Error(`${name} must be configured with at least 32 characters`)
  }
  return value
}

function sign(payload: string): string {
  return createHmac('sha256', requiredSecret('CAREER_OS_SESSION_SECRET'))
    .update(payload)
    .digest('hex')
}

export function configurationReady(): boolean {
  return (
    (process.env.CAREER_OS_ACCESS_KEY || '').length >= 32 &&
    (process.env.CAREER_OS_SESSION_SECRET || '').length >= 32
  )
}

export function accessKeyMatches(candidate: string): boolean {
  let expected: string
  try {
    expected = requiredSecret('CAREER_OS_ACCESS_KEY')
  } catch {
    return false
  }
  const supplied = Buffer.from(candidate || '', 'utf8')
  const wanted = Buffer.from(expected, 'utf8')
  return supplied.length === wanted.length && timingSafeEqual(supplied, wanted)
}

export function createSessionToken(nowSeconds = Math.floor(Date.now() / 1000)): string {
  const payload = Buffer.from(
    JSON.stringify({ iat: nowSeconds, exp: nowSeconds + SESSION_TTL_SECONDS }),
    'utf8',
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !configurationReady()) return false
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return false

  let expectedSignature: string
  try {
    expectedSignature = sign(payload)
  } catch {
    return false
  }
  const actual = Buffer.from(signature, 'utf8')
  const expected = Buffer.from(expectedSignature, 'utf8')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      iat?: number
      exp?: number
    }
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

export function requireSession(request: NextRequest): void {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    const error = new Error('Unauthorized')
    ;(error as Error & { status?: number }).status = 401
    throw error
  }
}

export async function readJsonBody<T>(
  request: NextRequest,
  maxBytes = 256 * 1024,
): Promise<T> {
  const declared = request.headers.get('content-length')
  if (declared) {
    const parsed = Number(declared)
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Invalid Content-Length')
    if (parsed > maxBytes) {
      const error = new Error('Request body too large')
      ;(error as Error & { status?: number }).status = 413
      throw error
    }
  }

  const text = await request.text()
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    const error = new Error('Request body too large')
    ;(error as Error & { status?: number }).status = 413
    throw error
  }
  try {
    return JSON.parse(text) as T
  } catch {
    const error = new Error('Invalid JSON')
    ;(error as Error & { status?: number }).status = 400
    throw error
  }
}

export function publicErrorStatus(error: unknown): number {
  if (error instanceof Error) {
    const status = (error as Error & { status?: number }).status
    if (status && [400, 401, 403, 413, 422, 429].includes(status)) return status
  }
  return 500
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}
