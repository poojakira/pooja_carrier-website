import { NextResponse } from "next/server";
import { tweakResume } from "@/lib/tweaker";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      resume?: string;
      jd?: string;
      mode?: "balanced" | "ats" | "concise" | "impact";
    };

    const resume = body.resume?.trim() || "";
    const jd = body.jd?.trim() || "";

    if (resume.length < 80 || jd.length < 100) {
      return NextResponse.json(
        { error: "Add a fuller resume and job description before tweaking." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      result: tweakResume(resume, jd, body.mode || "balanced")
    });
  } catch {
    return NextResponse.json({ error: "Could not tailor the resume." }, { status: 500 });
  }
}
