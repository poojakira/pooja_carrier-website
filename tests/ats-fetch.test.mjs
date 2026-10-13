import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchATSJson } from '../lib/ats-fetch.ts';

const endpoint = 'https://boards-api.greenhouse.io/v1/boards/example/jobs';
const max = 16 * 1024 * 1024;

test('valid JSON fetch preserves headers and forces redirect and abort policy', async t => {
  let options;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, endpoint); options = init;
    return new Response('{"jobs":[]}', { headers: { 'content-length': '11' } });
  });
  assert.deepEqual(await fetchATSJson(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }), { jobs: [] });
  assert.equal(options.redirect, 'error');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.headers.get('accept'), 'application/json');
  assert.equal(options.headers.get('content-type'), 'application/json');
  assert.equal(options.signal.aborted, true); // released after body parsing
});

test('arbitrary hosts, non-HTTPS, credentials and unexpected ports never reach fetch', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('must not fetch'); });
  for (const url of ['http://api.lever.co/v0/postings/example', 'https://127.0.0.1/',
    'https://api.lever.co.attacker.example/', 'https://user:password@api.lever.co/',
    'https://api.lever.co:444/', 'https://tenant.wd1.myworkdayjobs.com.attacker.example/']) {
    await assert.rejects(fetchATSJson(url), /Unsupported ATS destination/);
  }
  assert.equal(calls, 0);
});

test('non-success, redirect, malformed JSON and advertised oversize are rejected', async t => {
  for (const response of [new Response('', { status: 302, headers: { location: 'http://127.0.0.1/' } }),
    new Response('', { status: 500 }), new Response('not json'),
    new Response('{}', { headers: { 'content-length': String(max + 1) } }),
    new Response('{}', { headers: { 'content-length': '-1' } })]) {
    t.mock.method(globalThis, 'fetch', async () => response);
    await assert.rejects(fetchATSJson(endpoint));
  }
});

test('streamed response cap applies with absent or misleading content length and cancels body', async t => {
  for (const headers of [{}, { 'content-length': '2' }]) {
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(max)); controller.enqueue(new Uint8Array(1)); },
      cancel() { cancelled = true; },
    });
    t.mock.method(globalThis, 'fetch', async () => new Response(stream, { headers }));
    await assert.rejects(fetchATSJson(endpoint), /exceeds 16 MiB/);
    assert.equal(cancelled, true);
  }
});

test('deadline stays active through fetch and streamed body consumption', async t => {
  for (const stage of ['headers', 'body']) {
    let timeout;
    let cleared = false;
    t.mock.method(globalThis, 'setTimeout', (callback, milliseconds) => {
      assert.equal(milliseconds, 15000); timeout = callback; return 123;
    });
    t.mock.method(globalThis, 'clearTimeout', handle => { assert.equal(handle, 123); cleared = true; });
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      if (stage === 'headers') return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
      return new Response(new ReadableStream({ start(controller) {
        options.signal.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true });
      } }));
    });
    const pending = fetchATSJson(endpoint);
    await Promise.resolve(); await Promise.resolve();
    timeout();
    await assert.rejects(pending, /aborted/);
    assert.equal(cleared, true);
  }
});

test('caller cancellation reaches fetch signal', async t => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('caller cancelled')), { once: true });
  }));
  const pending = fetchATSJson(endpoint, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /caller cancelled/);
});


test('Headers and tuple headers retain content type and custom entries', async t => {
  for (const headers of [new Headers({ 'content-type': 'application/json', 'x-test': 'yes' }),
    [['content-type', 'application/json'], ['x-test', 'yes']]]) {
    t.mock.method(globalThis, 'fetch', async (url, init) => {
      assert.equal(init.headers.get('content-type'), 'application/json');
      assert.equal(init.headers.get('x-test'), 'yes');
      return new Response('{}');
    });
    assert.deepEqual(await fetchATSJson(endpoint, { headers }), {});
  }
});


test('malformed headers reject before creating timeout resources or fetching', async t => {
  let timers = 0;
  let calls = 0;
  t.mock.method(globalThis, 'setTimeout', () => { timers++; throw new Error('unexpected timer'); });
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('unexpected fetch'); });
  await assert.rejects(fetchATSJson(endpoint, { headers: { 'bad header': 'value' } }));
  assert.equal(timers, 0);
  assert.equal(calls, 0);
});
