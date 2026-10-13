import test from 'node:test';
import assert from 'node:assert/strict';
import { readApiObject, textField, booleanField, jobLimit, resumeMode } from '../lib/api-input.ts';

const request = (body, headers = {}) => new Request('http://localhost/test', {
  method: 'POST', body, headers,
});

test('bounded reader accepts objects and rejects malformed or non-object JSON', async () => {
  assert.deepEqual(await readApiObject(request('{"resume":"hello"}')), { resume: 'hello' });
  for (const body of ['{bad', 'null', '[]', '42', '"string"']) {
    await assert.rejects(readApiObject(request(body)), error => error.status === 400);
  }
});

test('body size is enforced with absent, invalid, misleading and excessive Content-Length', async () => {
  const large = JSON.stringify({ resume: 'x'.repeat(1024 * 1024) });
  for (const headers of [{}, { 'content-length': '1' }, { 'content-length': String(large.length) }]) {
    await assert.rejects(readApiObject(request(large, headers)), error => error.status === 413);
  }
  await assert.rejects(readApiObject(request('{}', { 'content-length': '-1' })), error => error.status === 400);
});

test('text and sponsorship fields preserve types and reject coercion', () => {
  assert.equal(textField({ resume: ' ok ' }, 'resume'), 'ok');
  assert.equal(textField({}, 'resume'), '');
  assert.equal(booleanField({ needsSponsorship: false }, 'needsSponsorship'), false);
  assert.equal(booleanField({ needsSponsorship: true }, 'needsSponsorship'), true);
  for (const value of [null, 42, [], {}]) {
    assert.throws(() => textField({ resume: value }, 'resume'), error => error.status === 400);
  }
  for (const value of ['false', 1, null, [], {}]) {
    assert.throws(() => booleanField({ needsSponsorship: value }, 'needsSponsorship'), error => error.status === 400);
  }
  assert.throws(() => textField({ resume: 'x'.repeat(50001) }, 'resume'), error => error.status === 413);
});

test('job caps and resume modes reject invalid enums and numeric values', () => {
  assert.equal(jobLimit({}), 100);
  assert.equal(jobLimit({ maxJobs: 500 }), 500);
  for (const value of ['bad', '100', null, 0, -1, 501, 1.5, NaN]) {
    assert.throws(() => jobLimit({ maxJobs: value }), error => error.status === 400);
  }
  assert.equal(resumeMode({}), 'balanced');
  for (const mode of ['balanced', 'ats', 'concise', 'impact']) assert.equal(resumeMode({ mode }), mode);
  for (const mode of ['unknown', 1, null]) assert.throws(() => resumeMode({ mode }), error => error.status === 400);
});
