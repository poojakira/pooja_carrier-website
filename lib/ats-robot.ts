import { createHash } from "node:crypto";

export type AtsCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "block";
  score: number;
  detail: string;
};

export type AtsRecheck = {
  scanId: string;
  overallScore: number;
  pass: boolean;
  verdict: "PASS" | "REVISE" | "BLOCKED";
  checkedAt: string;
  checks: AtsCheck[];
  blockers: string[];
  warnings: string[];
  strengths: string[];
};

const STOP = new Set([
  "the","and","for","with","that","this","from","your","you","our","their","are","was","were","have","has","will",
  "can","all","any","job","role","work","team","teams","experience","skills","skill","using","use","into","about",
  "who","what","when","where","why","how","not","but","they","them","its","per","responsibilities","requirements",
  "qualifications","preferred","required","minimum","candidate","position","company","organization","including"
]);

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9+#./%$&@:_ -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentTokens(value: string) {
  return normalize(value).split(" ").filter((token) => token.length > 2 && !STOP.has(token));
}

function topTerms(value: string, limit = 30) {
  const counts = new Map<string, number>();
  for (const token of contentTokens(value)) counts.set(token, (counts.get(token) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .slice(0, limit);
}

function extractFacts(value: string) {
  const facts = new Set<string>();
  const patterns = [
    /\b\d+(?:\.\d+)?%/g,
    /\$[\d,.]+(?:[kKmMbB])?/g,
    /\b(?:19|20)\d{2}\b/g,
    /\b\d+\+?\b/g,
    /\b[A-Z]{2,}(?:[-/][A-Z0-9]+)?\b/g,
    /https?:\/\/\S+/g
  ];
  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      facts.add(match[0].replace(/[),.;]+$/, ""));
    }
  }
  return [...facts].filter((item) => item.length > 1);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function keywordFit(resume: string, jd: string) {
  const terms = topTerms(jd);
  if (!terms.length) return { score: 55, matched: [] as string[], missing: [] as string[] };
  const hay = normalize(resume);
  const matched = terms.filter((term) => hay.includes(term));
  const missing = terms.filter((term) => !hay.includes(term));
  return {
    score: clamp(35 + (matched.length / terms.length) * 65),
    matched,
    missing
  };
}

function structureScore(resume: string) {
  const lower = resume.toLowerCase();
  const sections = ["experience", "education", "skills"];
  const present = sections.filter((section) => lower.includes(section));
  const bullets = resume.split("\n").filter((line) => /^[•*-]\s*/.test(line.trim()));
  const wordCount = resume.trim().split(/\s+/).filter(Boolean).length;

  let score = 44 + present.length * 14;
  if (bullets.length >= 3) score += 8;
  if (wordCount >= 250 && wordCount <= 1100) score += 6;

  const issues: string[] = [];
  if (present.length < 3) issues.push("Use standard Experience, Education, and Skills headings.");
  if (bullets.length < 3) issues.push("Use concise accomplishment bullets for experience.");
  if (wordCount < 180) issues.push("Resume is unusually short for an ATS-ready application.");
  if (wordCount > 1300) issues.push("Resume is unusually long and may dilute relevance.");

  return { score: clamp(score), issues, wordCount, bulletCount: bullets.length };
}

function impactScore(resume: string) {
  const bullets = resume.split("\n").filter((line) => /^[•*-]\s*/.test(line.trim()));
  if (!bullets.length) return { score: 35, metricRatio: 0, actionRatio: 0 };
  const metricBullets = bullets.filter((line) => /\b\d+(?:\.\d+)?%|\b\d+\+?\b|\$[\d,.]+/i.test(line));
  const actionBullets = bullets.filter((line) =>
    /\b(built|led|created|developed|designed|implemented|improved|reduced|increased|owned|managed|delivered|launched|analyzed|automated|optimized|grew|supported|coordinated|executed|produced|achieved|generated)\b/i.test(line)
  );
  const metricRatio = metricBullets.length / bullets.length;
  const actionRatio = actionBullets.length / bullets.length;
  return {
    score: clamp(38 + metricRatio * 32 + actionRatio * 30),
    metricRatio,
    actionRatio
  };
}

function stuffingScore(resume: string, jd: string) {
  const terms = topTerms(jd, 18);
  const words = contentTokens(resume);
  if (!words.length) return { score: 0, suspicious: [] as string[] };
  const suspicious: string[] = [];
  for (const term of terms) {
    const count = words.filter((word) => word === term).length;
    const ratio = count / words.length;
    if (count >= 8 && ratio > 0.025) suspicious.push(term);
  }
  return { score: suspicious.length ? 45 : 100, suspicious };
}

function evidenceIntegrity(sourceResume: string, tailoredResume: string) {
  const sourceFacts = extractFacts(sourceResume);
  const tailoredFacts = extractFacts(tailoredResume);
  const missing = sourceFacts.filter((fact) => !tailoredResume.includes(fact));
  const novel = tailoredFacts.filter((fact) => !sourceResume.includes(fact));
  const preserved = sourceFacts.filter((fact) => tailoredResume.includes(fact));
  const preservation = sourceFacts.length ? preserved.length / sourceFacts.length : 1;
  const score = clamp(100 - missing.length * 6 - novel.length * 20 - (1 - preservation) * 18);
  return { score, missing, novel, sourceFacts, preserved };
}

function readabilityScore(resume: string) {
  const lines = resume.split("\n").map((line) => line.trim()).filter(Boolean);
  const overlong = lines.filter((line) => line.split(/\s+/).length > 45);
  const repeated = new Map<string, number>();
  for (const line of lines.filter((line) => /^[•*-]\s*/.test(line))) {
    const opener = line.replace(/^[•*\-\s]+/, "").split(/\s+/)[0]?.toLowerCase();
    if (opener) repeated.set(opener, (repeated.get(opener) || 0) + 1);
  }
  const repetitiveOpeners = [...repeated.entries()].filter(([, count]) => count >= 3).map(([word]) => word);
  const score = clamp(96 - overlong.length * 7 - repetitiveOpeners.length * 8);
  return { score, overlong, repetitiveOpeners };
}

function contactScore(resume: string) {
  const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(resume);
  const hasPhone = /(?:\+?\d[\d\s().-]{7,}\d)/.test(resume);
  const hasNameLikeHeader = resume.split("\n").slice(0, 4).some((line) => line.trim().split(/\s+/).length >= 2);
  let score = 40;
  if (hasEmail) score += 30;
  if (hasPhone) score += 20;
  if (hasNameLikeHeader) score += 10;
  return { score: clamp(score), hasEmail, hasPhone, hasNameLikeHeader };
}

export function runAtsRobot(sourceResume: string, tailoredResume: string, jd: string): AtsRecheck {
  const keyword = keywordFit(tailoredResume, jd);
  const structure = structureScore(tailoredResume);
  const impact = impactScore(tailoredResume);
  const stuffing = stuffingScore(tailoredResume, jd);
  const integrity = evidenceIntegrity(sourceResume, tailoredResume);
  const readability = readabilityScore(tailoredResume);
  const contact = contactScore(tailoredResume);

  const checks: AtsCheck[] = [
    {
      id: "evidence",
      label: "Evidence integrity",
      status: integrity.novel.length ? "block" : integrity.score >= 90 ? "pass" : "warn",
      score: integrity.score,
      detail: integrity.novel.length
        ? "New factual tokens were introduced that are not present in the source resume: " + integrity.novel.slice(0, 6).join(", ")
        : integrity.missing.length
          ? "Some source facts disappeared during tailoring: " + integrity.missing.slice(0, 6).join(", ")
          : "Numeric/date/acronym facts from the source resume were preserved."
    },
    {
      id: "keyword",
      label: "Job-language alignment",
      status: keyword.score >= 68 ? "pass" : keyword.score >= 55 ? "warn" : "block",
      score: keyword.score,
      detail: keyword.score >= 68
        ? "Strong truthful overlap with the target posting."
        : "Important target terms remain weak or absent: " + keyword.missing.slice(0, 8).join(", ")
    },
    {
      id: "structure",
      label: "ATS structure",
      status: structure.score >= 74 ? "pass" : structure.score >= 60 ? "warn" : "block",
      score: structure.score,
      detail: structure.issues.length ? structure.issues.join(" ") : "Standard sections, bullet structure, and length look ATS-friendly."
    },
    {
      id: "readability",
      label: "Recruiter readability",
      status: readability.score >= 76 ? "pass" : readability.score >= 62 ? "warn" : "block",
      score: readability.score,
      detail: readability.overlong.length || readability.repetitiveOpeners.length
        ? "Reduce very long lines or repetitive bullet openers."
        : "Bullets are readable and action framing is varied."
    },
    {
      id: "impact",
      label: "Impact evidence",
      status: impact.score >= 62 ? "pass" : "warn",
      score: impact.score,
      detail: "Metric-backed bullets: " + Math.round(impact.metricRatio * 100) + "%. Action-led bullets: " + Math.round(impact.actionRatio * 100) + "%."
    },
    {
      id: "stuffing",
      label: "Keyword-stuffing guard",
      status: stuffing.suspicious.length ? "block" : "pass",
      score: stuffing.score,
      detail: stuffing.suspicious.length
        ? "Suspicious repetition detected: " + stuffing.suspicious.join(", ")
        : "No obvious keyword-stuffing pattern detected."
    },
    {
      id: "contact",
      label: "Contact/readiness fields",
      status: contact.score >= 80 ? "pass" : "warn",
      score: contact.score,
      detail: "Email " + (contact.hasEmail ? "present" : "missing") + "; phone " + (contact.hasPhone ? "present" : "missing") + "."
    }
  ];

  const blockers = checks.filter((check) => check.status === "block").map((check) => check.label + ": " + check.detail);
  const warnings = checks.filter((check) => check.status === "warn").map((check) => check.label + ": " + check.detail);
  const strengths = checks.filter((check) => check.status === "pass").map((check) => check.label);

  const weighted =
    integrity.score * 0.24 +
    keyword.score * 0.23 +
    structure.score * 0.16 +
    readability.score * 0.13 +
    impact.score * 0.10 +
    stuffing.score * 0.08 +
    contact.score * 0.06;

  const overallScore = clamp(weighted);
  const pass = blockers.length === 0 && overallScore >= 72 && integrity.score >= 88 && keyword.score >= 60;
  const verdict: AtsRecheck["verdict"] = blockers.length ? "BLOCKED" : pass ? "PASS" : "REVISE";
  const hash = createHash("sha256")
    .update(sourceResume + "\n---TAILORED---\n" + tailoredResume + "\n---JD---\n" + jd)
    .digest("hex")
    .slice(0, 16);

  return {
    scanId: "ATS-" + hash,
    overallScore,
    pass,
    verdict,
    checkedAt: new Date().toISOString(),
    checks,
    blockers,
    warnings,
    strengths
  };
}
