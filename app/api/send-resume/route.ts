import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { tweakedResume, jobLink, jobDescription, fontPreferences } = await request.json()
    if (!tweakedResume) return NextResponse.json({ error: 'No resume provided' }, { status: 400 })

    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const to = process.env.NOTIFICATION_EMAIL || 'pkiran1@asu.edu'

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({ error: 'SMTP not configured. Set SMTP_USER and SMTP_PASS in .env' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    })

    const subject = jobLink
      ? `📄 Resume Tweaked — ${new URL(jobLink).hostname.replace('www.', '')}`
      : `📄 Resume Tweaked — ${new Date().toLocaleDateString()}`

    await transporter.sendMail({
      from: `"Career OS" <${smtpUser}>`,
      to,
      subject,
      html: `
<div style="font-family:${fontPreferences?.family || 'Arial'},sans-serif;max-width:650px;margin:0 auto;padding:20px;color:#333">
  <h2 style="border-bottom:2px solid #4f46e5;padding-bottom:8px">Tweaked Resume</h2>
  ${jobLink ? `<p><strong>Job:</strong> <a href="${jobLink}">${jobLink}</a></p>` : ''}
  <p><strong>Font:</strong> ${fontPreferences?.family} | Body: ${fontPreferences?.bodySize}pt</p>
  <h3>Summary</h3><p>${tweakedResume.summary}</p>
  <h3>Skills</h3><p>${tweakedResume.skills?.join(', ')}</p>
  <h3>Experience</h3><ul>${tweakedResume.experienceHighlights?.map((h: string) => `<li>${h}</li>`).join('')}</ul>
  <h3>Projects</h3><ul>${tweakedResume.projectHighlights?.map((p: string) => `<li>${p}</li>`).join('')}</ul>
  ${jobDescription ? `<h3>Job Description</h3><pre style="font-size:11px;white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px">${jobDescription.substring(0, 2000)}</pre>` : ''}
  <hr><p style="font-size:11px;color:#888">Sent from Career OS • ${new Date().toLocaleString()}</p>
</div>`,
      text: tweakedResume.fullText || `${tweakedResume.summary}\n\nSkills: ${tweakedResume.skills?.join(', ')}\n\nJob: ${jobLink}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Email failed' }, { status: 500 })
  }
}
