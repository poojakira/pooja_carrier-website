import Link from "next/link";

const features = [
  ["Readiness Read", "See ATS-style clarity, impact, completeness, and keyword signals before you tailor."],
  ["Role Evaluation", "Score a posting against your actual evidence, including explicit requirements and work-authorization language."],
  ["Application Kit", "Keep the tailored resume, cover-letter angle, follow-up, and recruiter message aligned to one story."],
  ["Career Companion", "A workspace that remembers your profile, saved roles, applications, interview stories, and next actions."],
  ["Pipeline Analytics", "Measure applications, responses, interviews, offers, and where your search is leaking momentum."],
  ["Human in the loop", "The system prepares and recommends. You review, edit, and decide what gets sent."]
];

export default function Home() {
  return (
    <main className="landing">
      <header className="landingNav">
        <Link href="/" className="brand">
          <span className="brandMark">P</span>
          <span>Pooja Career OS</span>
        </Link>
        <div className="landingLinks">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <Link className="button secondary small" href="/workspace">Open workspace</Link>
        </div>
      </header>

      <section className="hero">
        <div className="heroGlow heroGlowOne" />
        <div className="heroGlow heroGlowTwo" />
        <div className="heroCopy">
          <span className="heroBadge">Career search, run like an operating system</span>
          <h1>Apply better to fewer roles. Keep the evidence. Keep the control.</h1>
          <p>
            A unified career workspace that combines ATS-style resume feedback, rigorous job evaluation,
            application kits, interview preparation, and pipeline analytics without auto-submitting on your behalf.
          </p>
          <div className="heroActions">
            <Link className="button primary" href="/workspace">Start with the workspace</Link>
            <a className="button ghost" href="#how">See the workflow</a>
          </div>
          <div className="trustLine">
            <span>Local-first prototype</span>
            <span>No auto-apply</span>
            <span>No fabricated experience</span>
          </div>
        </div>

        <div className="heroProduct">
          <div className="productWindow">
            <div className="windowBar">
              <div className="windowDots"><span /><span /><span /></div>
              <span>Career command center</span>
              <span className="livePill">Live</span>
            </div>
            <div className="productBody">
              <aside className="miniSidebar">
                <span className="miniBrand">P</span>
                <span className="miniActive">⌂</span>
                <span>◎</span>
                <span>▣</span>
                <span>◇</span>
              </aside>
              <div className="miniMain">
                <div className="miniHeading">
                  <div><small>GOOD EVENING</small><strong>Your search, prioritized.</strong></div>
                  <span>+ Evaluate role</span>
                </div>
                <div className="miniStats">
                  <div><small>Readiness</small><b>86</b><i>Strong baseline</i></div>
                  <div><small>Best fit</small><b>94%</b><i>Application Security</i></div>
                  <div><small>Pipeline</small><b>12</b><i>4 active</i></div>
                </div>
                <div className="miniPanel">
                  <div className="miniPanelHead"><strong>Today</strong><span>3 high-value actions</span></div>
                  <div className="miniTask"><em>1</em><span><b>Review top match</b><small>Application Security Engineer · Phoenix</small></span><strong>94%</strong></div>
                  <div className="miniTask"><em>2</em><span><b>Strengthen resume impact</b><small>3 bullets need measurable outcomes</small></span><strong>Fix</strong></div>
                  <div className="miniTask"><em>3</em><span><b>Interview story bank</b><small>Prepare one identity-security story</small></span><strong>Prep</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="proofStrip">
        <span>Resume → fit → application → interview → offer</span>
        <strong>One evidence-backed workflow.</strong>
      </section>

      <section className="howSection" id="how">
        <div className="sectionIntro">
          <span className="eyebrow">How it works</span>
          <h2>One role in. One decision-quality packet out.</h2>
          <p>The system is designed to help you decide where to invest time before it helps you write anything.</p>
        </div>
        <div className="steps">
          {[
            ["01", "Load your truth", "Keep a master resume and profile as the source of truth. The tool may sharpen wording, but it should never invent experience."],
            ["02", "Evaluate before applying", "Read the posting, weight explicit requirements, flag work-authorization blockers, and surface legitimacy signals."],
            ["03", "Build one coherent kit", "Tailor the resume, cover-letter angle, recruiter note, follow-up, and interview stories around the same evidence."],
            ["04", "Track outcomes", "Move roles through the pipeline and learn from response rates, interviews, rejections, and offers."]
          ].map(([n, title, text]) => (
            <article className="stepCard" key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="featureSection" id="features">
        <div className="sectionIntro">
          <span className="eyebrow">A complete career operating layer</span>
          <h2>Polished enough to use daily. Rigorous enough to trust.</h2>
        </div>
        <div className="featureGrid">
          {features.map(([title, text]) => (
            <article className="featureCard" key={title}>
              <span className="featureIcon">✦</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ctaSection">
        <div>
          <span className="eyebrow">Your side, never on your behalf</span>
          <h2>Make every application a deliberate one.</h2>
          <p>Start with the included demo data, then replace it with your own resume and job descriptions.</p>
        </div>
        <Link className="button light" href="/workspace">Open Career OS</Link>
      </section>

      <footer className="landingFooter">
        <span>Pooja Career OS · independent implementation</span>
        <span>Human review required before any application is sent.</span>
      </footer>
    </main>
  );
}
