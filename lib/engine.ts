export type Requirement = {
  label: string;
  source: "explicit" | "structural" | "estimated";
  weight: number;
  matched: boolean;
};

export type Evaluation = {
  score: number;
  verdict: "Strong apply" | "Apply with focus" | "Stretch" | "Do not apply";
  workAuth: "clear" | "review" | "block";
  legitimacy: {
    level: "low concern" | "review";
    signals: string[];
  };
  requirements: Requirement[];
  strengths: string[];
  gaps: string[];
  actions: string[];
};

const STOP = new Set([
  "the","and","for","with","that","this","from","your","you","our","their","will","are","have",
  "has","job","role","work","team","teams","years","experience","skills","skill","about","who",
  "into","using","use","but","not","can","all","any","our","we","they","engineer","engineering"
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#./ -]/g, " ");
}

function words(value: string) {
  return normalize(value)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && !STOP.has(item));
}

function topTerms(value: string, limit = 18) {
  const counts = new Map<string, number>();
  for (const word of words(value)) counts.set(word, (counts.get(word) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
}

function sentenceRequirements(jd: string) {
  const sentences = jd
    .split(/[\n.!?]/)
    .map((line) => line.trim())
    .filter(Boolean);

  const requirements: Requirement[] = [];
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const explicit = /\b(required|must|minimum|need|needs|at least)\b/.test(lower);
    const preferred = /\b(preferred|nice to have|plus|bonus)\b/.test(lower);
    if (!explicit && !preferred) continue;

    const label = sentence.length > 120 ? sentence.slice(0, 117) + "..." : sentence;
    requirements.push({
      label,
      source: "explicit",
      weight: explicit ? 3 : 2,
      matched: false
    });
  }
  return requirements.slice(0, 8);
}

function hasNegativeSponsorship(jd: string) {
  return [
    /no sponsorship/i,
    /cannot sponsor/i,
    /unable to sponsor/i,
    /without sponsorship/i,
    /must be (a )?u\.?s\.? citizen/i,
    /citizenship required/i,
    /security clearance required/i,
    /must hold.*clearance/i
  ].some((pattern) => pattern.test(jd));
}

function legitimacySignals(jd: string) {
  const signals: string[] = [];
  if (!/\b(company|about us|team|organization|business)\b/i.test(jd)) {
    signals.push("The posting gives limited company or team context.");
  }
  if (!/\b(responsibilit|you will|what you will|day to day|role)\b/i.test(jd)) {
    signals.push("Responsibilities are unusually vague.");
  }
  if (/\btelegram\b|\bwhatsapp\b|\bcrypto payment\b|\bgift card\b/i.test(jd)) {
    signals.push("The posting contains a channel or payment signal worth verifying.");
  }
  if (/\burgent hiring\b|\bimmediate payment\b|\bpay a fee\b/i.test(jd)) {
    signals.push("The posting contains urgency or payment language that deserves verification.");
  }
  return signals;
}

export function evaluateRole(resume: string, jd: string): Evaluation {
  const resumeNorm = normalize(resume);
  const terms = topTerms(jd, 22);
  const matchedTerms = terms.filter((term) => resumeNorm.includes(term));
  const missingTerms = terms.filter((term) => !resumeNorm.includes(term));

  const requirements = sentenceRequirements(jd).map((requirement) => {
    const requirementTerms = words(requirement.label).slice(0, 7);
    const overlap = requirementTerms.filter((term) => resumeNorm.includes(term)).length;
    return { ...requirement, matched: overlap >= Math.max(1, Math.ceil(requirementTerms.length * 0.35)) };
  });

  const explicitTotal = requirements.reduce((sum, item) => sum + item.weight, 0);
  const explicitHit = requirements.reduce((sum, item) => sum + (item.matched ? item.weight : 0), 0);
  const termRatio = terms.length ? matchedTerms.length / terms.length : 0.5;
  const reqRatio = explicitTotal ? explicitHit / explicitTotal : termRatio;

  const blocker = hasNegativeSponsorship(jd);
  const raw = Math.round(38 + termRatio * 32 + reqRatio * 24);
  const score = Math.max(24, Math.min(96, blocker ? Math.min(raw, 54) : raw));

  let verdict: Evaluation["verdict"] = "Stretch";
  if (blocker) verdict = "Do not apply";
  else if (score >= 82) verdict = "Strong apply";
  else if (score >= 67) verdict = "Apply with focus";
  else if (score < 48) verdict = "Do not apply";

  const signals = legitimacySignals(jd);
  const strengths = matchedTerms.slice(0, 6).map((term) => "Evidence overlap: " + term);
  const gaps = missingTerms.slice(0, 5).map((term) => "Missing or weak signal: " + term);
  const actions = [
    blocker ? "Verify work-authorization language before spending time tailoring." : "Confirm the role is still open on the employer career site.",
    "Move the strongest matching evidence into the top third of the resume.",
    "Mirror only truthful terminology from the posting; do not invent experience.",
    "Prepare two STAR stories for the highest-weight requirements."
  ];

  return {
    score,
    verdict,
    workAuth: blocker ? "block" : /sponsor|visa|work authorization/i.test(jd) ? "review" : "clear",
    legitimacy: { level: signals.length ? "review" : "low concern", signals },
    requirements,
    strengths,
    gaps,
    actions
  };
}

export function atsReadiness(resume: string) {
  const lower = resume.toLowerCase();
  const bullets = resume.split("\n").filter((line) => /^[•*-]/.test(line.trim()));
  const metricBullets = bullets.filter((line) => /\b\d+(?:\.\d+)?%|\b\d+\+?\b|\$\d+/i.test(line));
  const sections = ["experience", "education", "skills"].filter((section) => lower.includes(section));
  const repeatedOpeners = new Map<string, number>();

  for (const bullet of bullets) {
    const opener = bullet.replace(/^[•*\-\s]+/, "").split(/\s+/)[0]?.toLowerCase();
    if (opener) repeatedOpeners.set(opener, (repeatedOpeners.get(opener) || 0) + 1);
  }

  const repetition = [...repeatedOpeners.values()].some((count) => count >= 3);
  const completeness = Math.min(100, 45 + sections.length * 15 + (resume.length > 900 ? 10 : 0));
  const impact = bullets.length ? Math.round((metricBullets.length / bullets.length) * 100) : 45;
  const clarity = Math.max(52, 92 - Math.max(0, resume.split(/\s+/).length - 650) / 8 - (repetition ? 9 : 0));
  const keywords = Math.min(96, 52 + new Set(words(resume)).size / 7);
  const score = Math.round(completeness * 0.25 + impact * 0.25 + clarity * 0.25 + keywords * 0.25);

  const fixes: string[] = [];
  if (impact < 65) fixes.push("Add measurable outcomes to more experience bullets.");
  if (sections.length < 3) fixes.push("Use standard Experience, Education, and Skills headings.");
  if (repetition) fixes.push("Vary repeated bullet openers so the resume reads less templated.");
  if (resume.length < 700) fixes.push("Add enough evidence for a recruiter to understand scope and outcomes.");
  if (!fixes.length) fixes.push("Your baseline structure is strong. Tailor evidence against each specific job next.");

  return {
    score,
    dimensions: {
      completeness: Math.round(completeness),
      impact: Math.round(impact),
      clarity: Math.round(clarity),
      keywords: Math.round(keywords)
    },
    fixes: fixes.slice(0, 3)
  };
}
