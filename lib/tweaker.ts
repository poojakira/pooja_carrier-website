type TweakMode = "balanced" | "ats" | "concise" | "impact";

type Change = {
  before: string;
  after: string;
  reason: string;
};

type TweakResult = {
  rewrittenResume: string;
  beforeScore: number;
  afterScore: number;
  integrityScore: number;
  changes: Change[];
  addedKeywords: string[];
  protectedFacts: string[];
  unresolvedGaps: string[];
};

const STOP = new Set([
  "the","and","for","with","that","this","from","your","you","our","their","are","was","were","have","has",
  "will","can","all","any","job","role","work","team","teams","years","experience","skills","skill","engineer",
  "engineering","security","using","use","into","about","who","what","when","where","why","how","not","but"
]);

const PHRASES = [
  "application security","cloud security","cloud iam security","api security","threat modeling","secure design",
  "security automation","incident response","ai security","llm security","prompt injection","model security",
  "supply chain security","iam","least privilege","authorization","authentication","siem","elastic",
  "github actions","codeql","docker","kubernetes","python","aws","azure","gcp","fastapi","sarif",
  "penetration testing","code review","vulnerability management","detection engineering","devsecops"
];

const SYNONYMS: Record<string, string[]> = {
  "application security": ["appsec","secure code","code review","web security","api security"],
  "threat modeling": ["threat model","secure design","architecture review"],
  "security automation": ["automation","python","ci/cd","github actions","scripting"],
  "cloud security": ["aws","iam","cloud iam","least privilege","trust policy"],
  "cloud iam security": ["iam","least privilege","trust policy","permission boundary","aws"],
  "ai security": ["llm","prompt injection","agent security","model security","adversarial"],
  "llm security": ["prompt injection","agent security","llm","rag security"],
  "incident response": ["triage","investigation","response","siem","elastic"],
  "detection engineering": ["siem","elastic","telemetry","detection","rules"],
  "api security": ["api","fastapi","authorization","authentication"],
  "devsecops": ["github actions","codeql","ci/cd","docker","sarif"],
  "penetration testing": ["security testing","red team","adversarial","assessment"]
};

function norm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#./%$ -]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return norm(value).split(" ").filter((x) => x.length > 2 && !STOP.has(x));
}

function extractJobKeywords(jd: string) {
  const lower = norm(jd);
  const phrases = PHRASES.filter((phrase) => lower.includes(phrase));
  const counts = new Map<string, number>();
  for (const token of tokens(jd)) counts.set(token, (counts.get(token) || 0) + 1);
  const terms = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .filter((term) => !phrases.some((p) => p.includes(term)))
    .slice(0, 18);
  return [...new Set([...phrases, ...terms])].slice(0, 28);
}

function supported(keyword: string, resume: string) {
  const r = norm(resume);
  if (r.includes(keyword)) return true;
  const synonyms = SYNONYMS[keyword] || [];
  return synonyms.some((item) => r.includes(item));
}

function overlapScore(resume: string, keywords: string[]) {
  if (!keywords.length) return 55;
  const hits = keywords.filter((k) => supported(k, resume)).length;
  return Math.max(35, Math.min(98, Math.round(40 + (hits / keywords.length) * 58)));
}

function facts(resume: string) {
  const result = new Set<string>();
  for (const match of resume.matchAll(/\b\d+(?:\.\d+)?%|\b\d+\+?\b|\$[\d,.]+[kKmM]?/g)) result.add(match[0]);
  for (const phrase of PHRASES) if (norm(resume).includes(phrase)) result.add(phrase);
  return [...result].slice(0, 16);
}

function actionUpgrade(line: string) {
  const replacements: Array<[RegExp, string]> = [
    [/^worked on\b/i, "Built"],
    [/^responsible for\b/i, "Owned"],
    [/^helped (to )?/i, "Supported"],
    [/^used\b/i, "Applied"],
    [/^did\b/i, "Executed"],
    [/^created\b/i, "Built"],
    [/^made\b/i, "Built"],
    [/^developed\b/i, "Engineered"]
  ];
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(line)) return line.replace(pattern, replacement);
  }
  return line;
}

function sentenceCase(value: string) {
  if (!value) return value;
  return value[0].toUpperCase() + value.slice(1);
}

function rewriteBullet(raw: string, keywords: string[], resume: string, mode: TweakMode): { value: string; reason?: string } {
  const prefix = raw.match(/^[•*\-\s]+/)?.[0] || "• ";
  let body = raw.replace(/^[•*\-\s]+/, "").trim();
  const original = body;
  body = actionUpgrade(body);

  const bodyNorm = norm(body);
  const candidates = keywords
    .filter((keyword) => supported(keyword, resume))
    .filter((keyword) => !bodyNorm.includes(keyword))
    .filter((keyword) => {
      const evidence = [keyword, ...(SYNONYMS[keyword] || [])];
      return evidence.some((signal) => bodyNorm.includes(signal) || norm(resume).includes(signal));
    });

  const contextual = candidates.find((keyword) => {
    const synonyms = SYNONYMS[keyword] || [];
    return synonyms.some((signal) => bodyNorm.includes(signal));
  });

  if (contextual && (mode === "ats" || mode === "balanced")) {
    if (/python|automation|github actions|ci\/cd/i.test(body) && contextual === "security automation") {
      body = body.replace(/\bautomation\b/i, "security automation");
    } else if (/iam|least privilege|trust polic/i.test(body) && contextual === "cloud iam security") {
      body = body.replace(/\bIAM\b/i, "Cloud IAM security");
    } else if (/threat model|secure design|architecture review/i.test(body) && contextual === "threat modeling") {
      if (!/threat model/i.test(body)) body = body.replace(/secure design/i, "threat modeling and secure design");
    } else if (/api/i.test(body) && contextual === "api security") {
      body = body.replace(/\bAPI\b/i, "API security");
    } else if (/llm|prompt injection|agent/i.test(body) && contextual === "ai security") {
      body = body.replace(/\bAI\b/i, "AI security");
    }
  }

  if (mode === "concise") {
    body = body
      .replace(/\bin order to\b/gi, "to")
      .replace(/\bthat were\b/gi, "that")
      .replace(/\bwhich were\b/gi, "that")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (mode === "impact" && /\b(built|engineered|implemented|created|developed|designed)\b/i.test(body) && !/[.;:]$/.test(body)) {
    body = body.replace(/\.$/, "");
  }

  body = sentenceCase(body);
  const changed = body !== original;
  let reason = "";
  if (changed) {
    if (body.toLowerCase().split(" ")[0] !== original.toLowerCase().split(" ")[0]) reason = "Strengthened the action verb without changing the underlying claim.";
    else if (mode === "concise") reason = "Tightened wording while preserving the original evidence.";
    else reason = "Aligned truthful terminology to the target job while preserving the source claim.";
  }
  return { value: prefix + body, reason: reason || undefined };
}

export function tweakResume(resume: string, jd: string, mode: TweakMode = "balanced"): TweakResult {
  const keywords = extractJobKeywords(jd);
  const supportedKeywords = keywords.filter((keyword) => supported(keyword, resume));
  const unresolved = keywords.filter((keyword) => !supported(keyword, resume)).slice(0, 8);
  const beforeScore = overlapScore(resume, keywords);

  const lines = resume.split("\n");
  const changes: Change[] = [];
  const rewritten = lines.map((line) => {
    if (!/^[•*-]\s*/.test(line.trim())) return line;
    const next = rewriteBullet(line, supportedKeywords, resume, mode);
    if (next.reason && next.value !== line) changes.push({ before: line, after: next.value, reason: next.reason });
    return next.value;
  });

  const summaryIndex = rewritten.findIndex((line) => /^summary\s*$/i.test(line.trim()));
  if (summaryIndex >= 0) {
    const nextLine = summaryIndex + 1;
    if (rewritten[nextLine]) {
      const original = rewritten[nextLine];
      const strongest = supportedKeywords.filter((k) => k.includes("security") || PHRASES.includes(k)).slice(0, 4);
      if (strongest.length) {
        const rolePhrase = strongest.map((x) => x.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ");
        const existing = original.replace(/\.$/, "");
        const candidate = existing + ". Target-role alignment: " + rolePhrase + ".";
        if (candidate.length <= 330 && candidate !== original) {
          rewritten[nextLine] = candidate;
          changes.unshift({
            before: original,
            after: candidate,
            reason: "Surfaced verified target-role domains in the summary without adding new experience."
          });
        }
      }
    }
  }

  const rewrittenResume = rewritten.join("\n");
  const afterScore = Math.max(beforeScore, Math.min(98, overlapScore(rewrittenResume, keywords) + Math.min(8, changes.length * 2)));

  const beforeFacts = facts(resume);
  const protectedFacts = beforeFacts.filter((fact) => norm(rewrittenResume).includes(norm(fact)));
  const integrityScore = beforeFacts.length ? Math.round((protectedFacts.length / beforeFacts.length) * 100) : 100;

  const actuallyAdded = supportedKeywords.filter((keyword) => !norm(resume).includes(keyword) && norm(rewrittenResume).includes(keyword));

  return {
    rewrittenResume,
    beforeScore,
    afterScore,
    integrityScore,
    changes: changes.slice(0, 20),
    addedKeywords: actuallyAdded.slice(0, 10),
    protectedFacts: protectedFacts.slice(0, 10),
    unresolvedGaps: unresolved
  };
}
