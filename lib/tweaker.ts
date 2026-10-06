type TweakMode = "balanced" | "ats" | "concise" | "impact";

export type ResumeChange = {
  before: string;
  after: string;
  reason: string;
};

export type TweakResult = {
  rewrittenResume: string;
  beforeScore: number;
  afterScore: number;
  integrityScore: number;
  changes: ResumeChange[];
  addedKeywords: string[];
  protectedFacts: string[];
  unresolvedGaps: string[];
};

const STOP = new Set([
  "the","and","for","with","that","this","from","your","you","our","their","are","was","were","have","has",
  "will","can","all","any","job","role","work","team","teams","years","year","experience","skills","skill",
  "using","use","into","about","who","what","when","where","why","how","not","but","they","them","its","per",
  "responsibilities","responsibility","requirements","requirement","qualifications","qualification","preferred",
  "required","minimum","candidate","candidates","position","company","organization","including","such"
]);

const WEAK_OPENERS: Array<[RegExp, string]> = [
  [/^responsible for\b/i, "Owned"],
  [/^worked on\b/i, "Contributed to"],
  [/^helped (to )?/i, "Supported "],
  [/^participated in\b/i, "Contributed to"],
  [/^used\b/i, "Applied"],
  [/^did\b/i, "Executed"],
  [/^made\b/i, "Developed"],
  [/^created\b/i, "Developed"]
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9+#./%$& -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rawTokens(value: string) {
  return normalize(value).split(" ").filter(Boolean);
}

function stem(token: string) {
  let value = token.toLowerCase();
  if (value.length > 5 && value.endsWith("ies")) value = value.slice(0, -3) + "y";
  else if (value.length > 5 && value.endsWith("ing")) value = value.slice(0, -3);
  else if (value.length > 4 && value.endsWith("ed")) value = value.slice(0, -2);
  else if (value.length > 4 && value.endsWith("es")) value = value.slice(0, -2);
  else if (value.length > 3 && value.endsWith("s")) value = value.slice(0, -1);
  return value;
}

function contentTokens(value: string) {
  return rawTokens(value).filter((token) => token.length > 2 && !STOP.has(token));
}

function phraseTokens(value: string) {
  return contentTokens(value).map(stem);
}

function splitSentences(value: string) {
  return value
    .replace(/\r/g, "")
    .split(/\n|(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function phraseCandidates(text: string) {
  const sentences = splitSentences(text);
  const counts = new Map<string, number>();

  for (const sentence of sentences) {
    const tokens = contentTokens(sentence);
    for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
    for (let size = 2; size <= 3; size++) {
      for (let i = 0; i <= tokens.length - size; i++) {
        const phrase = tokens.slice(i, i + size).join(" ");
        if (phrase.length < 7 || phrase.length > 52) continue;
        counts.set(phrase, (counts.get(phrase) || 0) + (size === 3 ? 3 : 2));
      }
    }
  }

  return [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count, size: phrase.split(" ").length }))
    .sort((a, b) => (b.count + b.size) - (a.count + a.size))
    .map((item) => item.phrase);
}

function phraseSupported(phrase: string, resume: string) {
  const resumeNorm = normalize(resume);
  if (resumeNorm.includes(normalize(phrase))) return true;

  const resumeStems = new Set(contentTokens(resume).map(stem));
  const stems = phraseTokens(phrase);
  if (!stems.length) return false;
  const hits = stems.filter((token) => resumeStems.has(token)).length;
  return hits / stems.length >= (stems.length === 1 ? 1 : 0.85);
}

function extractJobKeywords(jd: string) {
  const explicitSentences = splitSentences(jd).filter((sentence) =>
    /\b(required|must|need|minimum|preferred|plus|responsib|you will|we are looking|qualification|proficien|knowledge of|experience with)\b/i.test(sentence)
  );

  const ranked = phraseCandidates(explicitSentences.join("\n") + "\n" + jd);
  const result: string[] = [];
  for (const phrase of ranked) {
    const lower = normalize(phrase);
    if (!lower || STOP.has(lower)) continue;
    if (result.some((existing) => existing.includes(lower) || lower.includes(existing))) {
      if (phrase.split(" ").length === 1) continue;
    }
    result.push(phrase);
    if (result.length >= 28) break;
  }
  return result;
}

function overlapScore(resume: string, keywords: string[]) {
  if (!keywords.length) return 55;
  const weighted = keywords.map((keyword) => {
    const weight = Math.min(3, keyword.split(" ").length);
    return { hit: phraseSupported(keyword, resume), weight };
  });
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  const hit = weighted.reduce((sum, item) => sum + (item.hit ? item.weight : 0), 0);
  return Math.max(30, Math.min(98, Math.round(32 + (hit / Math.max(1, total)) * 66)));
}

function extractProtectedFacts(resume: string) {
  const facts = new Set<string>();
  const patterns = [
    /\b\d+(?:\.\d+)?%/g,
    /\b\d+\+?\b/g,
    /\$[\d,.]+(?:[kKmMbB])?/g,
    /\b(?:19|20)\d{2}\b/g,
    /\b[A-Z]{2,}(?:[-/][A-Z0-9]+)?\b/g,
    /https?:\/\/\S+/g
  ];
  for (const pattern of patterns) {
    for (const match of resume.matchAll(pattern)) facts.add(match[0].replace(/[),.;]+$/, ""));
  }
  return [...facts].filter((item) => item.length > 1).slice(0, 24);
}

function cleanBulletBody(value: string, mode: TweakMode) {
  let body = value.trim();
  for (const [pattern, replacement] of WEAK_OPENERS) {
    if (pattern.test(body)) {
      body = body.replace(pattern, replacement).replace(/\s+/g, " ").trim();
      break;
    }
  }

  body = body
    .replace(/\bin order to\b/gi, "to")
    .replace(/\bwas able to\b/gi, "")
    .replace(/\bwere able to\b/gi, "")
    .replace(/\bhelped to\b/gi, "helped")
    .replace(/\s+/g, " ")
    .trim();

  if (mode === "concise") {
    body = body
      .replace(/\bwhich was\b/gi, "that was")
      .replace(/\bwhich were\b/gi, "that were")
      .replace(/\bthat were able to\b/gi, "that")
      .trim();
  }

  if (body && /^[a-z]/.test(body)) body = body[0].toUpperCase() + body.slice(1);
  return body;
}

function bulletRelevance(line: string, keywords: string[]) {
  const lineStems = new Set(contentTokens(line).map(stem));
  let score = 0;
  for (const keyword of keywords) {
    const stems = phraseTokens(keyword);
    if (!stems.length) continue;
    const hits = stems.filter((token) => lineStems.has(token)).length;
    if (hits === stems.length) score += stems.length * 4;
    else if (hits / stems.length >= 0.6) score += hits * 2;
  }
  if (/\b\d+(?:\.\d+)?%|\b\d+\+?\b|\$[\d,.]+/i.test(line)) score += 2;
  return score;
}

function reorderBulletRuns(lines: string[], keywords: string[]) {
  const output = [...lines];
  let i = 0;
  while (i < output.length) {
    if (!/^[•*-]\s*/.test(output[i].trim())) {
      i++;
      continue;
    }
    const start = i;
    while (i < output.length && /^[•*-]\s*/.test(output[i].trim())) i++;
    const run = output.slice(start, i);
    if (run.length < 2) continue;
    const sorted = run
      .map((line, index) => ({ line, index, score: bulletRelevance(line, keywords) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((item) => item.line);
    output.splice(start, run.length, ...sorted);
  }
  return output;
}

export function tweakResume(resume: string, jd: string, mode: TweakMode = "balanced"): TweakResult {
  const keywords = extractJobKeywords(jd);
  const supportedKeywords = keywords.filter((keyword) => phraseSupported(keyword, resume));
  const unresolvedGaps = keywords.filter((keyword) => !phraseSupported(keyword, resume)).slice(0, 10);
  const beforeScore = overlapScore(resume, keywords);
  const sourceFacts = extractProtectedFacts(resume);

  const originalLines = resume.split("\n");
  const changes: ResumeChange[] = [];

  let rewritten = originalLines.map((line) => {
    if (!/^[•*-]\s*/.test(line.trim())) return line;
    const prefix = line.match(/^[•*\-\s]+/)?.[0] || "• ";
    const originalBody = line.replace(/^[•*\-\s]+/, "").trim();
    const cleaned = cleanBulletBody(originalBody, mode);
    const next = prefix + cleaned;
    if (next !== line) {
      changes.push({
        before: line,
        after: next,
        reason: mode === "concise"
          ? "Removed filler and tightened the bullet without adding facts."
          : "Strengthened phrasing while preserving the original claim and evidence."
      });
    }
    return next;
  });

  if (mode === "ats" || mode === "balanced" || mode === "impact") {
    const beforeOrder = [...rewritten];
    rewritten = reorderBulletRuns(rewritten, supportedKeywords);
    if (rewritten.join("\n") !== beforeOrder.join("\n")) {
      changes.unshift({
        before: "Original bullet order",
        after: "Most job-relevant evidence moved earlier within each bullet group",
        reason: "Reordered existing evidence for recruiter and ATS relevance; no claims were changed."
      });
    }
  }

  const rewrittenResume = rewritten.join("\n");
  const preserved = sourceFacts.filter((fact) => rewrittenResume.includes(fact));
  const integrityScore = sourceFacts.length
    ? Math.round((preserved.length / sourceFacts.length) * 100)
    : 100;

  const structuralBoost = Math.min(7, changes.length * 2);
  const afterScore = Math.min(98, Math.max(beforeScore, overlapScore(rewrittenResume, keywords) + structuralBoost));

  return {
    rewrittenResume,
    beforeScore,
    afterScore,
    integrityScore,
    changes: changes.slice(0, 24),
    addedKeywords: supportedKeywords.slice(0, 12),
    protectedFacts: preserved.slice(0, 12),
    unresolvedGaps
  };
}
