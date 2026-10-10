import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTotals, validateDiscount } from '../src/utils/billing.js';

const items = [
  { price: 240, qty: 2 }, // 480
  { price: 50, qty: 3 }, // 150
];

test('calculates subtotal, tax and total without discount', () => {
  const t = calculateTotals(items, { taxRate: 5 });
  assert.equal(t.subtotal, 630);
  assert.equal(t.discountAmount, 0);
  assert.equal(t.taxAmount, 31.5);
  assert.equal(t.total, 661.5);
});

test('applies percentage discount before tax', () => {
  const t = calculateTotals(items, { discountType: 'PERCENT', discountValue: 10, taxRate: 5 });
  assert.equal(t.discountAmount, 63);
  assert.equal(t.taxableAmount, 567);
  assert.equal(t.taxAmount, 28.35);
  assert.equal(t.total, 595.35);
});

test('applies flat discount and never goes below zero', () => {
  const t = calculateTotals(items, { discountType: 'FLAT', discountValue: 1000, taxRate: 5 });
  assert.equal(t.discountAmount, 630);
  assert.equal(t.total, 0);
});

test('rounds to 2 decimal places', () => {
  const t = calculateTotals([{ price: 33.33, qty: 3 }], { taxRate: 5 });
  assert.equal(t.subtotal, 99.99);
  assert.equal(t.taxAmount, 5);
  assert.equal(t.total, 104.99);
});

test('empty order totals to zero', () => {
  const t = calculateTotals([], { taxRate: 5 });
  assert.deepEqual(t, { subtotal: 0, discountAmount: 0, taxableAmount: 0, taxAmount: 0, total: 0 });
});

test('validates discount input', () => {
  assert.equal(validateDiscount('PERCENT', 10), null);
  assert.equal(validateDiscount('FLAT', 50), null);
  assert.ok(validateDiscount('PERCENT', 120));
  assert.ok(validateDiscount('FLAT', -5));
  assert.ok(validateDiscount('OTHER', 5));
  assert.ok(validateDiscount('FLAT', NaN));
});
