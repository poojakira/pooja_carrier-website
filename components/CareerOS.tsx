"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { atsReadiness, type Evaluation } from "@/lib/engine";
import { demoJob, demoJobs, demoResume, starterStories } from "@/lib/demo";

type View = "today" | "resume" | "tweaker" | "evaluate" | "explore" | "kit" | "tracker" | "interview" | "analytics" | "profile";
type Status = "Saved" | "Applied" | "Interview" | "Offer" | "Rejected";

type TrackedRole = {
  id: string;
  title: string;
  company: string;
  location: string;
  fit: number;
  status: Status;
  sponsor: string;
  applyUrl?: string;
  source?: string;
  reviewed?: boolean;
};

type AuditEntry = {
  id: string;
  at: string;
  roleId: string;
  role: string;
  company: string;
  action: "saved" | "reviewed" | "opened" | "status_changed" | "removed";
  detail: string;
};

type LiveJob = {
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

const nav: { id: View; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "⌂" },
  { id: "explore", label: "Explore", icon: "◎" },
  { id: "evaluate", label: "Evaluate role", icon: "✦" },
  { id: "resume", label: "Resume lab", icon: "▤" },
  { id: "tweaker", label: "Resume Tweaker", icon: "✎" },
  { id: "kit", label: "Application kit", icon: "◇" },
  { id: "tracker", label: "Pipeline", icon: "▦" },
  { id: "interview", label: "Interview prep", icon: "◌" },
  { id: "analytics", label: "Analytics", icon: "↗" },
  { id: "profile", label: "Profile", icon: "⚙" }
];

function scoreTone(score: number) {
  if (score >= 82) return "good";
  if (score >= 65) return "mid";
  return "low";
}

export function CareerOS() {
  const [view, setView] = useState<View>("today");
  const [resume, setResume] = useState(demoResume);
  const [jd, setJd] = useState(demoJob);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [tweakResult, setTweakResult] = useState<any | null>(null);
  const [tweaking, setTweaking] = useState(false);
  const [tweakMode, setTweakMode] = useState<"balanced" | "ats" | "concise" | "impact">("balanced");
  const [tracker, setTracker] = useState<TrackedRole[]>([]);
  const [profileName, setProfileName] = useState("Pooja Kiran");
  const [target, setTarget] = useState("Security Engineer · AI Security · Application Security");
  const [location, setLocation] = useState("United States");
  const [workAuthMode, setWorkAuthMode] = useState<"future-sponsorship" | "no-sponsorship-needed" | "unknown">("future-sponsorship");
  const [liveSource, setLiveSource] = useState("");
  const [liveJobs, setLiveJobs] = useState<LiveJob[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [liveFetchedAt, setLiveFetchedAt] = useState("");
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [savedFlash, setSavedFlash] = useState("");

  useEffect(() => {
    const storedResume = localStorage.getItem("pcos-resume");
    const storedTracker = localStorage.getItem("pcos-tracker");
    const storedProfile = localStorage.getItem("pcos-profile");
    const storedAudit = localStorage.getItem("pcos-audit");
    if (storedResume) setResume(storedResume);
    if (storedTracker) setTracker(JSON.parse(storedTracker) as TrackedRole[]);
    if (storedAudit) setAudit(JSON.parse(storedAudit) as AuditEntry[]);
    if (storedProfile) {
      const profile = JSON.parse(storedProfile) as { name?: string; target?: string; location?: string; workAuthMode?: "future-sponsorship" | "no-sponsorship-needed" | "unknown" };
      if (profile.name) setProfileName(profile.name);
      if (profile.target) setTarget(profile.target);
      if (profile.location) setLocation(profile.location);
      if (profile.workAuthMode) setWorkAuthMode(profile.workAuthMode);
    }
  }, []);

  const readiness = useMemo(() => atsReadiness(resume), [resume]);
  const pipelineCounts = useMemo(() => {
    const count = (status: Status) => tracker.filter((item) => item.status === status).length;
    return {
      saved: count("Saved"),
      applied: count("Applied"),
      interview: count("Interview"),
      offer: count("Offer"),
      rejected: count("Rejected")
    };
  }, [tracker]);

  const responseRate = useMemo(() => {
    const decided = pipelineCounts.interview + pipelineCounts.offer + pipelineCounts.rejected;
    return pipelineCounts.applied + decided === 0
      ? 0
      : Math.round(((pipelineCounts.interview + pipelineCounts.offer) / (pipelineCounts.applied + decided)) * 100);
  }, [pipelineCounts]);

  function persistResume(next: string) {
    setResume(next);
    localStorage.setItem("pcos-resume", next);
  }

  function persistTracker(next: TrackedRole[]) {
    setTracker(next);
    localStorage.setItem("pcos-tracker", JSON.stringify(next));
  }

  function logAudit(role: Pick<TrackedRole, "id" | "title" | "company">, action: AuditEntry["action"], detail: string) {
    const entry: AuditEntry = {
      id: role.id + "-" + Date.now() + "-" + action,
      at: new Date().toISOString(),
      roleId: role.id,
      role: role.title,
      company: role.company,
      action,
      detail
    };
    const next = [entry, ...audit].slice(0, 100);
    setAudit(next);
    localStorage.setItem("pcos-audit", JSON.stringify(next));
  }

  function markReviewed(id: string) {
    const role = tracker.find((item) => item.id === id);
    if (!role) return;
    const next = tracker.map((item) => item.id === id ? { ...item, reviewed: true } : item);
    persistTracker(next);
    logAudit(role, "reviewed", "User reviewed the application record before opening the official application.");
    setSavedFlash("Review gate complete");
    window.setTimeout(() => setSavedFlash(""), 1300);
  }

  function recordOpen(role: TrackedRole) {
    logAudit(role, "opened", "Opened the official employer application URL. This is not recorded as a submission.");
  }

  function saveLiveJob(job: LiveJob) {
    if (tracker.some((item) => item.id === job.id)) {
      setSavedFlash("Already in pipeline");
      window.setTimeout(() => setSavedFlash(""), 1300);
      return;
    }
    const role: TrackedRole = {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      fit: job.fit,
      status: "Saved",
      sponsor: job.sponsorshipLabel,
      applyUrl: job.applyUrl,
      source: job.sourceLabel,
      reviewed: false
    };
    persistTracker([...tracker, role]);
    logAudit(role, "saved", "Saved from a live " + job.sourceLabel + " board.");
    setSavedFlash("Live role saved");
    window.setTimeout(() => setSavedFlash(""), 1300);
  }

  async function loadLiveBoard() {
    setLiveLoading(true);
    setLiveError("");
    try {
      const response = await fetch("/api/live-jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: liveSource,
          resume,
          needsSponsorship: workAuthMode === "future-sponsorship"
        })
      });
      const data = await response.json() as { jobs?: LiveJob[]; error?: string; fetchedAt?: string };
      if (!response.ok || data.error) {
        setLiveJobs([]);
        setLiveError(data.error || "Could not load this live board.");
        return;
      }
      setLiveJobs(data.jobs || []);
      setLiveFetchedAt(data.fetchedAt || new Date().toISOString());
    } catch {
      setLiveJobs([]);
      setLiveError("Live board request failed.");
    } finally {
      setLiveLoading(false);
    }
  }

  function saveDemoJob(job: (typeof demoJobs)[number]) {
    if (tracker.some((item) => item.id === job.id)) {
      setSavedFlash("Already in pipeline");
      window.setTimeout(() => setSavedFlash(""), 1300);
      return;
    }
    const role: TrackedRole = {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      fit: job.fit,
      status: "Saved",
      sponsor: job.sponsor,
      reviewed: false
    };
    persistTracker([...tracker, role]);
    logAudit(role, "saved", "Saved from the demo catalog.");
    setSavedFlash("Saved to pipeline");
    window.setTimeout(() => setSavedFlash(""), 1300);
  }

  function updateStatus(id: string, status: Status) {
    const role = tracker.find((item) => item.id === id);
    if (!role) return;
    if ((status === "Applied" || status === "Interview" || status === "Offer") && !role.reviewed) {
      setSavedFlash("Review this role before marking it applied");
      window.setTimeout(() => setSavedFlash(""), 1600);
      return;
    }
    persistTracker(tracker.map((item) => (item.id === id ? { ...item, status } : item)));
    logAudit(role, "status_changed", "Status changed from " + role.status + " to " + status + ". Applied is a user-confirmed status.");
  }

  function removeRole(id: string) {
    const role = tracker.find((item) => item.id === id);
    if (role) logAudit(role, "removed", "Removed from the active pipeline.");
    persistTracker(tracker.filter((item) => item.id !== id));
  }

  async function runTweaker() {
    setTweaking(true);
    try {
      const response = await fetch("/api/tweak-resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resume, jd, mode: tweakMode })
      });
      const data = await response.json();
      if (data.result) setTweakResult(data.result);
    } finally {
      setTweaking(false);
    }
  }

  function applyTweakedResume() {
    if (!tweakResult?.rewrittenResume) return;
    persistResume(tweakResult.rewrittenResume);
    setSavedFlash("Tweaked resume applied");
    window.setTimeout(() => setSavedFlash(""), 1400);
  }

  async function runEvaluation() {
    setEvaluating(true);
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resume, jd, needsSponsorship: workAuthMode === "future-sponsorship" })
      });
      const data = (await response.json()) as { evaluation?: Evaluation; error?: string };
      if (data.evaluation) setEvaluation(data.evaluation);
    } finally {
      setEvaluating(false);
    }
  }

  function saveProfile() {
    localStorage.setItem("pcos-profile", JSON.stringify({ name: profileName, target, location, workAuthMode }));
    setSavedFlash("Profile saved");
    window.setTimeout(() => setSavedFlash(""), 1300);
  }

  return (
    <div className="workspace">
      <aside className="workspaceSidebar">
        <Link href="/" className="brand workspaceBrand">
          <span className="brandMark">P</span>
          <span>Pooja Career OS</span>
        </Link>

        <nav className="workspaceNav" aria-label="Workspace">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? "workspaceNavItem active" : "workspaceNavItem"}
              onClick={() => setView(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebarRule" />
        <div className="sidebarPrinciples">
          <small>Operating rules</small>
          <span>Human review before send</span>
          <span>Evidence over keywords</span>
          <span>No invented experience</span>
        </div>

        <div className="sidebarProfile">
          <span className="profileAvatar">PK</span>
          <span>
            <strong>{profileName}</strong>
            <small>Career workspace</small>
          </span>
        </div>
      </aside>

      <main className="workspaceMain">
        <header className="workspaceTopbar">
          <div className="mobileBrand">
            <span className="brandMark">P</span>
            <strong>Career OS</strong>
          </div>
          <div className="topbarSearch">⌕ <span>Search roles, companies, notes</span></div>
          <div className="topbarRight">
            <span className="privacyPill">Local-first demo</span>
            <button className="circleButton" type="button">?</button>
          </div>
        </header>

        <div className="workspaceContent">
          {savedFlash && <div className="toast">{savedFlash}</div>}

          {view === "today" && (
            <section className="viewStack">
              <div className="pageHeading splitHeading">
                <div>
                  <span className="eyebrow">Career command center</span>
                  <h1>Good evening, {profileName.split(" ")[0]}.</h1>
                  <p>Spend your next hour where it has the highest chance of moving the search forward.</p>
                </div>
                <button className="button primary" onClick={() => setView("evaluate")}>+ Evaluate a role</button>
              </div>

              <div className="metricGrid">
                <article className="metricCard">
                  <span>Resume readiness</span>
                  <strong>{readiness.score}</strong>
                  <small>Baseline score</small>
                </article>
                <article className="metricCard">
                  <span>Strongest demo fit</span>
                  <strong>94%</strong>
                  <small>Application Security</small>
                </article>
                <article className="metricCard">
                  <span>Tracked roles</span>
                  <strong>{tracker.length}</strong>
                  <small>{pipelineCounts.interview} interview stage</small>
                </article>
                <article className="metricCard accentMetric">
                  <span>Response rate</span>
                  <strong>{responseRate}%</strong>
                  <small>Based on your local pipeline</small>
                </article>
              </div>

              <div className="twoCol">
                <article className="panel todayPanel">
                  <div className="panelHead">
                    <div>
                      <span className="eyebrow">Today</span>
                      <h2>Your next best actions</h2>
                    </div>
                    <span className="subtlePill">Prioritized</span>
                  </div>
                  <button className="actionRow" onClick={() => setView("explore")}>
                    <span className="actionNumber">1</span>
                    <span><strong>Review the top-fit roles</strong><small>Four curated demo opportunities are ready.</small></span>
                    <em>94%</em>
                  </button>
                  <button className="actionRow" onClick={() => setView("resume")}>
                    <span className="actionNumber">2</span>
                    <span><strong>Improve resume impact</strong><small>{readiness.fixes[0]}</small></span>
                    <em>Fix</em>
                  </button>
                  <button className="actionRow" onClick={() => setView("interview")}>
                    <span className="actionNumber">3</span>
                    <span><strong>Practice one evidence story</strong><small>Keep STAR plus reflection ready before interviews arrive.</small></span>
                    <em>Prep</em>
                  </button>
                </article>

                <article className="panel companionPanel">
                  <div className="companionOrb">✦</div>
                  <span className="eyebrow">Career companion</span>
                  <h2>Your search has one source of truth.</h2>
                  <p>
                    Your resume, role evaluations, application decisions, story bank, and pipeline live in one
                    workspace so each next step can use what you already learned.
                  </p>
                  <div className="companionPrompt">
                    <span>Recommended</span>
                    <strong>Evaluate before tailoring.</strong>
                    <small>Do not spend 45 minutes rewriting a resume for a role with a hard blocker.</small>
                  </div>
                </article>
              </div>

              <article className="panel">
                <div className="panelHead">
                  <div>
                    <span className="eyebrow">Search flow</span>
                    <h2>One operating loop</h2>
                  </div>
                </div>
                <div className="flowRow">
                  {[
                    ["1", "Truth", "Master resume + profile"],
                    ["2", "Filter", "Evaluate fit + blockers"],
                    ["3", "Tailor", "Build one coherent kit"],
                    ["4", "Apply", "You review and send"],
                    ["5", "Learn", "Track outcomes + patterns"]
                  ].map(([n, title, text]) => (
                    <div className="flowStep" key={n}>
                      <span>{n}</span>
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}

          {view === "tweaker" && (
            <section className="viewStack">
              <div className="pageHeading splitHeading">
                <div>
                  <span className="eyebrow">Resume Tweaker</span>
                  <h1>Tailor aggressively. Fabricate nothing.</h1>
                  <p>
                    This mode rewrites only from evidence already present in your master resume, aligns truthful wording
                    to the job description, preserves numbers, and shows every important change before you apply it.
                  </p>
                </div>
                <span className="subtlePill">Evidence-locked rewriting</span>
              </div>

              <div className="tweakerControls panel">
                <div>
                  <span className="eyebrow">Optimization mode</span>
                  <h2>Choose what to prioritize</h2>
                </div>
                <div className="modeTabs">
                  {([
                    ["balanced", "Balanced"],
                    ["ats", "ATS alignment"],
                    ["impact", "Impact"],
                    ["concise", "Concise"]
                  ] as const).map(([id, label]) => (
                    <button
                      type="button"
                      key={id}
                      className={tweakMode === id ? "modeTab active" : "modeTab"}
                      onClick={() => setTweakMode(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="tweakerGrid">
                <article className="panel">
                  <div className="panelHead">
                    <div>
                      <span className="eyebrow">Source resume</span>
                      <h2>Your verified evidence</h2>
                    </div>
                    <span className="subtlePill">{resume.split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                  <textarea className="tweakEditor" value={resume} onChange={(event) => persistResume(event.target.value)} />
                </article>

                <article className="panel">
                  <div className="panelHead">
                    <div>
                      <span className="eyebrow">Target job</span>
                      <h2>What the role actually asks for</h2>
                    </div>
                    <button className="button ghost small" onClick={() => setJd(demoJob)}>Load demo</button>
                  </div>
                  <textarea className="tweakEditor" value={jd} onChange={(event) => setJd(event.target.value)} />
                </article>
              </div>

              <div className="tweakerRun panel">
                <div>
                  <strong>Evidence lock is on.</strong>
                  <span>Numbers, employers, dates, technologies, and achievements are never invented.</span>
                </div>
                <button className="button primary" onClick={runTweaker} disabled={tweaking || resume.length < 80 || jd.length < 100}>
                  {tweaking ? "Building evidence-safe rewrite..." : "Generate excellent tailored resume"}
                </button>
              </div>

              {tweakResult && (
                <div className="viewStack">
                  <div className="tweakScoreGrid">
                    <article className="metricCard"><span>Before fit</span><strong>{tweakResult.beforeScore}</strong><small>Job-language overlap</small></article>
                    <article className="metricCard accentMetric"><span>After fit</span><strong>{tweakResult.afterScore}</strong><small>Evidence-safe alignment</small></article>
                    <article className="metricCard"><span>Evidence integrity</span><strong>{tweakResult.integrityScore}%</strong><small>No invented claims</small></article>
                    <article className="metricCard"><span>Edits proposed</span><strong>{tweakResult.changes.length}</strong><small>Reviewable changes</small></article>
                  </div>

                  <div className="tweakerResultGrid">
                    <article className="panel">
                      <div className="panelHead">
                        <div>
                          <span className="eyebrow">Tailored version</span>
                          <h2>Recruiter-ready draft</h2>
                        </div>
                        <button className="button primary small" onClick={applyTweakedResume}>Use as master resume</button>
                      </div>
                      <pre className="resumePreview">{tweakResult.rewrittenResume}</pre>
                    </article>

                    <aside className="panel tweakAudit">
                      <span className="eyebrow">Change audit</span>
                      <h2>Why each change was made</h2>
                      <div className="changeList">
                        {tweakResult.changes.map((change: any, index: number) => (
                          <div className="changeItem" key={index}>
                            <span>{index + 1}</span>
                            <div>
                              <strong>{change.reason}</strong>
                              <small>Before</small>
                              <p>{change.before}</p>
                              <small>After</small>
                              <p>{change.after}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </aside>
                  </div>

                  <div className="threeCol">
                    <article className="panel compactPanel">
                      <span className="eyebrow">Keywords earned</span>
                      <h3>Truthful alignment added</h3>
                      <div className="tagRow">{tweakResult.addedKeywords.map((item: string) => <span key={item}>{item}</span>)}</div>
                    </article>
                    <article className="panel compactPanel">
                      <span className="eyebrow">Protected facts</span>
                      <h3>Preserved from source</h3>
                      <div className="checkList">{tweakResult.protectedFacts.map((item: string) => <span key={item}>✓ {item}</span>)}</div>
                    </article>
                    <article className="panel compactPanel">
                      <span className="eyebrow">Remaining gaps</span>
                      <h3>Do not fake these</h3>
                      <div className="checkList warnList">{tweakResult.unresolvedGaps.map((item: string) => <span key={item}>• {item}</span>)}</div>
                    </article>
                  </div>
                </div>
              )}
            </section>
          )}

          {view === "resume" && (
            <section className="viewStack">
              <div className="pageHeading">
                <span className="eyebrow">Resume lab</span>
                <h1>See what the filters see.</h1>
                <p>Use the master resume as truth, then inspect structural readiness before tailoring it to a job.</p>
              </div>

              <div className="resumeLayout">
                <article className="panel editorPanel">
                  <div className="panelHead">
                    <div>
                      <span className="eyebrow">Master resume</span>
                      <h2>Editable source of truth</h2>
                    </div>
                    <button className="button secondary small" onClick={() => persistResume(demoResume)}>Reset demo</button>
                  </div>
                  <textarea className="largeEditor" value={resume} onChange={(event) => persistResume(event.target.value)} />
                </article>

                <aside className="panel scorePanel">
                  <div className={"scoreRing " + scoreTone(readiness.score)}>
                    <strong>{readiness.score}</strong>
                    <span>/100</span>
                  </div>
                  <h2>Readiness Read</h2>
                  <p className="muted">A deterministic baseline, not a claim about any employer ATS.</p>
                  <div className="dimensionList">
                    {Object.entries(readiness.dimensions).map(([label, score]) => (
                      <div className="dimension" key={label}>
                        <div><span>{label}</span><strong>{score}</strong></div>
                        <div className="bar"><span style={{ width: score + "%" }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className="fixList">
                    <strong>Top fixes</strong>
                    {readiness.fixes.map((fix, index) => (
                      <div key={fix}><span>{index + 1}</span><p>{fix}</p></div>
                    ))}
                  </div>
                </aside>
              </div>
            </section>
          )}

          {view === "evaluate" && (
            <section className="viewStack">
              <div className="pageHeading">
                <span className="eyebrow">Decision before drafting</span>
                <h1>Should this role get your time?</h1>
                <p>Paste the job description. The evaluator looks for evidence overlap, explicit requirements, work-authorization language, and posting signals.</p>
              </div>

              <div className="evaluateGrid">
                <article className="panel">
                  <label className="fieldLabel" htmlFor="jd">Job description</label>
                  <textarea id="jd" className="jdEditor" value={jd} onChange={(event) => setJd(event.target.value)} />
                  <div className="inlineActions">
                    <button className="button ghost small" onClick={() => setJd(demoJob)}>Load demo</button>
                    <button className="button primary" onClick={runEvaluation} disabled={evaluating}>
                      {evaluating ? "Evaluating..." : "Evaluate role"}
                    </button>
                  </div>
                </article>

                <aside className="panel evaluateAside">
                  <span className="eyebrow">Evaluation policy</span>
                  <h2>Conservative by design</h2>
                  <div className="policyItem"><span>01</span><p>Explicit requirements carry more weight than guessed keywords.</p></div>
                  <div className="policyItem"><span>02</span><p>Hard no-sponsorship or clearance language can block the recommendation.</p></div>
                  <div className="policyItem"><span>03</span><p>Posting-legitimacy checks are observations, not accusations.</p></div>
                  <div className="policyItem"><span>04</span><p>Resume evidence is never invented to close a gap.</p></div>
                </aside>
              </div>

              {evaluation && (
                <div className="evaluationResult">
                  <div className="evaluationScoreGrid">
                    <article className="panel scoreSignal">
                      <span className="eyebrow">Evidence fit</span>
                      <strong>{evaluation.score}%</strong>
                      <small>Resume ↔ role alignment</small>
                    </article>
                    <article className="panel scoreSignal roleChanceSignal">
                      <span className="eyebrow">Estimated role chance</span>
                      <strong>{evaluation.roleChance.percentage}%</strong>
                      <small>{evaluation.roleChance.label} · {evaluation.roleChance.confidence} confidence</small>
                    </article>
                    <article className="panel scoreSignal sponsorSignal">
                      <span className="eyebrow">Visa sponsorship chance</span>
                      <strong>{evaluation.sponsorship.percentage}%</strong>
                      <small>{evaluation.sponsorship.label} · posting-based</small>
                    </article>
                  </div>

                  <article className="panel verdictPanel">
                    <div className={"bigScore " + scoreTone(evaluation.score)}>
                      <strong>{evaluation.score}</strong><span>/100</span>
                    </div>
                    <div>
                      <span className="eyebrow">Global recommendation</span>
                      <h2>{evaluation.verdict}</h2>
                      <p>
                        Work authorization: <strong>{evaluation.workAuth}</strong> · Posting review: <strong>{evaluation.legitimacy.level}</strong>
                      </p>
                    </div>
                    <button className="button secondary" onClick={() => setView("kit")}>Build application kit</button>
                  </article>

                  <article className="panel estimateExplain">
                    <div>
                      <span className="eyebrow">Why these percentages</span>
                      <h2>Transparent estimates, not fake certainty.</h2>
                    </div>
                    <div className="estimateColumns">
                      <div>
                        <strong>Role chance factors</strong>
                        {evaluation.roleChance.factors.map((factor) => <span key={factor}>• {factor}</span>)}
                      </div>
                      <div>
                        <strong>Sponsorship basis</strong>
                        {evaluation.sponsorship.reasons.map((reason) => <span key={reason}>• {reason}</span>)}
                      </div>
                    </div>
                    <p>{evaluation.roleChance.disclaimer}</p>
                  </article>

                  <div className="threeCol">
                    <article className="panel compactPanel">
                      <span className="eyebrow">Strengths</span>
                      <h3>Evidence already present</h3>
                      <div className="checkList">
                        {evaluation.strengths.length ? evaluation.strengths.map((item) => <span key={item}>✓ {item}</span>) : <span>Review manually.</span>}
                      </div>
                    </article>
                    <article className="panel compactPanel">
                      <span className="eyebrow">Gaps</span>
                      <h3>Signals to verify</h3>
                      <div className="checkList warnList">
                        {evaluation.gaps.map((item) => <span key={item}>• {item}</span>)}
                      </div>
                    </article>
                    <article className="panel compactPanel">
                      <span className="eyebrow">Action plan</span>
                      <h3>Before you apply</h3>
                      <div className="checkList">
                        {evaluation.actions.map((item) => <span key={item}>→ {item}</span>)}
                      </div>
                    </article>
                  </div>

                  <article className="panel">
                    <div className="panelHead">
                      <div>
                        <span className="eyebrow">Requirement map</span>
                        <h2>What the posting explicitly emphasizes</h2>
                      </div>
                    </div>
                    {evaluation.requirements.length ? (
                      <div className="requirementTable">
                        {evaluation.requirements.map((requirement) => (
                          <div className="requirementRow" key={requirement.label}>
                            <span className={requirement.matched ? "statusDot match" : "statusDot miss"} />
                            <p>{requirement.label}</p>
                            <span>{requirement.source}</span>
                            <strong>{requirement.matched ? "Evidence found" : "Review gap"}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">No explicit requirement sentences were detected. Treat this as a manual-review posting.</p>
                    )}
                  </article>

                  {evaluation.legitimacy.signals.length > 0 && (
                    <article className="panel warningPanel">
                      <strong>Posting review signals</strong>
                      {evaluation.legitimacy.signals.map((signal) => <span key={signal}>• {signal}</span>)}
                    </article>
                  )}
                </div>
              )}
            </section>
          )}

          {view === "explore" && (
            <section className="viewStack">
              <div className="pageHeading splitHeading">
                <div>
                  <span className="eyebrow">Live Explore</span>
                  <h1>Pull real employer jobs into your workspace.</h1>
                  <p>
                    Paste a public Greenhouse or Lever careers URL. Career OS fetches the live board, ranks roles
                    against your resume, shows estimated role chance and sponsorship signal, and preserves the official apply link.
                  </p>
                </div>
                <span className="subtlePill">Live source · no paid feed required</span>
              </div>

              <article className="panel liveImporter">
                <div className="liveImporterTop">
                  <div>
                    <span className="eyebrow">Employer board</span>
                    <h2>Supported now: Greenhouse + Lever</h2>
                  </div>
                  <span className="privacyPill">Server-side fetch · restricted hosts</span>
                </div>
                <div className="liveSourceRow">
                  <input
                    value={liveSource}
                    onChange={(event) => setLiveSource(event.target.value)}
                    placeholder="https://boards.greenhouse.io/company or https://jobs.lever.co/company"
                  />
                  <button className="button primary" onClick={loadLiveBoard} disabled={liveLoading || !liveSource.trim()}>
                    {liveLoading ? "Loading live board..." : "Load live jobs"}
                  </button>
                </div>
                <div className="liveExamples">
                  <span>Career OS accepts only supported public ATS hosts; arbitrary URLs are rejected.</span>
                  {liveFetchedAt && <strong>Last fetched: {new Date(liveFetchedAt).toLocaleString()}</strong>}
                </div>
                {liveError && <div className="inlineError">{liveError}</div>}
              </article>

              <div className="filterBar">
                <span>Live source first</span>
                <span>High fit first</span>
                <span>Role chance visible</span>
                <span>Visa signal visible</span>
                <span>Official apply link</span>
              </div>

              {liveJobs.length > 0 ? (
                <div className="jobList">
                  {liveJobs.map((job) => (
                    <article className="jobCard liveJobCard" key={job.id}>
                      <div className="jobCompanyMark">{job.company[0]?.toUpperCase() || "J"}</div>
                      <div className="jobContent">
                        <span className="muted">{job.company} · {job.sourceLabel}</span>
                        <h2>{job.title}</h2>
                        <div className="jobMeta">
                          <span>{job.location}</span>
                          <span>{job.verdict}</span>
                          {job.updatedAt && <span>Source timestamp: {new Date(job.updatedAt).toLocaleDateString()}</span>}
                        </div>
                        <div className="liveSignals">
                          <span><b>{job.fit}%</b> fit</span>
                          <span><b>{job.roleChance}%</b> role chance · {job.roleConfidence}</span>
                          <span><b>{job.sponsorshipChance}%</b> visa · {job.sponsorshipLabel}</span>
                        </div>
                      </div>
                      <div className="jobRight">
                        <a className="button primary small" href={job.applyUrl} target="_blank" rel="noreferrer">Open official job</a>
                        <button className="button secondary small" onClick={() => saveLiveJob(job)}>
                          {tracker.some((item) => item.id === job.id) ? "In pipeline" : "Save role"}
                        </button>
                        <small>{job.sourceLabel} live feed</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <>
                  <div className="demoDivider">
                    <span />
                    <strong>Demo catalog fallback</strong>
                    <span />
                  </div>
                  <div className="jobList">
                    {demoJobs.map((job) => (
                      <article className="jobCard" key={job.id}>
                        <div className="jobCompanyMark">{job.company[0]}</div>
                        <div className="jobContent">
                          <span className="muted">{job.company}</span>
                          <h2>{job.title}</h2>
                          <div className="jobMeta">
                            <span>{job.location}</span><span>{job.mode}</span><span>{job.salary}</span>
                          </div>
                          <div className="tagRow">{job.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                        </div>
                        <div className="jobRight">
                          <div className="fitBadge"><strong>{job.fit}%</strong><span>fit</span></div>
                          <small>Sponsorship: {job.sponsor}</small>
                          <button className="button secondary small" onClick={() => saveDemoJob(job)}>
                            {tracker.some((item) => item.id === job.id) ? "In pipeline" : "Save role"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {view === "kit" && (
            <section className="viewStack">
              <div className="pageHeading">
                <span className="eyebrow">Application kit</span>
                <h1>One role. One coherent story.</h1>
                <p>Keep the resume priorities, cover-letter angle, recruiter message, follow-up, and interview proof aligned.</p>
              </div>

              <div className="kitHero panel">
                <div>
                  <span className="eyebrow">Kit status</span>
                  <h2>{evaluation ? evaluation.verdict : "Evaluate a role first for a scored kit"}</h2>
                  <p>{evaluation ? "Built from the current evaluation and your master resume." : "The workspace can still show the kit structure using demo content."}</p>
                </div>
                <div className="kitProgress">
                  <span className="ready">Resume plan</span>
                  <span className="ready">Cover angle</span>
                  <span className="ready">Recruiter note</span>
                  <span className="ready">Follow-up</span>
                </div>
              </div>

              <div className="kitGrid">
                <article className="panel kitCard">
                  <span className="kitIcon">CV</span>
                  <span className="eyebrow">Tailored resume plan</span>
                  <h2>Lead with the proof the role asks for.</h2>
                  <ul>
                    <li>Move the strongest matching security evidence into the top third.</li>
                    <li>Use the posting language only where it is already true in your background.</li>
                    <li>Quantify outcomes where your source resume supports the number.</li>
                    <li>Keep unsupported gaps visible instead of filling them with invented claims.</li>
                  </ul>
                </article>

                <article className="panel kitCard">
                  <span className="kitIcon">CL</span>
                  <span className="eyebrow">Cover-letter angle</span>
                  <h2>Problem → evidence → why this team.</h2>
                  <p>
                    Open with the security problem you can solve, point to one concrete example from your work,
                    then connect that evidence to the company or product. Avoid generic excitement language.
                  </p>
                </article>

                <article className="panel kitCard">
                  <span className="kitIcon">LI</span>
                  <span className="eyebrow">Recruiter note</span>
                  <h2>Short enough to read.</h2>
                  <div className="draftBox">
                    Hi — I am exploring this role because the work around secure design, application security, and automation maps closely to projects I have built. I would value a quick look at whether that background is relevant to the team.
                  </div>
                </article>

                <article className="panel kitCard">
                  <span className="kitIcon">FO</span>
                  <span className="eyebrow">Follow-up</span>
                  <h2>Specific, not needy.</h2>
                  <div className="draftBox">
                    Following up on my application. The part of the role I am most aligned with is translating security requirements into practical engineering controls. I would be glad to share a concise example if useful.
                  </div>
                </article>
              </div>

              <div className="humanGate">
                <span>Human gate</span>
                <strong>Nothing sends automatically.</strong>
                <p>Review the job, verify every claim, edit the drafts, and choose when or whether to submit.</p>
              </div>
            </section>
          )}

          {view === "tracker" && (
            <section className="viewStack">
              <div className="pageHeading splitHeading">
                <div>
                  <span className="eyebrow">Pipeline</span>
                  <h1>Know exactly where every role stands.</h1>
                  <p>Saved jobs become decisions, and decisions become learning signals.</p>
                </div>
                <button className="button primary" onClick={() => setView("explore")}>+ Find roles</button>
              </div>

              {tracker.length === 0 ? (
                <div className="emptyState panel">
                  <span>◎</span>
                  <h2>Your pipeline is empty.</h2>
                  <p>Save a demo role from Explore to test the complete tracking flow.</p>
                  <button className="button primary" onClick={() => setView("explore")}>Explore roles</button>
                </div>
              ) : (
                <div className="pipelineBoard">
                  {(["Saved", "Applied", "Interview", "Offer", "Rejected"] as Status[]).map((status) => (
                    <section className="pipelineColumn" key={status}>
                      <div className="columnHead">
                        <strong>{status}</strong>
                        <span>{tracker.filter((item) => item.status === status).length}</span>
                      </div>
                      <div className="columnStack">
                        {tracker.filter((item) => item.status === status).map((item) => (
                          <article className="pipelineCard" key={item.id}>
                            <small>{item.company}</small>
                            <h3>{item.title}</h3>
                            <p>{item.location}</p>
                            <div className="pipelineMeta"><span>{item.fit}% fit</span><span>{item.sponsor}</span></div>
                            <div className="reviewGate">
                              <span className={item.reviewed ? "gateDone" : "gatePending"}>{item.reviewed ? "Reviewed" : "Review required"}</span>
                              {!item.reviewed && <button type="button" onClick={() => markReviewed(item.id)}>Mark reviewed</button>}
                            </div>
                            <select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value as Status)}>
                              {(["Saved", "Applied", "Interview", "Offer", "Rejected"] as Status[]).map((option) => <option key={option}>{option}</option>)}
                            </select>
                            {item.applyUrl && item.reviewed && (
                              <a className="textButton" href={item.applyUrl} target="_blank" rel="noreferrer" onClick={() => recordOpen(item)}>
                                Open official application
                              </a>
                            )}
                            <button className="textButton" onClick={() => removeRole(item.id)}>Remove</button>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              {audit.length > 0 && (
                <article className="panel auditPanel">
                  <div className="panelHead">
                    <div>
                      <span className="eyebrow">Application audit</span>
                      <h2>What actually happened</h2>
                    </div>
                    <span className="subtlePill">Latest {Math.min(audit.length, 12)} events</span>
                  </div>
                  <div className="auditList">
                    {audit.slice(0, 12).map((entry) => (
                      <div className="auditRow" key={entry.id}>
                        <span className={"auditAction " + entry.action}>{entry.action.replace("_", " ")}</span>
                        <div>
                          <strong>{entry.role} · {entry.company}</strong>
                          <p>{entry.detail}</p>
                        </div>
                        <time>{new Date(entry.at).toLocaleString()}</time>
                      </div>
                    ))}
                  </div>
                </article>
              )}
            </section>
          )}

          {view === "interview" && (
            <section className="viewStack">
              <div className="pageHeading">
                <span className="eyebrow">Interview preparation</span>
                <h1>Build stories before the calendar invite arrives.</h1>
                <p>A small story bank is more useful than memorizing dozens of isolated answers.</p>
              </div>

              <div className="storyGrid">
                {starterStories.map((story, index) => (
                  <article className="panel storyCard" key={story.title}>
                    <div className="storyTop"><span>Story 0{index + 1}</span><strong>STAR + R</strong></div>
                    <h2>{story.title}</h2>
                    <div className="storyBlock"><span>S</span><p>{story.situation}</p></div>
                    <div className="storyBlock"><span>T</span><p>{story.task}</p></div>
                    <div className="storyBlock"><span>A</span><p>{story.action}</p></div>
                    <div className="storyBlock"><span>R</span><p>{story.result}</p></div>
                    <div className="storyBlock reflection"><span>↗</span><p>{story.reflection}</p></div>
                  </article>
                ))}
                <article className="panel questionCard">
                  <span className="eyebrow">Practice prompts</span>
                  <h2>Use evidence, not adjectives.</h2>
                  {[
                    "Tell me about a security risk you found before it became an incident.",
                    "Describe a time you disagreed with an engineering design.",
                    "How did you make a security control easier to adopt?",
                    "Tell me about a result that did not meet your expectation and what changed next."
                  ].map((question) => <button key={question}>{question}<span>→</span></button>)}
                </article>
              </div>
            </section>
          )}

          {view === "analytics" && (
            <section className="viewStack">
              <div className="pageHeading">
                <span className="eyebrow">Search analytics</span>
                <h1>Use outcomes to change behavior.</h1>
                <p>The purpose of analytics is not volume. It is knowing where your current approach stops working.</p>
              </div>

              <div className="metricGrid">
                <article className="metricCard"><span>Tracked</span><strong>{tracker.length}</strong><small>Total roles</small></article>
                <article className="metricCard"><span>Applied</span><strong>{pipelineCounts.applied}</strong><small>Current stage</small></article>
                <article className="metricCard"><span>Interviews</span><strong>{pipelineCounts.interview}</strong><small>Active loops</small></article>
                <article className="metricCard accentMetric"><span>Offers</span><strong>{pipelineCounts.offer}</strong><small>Final outcome</small></article>
              </div>

              <div className="twoCol analyticsGrid">
                <article className="panel">
                  <span className="eyebrow">Funnel</span>
                  <h2>Pipeline conversion</h2>
                  <div className="funnel">
                    {[
                      ["Saved", pipelineCounts.saved, 100],
                      ["Applied", pipelineCounts.applied, tracker.length ? Math.max(18, (pipelineCounts.applied / tracker.length) * 100) : 18],
                      ["Interview", pipelineCounts.interview, tracker.length ? Math.max(12, (pipelineCounts.interview / tracker.length) * 100) : 12],
                      ["Offer", pipelineCounts.offer, tracker.length ? Math.max(8, (pipelineCounts.offer / tracker.length) * 100) : 8]
                    ].map(([label, count, width]) => (
                      <div className="funnelRow" key={String(label)}>
                        <span>{label}</span>
                        <div><i style={{ width: String(width) + "%" }} /></div>
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel">
                  <span className="eyebrow">Interpretation</span>
                  <h2>What to inspect next</h2>
                  <div className="insightList">
                    <div><span>01</span><p>If saved roles rarely become applications, tighten the evaluation criteria or reduce tailoring effort.</p></div>
                    <div><span>02</span><p>If applications do not become interviews, revisit role fit, evidence placement, and referral strategy.</p></div>
                    <div><span>03</span><p>If interviews do not become offers, analyze story quality, technical gaps, and process friction separately.</p></div>
                  </div>
                </article>
              </div>
            </section>
          )}

          {view === "profile" && (
            <section className="viewStack">
              <div className="pageHeading">
                <span className="eyebrow">Profile</span>
                <h1>Define the search before the search defines you.</h1>
                <p>These settings stay in your browser in this prototype.</p>
              </div>

              <div className="profileGrid">
                <article className="panel formPanel">
                  <label className="formField">
                    <span>Name</span>
                    <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
                  </label>
                  <label className="formField">
                    <span>Target roles</span>
                    <input value={target} onChange={(event) => setTarget(event.target.value)} />
                  </label>
                  <label className="formField">
                    <span>Search geography</span>
                    <input value={location} onChange={(event) => setLocation(event.target.value)} />
                  </label>
                  <label className="formField">
                    <span>Work authorization</span>
                    <select value={workAuthMode} onChange={(event) => setWorkAuthMode(event.target.value as "future-sponsorship" | "no-sponsorship-needed" | "unknown")}>
                      <option value="future-sponsorship">I need future visa sponsorship</option>
                      <option value="no-sponsorship-needed">I do not need sponsorship</option>
                      <option value="unknown">Prefer not to apply sponsorship as a constraint</option>
                    </select>
                  </label>
                  <div className="settingRow">
                    <div><strong>Human-in-the-loop</strong><small>Never auto-submit applications.</small></div>
                    <span className="switch on"><i /></span>
                  </div>
                  <div className="settingRow">
                    <div><strong>Evidence-only drafting</strong><small>Do not fabricate facts to improve fit.</small></div>
                    <span className="switch on"><i /></span>
                  </div>
                  <div className="settingRow">
                    <div><strong>Work-authorization check</strong><small>Surface restrictive language before tailoring.</small></div>
                    <span className="switch on"><i /></span>
                  </div>
                  <button className="button primary" onClick={saveProfile}>Save profile</button>
                </article>

                <aside className="panel profilePreview">
                  <span className="eyebrow">Search brief</span>
                  <div className="largeAvatar">PK</div>
                  <h2>{profileName}</h2>
                  <p>{target}</p>
                  <span className="locationLine">⌖ {location}</span>
                  <span className="locationLine">Visa setting: {workAuthMode === "future-sponsorship" ? "future sponsorship needed" : workAuthMode === "no-sponsorship-needed" ? "no sponsorship needed" : "not applied to scoring"}</span>
                  <div className="profileRule" />
                  <strong>Core operating principle</strong>
                  <p>Apply better to fewer. Signal over volume. Evidence over keywords. A human decides.</p>
                </aside>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
