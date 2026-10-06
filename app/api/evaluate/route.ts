import { NextResponse } from "next/server";
import { evaluateRole } from "@/lib/engine";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resume?: string; jd?: string };
    const resume = body.resume?.trim() || "";
    const jd = body.jd?.trim() || "";

    if (resume.length < 40 || jd.length < 80) {
      return NextResponse.json(
        { error: "Add a fuller resume and job description before evaluating." },
        { status: 400 }
      );
    }

    return NextResponse.json({ evaluation: evaluateRole(resume, jd) });
  } catch {
    return NextResponse.json({ error: "Could not evaluate this role." }, { status: 500 });
  }
}
