import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import {
  publicErrorStatus,
  readJsonBody,
  requireSession,
} from '@/lib/security'

type ResumeDraft = {
  summary?: unknown
  skills?: unknown
  experienceHighlights?: unknown
  projectHighlights?: unknown
}

type PdfRequest = {
  tweakedResume?: ResumeDraft
  fontPreferences?: {
    bodySize?: unknown
    headingSize?: unknown
    nameSize?: unknown
  }
}

function boundedString(value: unknown, max: number): string {
  if (value == null) return ''
  if (typeof value !== 'string' || value.length > max) {
    throw Object.assign(new Error('Invalid resume field'), { status: 422 })
  }
  // pdf-lib StandardFonts.Helvetica cannot encode arbitrary Unicode reliably.
  // Normalize unsupported control characters and common bullet glyphs.
  return value
    .replaceAll('•', '-')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
}

function boundedStringArray(value: unknown, maxItems: number, maxChars: number): string[] {
  if (value == null) return []
  if (!Array.isArray(value) || value.length > maxItems) {
    throw Object.assign(new Error('Invalid resume list'), { status: 422 })
  }
  return value.map((item) => boundedString(item, maxChars))
}

function fontSize(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export async function POST(request: NextRequest) {
  try {
    requireSession(request)
    const body = await readJsonBody<PdfRequest>(request, 128 * 1024)
    if (!body.tweakedResume || typeof body.tweakedResume !== 'object') {
      return NextResponse.json({ error: 'No resume provided' }, { status: 400 })
    }

    const summary = boundedString(body.tweakedResume.summary, 8_000)
    const skills = boundedStringArray(body.tweakedResume.skills, 80, 256)
    const experience = boundedStringArray(body.tweakedResume.experienceHighlights, 30, 2_000)
    const projects = boundedStringArray(body.tweakedResume.projectHighlights, 30, 2_000)

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([612, 792])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const bodySize = fontSize(body.fontPreferences?.bodySize, 10.5, 8, 14)
    const headingSize = fontSize(body.fontPreferences?.headingSize, 12, 9, 18)
    const nameSize = fontSize(body.fontPreferences?.nameSize, 16, 12, 24)
    const margin = 50
    const maxWidth = 512
    let y = 742
    let pages = 1
    const maxPages = 4

    const newPage = () => {
      if (pages >= maxPages) {
        throw Object.assign(new Error('Resume exceeds PDF page limit'), { status: 422 })
      }
      page = pdfDoc.addPage([612, 792])
      y = 742
      pages += 1
    }

    const drawText = (
      text: string,
      size: number,
      f = font,
      color = rgb(0.1, 0.1, 0.1),
    ) => {
      if (y < 60) newPage()
      page.drawText(text, { x: margin, y, size, font: f, color, maxWidth })
      y -= size + 6
    }

    const drawWrapped = (text: string, size: number, f = font) => {
      const words = text.split(/\s+/).filter(Boolean)
      let line = ''
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word
        const width = f.widthOfTextAtSize(candidate, size)
        if (width > maxWidth && line) {
          drawText(line, size, f)
          line = word
        } else if (width > maxWidth) {
          // Bound pathological single tokens rather than allowing a huge
          // unbroken string to overflow the page.
          const chunkSize = Math.max(8, Math.floor(word.length * maxWidth / width))
          for (let i = 0; i < word.length; i += chunkSize) {
            drawText(word.slice(i, i + chunkSize), size, f)
          }
          line = ''
        } else {
          line = candidate
        }
      }
      if (line) drawText(line, size, f)
    }

    drawText('POOJA KIRAN BHARADWAJ', nameSize, fontBold)
    drawText(
      'AI Security Engineer | pkiran1@asu.edu | github.com/poojakira | linkedin.com/in/poojakiran',
      8,
      font,
      rgb(0.4, 0.4, 0.4),
    )
    y -= 8
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + maxWidth, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })
    y -= 12

    drawText('SUMMARY', headingSize, fontBold)
    y -= 2
    drawWrapped(summary, bodySize)
    y -= 8

    drawText('SKILLS', headingSize, fontBold)
    y -= 2
    drawWrapped(skills.join(' - '), bodySize)
    y -= 8

    drawText('EXPERIENCE HIGHLIGHTS', headingSize, fontBold)
    y -= 2
    for (const bullet of experience) {
      drawWrapped(`- ${bullet}`, bodySize)
      y -= 2
    }
    y -= 6

    drawText('PROJECTS', headingSize, fontBold)
    y -= 2
    for (const project of projects) {
      drawWrapped(`- ${project}`, bodySize)
      y -= 2
    }

    const pdfBytes = await pdfDoc.save()
    if (pdfBytes.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Generated PDF exceeds size limit' }, { status: 413 })
    }

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Pooja_Kiran_Resume.pdf"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    const status = publicErrorStatus(error)
    return NextResponse.json(
      { error: status === 500 ? 'PDF generation failed' : (error as Error).message },
      { status },
    )
  }
}
