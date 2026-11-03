import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLoanPayment } from '../lib/activity/calculations.ts';

test('loan payments use the equivalent monthly rate on the outstanding principal', () => {
  assert.deepEqual(calculateLoanPayment(1000, 12.682503, 110), { interest: 10, principal: 100, remaining: 900 });
  assert.deepEqual(calculateLoanPayment(1000, 0, 100), { interest: 0, principal: 100, remaining: 900 });
  assert.deepEqual(calculateLoanPayment(1000, 12.682503, 5), { interest: 10, principal: -5, remaining: 1005 });
});

test('bank example uses TEA or a manually entered interest', () => {
  assert.deepEqual(calculateLoanPayment(19240.05, 9.49, 424.16), { interest: 145.91, principal: 278.25, remaining: 18961.8 });
  assert.deepEqual(calculateLoanPayment(19240.05, 9.49, 424.16, 140), { interest: 140, principal: 284.16, remaining: 18955.89 });
  assert.equal(calculateLoanPayment(1000, 12.682503, 100, 0).interest, 0);
});