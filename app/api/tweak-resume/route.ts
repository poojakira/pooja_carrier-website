import { ApiInputError, readApiObject, textField, resumeMode } from "@/lib/api-input";
import { NextResponse } from "next/server";
import { tweakResume } from "@/lib/tweaker";

export async function POST(request: Request) {
  try {
    const body = await readApiObject(request);

    const resume = textField(body, "resume");
    const jd = textField(body, "jd");

    if (resume.length < 80 || jd.length < 100) {
      return NextResponse.json(
        { error: "Add a fuller resume and job description before tweaking." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      result: tweakResume(resume, jd, resumeMode(body))
    });
  } catch (error) {
    if (error instanceof ApiInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not tailor the resume." }, { status: 500 });
  }
}
