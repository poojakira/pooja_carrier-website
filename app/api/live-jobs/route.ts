import { NextResponse } from "next/server";
import { loadLiveJobs } from "@/lib/live-jobs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      source?: string;
      resume?: string;
      needsSponsorship?: boolean;
      roleQuery?: string;
      maxJobs?: number;
    };

    const source = body.source?.trim() || "";
    const resume = body.resume?.trim() || "";

    if (!source || resume.length < 80) {
      return NextResponse.json(
        { error: "Add a supported job-board URL and a fuller resume first." },
        { status: 400 }
      );
    }

    const jobs = await loadLiveJobs(source, resume, Boolean(body.needsSponsorship), body.maxJobs || 100, body.roleQuery || "");
    return NextResponse.json({
      jobs,
      fetchedAt: new Date().toISOString(),
      sourceCount: jobs.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load this live board.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
