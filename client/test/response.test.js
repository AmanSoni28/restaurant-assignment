import assert from 'node:assert/strict';
import test from 'node:test';
import { expectArrayResponse } from '../src/api/response.js';

test('accepts list API responses', () => {
  const items = [{ id: 'item-1' }];
  assert.equal(expectArrayResponse(items, '/api/tables'), items);
});

test('reports non-list API responses with deployment guidance', () => {
  assert.throws(
    () => expectArrayResponse('<!doctype html><html></html>', '/api/tables'),
    /Expected a list from \/api\/tables, but received string.*VITE_API_URL/
  );
});
