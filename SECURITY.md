# Security policy

## Scope and maturity

Carrier OS is an early-stage, human-reviewed career-operations application. Its stored profile and application state currently rely on browser `localStorage`. This is **not** encrypted production storage or an appropriate vault for highly sensitive personal records.

The public job-discovery and PDF-generation routes are not represented as multi-tenant production services with complete authentication, authorization, quotas or abuse protection. A green type-check or build is not a security certification.

## Reporting a vulnerability

Please use GitHub's **Report a vulnerability** / private security-advisory feature for this repository if it is available. Otherwise email **poojakiranbhardwaj@gmail.com** with the subject `Carrier OS security report`. Do not publish an exploit, token, credential, or a third party's private data in a public issue.

Include the affected version or commit, reproduction steps with dummy data, affected endpoint or file, expected versus observed behavior, and practical impact. Do not test against real candidate data or third-party employer systems without authorization. This policy does not establish a bug bounty or a guaranteed response SLA.

## Safe local operation

- Use your own environment variables. Do not commit secrets, session tokens, employer API credentials or filled `.env` files.
- Review generated application content manually. The program does not submit applications on a candidate's behalf.
- Treat percentage-based role-fit and sponsorship scores as **heuristic ranking aids**, never the probability of hiring or a sponsorship commitment.
- Do not enter high-sensitivity information until authentication, storage protections, retention rules and access controls have been designed and tested.
- Before public production usage, complete a threat model, authenticated route review, per-user rate limiting, current-dependency audit, end-to-end browser and API tests, TLS and error-path review.

## Disclosure boundaries

A fix is only considered verified after the relevant test and deployment evidence is recorded with a dated commit. Please disclose responsibly; a scanner report alone does not prove exploitability.
