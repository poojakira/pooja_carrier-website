import assert from 'node:assert/strict'
import { carrierBaseUrl } from '../lib/carrier-client'

const previous = process.env.CARRIER_API_BASE_URL
const previousEnv = process.env.NODE_ENV

try {
  process.env.NODE_ENV = 'development'
  process.env.CARRIER_API_BASE_URL = 'http://127.0.0.1:3001'
  assert.equal(carrierBaseUrl().origin, 'http://127.0.0.1:3001')

  process.env.CARRIER_API_BASE_URL = 'http://example.com'
  assert.throws(() => carrierBaseUrl(), /loopback/)

  process.env.CARRIER_API_BASE_URL = 'ftp://example.com'
  assert.throws(() => carrierBaseUrl(), /HTTP\(S\)/)

  process.env.CARRIER_API_BASE_URL = 'https://user:pass@example.com'
  assert.throws(() => carrierBaseUrl(), /unsupported components/)

  process.env.NODE_ENV = 'production'
  process.env.CARRIER_API_BASE_URL = 'http://127.0.0.1:3001'
  assert.throws(() => carrierBaseUrl(), /HTTPS in production/)

  process.env.CARRIER_API_BASE_URL = 'https://carrier.example.com'
  assert.equal(carrierBaseUrl().origin, 'https://carrier.example.com')

  console.log('Carrier client boundary checks passed')
} finally {
  if (previous === undefined) delete process.env.CARRIER_API_BASE_URL
  else process.env.CARRIER_API_BASE_URL = previous
  if (previousEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = previousEnv
}
