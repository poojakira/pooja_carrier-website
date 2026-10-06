import { NextResponse } from "next/server";
import { evaluateRole } from "@/lib/engine";

export const runtime = "nodejs";

type InputJob = {
  id?: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  applyUrl?: string;
  source?: string;
};

function keyFor(job: InputJob) {
  return (job.applyUrl || [job.company, job.title, job.location].filter(Boolean).join("|")).toLowerCase().trim();
}

function wanted(title: string, roleQuery: string) {
  const targets = roleQuery.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!targets.length) return true;
  const hay = title.toLowerCase();
  return targets.some((target) => hay.includes(target) || target.includes(hay));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      jobs?: InputJob[];
      resume?: string;
      needsSponsorship?: boolean;
      maxResults?: number;
      roleQuery?: string;
    };

    const resume = body.resume?.trim() || "";
    const jobs = Array.isArray(body.jobs) ? body.jobs : [];
    const roleQuery = body.roleQuery?.trim() || "";

    if (resume.length < 80) {
      return NextResponse.json({ error: "A fuller resume is required." }, { status: 400 });
    }
    if (!jobs.length) {
      return NextResponse.json({ error: "Add at least one job." }, { status: 400 });
    }
    if (jobs.length > 10000) {
      return NextResponse.json({ error: "Batch limit is 10,000 jobs per scan." }, { status: 413 });
    }

    const unique = new Map<string, InputJob>();
    for (const job of jobs) {
      const key = keyFor(job);
      if (!key || unique.has(key)) continue;
      unique.set(key, job);
    }

    const roleFiltered = [...unique.values()].filter((job) => wanted(job.title || "", roleQuery));

    const evaluated = roleFiltered.map((job, index) => {
      const description = (job.description || [job.title, job.location].filter(Boolean).join(" ")).trim();
      const result = evaluateRole(resume, description || "Untitled job", Boolean(body.needsSponsorship));
      return {
        id: job.id || "batch-" + index,
        title: job.title || "Untitled role",
        company: job.company || "Unknown company",
        location: job.location || "Location not listed",
        applyUrl: job.applyUrl || "",
        source: job.source || "batch",
        fit: result.score,
        roleChance: result.roleChance.percentage,
        roleConfidence: result.roleChance.confidence,
        sponsorshipChance: result.sponsorship.percentage,
        sponsorshipLabel: result.sponsorship.label,
        verdict: result.verdict
      };
    }).sort((a, b) => b.fit - a.fit || b.roleChance - a.roleChance);

    const limit = Math.max(1, Math.min(500, body.maxResults || 200));
    const strong = evaluated.filter((job) => job.fit >= 60 || job.roleChance >= 8);

    return NextResponse.json({
      scanned: jobs.length,
      deduped: unique.size,
      roleFiltered: roleFiltered.length,
      strongMatches: strong.length,
      results: strong.slice(0, limit),
      process: {
        pass1: "dedupe + role filter",
        pass2: "fit + sponsorship + role-chance evaluation"
      }
    });
  } catch {
    return NextResponse.json({ error: "Batch scan failed." }, { status: 500 });
  }
}
