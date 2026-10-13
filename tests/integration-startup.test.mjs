import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import { promisify } from 'node:util';
import test from 'node:test';

test('integration startup failure keeps the original error and exits promptly', { timeout: 10000 }, async () => {
  const occupied = net.createServer();
  occupied.listen(3123, '127.0.0.1');
  await once(occupied, 'listening');
  try {
    await assert.rejects(promisify(execFile)(process.execPath, ['tests/api-contract.integration.mjs'], {
      timeout: 5000, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    }), error => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /server exit 1/);
      assert.doesNotMatch(error.stderr, /unsettled top-level await/i);
      return true;
    });
  } finally {
    await new Promise((resolve, reject) => occupied.close(error => error ? reject(error) : resolve()));
  }
});
