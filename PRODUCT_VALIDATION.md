# Product Validation

## Product boundary

Career OS is the authenticated single-user interface/control plane for resume drafting, bounded AI assistance, PDF generation, and fixed-recipient notification workflows. It is not a separate autonomous job-submission engine; Carrier owns job matching and application workflow logic.

## Real-world validation ladder

1. Static security-contract checks for route-level session enforcement, bounded JSON parsing, generic public errors, security headers, and abuse limits.
2. Production build/type-check against the actual Next.js routes.
3. Session-integrity and same-origin boundary checks.
4. Fixed-recipient SMTP contract and escaped HTML verification.
5. Trusted-proxy deployment contract: forwarded client-IP headers are ignored by default and may be enabled only behind an operator-controlled proxy that overwrites them.
6. External pilot with the single intended user before any multi-user or public-service claim.

## Release gates

- AI, email, PDF, and resume-tailoring routes require a valid signed session.
- Request bodies are bounded before expensive processing.
- Caller-controlled email recipients are not accepted.
- Raw provider/server exception details are not returned to clients.
- Rate limiting must not trust spoofable forwarded-address headers by default.
- Resume drafts remain evidence-constrained and require human review.
- This repository must not claim multi-tenant isolation or autonomous employer-side submission.

## Evidence boundary

Passing these gates demonstrates the single-user interface security contract at the tested revision. It does not establish public SaaS readiness, employer ATS authorization, hiring outcomes, or multi-tenant security.


## Dependency audit boundary

The release gate blocks high/critical advisories in production runtime dependencies using `npm audit --omit=dev --audit-level=high`. A full development-tool audit is also emitted. As of the current validation pass, runtime dependencies report zero high/critical advisories; high-severity findings remain in development/build glob tooling through `braces` (GHSA-vfj7-8cjw-p6xm), for which the npm registry currently exposes no patched `braces` release beyond the affected range. Critical development-tool advisories remain blocking. This distinction is explicit so dev-only findings are neither hidden nor misrepresented as runtime exposure.
