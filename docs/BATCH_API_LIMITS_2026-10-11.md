# Batch scan API input protection - implementation review, 2026-10-11

This document describes the proposed **draft pull-request** changes in `app/api/batch-scan/route.ts`. It is **not** an assertion that CI, production deploy, or browser/API integration tests have passed.

## Scope

- Enforce **16 MiB (16 × 1024 × 1024 bytes)** for the incoming JSON body, including chunked transfer bodies without a declared `Content-Length`.
- Keep the existing upper bound of **10,000 jobs**; cap resume length at 50,000 characters and role queries at 1,000 characters.
- Enforce individual field limits: description 25,000, applyUrl 2,000, title/company/location 250, ID 200, source 100 characters.
- Require typed JSON fields, including an integer maxResults between 1 and 500.
- Only return HTTPS application URLs from batch-provided job records; strip unsupported schemes rather than emitting them to a clickable href.
- Return 400 for malformed JSON/field types, 413 for oversized bodies, and preserve the existing 500 fallback for unexpected server errors.

## Required verification before merge

Run `npm ci --no-audit --no-fund`, `npm run typecheck`, and `npm run build` with **Node.js 22**. A source-review branch is not a substitute for executing those commands.

With a local Next.js server, test all of the following:

1. A valid small batch and a valid 10,000-job batch inside the size limit; compare sorted/deduplicated responses against the unmodified main branch.
2. 10,001 jobs returns 413.
3. Malformed JSON, `null` job objects, non-string titles, and incorrect sponsorship-field types return 400.
4. Bodies above 16 MiB return 413 both with Content-Length and with chunked transfer encoding.
5. Unsafe `javascript:` / `data:` / `http:` application URLs are not returned as clickable apply URLs; HTTPS works.
6. Missing or invalid `maxResults` behaves as documented.
7. Check runtime memory and response latency for near-limit batches; 16 MiB is a bounded input size, **not** a throughput/security SLA.

## Unresolved production work

No authentication, per-user throttling, cross-user quota, or persistent state protection was added. This is still a prototype; source data and output do not become trustworthy simply because the request parser rejects malformed input. Do not merge or deploy on the basis of this document alone.
