# Product Validation

## Product boundary

Career OS is a single-user authenticated workflow for evidence-constrained career drafts, bounded PDF generation, and delivery to one operator-configured inbox. It is not a public AI service, autonomous application submitter, or authoritative resume generator.

## Real-world validation ladder

1. Static security and product-contract checks on every privileged route.
2. Build/type checks for the Next.js application.
3. Route-level verification that AI, resume, email, and PDF operations re-check the signed session and enforce bounded request sizes and rate limits.
4. Fixed-recipient email contract: the request cannot select the destination inbox.
5. Bounded PDF contract: page and byte ceilings prevent unbounded document generation.
6. External pilot with the owner reviewing generated drafts before any use or delivery.

## Release gates

- AI-generated career content must be marked for human approval.
- Resume tailoring must be constrained to supplied evidence and must not invent employers, metrics, certifications, or deployment claims.
- Privileged API routes must fail without a valid signed session.
- Email recipients must come only from server configuration, never caller input.
- PDF generation must enforce page and output-size ceilings.
- Provider credentials must remain server-side environment configuration.

## Evidence boundary

The automated verifier is a source-contract gate, not a browser penetration test or external provider certification. Passing it proves that required safeguards are present in the reviewed source revision; runtime deployment still requires secure secrets, HTTPS, and operator review.
