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
