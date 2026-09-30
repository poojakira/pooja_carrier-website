# Career OS

**Repository owner & maintainer:** Pooja Kiran ([@poojakira](https://github.com/poojakira))

Career OS is a single-user, authenticated career workflow application for preparing evidence-constrained resume drafts, generating bounded PDFs, tracking application material, and delivering an approved draft to a configured inbox.

## Overview

Career OS is a single-user, authenticated (TypeScript/Next.js) career-workflow app: it prepares evidence-constrained resume drafts, generates bounded PDFs, tracks application material, and delivers an approved draft to one configured inbox. It is built around a strict security boundary — every page and privileged route requires a signed HttpOnly session — because it integrates AI, email, and PDF generation that must not be exposed as an anonymous public endpoint.

## Verified Snapshot

| Metric | Current result |
|---|---:|
| Stack | Next.js / TypeScript, single-user |
| Auth | signed HttpOnly session; `CAREER_OS_ACCESS_KEY` + separate `CAREER_OS_SESSION_SECRET` (≥32 chars) |
| Route protection | middleware + per-route session re-check on AI/email/PDF routes |
| Output bounds | JSON body, PDF input/page/size, and OpenAI request deadlines all bounded |

## Security Problem

An app that wires together AI generation, SMTP email, and PDF rendering is a high-value target if left open: prompt/input abuse, arbitrary-recipient email, resource-exhaustion via unbounded PDFs, and session/credential leakage. Career OS treats itself as a **single-user authenticated** system with defense-in-depth so none of those routes are reachable anonymously or unbounded.

## Threat Model & Scope

**In scope:** authenticated single-user workflow with signed-session protection on every privileged route, bounded inputs/outputs, fixed email recipient, and HTML escaping.

**Out of scope / not claimed:** It is explicitly **not** an anonymous public AI endpoint and not multi-tenant. Resume tailoring is an evidence-constrained draft that requires human approval — it is not an authoritative document generator. SMTP delivery is restricted to `NOTIFICATION_EMAIL`; callers cannot choose recipients.

## Architecture

```text
Login (CAREER_OS_ACCESS_KEY)  -->  signed HttpOnly session (CAREER_OS_SESSION_SECRET)
      |  middleware + per-route re-check
      v
AI draft (bounded, deadlined) --> evidence-constrained resume draft (human approval)
      |
      v
Bounded PDF generation  |  SMTP delivery to fixed NOTIFICATION_EMAIL (escaped HTML)
```

## Core Capabilities

- Signed HttpOnly session auth with separate access key and session secret (≥32 chars, env-supplied)
- Per-route session re-check on AI, resume-tailoring, email, and PDF routes
- Bounded JSON bodies, bounded PDF input/page-count/output size, deadlined OpenAI calls
- Evidence-constrained resume drafts marked as requiring human approval
- Fixed-recipient SMTP delivery with HTML escaping

## Production security boundary

The application is not an anonymous public AI endpoint.

- Every application page and privileged API route is protected by a signed HttpOnly session.
- Login requires `CAREER_OS_ACCESS_KEY`; the session signature uses a different `CAREER_OS_SESSION_SECRET`.
- Both secrets must be at least 32 characters and are supplied only through the deployment environment.
- AI, resume-tailoring, email, and PDF routes re-check the signed session even though middleware already protects the route.
- JSON bodies are bounded before parsing.
- OpenAI calls have request deadlines and return generic upstream errors.
- Resume tailoring is an evidence-constrained **draft** and is marked as requiring human approval.
- SMTP delivery is limited to `NOTIFICATION_EMAIL`; callers cannot choose an arbitrary recipient.
- HTML email fields are escaped before rendering.
- PDF generation limits input, page count, and output size.
- Security headers deny framing, reduce browser permissions, and restrict content sources.
- The production gate runs the security-contract verifier, TypeScript compiler, and Next.js production build.

## Features

- **Resume Tweaker** — create an evidence-constrained draft from a job link or description.
- **PDF Generator** — generate a bounded PDF from an approved draft.
- **Email Delivery** — deliver the approved draft to the configured inbox.
- **AI Assistant** — authenticated career-assistance chat with bounded context.
- **Job/Resume UI** — local workflow views for application organization.

## Local setup

```bash
npm ci
cp .env.example .env.local
# Replace every authentication placeholder before starting.
npm run dev
```

Open `http://localhost:3000`. Unauthenticated requests are redirected to `/login`.

## Required production configuration

| Variable | Required | Purpose |
|---|---|---|
| `CAREER_OS_ACCESS_KEY` | Yes | Single-user login credential; minimum 32 characters |
| `CAREER_OS_SESSION_SECRET` | Yes | HMAC key for session cookies; minimum 32 characters |
| `OPENAI_API_KEY` | Optional | Enables provider-backed chat/tailoring |
| `OPENAI_MODEL` | Optional | Provider model name |
| `SMTP_HOST` / `SMTP_PORT` | For email | SMTP endpoint |
| `SMTP_USER` / `SMTP_PASS` | For email | SMTP credentials |
| `NOTIFICATION_EMAIL` | For email | Fixed delivery destination |

Do not expose this application publicly without TLS at the reverse proxy/platform edge. Do not store secrets in the repository or browser-side environment variables.

## Release verification

```bash
node scripts/verify-security.mjs
npx tsc --noEmit
npm run build
```

The security-contract script rejects privileged routes that lose session enforcement, bounded JSON parsing, or safe email rendering.

## Operational limits

This repository intentionally implements a **single-user** trust model. It is not a multi-tenant recruiting SaaS. It does not automatically submit applications or send a resume to arbitrary third parties. Generated text remains a draft until reviewed by the user.

## Stack

Next.js 15, TypeScript, Tailwind CSS, pdf-lib, Nodemailer, and an optional OpenAI provider integration.

<!-- repo-verification:start -->
## Verification update — 2026-09-30

- **Scope:** Account-wide `poojakira` repository pass covering source/configuration, CI/release workflows, security-hygiene gates, dependency/SAST controls, and documentation consistency.
- **Remediation:** Reviewed the Next.js career-assistant security/build workflow and existing authentication/provider safeguards.
- **Verification state:** Hosted Actions is currently blocked before runner assignment: the latest build failure had zero executed steps, so npm audit, tests, lint, typecheck, and build did not actually run.
- **Security note:** Re-run CI after hosted-runner/account availability returns; custom error/loading screens and critical-provider alerting remain documented hardening follow-ups.
- **Evidence boundary:** This update records repository and GitHub Actions evidence observed during the pass. It is not a claim of independent penetration testing, production deployment, or zero residual risk.
<!-- repo-verification:end -->
