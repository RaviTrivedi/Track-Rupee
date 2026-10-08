const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'foundation-test-access-only-not-for-production-123456789';
process.env.JWT_REFRESH_SECRET = 'foundation-test-refresh-only-not-for-production-123456789';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/trackrupee_test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
const { app } = require('../dist/app');
const { errorHandler } = require('../dist/middleware/error-handler');
const { asyncHandler } = require('../dist/utils/async-handler');
const { AppError } = require('../dist/utils/app-error');
const express = require('express');

async function serve(application, run) {
  const server = application.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
}

test('health, security headers, CORS, 404, and body parsing', async () => {
  await serve(app, async (base) => {
    const health = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('x-powered-by'), null);
    const body = await health.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
    assert.ok(Number.isFinite(Date.parse(body.data.timestamp)));

    const denied = await fetch(`${base}/health`, { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    const preflight = await fetch(`${base}/health`, {
      method: 'OPTIONS', headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'GET' },
    });
    assert.equal(preflight.status, 204);

    const missing = await fetch(`${base}/missing`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { success: false, message: 'Route not found.', data: null });
    const malformed = await fetch(`${base}/health`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).message, 'Invalid JSON body.');
    const large = await fetch(`${base}/health`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify('x'.repeat(110_000)),
    });
    assert.equal(large.status, 413);
  });
});

test('async failures reach the handler and unexpected details stay private', async () => {
  const isolated = express();
  isolated.get('/expected', asyncHandler(async () => { throw new AppError('Invalid amount.', 400); }));
  isolated.get('/unexpected', asyncHandler(async () => { throw new Error('secret detail'); }));
  isolated.use(errorHandler);
  await serve(isolated, async (base) => {
    const expected = await fetch(`${base}/expected`);
    assert.equal(expected.status, 400);
    assert.equal((await expected.json()).message, 'Invalid amount.');
    const unexpected = await fetch(`${base}/unexpected`);
    assert.equal(unexpected.status, 500);
    assert.deepEqual(await unexpected.json(), { success: false, message: 'Internal server error.', data: null });
  });
});

test('invalid configuration fails before startup', () => {
  for (const overrides of [{ PORT: 'abc' }, { PORT: '65536' }, { NODE_ENV: 'invalid' }, { CORS_ORIGINS: '*' }]) {
    const result = spawnSync(process.execPath, ['-e', "require('./dist/config')"], {
      cwd: require('node:path').resolve(__dirname, '..'),
      env: { ...process.env, ...overrides }, encoding: 'utf8',
    });
    assert.equal(result.status, 1, result.stderr);
  }
});
