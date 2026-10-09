# Verification status — October 9, 2026

PR #32 pinned checkout and setup-node to immutable commits and disabled checkout credential persistence. PR #34 added package-lock.json and replaced npm install in CI with npm ci, so the current dependency installation is now lockfile-based.

A Windows checkout ran npm ci --ignore-scripts --no-audit --no-fund; npm run typecheck; npm run build, all successfully. Vercel preview deployment succeeded. Neither is proof of a green GitHub Actions workflow.

GitHub Actions repository permissions endpoint returned enabled=false on October 9, 2026. Therefore the checked-in CI workflow is configuration only, not a recent hosted execution. Enabling it requires an explicit settings change.

The README mixes prototype functions and planned features. Do not treat job-board ingestion, visa sponsorship percentages, role-success estimates, resume scoring or PDF outputs as independently calibrated or validated by real employers. Application status changes require user confirmation; no automated applications are established.

Reproduce: npm ci --no-audit --no-fund; npm run typecheck; npm run build. Future improvement: automated API/browser tests and a production health smoke test.