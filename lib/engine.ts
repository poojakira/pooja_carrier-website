export type Requirement = {
  label: string;
  source: "explicit" | "structural" | "estimated";
  weight: number;
  matched: boolean;
};

export type SponsorshipAssessment = {
  percentage: number;
  label: "Explicitly sponsors" | "Likely" | "Possible" | "Unclear" | "Unlikely" | "Hard blocker";
  confidence: "low" | "medium" | "high";
  basis: "posting";
  reasons: string[];
};

export type RoleChance = {
  percentage: number;
  confidence: "low" | "medium" | "high";
  label: "Low" | "Competitive" | "Strong" | "Very strong";
  factors: string[];
  disclaimer: string;
};

export type Evaluation = {
  score: number;
  verdict: "Strong apply" | "Apply with focus" | "Stretch" | "Do not apply";
  workAuth: "clear" | "review" | "block";
  sponsorship: SponsorshipAssessment;
  roleChance: RoleChance;
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

    const label = sentence.length > 140 ? sentence.slice(0, 137) + "..." : sentence;
    requirements.push({
      label,
      source: "explicit",
      weight: explicit ? 3 : 2,
      matched: false
    });
  }
  return requirements.slice(0, 10);
}

function sponsorshipAssessment(jd: string): SponsorshipAssessment {
  const negativePatterns = [
    /no (?:visa )?sponsorship/i,
    /cannot sponsor/i,
    /unable to sponsor/i,
    /will not sponsor/i,
    /without (?:current or future )?(?:visa )?sponsorship/i,
    /not eligible for sponsorship/i,
    /must be (?:a )?u\.?s\.? citizen/i,
    /citizenship required/i,
    /security clearance required/i,
    /must (?:hold|maintain|obtain).*clearance/i
  ];
  const strongPositive = [
    /visa sponsorship (?:is )?(?:available|provided)/i,
    /we (?:will|do) sponsor/i,
    /sponsorship (?:is )?available/i,
    /h-?1b sponsorship/i,
    /employment visa sponsorship/i,
    /immigration sponsorship/i
  ];
  const conditional = [
    /may sponsor/i,
    /sponsorship may be/i,
    /case[- ]by[- ]case.*sponsor/i,
    /sponsorship.*case[- ]by[- ]case/i,
    /eligible for sponsorship/i
  ];

  if (negativePatterns.some((pattern) => pattern.test(jd))) {
    return {
      percentage: 2,
      label: "Hard blocker",
      confidence: "high",
      basis: "posting",
      reasons: ["The posting contains explicit no-sponsorship, citizenship, or clearance language."]
    };
  }
  if (strongPositive.some((pattern) => pattern.test(jd))) {
    return {
      percentage: 88,
      label: "Explicitly sponsors",
      confidence: "high",
      basis: "posting",
      reasons: ["The posting explicitly indicates sponsorship or immigration support is available."]
    };
  }
  if (conditional.some((pattern) => pattern.test(jd))) {
    return {
      percentage: 62,
      label: "Likely",
      confidence: "medium",
      basis: "posting",
      reasons: ["The posting indicates sponsorship may be available conditionally."]
    };
  }
  if (/\b(sponsor|sponsorship|visa|work authorization|employment authorization)\b/i.test(jd)) {
    return {
      percentage: 42,
      label: "Possible",
      confidence: "medium",
      basis: "posting",
      reasons: ["Work-authorization or sponsorship language is present, but it is not an explicit commitment."]
    };
  }
  return {
    percentage: 32,
    label: "Unclear",
    confidence: "low",
    basis: "posting",
    reasons: ["The posting does not clearly state its sponsorship policy. Company-history evidence is not yet included in this estimate."]
  };
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

function estimateRoleChance(
  fitScore: number,
  reqRatio: number,
  sponsorship: SponsorshipAssessment,
  needsSponsorship: boolean,
  legitimacyCount: number,
  requirementCount: number
): RoleChance {
  let chance = 4 + Math.max(0, fitScore - 40) * 0.42;
  chance += Math.max(-5, (reqRatio - 0.55) * 15);
  if (legitimacyCount) chance -= 2;

  const factors: string[] = [
    "Resume-to-job evidence fit: " + fitScore + "/100.",
    "Explicit requirement coverage: " + Math.round(reqRatio * 100) + "%."
  ];

  if (needsSponsorship) {
    if (sponsorship.label === "Hard blocker") {
      chance = 1;
      factors.push("A hard work-authorization or sponsorship blocker materially reduces the estimate.");
    } else {
      const visaMultiplier = 0.45 + (sponsorship.percentage / 100) * 0.55;
      chance *= visaMultiplier;
      factors.push("Future sponsorship need is included using the posting-based sponsorship signal.");
    }
  } else {
    factors.push("Sponsorship was not applied as a candidate constraint.");
  }

  const percentage = Math.max(1, Math.min(45, Math.round(chance)));
  const confidenceScore =
    32 +
    Math.min(30, requirementCount * 5) +
    (sponsorship.confidence === "high" ? 15 : sponsorship.confidence === "medium" ? 8 : 0) +
    (fitScore >= 70 ? 5 : 0);
  const confidence: RoleChance["confidence"] =
    confidenceScore >= 68 ? "high" : confidenceScore >= 50 ? "medium" : "low";

  let label: RoleChance["label"] = "Low";
  if (percentage >= 28) label = "Very strong";
  else if (percentage >= 18) label = "Strong";
  else if (percentage >= 9) label = "Competitive";

  return {
    percentage,
    confidence,
    label,
    factors,
    disclaimer:
      "Estimated application-level chance, not an observed recruiter probability. Applicant volume, referrals, interview performance, timing, compensation, location, and employer decisions are not fully observable."
  };
}

export function evaluateRole(resume: string, jd: string, needsSponsorship = false): Evaluation {
  const resumeNorm = normalize(resume);
  const terms = topTerms(jd, 24);
  const matchedTerms = terms.filter((term) => resumeNorm.includes(term));
  const missingTerms = terms.filter((term) => !resumeNorm.includes(term));

  const requirements = sentenceRequirements(jd).map((requirement) => {
    const requirementTerms = words(requirement.label).slice(0, 9);
    const overlap = requirementTerms.filter((term) => resumeNorm.includes(term)).length;
    return { ...requirement, matched: overlap >= Math.max(1, Math.ceil(requirementTerms.length * 0.35)) };
  });

  const explicitTotal = requirements.reduce((sum, item) => sum + item.weight, 0);
  const explicitHit = requirements.reduce((sum, item) => sum + (item.matched ? item.weight : 0), 0);
  const termRatio = terms.length ? matchedTerms.length / terms.length : 0.5;
  const reqRatio = explicitTotal ? explicitHit / explicitTotal : termRatio;

  const sponsorship = sponsorshipAssessment(jd);
  const blocker = sponsorship.label === "Hard blocker";
  const raw = Math.round(38 + termRatio * 32 + reqRatio * 24);
  const score = Math.max(24, Math.min(96, blocker && needsSponsorship ? Math.min(raw, 54) : raw));

  let verdict: Evaluation["verdict"] = "Stretch";
  if (blocker && needsSponsorship) verdict = "Do not apply";
  else if (score >= 82) verdict = "Strong apply";
  else if (score >= 67) verdict = "Apply with focus";
  else if (score < 48) verdict = "Do not apply";

  const signals = legitimacySignals(jd);
  const roleChance = estimateRoleChance(score, reqRatio, sponsorship, needsSponsorship, signals.length, requirements.length);
  const strengths = matchedTerms.slice(0, 6).map((term) => "Evidence overlap: " + term);
  const gaps = missingTerms.slice(0, 5).map((term) => "Missing or weak signal: " + term);
  const actions = [
    blocker && needsSponsorship
      ? "Treat the work-authorization language as a blocker unless a recruiter confirms an exception."
      : sponsorship.confidence === "low"
        ? "Verify sponsorship policy before investing heavily in the application."
        : "Use the sponsorship language as one decision signal, not a guarantee.",
    "Confirm the role is still open on the employer career site.",
    "Move the strongest matching evidence into the top third of the resume.",
    "Mirror only truthful terminology from the posting; do not invent experience.",
    "Prepare two STAR stories for the highest-weight requirements."
  ];

  return {
    score,
    verdict,
    workAuth: blocker ? "block" : sponsorship.confidence === "low" ? "review" : "clear",
    sponsorship,
    roleChance,
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
