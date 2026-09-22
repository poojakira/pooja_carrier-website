import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import {
  escapeHtml,
  normalizeHttpUrl,
  publicErrorStatus,
  readJsonBody,
  requireSession,
} from '@/lib/security'

type ResumeDraft = {
  summary?: unknown
  skills?: unknown
  experienceHighlights?: unknown
  projectHighlights?: unknown
  fullText?: unknown
}

type SendRequest = {
  tweakedResume?: ResumeDraft
  jobLink?: unknown
  jobDescription?: unknown
  fontPreferences?: { family?: unknown; bodySize?: unknown }
}

function boundedString(value: unknown, max: number): string {
  if (value == null) return ''
  if (typeof value !== 'string' || value.length > max) {
    throw Object.assign(new Error('Invalid text field'), { status: 422 })
  }
  return value
}

function boundedStringArray(value: unknown, maxItems: number, maxChars: number): string[] {
  if (value == null) return []
  if (!Array.isArray(value) || value.length > maxItems) {
    throw Object.assign(new Error('Invalid list field'), { status: 422 })
  }
  return value.map((item) => boundedString(item, maxChars))
}

export async function POST(request: NextRequest) {
  try {
    requireSession(request)
    const body = await readJsonBody<SendRequest>(request, 192 * 1024)
    if (!body.tweakedResume || typeof body.tweakedResume !== 'object') {
      return NextResponse.json({ error: 'No resume provided' }, { status: 400 })
    }

    const summary = boundedString(body.tweakedResume.summary, 8_000)
    const skills = boundedStringArray(body.tweakedResume.skills, 80, 256)
    const experience = boundedStringArray(body.tweakedResume.experienceHighlights, 30, 2_000)
    const projects = boundedStringArray(body.tweakedResume.projectHighlights, 30, 2_000)
    const fullText = boundedString(body.tweakedResume.fullText, 80_000)
    const jobDescription = boundedString(body.jobDescription, 100_000)
    const rawJobLink = boundedString(body.jobLink, 4_000)
    const jobLink = rawJobLink ? normalizeHttpUrl(rawJobLink) : null
    if (rawJobLink && !jobLink) {
      return NextResponse.json({ error: 'Job link must be an http(s) URL' }, { status: 422 })
    }

    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const to = process.env.NOTIFICATION_EMAIL
    if (!smtpUser || !smtpPass || !to) {
      return NextResponse.json({ error: 'Mail delivery is not configured' }, { status: 503 })
    }

    const port = Number(process.env.SMTP_PORT || '587')
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return NextResponse.json({ error: 'Mail delivery is misconfigured' }, { status: 503 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      tls: { minVersion: 'TLSv1.2' },
    })

    const hostname = jobLink ? new URL(jobLink).hostname.replace(/^www\./, '') : ''
    const subject = hostname
      ? `Resume draft — ${hostname}`
      : `Resume draft — ${new Date().toISOString().slice(0, 10)}`

    const safeLink = jobLink ? escapeHtml(jobLink) : ''
    const family = escapeHtml(body.fontPreferences?.family || 'Arial')
    const bodySize =
      typeof body.fontPreferences?.bodySize === 'number' &&
      Number.isFinite(body.fontPreferences.bodySize)
        ? Math.min(18, Math.max(8, body.fontPreferences.bodySize))
        : 10.5

    await transporter.sendMail({
      from: `"Career OS" <${smtpUser}>`,
      to,
      subject,
      html: `
<div style="font-family:${family},sans-serif;max-width:650px;margin:0 auto;padding:20px;color:#333">
  <h2 style="border-bottom:2px solid #4f46e5;padding-bottom:8px">Resume draft</h2>
  ${jobLink ? `<p><strong>Job:</strong> <a href="${safeLink}">${safeLink}</a></p>` : ''}
  <p><strong>Font:</strong> ${family} | Body: ${bodySize}pt</p>
  <h3>Summary</h3><p>${escapeHtml(summary)}</p>
  <h3>Skills</h3><p>${skills.map(escapeHtml).join(', ')}</p>
  <h3>Experience</h3><ul>${experience.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  <h3>Projects</h3><ul>${projects.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  ${jobDescription ? `<h3>Job Description</h3><pre style="font-size:11px;white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px">${escapeHtml(jobDescription.slice(0, 12_000))}</pre>` : ''}
  <hr><p style="font-size:11px;color:#888">Career OS generated draft — review before use.</p>
</div>`,
      text:
        fullText ||
        `${summary}\n\nSkills: ${skills.join(', ')}\n\nJob: ${jobLink || ''}`,
    })

    return NextResponse.json({ success: true, deliveredToConfiguredInbox: true })
  } catch (error) {
    const status = publicErrorStatus(error)
    return NextResponse.json(
      { error: status === 500 ? 'Email delivery failed' : (error as Error).message },
      { status },
    )
  }
}
