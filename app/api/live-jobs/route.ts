import { ApiInputError, readApiObject, textField, booleanField, jobLimit } from "@/lib/api-input";
import { NextResponse } from "next/server";
import { loadLiveJobs } from "@/lib/live-jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await readApiObject(request);

    const source = textField(body, "source", 2_000);
    const resume = textField(body, "resume");

    if (!source || resume.length < 80) {
      return NextResponse.json(
        { error: "Add a supported job-board URL and a fuller resume first." },
        { status: 400 }
      );
    }

    const jobs = await loadLiveJobs(source, resume, booleanField(body, "needsSponsorship"), jobLimit(body), textField(body, "roleQuery", 1_000));
    return NextResponse.json({
      jobs,
      fetchedAt: new Date().toISOString(),
      sourceCount: jobs.length
    });
  } catch (error) {
    if (error instanceof ApiInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = "Could not load this supported live board.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
