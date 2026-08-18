import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function POST(request: NextRequest) {
  try {
    const { tweakedResume, fontPreferences } = await request.json()
    if (!tweakedResume) return NextResponse.json({ error: 'No resume' }, { status: 400 })

    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([612, 792]) // Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const bodySize = fontPreferences?.bodySize || 10.5
    const headingSize = fontPreferences?.headingSize || 12
    const nameSize = fontPreferences?.nameSize || 16
    const margin = 50
    const maxWidth = 512
    let y = 742

    const drawText = (text: string, size: number, f = font, color = rgb(0.1, 0.1, 0.1)) => {
      if (y < 60) { page = pdfDoc.addPage([612, 792]); y = 742 }
      page.drawText(text, { x: margin, y, size, font: f, color, maxWidth })
      y -= size + 6
    }

    const drawWrapped = (text: string, size: number, f = font) => {
      const words = text.split(' ')
      let line = ''
      for (const word of words) {
        const test = line + (line ? ' ' : '') + word
        const width = f.widthOfTextAtSize(test, size)
        if (width > maxWidth && line) {
          drawText(line, size, f)
          line = word
        } else {
          line = test
        }
      }
      if (line) drawText(line, size, f)
    }

    // Name
    drawText('POOJA KIRAN BHARADWAJ', nameSize, fontBold)
    drawText('AI Security Engineer | pkiran1@asu.edu | github.com/poojakira | linkedin.com/in/poojakiran', 8, font, rgb(0.4, 0.4, 0.4))
    y -= 8

    // Line
    page.drawLine({ start: { x: margin, y }, end: { x: margin + maxWidth, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) })
    y -= 12

    // Summary
    drawText('SUMMARY', headingSize, fontBold)
    y -= 2
    drawWrapped(tweakedResume.summary || '', bodySize)
    y -= 8

    // Skills
    drawText('SKILLS', headingSize, fontBold)
    y -= 2
    drawWrapped((tweakedResume.skills || []).join(' • '), bodySize)
    y -= 8

    // Experience
    drawText('EXPERIENCE HIGHLIGHTS', headingSize, fontBold)
    y -= 2
    for (const bullet of (tweakedResume.experienceHighlights || [])) {
      drawWrapped(`• ${bullet}`, bodySize)
      y -= 2
    }
    y -= 6

    // Projects
    drawText('PROJECTS', headingSize, fontBold)
    y -= 2
    for (const proj of (tweakedResume.projectHighlights || [])) {
      drawWrapped(`• ${proj}`, bodySize)
      y -= 2
    }

    const pdfBytes = await pdfDoc.save()
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Pooja_Kiran_Resume.pdf"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
