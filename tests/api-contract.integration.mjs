import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { once } from 'node:events';

const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3123'], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});
let checks = 0;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timed out')), 15000);
    child.once('exit', code => { clearTimeout(timer); reject(new Error('server exit ' + code)); });
    const ready = chunk => {
      if (String(chunk).includes('Ready')) { clearTimeout(timer); resolve(); }
    };
    child.stdout.on('data', ready);
    child.stderr.on('data', ready);
  });
  const post = (route, body) => fetch('http://127.0.0.1:3123/api/' + route, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  for (const route of ['evaluate', 'ats-recheck', 'tweak-resume', 'live-jobs', 'resume-pdf']) {
    for (const body of [null, [], { resume: 42, sourceResume: 42 }]) {
      const response = await post(route, body);
      assert.equal(response.status, 400, route + ' invalid input'); checks++;
    }
    const response = await post(route, { resume: 'x'.repeat(1024 * 1024) });
    assert.equal(response.status, 413, route + ' oversized stream'); checks++;
  }
  const resume = 'Security Engineer with Python, cloud IAM security, pytest, API threat modeling and testing experience. '.repeat(3);
  const jd = 'Security Engineer required to build Python tools, perform API security testing and review cloud IAM policies. '.repeat(3);
  assert.equal((await post('evaluate', { resume, jd })).status, 200); checks++;
  assert.equal((await post('evaluate', { resume, jd, needsSponsorship: 'false' })).status, 400); checks++;
  assert.equal((await post('tweak-resume', { resume, jd, mode: 'unknown' })).status, 400); checks++;
  assert.equal((await post('tweak-resume', { resume, jd, mode: 'balanced' })).status, 200); checks++;
  assert.equal((await post('ats-recheck', { sourceResume: resume, tailoredResume: resume, jd })).status, 200); checks++;
  assert.equal((await post('live-jobs', { source: 'https://boards.greenhouse.io/example', resume, maxJobs: 'bad' })).status, 400); checks++;
  console.log(checks + ' API contract checks passed against the production build');
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    // Register before killing, and only wait while the process is still alive.
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
}
