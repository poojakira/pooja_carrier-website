# Verification status — October 9, 2026

PR #32 pinned checkout and setup-node to immutable commits, disabled checkout credential persistence and retained npm install because the repository has no package-lock.json. Consequently dependency installation is not reproducible through npm ci.

A Windows checkout ran npm install --ignore-scripts --no-audit --no-fund; npm run typecheck; npm run build, all successfully. Vercel preview deployment succeeded. Neither is proof of a green GitHub Actions workflow.

GitHub Actions repository permissions endpoint returned enabled=false on October 9, 2026. Therefore the checked-in CI workflow is configuration only, not a recent hosted execution. Enabling it requires an explicit settings change.

The README mixes prototype functions and planned features. Do not treat job-board ingestion, visa sponsorship percentages, role-success estimates, resume scoring or PDF outputs as independently calibrated or validated by real employers. Application status changes require user confirmation; no automated applications are established.

Reproduce: npm install --no-audit --no-fund; npm run typecheck; npm run build. Future improvement: add a committed lockfile and automated API/browser tests.