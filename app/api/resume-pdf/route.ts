import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { runAtsRobot } from "@/lib/ats-robot";

export const runtime = "nodejs";

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "Tailored_Resume";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceResume?: string;
      tailoredResume?: string;
      jd?: string;
      filename?: string;
    };

    const sourceResume = body.sourceResume?.trim() || "";
    const tailoredResume = body.tailoredResume?.trim() || "";
    const jd = body.jd?.trim() || "";

    const recheck = runAtsRobot(sourceResume, tailoredResume, jd);
    if (!recheck.pass) {
      return NextResponse.json(
        {
          error: "PDF locked until the ATS robot passes this tailored resume.",
          recheck
        },
        { status: 422 }
      );
    }

    const chunks: Buffer[] = [];
    const pdf = new PDFDocument({
      size: "LETTER",
      margins: { top: 38, right: 46, bottom: 38, left: 46 },
      info: {
        Title: "ATS-ready tailored resume",
        Subject: "Generated only after server-side ATS recheck",
        Keywords: "resume, ATS, tailored"
      }
    });

    pdf.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

    const finished = new Promise<Buffer>((resolve, reject) => {
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);
    });

    const lines = tailoredResume.replace(/\r/g, "").split("\n");
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        pdf.moveDown(0.35);
        continue;
      }

      const trimmed = line.trim();
      const isBullet = /^[•*-]\s*/.test(trimmed);
      const clean = trimmed.replace(/^[•*-]\s*/, "");
      const looksHeading =
        !isBullet &&
        clean.length <= 55 &&
        (clean === clean.toUpperCase() || /^(summary|experience|education|skills|projects|certifications|publications|awards)$/i.test(clean));

      if (looksHeading) {
        pdf.moveDown(0.2);
        pdf.font("Helvetica-Bold").fontSize(11.2).text(clean, { lineGap: 1 });
        pdf.moveDown(0.12);
      } else if (isBullet) {
        pdf.font("Helvetica").fontSize(9.3).text("• " + clean, {
          indent: 8,
          continued: false,
          lineGap: 1.8
        });
      } else {
        const isHeader = pdf.y < 85 && clean.length < 90;
        pdf.font(isHeader ? "Helvetica-Bold" : "Helvetica")
          .fontSize(isHeader ? 12.2 : 9.4)
          .text(clean, { lineGap: 1.7 });
      }
    }

    pdf.end();
    const buffer = await finished;
    const filename = safeFilePart(body.filename || "Tailored_Resume") + ".pdf";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="' + filename + '"',
        "x-ats-scan-id": recheck.scanId,
        "x-ats-score": String(recheck.overallScore),
        "cache-control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Could not generate the ATS-gated PDF." }, { status: 500 });
  }
}
