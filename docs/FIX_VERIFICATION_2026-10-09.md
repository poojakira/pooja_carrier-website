# Carrier maintenance verification, October 9, 2026

Base source: `2a8c0e6774c9e01afed069c03c1c10c6b45d3584`, plus the maintenance patch accompanying this document.

The README now separates implemented employer-board adapters and PDF route from planned authentication, encrypted storage, and model-backed drafting. It identifies sponsorship and role-chance percentages as heuristic indicators rather than calibrated employer-selection probabilities. TypeScript incremental build files are ignored.

Local checks passed with Node.js 24.19.0 and npm 11.9.0: `npm ci --ignore-scripts --no-audit --no-fund`, `npm run typecheck`, `NEXT_TELEMETRY_DISABLED=1 npm run build` (Next.js 15.5.27), and `git diff --check`. The build generated the landing/workspace pages and compiled six API routes. No API route was invoked and no job application, message, or deployment was sent.

CI declares Node.js 22; these local Node.js 24 checks do not establish a hosted Node.js 22 run. The previously recorded disabled Actions setting is a separate limitation. The adapter implementations were inspected, but live providers, response handling, browser workflows, PDF output, and scoring calibration were not dynamically verified here. Cerberus configuration and operational state were not accessed or modified.
