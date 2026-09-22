# Career OS

**Repository owner & maintainer:** Pooja Kiran ([@poojakira](https://github.com/poojakira))

Career OS is a single-user, authenticated career workflow application for preparing evidence-constrained resume drafts, generating bounded PDFs, tracking application material, and delivering an approved draft to a configured inbox.

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
