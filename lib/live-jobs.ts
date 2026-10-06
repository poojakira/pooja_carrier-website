import { evaluateRole } from "@/lib/engine";

export type LiveJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  source: "greenhouse" | "lever";
  sourceLabel: string;
  sourceUrl: string;
  applyUrl: string;
  updatedAt?: string;
  description: string;
  fit: number;
  roleChance: number;
  roleConfidence: "low" | "medium" | "high";
  sponsorshipChance: number;
  sponsorshipLabel: string;
  sponsorshipConfidence: "low" | "medium" | "high";
  verdict: string;
};

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function greenhouseToken(input: URL) {
  const host = input.hostname.toLowerCase();
  if (!host.endsWith("greenhouse.io")) return null;
  const parts = input.pathname.split("/").filter(Boolean);
  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") return parts[0] || null;
  if (host === "boards-api.greenhouse.io") {
    const index = parts.findIndex((item) => item === "boards");
    return index >= 0 ? parts[index + 1] || null : null;
  }
  return null;
}

function leverSite(input: URL) {
  const host = input.hostname.toLowerCase();
  if (!host.endsWith("lever.co")) return null;
  const parts = input.pathname.split("/").filter(Boolean);
  if (host === "jobs.lever.co") return parts[0] || null;
  if (host === "api.lever.co") {
    const index = parts.findIndex((item) => item === "postings");
    return index >= 0 ? parts[index + 1] || null : null;
  }
  return null;
}

async function fetchGreenhouse(token: string) {
  const endpoint = "https://boards-api.greenhouse.io/v1/boards/" + encodeURIComponent(token) + "/jobs?content=true";
  const response = await fetch(endpoint, {
    headers: { accept: "application/json", "user-agent": "PoojaCareerOS/1.0" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Greenhouse board could not be read.");
  const data = await response.json() as {
    jobs?: Array<{
      id: number;
      title: string;
      absolute_url: string;
      updated_at?: string;
      location?: { name?: string };
      content?: string;
      departments?: Array<{ name?: string }>;
      offices?: Array<{ name?: string }>;
    }>
  };

  return (data.jobs || []).map((job) => ({
    id: "gh-" + job.id,
    title: job.title || "Untitled role",
    company: token,
    location: job.location?.name || job.offices?.map((item) => item.name).filter(Boolean).join(", ") || "Location not listed",
    source: "greenhouse" as const,
    sourceLabel: "Greenhouse",
    sourceUrl: endpoint,
    applyUrl: job.absolute_url,
    updatedAt: job.updated_at,
    description: stripHtml(job.content || "")
  }));
}

async function fetchLever(site: string) {
  const endpoint = "https://api.lever.co/v0/postings/" + encodeURIComponent(site) + "?mode=json";
  const response = await fetch(endpoint, {
    headers: { accept: "application/json", "user-agent": "PoojaCareerOS/1.0" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Lever board could not be read.");
  const data = await response.json() as Array<{
    id: string;
    text: string;
    hostedUrl?: string;
    applyUrl?: string;
    categories?: { location?: string; team?: string; commitment?: string };
    descriptionPlain?: string;
    description?: string;
    lists?: Array<{ text?: string; content?: string }>;
    additionalPlain?: string;
    createdAt?: number;
  }>;

  return (Array.isArray(data) ? data : []).map((job) => {
    const listText = (job.lists || [])
      .map((item) => [item.text, stripHtml(item.content || "")].filter(Boolean).join(": "))
      .join(" ");
    const description = [
      job.descriptionPlain || stripHtml(job.description || ""),
      listText,
      job.additionalPlain || ""
    ].filter(Boolean).join(" ");

    return {
      id: "lv-" + job.id,
      title: job.text || "Untitled role",
      company: site,
      location: job.categories?.location || "Location not listed",
      source: "lever" as const,
      sourceLabel: "Lever",
      sourceUrl: endpoint,
      applyUrl: job.applyUrl || job.hostedUrl || ("https://jobs.lever.co/" + site + "/" + job.id),
      updatedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
      description: stripHtml(description)
    };
  });
}

export async function loadLiveJobs(
  sourceInput: string,
  resume: string,
  needsSponsorship: boolean
): Promise<LiveJob[]> {
  let parsed: URL;
  try {
    parsed = new URL(sourceInput);
  } catch {
    throw new Error("Enter a full Greenhouse or Lever job-board URL.");
  }

  const gh = greenhouseToken(parsed);
  const lv = leverSite(parsed);
  if (!gh && !lv) {
    throw new Error("This live importer currently supports public Greenhouse and Lever boards.");
  }

  const base = gh ? await fetchGreenhouse(gh) : await fetchLever(lv as string);

  return base
    .filter((job) => job.title && job.applyUrl)
    .slice(0, 60)
    .map((job) => {
      const evalResult = evaluateRole(resume, job.description || job.title, needsSponsorship);
      return {
        ...job,
        fit: evalResult.score,
        roleChance: evalResult.roleChance.percentage,
        roleConfidence: evalResult.roleChance.confidence,
        sponsorshipChance: evalResult.sponsorship.percentage,
        sponsorshipLabel: evalResult.sponsorship.label,
        sponsorshipConfidence: evalResult.sponsorship.confidence,
        verdict: evalResult.verdict
      };
    })
    .sort((a, b) => b.fit - a.fit || b.roleChance - a.roleChance);
}
