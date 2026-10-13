import assert from "node:assert/strict";
import { test } from "node:test";

import { runAtsRobot } from "../lib/ats-robot.ts";
import { atsReadiness, evaluateRole } from "../lib/engine.ts";
import { tweakResume } from "../lib/tweaker.ts";

const resume = [
  "Security Engineer",
  "Experience",
  "- Built a Python IAM review tool with 25 rule checks in 2026.",
  "Education",
  "Master of Information Technology",
  "Skills",
  "Python, IAM, API security"
].join("\n");

test("explicit citizenship and no-sponsorship language blocks constrained candidates", () => {
  const job = "Security Engineer. US citizenship required. No visa sponsorship. Must use Python.";
  const result = evaluateRole(resume, job, true);
  assert.equal(result.verdict, "Do not apply");
  assert.equal(result.workAuth, "block");
  assert.equal(result.sponsorship.label, "Hard blocker");
});

test("posting-based sponsorship support never becomes an employer guarantee", () => {
  const job = "Security Engineer. We will sponsor employment visas. Python experience required.";
  const result = evaluateRole(resume, job, true);
  assert.equal(result.sponsorship.label, "Explicitly sponsors");
  assert.ok(result.sponsorship.reasons.length > 0);
  assert.match(result.roleChance.disclaimer, /not an observed recruiter probability/i);
});

test("missing sponsorship language remains a review requirement", () => {
  const result = evaluateRole(resume, "Security engineer role. Python required.", true);
  assert.equal(result.sponsorship.label, "Unclear");
  assert.equal(result.workAuth, "review");
});

test("ATS evidence gate blocks newly fabricated numerical achievements", () => {
  const tailored = resume + "\n- Increased enterprise revenue by 999% in 2026.";
  const result = runAtsRobot(resume, tailored, "Security Engineer. Python required.");
  assert.equal(result.pass, false);
  assert.equal(result.verdict, "BLOCKED");
  assert.ok(result.checks.some((check) => check.id === "evidence" && check.status === "block"));
});

test("resume rewriting preserves existing numerical evidence", () => {
  const result = tweakResume(resume, "Security Engineer. Python and IAM required.");
  assert.match(result.rewrittenResume, /25 rule checks/);
  assert.equal(result.integrityScore, 100);
});

test("readiness evaluation stays bounded and signals missing sections", () => {
  const result = atsReadiness("Experience\n- Wrote software");
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(result.fixes.some((fix) => /education/i.test(fix)));
});
