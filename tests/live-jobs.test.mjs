import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as engine from '../lib/engine.ts';
import { fetchATSJson } from '../lib/ats-fetch.ts';

function loadModule() {
  const source = ts.transpileModule(fs.readFileSync(new URL('../lib/live-jobs.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => {
    if (name === '@/lib/engine') return engine;
    if (name === '@/lib/ats-fetch') return { fetchATSJson };
    throw new Error('Unexpected dependency: ' + name);
  }, module, module.exports);
  return module.exports;
}

const resume = 'Security Engineer with Python and API security testing experience. '.repeat(3);

test('provider integration preserves results and cancels timer resources', async t => {
  const originalSet = globalThis.setTimeout;
  const originalClear = globalThis.clearTimeout;
  const timers = new Set();
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => { const handle = originalSet(fn, ms); timers.add(handle); return handle; });
  t.mock.method(globalThis, 'clearTimeout', handle => { timers.delete(handle); originalClear(handle); });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++;
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify({ jobs: [{ id: 1, title: 'Security Engineer',
      absolute_url: 'https://job-boards.greenhouse.io/example/jobs/1',
      content: 'Build Python API security tooling.', location: { name: 'Phoenix, AZ' } }] }));
  });
  const jobs = await loadModule().loadLiveJobs('https://boards.greenhouse.io/example', resume, false, 20, 'Security Engineer');
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, 'Security Engineer');
  assert.equal(jobs[0].source, 'greenhouse');
  assert.equal(calls, 1);
  assert.equal(timers.size, 0);
});

test('non-HTTPS and embedded credential input is rejected before provider fetch', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('unexpected fetch'); });
  for (const source of ['ftp://boards.greenhouse.io/example', 'https://user:secret@boards.greenhouse.io/example',
    'https://boards.greenhouse.io:444/example']) {
    await assert.rejects(loadModule().loadLiveJobs(source, resume, false), /HTTPS employer/);
  }
  assert.equal(calls, 0);
});

test('aggregate 60-second deadline aborts multi-request Workday detail work', async t => {
  let deadline;
  const timers = new Set();
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => {
    const handle = Symbol(); timers.add(handle);
    if (ms === 60000) deadline = fn;
    return handle;
  });
  t.mock.method(globalThis, 'clearTimeout', handle => { timers.delete(handle); });
  let detailStarted;
  const ready = new Promise(resolve => { detailStarted = resolve; });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options.signal.aborted) throw new Error('aborted');
    if (url.endsWith('/jobs')) return new Response(JSON.stringify({ total: 2, jobPostings: [
      { title: 'Security Engineer', externalPath: '/job/one' },
      { title: 'Security Engineer', externalPath: '/job/two' },
    ] }));
    detailStarted();
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  });
  const pending = loadModule().loadLiveJobs('https://example.wd1.myworkdayjobs.com/careers', resume, false, 20);
  await ready;
  deadline();
  await assert.rejects(pending, /cancelled or deadline exceeded/);
  assert.equal(timers.size, 0);
});

test('caller cancellation terminates pending board fetch', async t => {
  const controller = new AbortController();
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    started();
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }));
  });
  const pending = loadModule().loadLiveJobs('https://boards.greenhouse.io/example', resume, false, 20, '', controller.signal);
  await ready;
  controller.abort();
  await assert.rejects(pending, /cancelled/);
});
