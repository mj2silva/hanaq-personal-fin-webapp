import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectionComparison } from '../lib/dashboard/calculations.ts';

test('buildProjectionComparison combines recent actuals with current projections', () => {
  const comparison = buildProjectionComparison(
    '2026-01',
    [
      { period: '2026-01', income: 1200, expenses: 400, net: 800, incomeDetails: [], expenseDetails: [] },
      { period: '2026-02', income: 900, expenses: 500, net: 400, incomeDetails: [], expenseDetails: [] },
    ],
    [
      { type: 'INCOME', amount: 1000, currency: 'PEN', transactionDate: '2025-12-05', isInstallment: false },
      { type: 'EXPENSE', amount: 200, currency: 'PEN', transactionDate: '2025-12-10', isInstallment: false },
      { type: 'REFUND', amount: 25, currency: 'PEN', transactionDate: '2025-12-12', isInstallment: false },
      { type: 'INCOME', amount: 300, currency: 'PEN', transactionDate: '2026-01-03', isInstallment: false },
      { type: 'EXPENSE', amount: 80, currency: 'PEN', transactionDate: '2026-01-04', isInstallment: false },
    ],
    [{ startPeriod: '2025-12', totalInstallments: 2, monthlyTotal: 50, currency: 'PEN' }],
    3.75
  );

  assert.deepStrictEqual(comparison.map(({ period }) => period), [
    '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02',
  ]);
  assert.deepStrictEqual(comparison[5], {
    period: '2025-12',
    actualIncome: 1000,
    actualExpenses: 225,
    actualNet: 775,
    projectedIncome: null,
    projectedExpenses: null,
    projectedNet: null,
  });
  assert.deepStrictEqual(comparison[6], {
    period: '2026-01',
    actualIncome: 300,
    actualExpenses: 130,
    actualNet: 170,
    projectedIncome: 1200,
    projectedExpenses: 400,
    projectedNet: 800,
  });
  assert.deepStrictEqual(comparison[7], {
    period: '2026-02',
    actualIncome: null,
    actualExpenses: null,
    actualNet: null,
    projectedIncome: 900,
    projectedExpenses: 500,
    projectedNet: 400,
  });
});

test('buildProjectionComparison returns zero actuals and no forecast where data is absent', () => {
  const comparison = buildProjectionComparison('2026-01', [], [], [], 3.75);

  assert.strictEqual(comparison.length, 7);
  assert.deepStrictEqual(comparison[0], {
    period: '2025-07',
    actualIncome: 0,
    actualExpenses: 0,
    actualNet: 0,
    projectedIncome: null,
    projectedExpenses: null,
    projectedNet: null,
  });
});