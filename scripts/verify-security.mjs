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

const middleware = fs.readFileSync('middleware.ts', 'utf8')
if (!middleware.includes("path.startsWith('/api/')")) {
  failures.push('middleware.ts: API authentication boundary missing')
}
if (!middleware.includes("SESSION_SECRET") && !middleware.includes('CAREER_OS_SESSION_SECRET')) {
  failures.push('middleware.ts: signed-session verification missing')
}

const sendRoute = fs.readFileSync('app/api/send-resume/route.ts', 'utf8')
if (!sendRoute.includes('escapeHtml')) {
  failures.push('send-resume: HTML escaping missing')
}
if (sendRoute.includes("|| 'pkiran1@asu.edu'")) {
  failures.push('send-resume: hard-coded recipient fallback is not allowed')
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('security contract verified')
