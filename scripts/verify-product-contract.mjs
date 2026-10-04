import fs from 'node:fs'

const failures = []

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

const protectedRoutes = [
  'app/api/ai-chat/route.ts',
  'app/api/resume-tweak/route.ts',
  'app/api/send-resume/route.ts',
  'app/api/generate-pdf/route.ts',
]

for (const file of protectedRoutes) {
  const content = read(file)
  if (!content.includes('requireSession(request)')) {
    failures.push(`${file}: privileged route must re-check the signed session`)
  }
  if (!content.includes('readJsonBody')) {
    failures.push(`${file}: bounded JSON parser missing`)
  }
  if (!content.includes('enforceRateLimit(')) {
    failures.push(`${file}: route-level abuse limit missing`)
  }
}

const send = read('app/api/send-resume/route.ts')
if (!send.includes('const to = process.env.NOTIFICATION_EMAIL')) {
  failures.push('send-resume: recipient must come only from NOTIFICATION_EMAIL')
}
if (!send.includes('to,') || send.includes('body.to') || send.includes('body.recipient')) {
  failures.push('send-resume: caller-controlled recipient is not allowed')
}
if (!send.includes('escapeHtml')) {
  failures.push('send-resume: HTML output must be escaped')
}

const pdf = read('app/api/generate-pdf/route.ts')
for (const required of ['const maxPages = 4', 'pdfBytes.byteLength > 5 * 1024 * 1024']) {
  if (!pdf.includes(required)) failures.push(`generate-pdf: missing bound ${required}`)
}

const ai = read('app/api/ai-chat/route.ts')
const tweak = read('app/api/resume-tweak/route.ts')
for (const [name, content] of [['ai-chat', ai], ['resume-tweak', tweak]]) {
  if (!content.includes('requiresApproval: true')) {
    failures.push(`${name}: generated output must require human approval`)
  }
}
if (!tweak.includes('Never invent facts') && !tweak.includes('Never invent employers')) {
  failures.push('resume-tweak: evidence-constrained generation instruction missing')
}

const security = read('lib/security.ts')
if (!security.includes("CAREER_OS_ACCESS_KEY") || !security.includes("CAREER_OS_SESSION_SECRET")) {
  failures.push('security: separate access/session secrets are required')
}
if (!security.includes('timingSafeEqual')) {
  failures.push('security: constant-time secret/session comparison missing')
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('product contract verified')
