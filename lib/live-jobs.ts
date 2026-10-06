import { evaluateRole } from "@/lib/engine";

export type LiveJobSource = "greenhouse" | "lever" | "ashby" | "smartrecruiters" | "workday";

export type LiveJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  source: LiveJobSource;
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

type BaseJob = Omit<LiveJob, "fit" | "roleChance" | "roleConfidence" | "sponsorshipChance" | "sponsorshipLabel" | "sponsorshipConfidence" | "verdict">;

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

function deepText(value: unknown, depth = 0): string {
  if (depth > 7 || value == null) return "";
  if (typeof value === "string") {
    const clean = stripHtml(value);
    if (/^https?:\/\//i.test(clean)) return "";
    return clean.length >= 20 ? clean : "";
  }
  if (Array.isArray(value)) return value.map((item) => deepText(item, depth + 1)).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/(id|uuid|url|ref|token|code)$/i.test(key))
      .map(([, item]) => deepText(item, depth + 1))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "user-agent": "PoojaCareerOS/1.1",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("ATS source returned HTTP " + response.status + ".");
  return response.json();
}

function greenhouseToken(input: URL) {
  const host = input.hostname.toLowerCase();
  if (host !== "boards.greenhouse.io" && host !== "job-boards.greenhouse.io" && host !== "boards-api.greenhouse.io") return null;
  const parts = input.pathname.split("/").filter(Boolean);
  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") return parts[0] || null;
  const index = parts.findIndex((item) => item === "boards");
  return index >= 0 ? parts[index + 1] || null : null;
}

function leverSite(input: URL) {
  const host = input.hostname.toLowerCase();
  if (host !== "jobs.lever.co" && host !== "api.lever.co") return null;
  const parts = input.pathname.split("/").filter(Boolean);
  if (host === "jobs.lever.co") return parts[0] || null;
  const index = parts.findIndex((item) => item === "postings");
  return index >= 0 ? parts[index + 1] || null : null;
}

function ashbyBoard(input: URL) {
  const host = input.hostname.toLowerCase();
  const parts = input.pathname.split("/").filter(Boolean);
  if (host === "jobs.ashbyhq.com") return parts[0] || null;
  if (host === "api.ashbyhq.com") {
    const index = parts.findIndex((item) => item === "job-board");
    return index >= 0 ? parts[index + 1] || null : null;
  }
  return null;
}

function smartRecruitersCompany(input: URL) {
  const host = input.hostname.toLowerCase();
  const parts = input.pathname.split("/").filter(Boolean);
  if (host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com") return parts[0] || null;
  if (host === "api.smartrecruiters.com") {
    const index = parts.findIndex((item) => item === "companies");
    return index >= 0 ? parts[index + 1] || null : null;
  }
  return null;
}

function workdayInfo(input: URL) {
  const match = input.hostname.toLowerCase().match(/^([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com$/i);
  if (!match) return null;
  const parts = input.pathname.split("/").filter(Boolean);
  if (parts[0] && /^[a-z]{2}-[a-z]{2}$/i.test(parts[0])) parts.shift();
  const site = parts[0];
  if (!site) return null;
  return { tenant: match[1], shard: match[2], host: input.hostname, site };
}

async function fetchGreenhouse(token: string, maxJobs: number): Promise<BaseJob[]> {
  const endpoint = "https://boards-api.greenhouse.io/v1/boards/" + encodeURIComponent(token) + "/jobs?content=true";
  const data = await fetchJson(endpoint) as {
    jobs?: Array<{
      id: number;
      title: string;
      absolute_url: string;
      updated_at?: string;
      location?: { name?: string };
      content?: string;
      offices?: Array<{ name?: string }>;
    }>
  };

  return (data.jobs || []).slice(0, maxJobs).map((job) => ({
    id: "gh-" + job.id,
    title: job.title || "Untitled role",
    company: token,
    location: job.location?.name || job.offices?.map((item) => item.name).filter(Boolean).join(", ") || "Location not listed",
    source: "greenhouse",
    sourceLabel: "Greenhouse",
    sourceUrl: endpoint,
    applyUrl: job.absolute_url,
    updatedAt: job.updated_at,
    description: stripHtml(job.content || "")
  }));
}

async function fetchLever(site: string, maxJobs: number): Promise<BaseJob[]> {
  const endpoint = "https://api.lever.co/v0/postings/" + encodeURIComponent(site) + "?mode=json";
  const data = await fetchJson(endpoint) as Array<{
    id: string;
    text: string;
    hostedUrl?: string;
    applyUrl?: string;
    categories?: { location?: string };
    descriptionPlain?: string;
    description?: string;
    lists?: Array<{ text?: string; content?: string }>;
    additionalPlain?: string;
    createdAt?: number;
  }>;

  return (Array.isArray(data) ? data : []).slice(0, maxJobs).map((job) => {
    const listText = (job.lists || []).map((item) => [item.text, stripHtml(item.content || "")].filter(Boolean).join(": ")).join(" ");
    return {
      id: "lv-" + job.id,
      title: job.text || "Untitled role",
      company: site,
      location: job.categories?.location || "Location not listed",
      source: "lever",
      sourceLabel: "Lever",
      sourceUrl: endpoint,
      applyUrl: job.applyUrl || job.hostedUrl || ("https://jobs.lever.co/" + site + "/" + job.id),
      updatedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
      description: stripHtml([job.descriptionPlain || job.description || "", listText, job.additionalPlain || ""].filter(Boolean).join(" "))
    };
  });
}

async function fetchAshby(board: string, maxJobs: number): Promise<BaseJob[]> {
  const endpoint = "https://api.ashbyhq.com/posting-api/job-board/" + encodeURIComponent(board) + "?includeCompensation=true";
  const data = await fetchJson(endpoint) as {
    jobs?: Array<{
      title?: string;
      location?: string;
      descriptionPlain?: string;
      descriptionHtml?: string;
      publishedAt?: string;
      jobUrl?: string;
      applyUrl?: string;
      isListed?: boolean;
      compensation?: { compensationTierSummary?: string };
    }>
  };

  return (data.jobs || [])
    .filter((job) => job.isListed !== false)
    .slice(0, maxJobs)
    .map((job, index) => ({
      id: "ash-" + board + "-" + index + "-" + (job.jobUrl || job.applyUrl || job.title || "job"),
      title: job.title || "Untitled role",
      company: board,
      location: job.location || "Location not listed",
      source: "ashby",
      sourceLabel: "Ashby",
      sourceUrl: endpoint,
      applyUrl: job.applyUrl || job.jobUrl || ("https://jobs.ashbyhq.com/" + board),
      updatedAt: job.publishedAt,
      description: stripHtml([
        job.descriptionPlain || job.descriptionHtml || "",
        job.compensation?.compensationTierSummary || ""
      ].filter(Boolean).join(" "))
    }));
}

async function fetchSmartRecruiters(company: string, maxJobs: number): Promise<BaseJob[]> {
  const pageSize = Math.min(100, Math.max(1, maxJobs));
  const endpoint = "https://api.smartrecruiters.com/v1/companies/" + encodeURIComponent(company) + "/postings?limit=" + pageSize + "&offset=0";
  const data = await fetchJson(endpoint) as {
    content?: Array<{
      id?: string;
      uuid?: string;
      name?: string;
      ref?: string;
      location?: { city?: string; region?: string; country?: string; remote?: boolean };
      releasedDate?: string;
    }>
  };

  const list = (data.content || []).slice(0, maxJobs);
  const details: BaseJob[] = [];
  for (let i = 0; i < list.length; i += 8) {
    const batch = list.slice(i, i + 8);
    const resolved = await Promise.all(batch.map(async (job, index) => {
      const id = job.id || job.uuid;
      if (!id) return null;
      const detailUrl = "https://api.smartrecruiters.com/v1/companies/" + encodeURIComponent(company) + "/postings/" + encodeURIComponent(id);
      let detail: unknown = job;
      try { detail = await fetchJson(detailUrl); } catch { detail = job; }
      const location = [job.location?.city, job.location?.region, job.location?.country].filter(Boolean).join(", ") || "Location not listed";
      return {
        id: "sr-" + id,
        title: job.name || (detail as { name?: string })?.name || "Untitled role",
        company,
        location,
        source: "smartrecruiters" as const,
        sourceLabel: "SmartRecruiters",
        sourceUrl: endpoint,
        applyUrl: "https://jobs.smartrecruiters.com/" + encodeURIComponent(company) + "/" + encodeURIComponent(id),
        updatedAt: job.releasedDate,
        description: deepText(detail) || [job.name, location].filter(Boolean).join(" ")
      };
    }));
    details.push(...resolved.filter((item): item is BaseJob => Boolean(item)));
  }
  return details;
}

async function fetchWorkday(input: ReturnType<typeof workdayInfo>, maxJobs: number): Promise<BaseJob[]> {
  if (!input) return [];
  const baseOrigin = "https://" + input.host;
  const cxsBase = baseOrigin + "/wday/cxs/" + encodeURIComponent(input.tenant) + "/" + encodeURIComponent(input.site);
  const endpoint = cxsBase + "/jobs";
  const results: Array<{
    title?: string;
    externalPath?: string;
    locationsText?: string;
    postedOn?: string;
    bulletFields?: string[];
  }> = [];

  let offset = 0;
  while (results.length < maxJobs) {
    const page = await fetchJson(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        referer: baseOrigin + "/" + input.site
      },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText: "" })
    }) as { jobPostings?: typeof results; total?: number };

    const jobs = page.jobPostings || [];
    results.push(...jobs);
    if (jobs.length < 20 || results.length >= (page.total || Number.MAX_SAFE_INTEGER)) break;
    offset += 20;
  }

  const chosen = results.slice(0, maxJobs);
  const detailed: BaseJob[] = [];

  for (let i = 0; i < chosen.length; i += 6) {
    const batch = chosen.slice(i, i + 6);
    const resolved = await Promise.all(batch.map(async (job, index) => {
      const externalPath = job.externalPath || "";
      const jobUrl = baseOrigin + "/" + encodeURIComponent(input.site) + externalPath;
      let detail: unknown = job;
      if (externalPath) {
        try {
          detail = await fetchJson(cxsBase + externalPath, {
            headers: { referer: baseOrigin + "/" + input.site }
          });
        } catch {
          detail = job;
        }
      }
      return {
        id: "wd-" + input.tenant + "-" + (externalPath || index),
        title: job.title || "Untitled role",
        company: input.tenant,
        location: job.locationsText || "Location not listed",
        source: "workday" as const,
        sourceLabel: "Workday",
        sourceUrl: endpoint,
        applyUrl: jobUrl,
        updatedAt: job.postedOn,
        description: deepText(detail) || [job.title, job.locationsText, ...(job.bulletFields || [])].filter(Boolean).join(" ")
      };
    }));
    detailed.push(...resolved);
  }

  return detailed;
}

export async function loadLiveJobs(
  sourceInput: string,
  resume: string,
  needsSponsorship: boolean,
  maxJobs = 60,
  roleQuery = ""
): Promise<LiveJob[]> {
  let parsed: URL;
  try {
    parsed = new URL(sourceInput);
  } catch {
    throw new Error("Enter a full supported employer job-board URL.");
  }

  const cap = Math.max(1, Math.min(500, maxJobs));
  const gh = greenhouseToken(parsed);
  const lv = leverSite(parsed);
  const ash = ashbyBoard(parsed);
  const sr = smartRecruitersCompany(parsed);
  const wd = workdayInfo(parsed);

  let base: BaseJob[];
  if (gh) base = await fetchGreenhouse(gh, cap);
  else if (lv) base = await fetchLever(lv, cap);
  else if (ash) base = await fetchAshby(ash, cap);
  else if (sr) base = await fetchSmartRecruiters(sr, cap);
  else if (wd) base = await fetchWorkday(wd, cap);
  else {
    throw new Error("Supported live boards: Greenhouse, Lever, Ashby, SmartRecruiters, and public Workday career sites.");
  }

  const targets = roleQuery.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const roleFiltered = base.filter((job) => {
    if (!targets.length) return true;
    const title = job.title.toLowerCase();
    return targets.some((target) => title.includes(target) || target.includes(title));
  });

  return roleFiltered
    .filter((job) => job.title && job.applyUrl)
    .map((job) => {
      const evalResult = evaluateRole(resume, job.description || (job.title + " " + job.location), needsSponsorship);
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
