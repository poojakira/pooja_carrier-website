import { ApiInputError, readApiObject, textField, booleanField } from "@/lib/api-input";
import { NextResponse } from "next/server";
import { evaluateRole } from "@/lib/engine";

export async function POST(request: Request) {
  try {
    const body = await readApiObject(request);
    const resume = textField(body, "resume");
    const jd = textField(body, "jd");

    if (resume.length < 40 || jd.length < 80) {
      return NextResponse.json(
        { error: "Add a fuller resume and job description before evaluating." },
        { status: 400 }
      );
    }

    return NextResponse.json({ evaluation: evaluateRole(resume, jd, booleanField(body, "needsSponsorship")) });
  } catch (error) {
    if (error instanceof ApiInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not evaluate this role." }, { status: 500 });
  }
}
