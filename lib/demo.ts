export const demoResume = "POOJA KIRAN\nSecurity Engineer\n\nSUMMARY\nSecurity engineer focused on application security, AI and agent security, cloud IAM security, and security automation.\n\nEXPERIENCE\n• Built Python security tooling for authorization, API security, prompt-injection detection, and cloud IAM analysis.\n• Created reproducible tests, CI/CD security checks, SIEM telemetry, and developer-facing remediation workflows.\n• Worked with AWS, GitHub Actions, CodeQL, Elastic, Docker, threat modeling, least privilege, and secure system design.\n• Evaluated model and data attack surfaces using adversarial testing and provenance checks.\n\nEDUCATION\nMaster of Science, Information Technology (Security)\n\nSKILLS\nPython, AWS, IAM, Application Security, API Security, Threat Modeling, SIEM, Elastic, GitHub Actions, CodeQL, Docker, LLM Security, Prompt Injection, Security Automation";

export const demoJob = "Application Security Engineer\n\nWe are looking for an early-career security engineer to partner with product and engineering teams. You will perform threat modeling, secure design reviews, API security testing, and automate security checks using Python. Experience with AWS IAM and CI/CD security is required. Familiarity with LLM security is a plus. The role is based in Phoenix and requires collaboration with software teams. Candidates must be authorized to work in the United States. Sponsorship may be considered for future employment.";

export const demoJobs = [
  {
    id: "a1",
    title: "Application Security Engineer",
    company: "Northstar Cloud",
    location: "Phoenix, AZ",
    mode: "On-site",
    salary: "$118k – $154k",
    fit: 94,
    sponsor: "Possible",
    tags: ["AppSec", "Python", "AWS", "Threat Modeling"]
  },
  {
    id: "a2",
    title: "AI Security Engineer",
    company: "Orbital Systems",
    location: "Tempe, AZ",
    mode: "On-site",
    salary: "$125k – $168k",
    fit: 91,
    sponsor: "Possible",
    tags: ["AI Security", "LLM", "API Security", "Python"]
  },
  {
    id: "a3",
    title: "Cloud Security Engineer I",
    company: "Nimbus Platforms",
    location: "Seattle, WA",
    mode: "Hybrid",
    salary: "$121k – $160k",
    fit: 87,
    sponsor: "Review",
    tags: ["AWS", "IAM", "SIEM", "Automation"]
  },
  {
    id: "a4",
    title: "Product Security Engineer",
    company: "Vector Mobility",
    location: "Austin, TX",
    mode: "On-site",
    salary: "$115k – $150k",
    fit: 84,
    sponsor: "Possible",
    tags: ["Product Security", "API", "Secure Design", "Python"]
  }
];

export const starterStories = [
  {
    title: "Security control design",
    situation: "A system needed a clear trust boundary before downstream actions.",
    task: "Design a default-deny control path that remained testable and observable.",
    action: "Defined authorization checks, validation, failure behavior, telemetry, and reproducible tests.",
    result: "Produced a defensible security boundary with evidence that could be reviewed in CI.",
    reflection: "Lead with the risk, then show the control and the evidence."
  },
  {
    title: "Cloud identity hardening",
    situation: "Cloud permissions created privilege-escalation and trust-policy risk.",
    task: "Make review more consistent and repeatable.",
    action: "Turned common IAM weaknesses into deterministic checks and clear remediation guidance.",
    result: "Reduced manual review ambiguity and made findings easier to reproduce.",
    reflection: "Explain why a permission path matters, not only that a rule fired."
  }
];
