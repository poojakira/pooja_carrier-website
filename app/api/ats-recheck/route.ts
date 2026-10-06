import { NextResponse } from "next/server";
import { runAtsRobot } from "@/lib/ats-robot";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceResume?: string;
      tailoredResume?: string;
      jd?: string;
    };

    const sourceResume = body.sourceResume?.trim() || "";
    const tailoredResume = body.tailoredResume?.trim() || "";
    const jd = body.jd?.trim() || "";

    if (sourceResume.length < 80 || tailoredResume.length < 80 || jd.length < 100) {
      return NextResponse.json(
        { error: "Source resume, tailored resume, and full job description are required." },
        { status: 400 }
      );
    }

    return NextResponse.json({ recheck: runAtsRobot(sourceResume, tailoredResume, jd) });
  } catch {
    return NextResponse.json({ error: "ATS robot recheck failed." }, { status: 500 });
  }
}
