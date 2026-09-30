# Security Audit — pooja_carrier-website

**Audit date:** 2026-09-29  
**Scope:** single-owner Next.js application, signed session/access key, AI/SMTP routes, request parsing, XSS/output handling, origin policy, rate limiting, failure screens, alerting, CI and secrets.

## Findings captured before this remediation pass

| ID | Severity | Finding | Status |
|---|---|---|---|
| PCW-001 | High | Middleware authenticates sessions but does not enforce same-origin unsafe API requests. | Open |
| PCW-002 | High | Login/API surface has no general request-rate limiter. | Open |
| PCW-003 | Medium | Security response headers/CSP are not set by middleware. | Open |
| PCW-004 | Medium | No custom app/global/not-found failure screens exist. | Open |
| PCW-005 | Medium | No critical runtime alert hook exists for provider/mail failures. | Open |
| PCW-006 | Info | This is a single-owner access-key application with no multi-user database; UUID tenant isolation and password reset links are not part of its current identity model. | N/A |
| PCW-007 | Info | Protected API routes use bounded JSON parsing and route-level session enforcement; mail HTML values are escaped. | Verified |

## Existing controls verified

- Access key and session secret require at least 32 characters.
- HMAC-signed expiring session tokens.
- HttpOnly, Secure-in-production, SameSite Strict session cookie.
- Route-level session checks for AI/resume/PDF/email APIs.
- Bounded JSON parsing.
- Provider/SMTP network timeouts.
- SMTP TLS minimum 1.2.
- Generic public errors in the security contract.
- Security-hygiene CI.

## Verification plan

Add origin/rate/security-header controls, custom failure screens and alerting, then run security contract, typecheck, build and dependency workflows.
