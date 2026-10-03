# Product Validation

## Product boundary
Authenticated UI/workflow shell for career material generation and delivery. Long term, this should act as the user-facing client for Carrier rather than a second independent career product.

## Real-world validation ladder
1. Authentication/session/security-contract checks.
2. Evidence-constrained resume/PDF generation.
3. Fixed-recipient email delivery tests with a local/mock SMTP sink.
4. Carrier API contract test when `CARRIER_API_BASE_URL` is configured.
5. End-to-end operator-approved workflow before any automation claim.

## Evidence rules
Provider/API integration is optional and must fail safely when not configured. Validation must never send real email or submit a real application without explicit operator action.
