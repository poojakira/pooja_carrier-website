import { ApiInputError, readApiObject, textField } from "@/lib/api-input";
import { NextResponse } from "next/server";
import { runAtsRobot } from "@/lib/ats-robot";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readApiObject(request);

    const sourceResume = textField(body, "sourceResume");
    const tailoredResume = textField(body, "tailoredResume");
    const jd = textField(body, "jd");

    if (sourceResume.length < 80 || tailoredResume.length < 80 || jd.length < 100) {
      return NextResponse.json(
        { error: "Source resume, tailored resume, and full job description are required." },
        { status: 400 }
      );
    }

    return NextResponse.json({ recheck: runAtsRobot(sourceResume, tailoredResume, jd) });
  } catch (error) {
    if (error instanceof ApiInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "ATS robot recheck failed." }, { status: 500 });
  }
}
