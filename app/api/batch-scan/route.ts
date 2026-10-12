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


const MAX_REQUEST_BYTES = 16 * 1024 * 1024;
const JOB_FIELD_LIMITS: Record<keyof InputJob, number> = {
  id: 200,
  title: 250,
  company: 250,
  location: 250,
  description: 25_000,
  applyUrl: 2_000,
  source: 100
};

class BatchInputError extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
  }
}

async function boundedJson(request: Request): Promise<unknown> {
  const claimed = request.headers.get("content-length");
  if (claimed !== null) {
    if (!/^\d+$/.test(claimed)) {
      throw new BatchInputError("Invalid Content-Length.");
    }
    if (Number(claimed) > MAX_REQUEST_BYTES) {
      throw new BatchInputError("Batch request exceeds 16 MiB.", 413);
    }
  }
  if (!request.body) throw new BatchInputError("A JSON request body is required.");
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let received = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new BatchInputError("Batch request exceeds 16 MiB.", 413);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks, received).toString("utf8")) as unknown;
  } catch {
    throw new BatchInputError("Provide a valid JSON object.");
  }
}

function safeApplyUrl(input?: string): string {
  if (!input) return "";
  try {
    const parsed = new URL(input);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const parsed = await boundedJson(request);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new BatchInputError("Provide a valid JSON object.");
    }
    const body = parsed as {
      jobs?: InputJob[];
      resume?: string;
      needsSponsorship?: boolean;
      maxResults?: number;
      roleQuery?: string;
    };

    if (typeof body.resume !== "string" || (body.roleQuery !== undefined && typeof body.roleQuery !== "string") ||
        (body.needsSponsorship !== undefined && typeof body.needsSponsorship !== "boolean")) {
      throw new BatchInputError("Invalid resume, role query, or sponsorship field.");
    }
    if (body.maxResults !== undefined &&
        (!Number.isInteger(body.maxResults) || body.maxResults < 1 || body.maxResults > 500)) {
      throw new BatchInputError("maxResults must be an integer from 1 to 500.");
    }
    const resume = body.resume.trim();
    const jobs = Array.isArray(body.jobs) ? body.jobs : [];
    const roleQuery = body.roleQuery?.trim() || "";
    if (resume.length > 50_000 || roleQuery.length > 1_000) {
      throw new BatchInputError("Resume or role query exceeds the supported length.", 413);
    }

    if (resume.length < 80) {
      return NextResponse.json({ error: "A fuller resume is required." }, { status: 400 });
    }
    if (!jobs.length) {
      return NextResponse.json({ error: "Add at least one job." }, { status: 400 });
    }
    if (jobs.length > 10000) {
      return NextResponse.json({ error: "Batch limit is 10,000 jobs per scan." }, { status: 413 });
    }

    for (const job of jobs) {
      if (!job || typeof job !== "object" || Array.isArray(job)) {
        throw new BatchInputError("Each job must be an object.");
      }
      for (const field of Object.keys(JOB_FIELD_LIMITS) as Array<keyof InputJob>) {
        const value = job[field];
        if (value != null && (typeof value !== "string" || value.length > JOB_FIELD_LIMITS[field])) {
          throw new BatchInputError("A job field has an invalid type or length.");
        }
      }
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
        applyUrl: safeApplyUrl(job.applyUrl),
        source: job.source || "batch",
        fit: result.score,
        roleChance: result.roleChance.percentage,
        roleConfidence: result.roleChance.confidence,
        sponsorshipChance: result.sponsorship.percentage,
        sponsorshipLabel: result.sponsorship.label,
        verdict: result.verdict
      };
    }).sort((a, b) => b.fit - a.fit || b.roleChance - a.roleChance);

    const limit = body.maxResults ?? 200;
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
  } catch (error) {
    if (error instanceof BatchInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Batch scan failed." }, { status: 500 });
  }
}
