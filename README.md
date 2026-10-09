# Carrier OS

Carrier OS is a human-in-the-loop career operations workspace for evaluating roles, improving resume readiness, preparing coherent application kits, organizing interview evidence, and learning from application outcomes.

The repository was rebuilt from scratch in October 2026. The product direction combines two useful ideas:

- the polished, applicant-facing workflow visible in Aspirely: resume readiness, application kits, a persistent career workspace, and explicit user control before anything is sent;
- the rigorous open-source workflow patterns from Career Ops: evaluate before applying, weight explicit requirements, surface work-authorization blockers, flag posting-review signals, preserve a source of truth, keep a story bank, and learn from pipeline analytics.

This is an independent implementation. It does not include Aspirely proprietary source code, assets, logos, or customer data. Career Ops is MIT-licensed; see THIRD_PARTY_NOTICES.md.

## Current product

The first fresh build includes:

- a polished public landing page;
- local-first master resume editing;
- an evidence-locked Resume Tweaker with job-specific rewriting, ATS alignment, impact/concise modes, protected-fact checks, exact before/after edits, and unresolved-gap warnings;
- deterministic readiness scoring across completeness, impact, clarity, and keyword breadth;
- job-description evaluation with evidence overlap;
- explicit-requirement extraction and weighting;
- work-authorization and sponsorship-language review;
- a posting-based visa sponsorship percentage with confidence and evidence;
- an estimated role-chance percentage with transparent factors and an explicit uncertainty disclaimer;
- conservative posting-legitimacy observations;
- live public employer-board ingestion for Greenhouse, Lever, Ashby, SmartRecruiters, and supported public Workday career sites, with server-side host allowlisting, source timestamps, official apply links, resume fit, role-chance estimates, and sponsorship signals;
- a demo job discovery catalog as an offline/fallback path;
- application-kit planning for resume, cover letter, recruiter note, and follow-up;
- a human-review gate that never auto-submits;
- a local application pipeline with Saved, Applied, Interview, Offer, and Rejected states;
- a premium-style review gate: live roles must be explicitly reviewed before they can be marked Applied/Interview/Offer;
- a visible lifecycle rail: Resume → Understood → Matched → Tailored → ATS Recheck → PDF Ready → User Applies → Tracked → Updates;
- user-selected role targeting: one role or comma-separated target roles drive live discovery and matching;
- an ATS Robot recheck gate that blocks PDF generation when evidence integrity, alignment, structure, readability, or stuffing checks fail;
- server-side PDF generation that independently re-runs the ATS gate before releasing the file;
- a two-pass bulk-scan API that accepts up to 10,000 jobs per batch for dedupe, user-role filtering, fit scoring, sponsorship analysis, and prioritization;
- an application audit trail that distinguishes saved, reviewed, official-application opened, user-confirmed status changes, and removed events;
- a STAR plus Reflection interview story bank;
- pipeline analytics and funnel interpretation;
- local profile preferences;
- responsive desktop and mobile UI.

## Product rules

1. Human review before send.
2. Evidence over keyword stuffing.
3. No invented experience.
4. Evaluate before spending time tailoring.
5. Restrictive work-authorization language is surfaced early.
6. Posting-legitimacy signals are observations, not accusations.
7. The current build uses demo jobs and deterministic logic so it works without paid APIs.

## Run locally

Requirements: Node.js 22 or newer.

1. Clone the repository.
2. Run npm ci.
3. Run npm run dev.
4. Open http://localhost:3000.

Verification:

- npm ci
- npm run typecheck
- npm run build

## Architecture

- Next.js App Router
- React 19
- TypeScript
- CSS without a component framework
- route handler for job evaluation
- browser localStorage for prototype user state
- no database required for the first build
- no paid AI or job-provider dependency required

The resume-tailoring engine is profession-agnostic: it derives role language from each job description instead of relying on a hard-coded occupation vocabulary. The code intentionally keeps the first version small enough to audit. Live providers, authentication, encrypted storage, PDF generation, and model-backed drafting can be layered on after the core workflow is stable.

## Safety and privacy

This prototype stores editable user state in browser localStorage. That makes the current build easy to run and inspect, but it is not the same as an encrypted production data layer. Do not treat the prototype as a production vault for highly sensitive information.

The application never auto-submits jobs and never sends messages. It can scan and prioritize up to 10,000 jobs in a batch, but applications remain human-confirmed. Drafting surfaces are review-only. Opening an employer application URL is logged separately from a user-confirmed Applied status, so the product does not manufacture submission success. The requested workflow requires an ATS-passed PDF before the application stage unlocks.

## Attribution

Career Ops:
https://github.com/career-ops-hq/career-ops

Aspirely public product pages:
https://aspirely.me/

See THIRD_PARTY_NOTICES.md for details.

## Next production steps

The recommended next layer is:

- real authentication and encrypted profile storage;
- expand live job feeds beyond the current Greenhouse and Lever adapters to additional employer ATS sources;
- role freshness and canonical employer-link verification;
- recruiter and hiring-manager research;
- document upload and parsing;
- model-backed drafting with evidence-grounding checks;
- ATS-friendly PDF generation;
- scheduled job scans;
- email/calendar follow-up integrations;
- automated tests for the evaluation engine;
- end-to-end browser tests;
- deployment hardening and observability.


## Verification status — October 9, 2026

See [evidence and limitations](docs/VERIFICATION_STATUS_2026-10-09.md). Passing CI at a dated commit or a preview deployment does not certify all source, security controls or operational claims.
