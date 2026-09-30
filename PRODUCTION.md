# Production Operating Contract

## System role

This repository is maintained as a **career workflow web application**.

## Production purpose

provide the user-facing career dashboard and server APIs with validated inputs and controlled integrations.

## Release gate

A release is promotable only when type check, route tests, dependency audit, and production build pass.

## Operating requirements

- Configuration must come from explicit environment/config files; secrets must never be committed.
- Production defaults must fail safely when required identity, credentials, artifacts, or dependencies are missing.
- Health/readiness behavior must represent real dependency state where the repository exposes a service.
- Logs and machine-readable outputs must support incident/debug reconstruction without leaking secrets.
- Dependency and security findings at the repository's blocking threshold must stop promotion.
- Public metrics and benchmark claims must identify their dataset, environment, and scope.
- Deployment images/artifacts must be versioned and immutable at promotion time.
- Rollback must be possible without rewriting Git history.

## Evidence boundary

"Production-oriented" describes the engineering and release contract of this repository. It does **not** mean that an external enterprise deployment, penetration test, certification, uptime history, or scale target has occurred unless a separate committed artifact proves it.

## Change management

Main is the supported integration branch. Production changes should be small, reviewable, tested, and tied to observable behavior. Historical benchmark/research material may remain for evidence, but active README, security, runbook, and deployment surfaces must describe the supported runtime rather than an academic or prototype status.

## Health-gated promotion and rollback

1. Build a candidate deployment without replacing the known-good deployment.
2. Require `GET /api/health` to return HTTP 200 and `GET /api/ready` to return HTTP 200 before promotion.
3. Run the repository security contract, lint, type check, dependency audit, and production build against the candidate revision.
4. Promote traffic only after those checks pass. Keep the previous deployment addressable and unchanged during the validation window.
5. If readiness fails or sustained application errors appear after promotion, route traffic back to the previous known-good deployment.
6. Do not roll back persistent-data changes unless a separately tested rollback/migration path exists.

External alert delivery is deployment-specific. This repository does not claim a configured monitoring provider; platform-level alerting for sustained 5xx/readiness failures remains an external operational requirement.
