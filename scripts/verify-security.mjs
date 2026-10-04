import fs from 'node:fs'

const protectedRoutes = [
  'app/api/ai-chat/route.ts',
  'app/api/resume-tweak/route.ts',
  'app/api/send-resume/route.ts',
  'app/api/generate-pdf/route.ts',
]

const failures = []
for (const file of protectedRoutes) {
  const content = fs.readFileSync(file, 'utf8')
  if (!content.includes('requireSession(request)')) {
    failures.push(`${file}: missing route-level session enforcement`)
  }
  if (!content.includes('readJsonBody')) {
    failures.push(`${file}: missing bounded JSON parsing`)
  }
  if (content.includes('error.message') || content.includes('String(error)')) {
    failures.push(`${file}: raw error details may be exposed`)
  }
}

const proxy = fs.readFileSync('proxy.ts', 'utf8')
if (!proxy.includes("path.startsWith('/api/')")) {
  failures.push('proxy.ts: API authentication boundary missing')
}
if (!proxy.includes("SESSION_SECRET") && !proxy.includes('CAREER_OS_SESSION_SECRET')) {
  failures.push('proxy.ts: signed-session verification missing')
}
if (!proxy.includes("request.headers.get('origin')") || !proxy.includes('Cross-origin request rejected')) {
  failures.push('proxy.ts: same-origin enforcement for unsafe API requests missing')
}
for (const header of ['X-Content-Type-Options', 'Referrer-Policy', 'Content-Security-Policy']) {
  if (!proxy.includes(header)) failures.push(`proxy.ts: missing security header ${header}`)
}

const securityLib = fs.readFileSync('lib/security.ts', 'utf8')
if (!securityLib.includes("CAREER_OS_TRUST_PROXY !== 'true'")) {
  failures.push('lib/security.ts: forwarded client IP headers must be opt-in behind a trusted proxy')
}

const loginRoute = fs.readFileSync('app/api/auth/login/route.ts', 'utf8')
if (!loginRoute.includes('enforceRateLimit(') || !loginRoute.includes('clearRateLimit(')) {
  failures.push('login route: brute-force rate-limit contract missing')
}

const sendRoute = fs.readFileSync('app/api/send-resume/route.ts', 'utf8')
if (!sendRoute.includes('escapeHtml')) {
  failures.push('send-resume: HTML escaping missing')
}
if (sendRoute.includes("|| 'pkiran1@asu.edu'")) {
  failures.push('send-resume: hard-coded recipient fallback is not allowed')
}


const expensiveRoutes = [
  'app/api/ai-chat/route.ts',
  'app/api/resume-tweak/route.ts',
  'app/api/send-resume/route.ts',
  'app/api/generate-pdf/route.ts',
]
for (const file of expensiveRoutes) {
  const content = fs.readFileSync(file, 'utf8')
  if (!content.includes('enforceRateLimit(')) {
    failures.push(`${file}: missing route-level abuse rate limit`)
  }
}

for (const file of ['app/error.tsx', 'app/global-error.tsx', 'app/not-found.tsx', 'app/loading.tsx']) {
  if (!fs.existsSync(file)) failures.push(`${file}: required failure/loading state missing`)
}

for (const file of ['app/api/health/route.ts', 'app/api/ready/route.ts']) {
  if (!fs.existsSync(file)) failures.push(`${file}: required health/readiness endpoint missing`)
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('security contract verified')
