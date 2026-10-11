import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

process.env.CLIENT_ORIGIN = 'http://localhost:5180';
const { default: app } = await import('../src/app.js');

test('API CORS accepts the configured origin and handles preflight requests', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/orders`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5180',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5180');
  assert.match(response.headers.get('access-control-allow-methods'), /POST/);
  assert.equal(response.headers.get('access-control-allow-headers'), 'content-type');
});

test('API CORS does not allow unconfigured origins', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/orders`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://untrusted.example',
      'Access-Control-Request-Method': 'GET',
    },
  });

  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
