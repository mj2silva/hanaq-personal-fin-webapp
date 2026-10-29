import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateInstallmentPlan,
  convertAmount,
  derivedSharedStatus,
  resolveInstallmentStartPeriod,
  toTransactionTimestamp,
} from '../lib/activity/calculations.ts';

test('convertAmount', async (t) => {
  await t.test('keeps the amount when currencies match', () => {
    assert.strictEqual(convertAmount(100, 'PEN', 'PEN', null), 100);
  });

  await t.test('converts USD to PEN multiplying by the rate', () => {
    assert.strictEqual(convertAmount(100, 'USD', 'PEN', 3.75), 375);
  });

  await t.test('converts PEN to USD dividing by the rate', () => {
    assert.strictEqual(convertAmount(375, 'PEN', 'USD', 3.75), 100);
  });

  await t.test('requires an exchange rate for cross-currency operations', () => {
    assert.throws(() => convertAmount(100, 'USD', 'PEN', null), /tipo de cambio/);
    assert.throws(() => convertAmount(100, 'USD', 'PEN', 0), /tipo de cambio/);
  });
});

test('calculateInstallmentPlan', async (t) => {
  await t.test('zero interest splits the purchase evenly', () => {
    const plan = calculateInstallmentPlan(1200, 12, 0);
    assert.deepStrictEqual(plan, { monthlyPrincipal: 100, monthlyInterest: 0, monthlyTotal: 100 });
  });

  await t.test('with TEA the monthly total is higher than the principal share', () => {
    const plan = calculateInstallmentPlan(1200, 12, 40);
    assert.strictEqual(plan.monthlyPrincipal, 100);
    assert.ok(plan.monthlyInterest > 0);
    assert.strictEqual(plan.monthlyTotal, Math.round((plan.monthlyPrincipal + plan.monthlyInterest) * 100) / 100);
  });

  await t.test('matches the French amortization payment', () => {
    const plan = calculateInstallmentPlan(1000, 6, 24);
    const monthlyRate = Math.pow(1.24, 1 / 12) - 1;
    const expected = (1000 * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -6));
    assert.ok(Math.abs(plan.monthlyTotal - expected) < 0.02);
  });

  await t.test('rejects invalid inputs', () => {
    assert.throws(() => calculateInstallmentPlan(0, 6, 0));
    assert.throws(() => calculateInstallmentPlan(100, 1, 0));
    assert.throws(() => calculateInstallmentPlan(100, 6, -1));
  });
});

test('resolveInstallmentStartPeriod', async (t) => {
  await t.test('purchase on or before closing day bills this month', () => {
    assert.strictEqual(resolveInstallmentStartPeriod('2026-03-10', 15), '2026-03');
    assert.strictEqual(resolveInstallmentStartPeriod('2026-03-15', 15), '2026-03');
  });

  await t.test('purchase after closing day bills next month', () => {
    assert.strictEqual(resolveInstallmentStartPeriod('2026-03-16', 15), '2026-04');
  });

  await t.test('rolls over the year in December', () => {
    assert.strictEqual(resolveInstallmentStartPeriod('2026-12-28', 20), '2027-01');
  });

  await t.test('rejects malformed dates', () => {
    assert.throws(() => resolveInstallmentStartPeriod('10/03/2026', 15));
  });
});

test('transaction timestamp and shared status helpers', async (t) => {
  await t.test('builds a Lima noon timestamp', () => {
    assert.strictEqual(toTransactionTimestamp('2026-03-10'), '2026-03-10T12:00:00-05:00');
    assert.throws(() => toTransactionTimestamp('2026-3-10'));
  });

  await t.test('derives shared expense status', () => {
    assert.strictEqual(derivedSharedStatus(100, 0), 'PENDING');
    assert.strictEqual(derivedSharedStatus(100, 40), 'PARTIAL');
    assert.strictEqual(derivedSharedStatus(100, 100), 'PAID');
  });
});
