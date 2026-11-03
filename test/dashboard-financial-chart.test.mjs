import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinancialTrajectory } from '../lib/dashboard/calculations.ts';

test('buildFinancialTrajectory combines historical actual flows, current wealth balances, and future projections', () => {
  const trajectory = buildFinancialTrajectory(
    '2026-11',
    [
      { period: '2026-11', income: 1200, expenses: 400, net: 800, incomeDetails: [], expenseDetails: [] },
      { period: '2026-12', income: 1000, expenses: 600, net: 400, incomeDetails: [], expenseDetails: [] },
      { period: '2027-01', income: 800, expenses: 900, net: -100, incomeDetails: [], expenseDetails: [] },
    ],
    [
      { type: 'INCOME', amount: 2000, currency: 'PEN', transactionDate: '2026-10-15', isInstallment: false },
      { type: 'EXPENSE', amount: 500, currency: 'PEN', transactionDate: '2026-10-20', isInstallment: false },
      { type: 'REFUND', amount: 50, currency: 'PEN', transactionDate: '2026-10-22', isInstallment: false },
      { type: 'INCOME', amount: 300, currency: 'PEN', transactionDate: '2026-11-02', isInstallment: false },
      { type: 'EXPENSE', amount: 120, currency: 'PEN', transactionDate: '2026-11-03', isInstallment: false },
    ],
    [
      { startPeriod: '2026-10', totalInstallments: 3, monthlyTotal: 100, currency: 'PEN' },
    ],
    3.75,
    5000.5,
    1500.25
  );

  assert.deepStrictEqual(trajectory.map((point) => point.period), [
    '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01',
  ]);

  // Historical month with transactions (2026-10)
  const oct = trajectory.find((p) => p.period === '2026-10');
  assert.deepStrictEqual(oct, {
    period: '2026-10',
    actualIncome: 2000,
    actualExpenses: 550, // 500 direct + 100 installment - 50 refund
    actualNet: 1450,
    actualNetWorth: null,
    actualLiquidity: null,
    projectedIncome: null,
    projectedExpenses: null,
    projectedNet: null,
    projectedNetWorth: null,
    projectedLiquidity: null,
  });

  // Current month (2026-11)
  const nov = trajectory.find((p) => p.period === '2026-11');
  assert.deepStrictEqual(nov, {
    period: '2026-11',
    actualIncome: 300,
    actualExpenses: 220, // 120 direct + 100 installment
    actualNet: 80,
    actualNetWorth: 5000.5,
    actualLiquidity: 1500.25,
    projectedIncome: 1200,
    projectedExpenses: 400,
    projectedNet: 800,
    projectedNetWorth: 5800.5, // 5000.5 + 800 net projection
    projectedLiquidity: 2300.25, // 1500.25 + 800 net projection
  });

  // Future month 1 (2026-12)
  const dec = trajectory.find((p) => p.period === '2026-12');
  assert.deepStrictEqual(dec, {
    period: '2026-12',
    actualIncome: null,
    actualExpenses: null,
    actualNet: null,
    actualNetWorth: null,
    actualLiquidity: null,
    projectedIncome: 1000,
    projectedExpenses: 600,
    projectedNet: 400,
    projectedNetWorth: 6200.5, // 5800.5 + 400
    projectedLiquidity: 2700.25, // 2300.25 + 400
  });

  // Future month 2 across year boundary with deficit (2027-01)
  const jan = trajectory.find((p) => p.period === '2027-01');
  assert.deepStrictEqual(jan, {
    period: '2027-01',
    actualIncome: null,
    actualExpenses: null,
    actualNet: null,
    actualNetWorth: null,
    actualLiquidity: null,
    projectedIncome: 800,
    projectedExpenses: 900,
    projectedNet: -100,
    projectedNetWorth: 6100.5, // 6200.5 - 100
    projectedLiquidity: 2600.25, // 2700.25 - 100
  });
});

test('buildFinancialTrajectory handles empty projections gracefully', () => {
  const trajectory = buildFinancialTrajectory(
    '2026-03',
    [],
    [],
    [],
    null,
    2500,
    800
  );

  assert.strictEqual(trajectory.length, 7); // 6 past months + current month
  const current = trajectory.find((p) => p.period === '2026-03');
  assert.deepStrictEqual(current, {
    period: '2026-03',
    actualIncome: 0,
    actualExpenses: 0,
    actualNet: 0,
    actualNetWorth: 2500,
    actualLiquidity: 800,
    projectedIncome: null,
    projectedExpenses: null,
    projectedNet: null,
    projectedNetWorth: null,
    projectedLiquidity: null,
  });

  const past = trajectory.find((p) => p.period === '2025-09');
  assert.deepStrictEqual(past, {
    period: '2025-09',
    actualIncome: 0,
    actualExpenses: 0,
    actualNet: 0,
    actualNetWorth: null,
    actualLiquidity: null,
    projectedIncome: null,
    projectedExpenses: null,
    projectedNet: null,
    projectedNetWorth: null,
    projectedLiquidity: null,
  });
});

test('buildFinancialTrajectory supports negative initial balances and deficit trajectories', () => {
  const trajectory = buildFinancialTrajectory(
    '2026-01',
    [
      { period: '2026-01', income: 100, expenses: 300, net: -200, incomeDetails: [], expenseDetails: [] },
      { period: '2026-02', income: 0, expenses: 150, net: -150, incomeDetails: [], expenseDetails: [] },
    ],
    [],
    [],
    3.8,
    -1000,
    -500
  );

  const jan = trajectory.find((p) => p.period === '2026-01');
  assert.strictEqual(jan.actualNetWorth, -1000);
  assert.strictEqual(jan.actualLiquidity, -500);
  assert.strictEqual(jan.projectedNetWorth, -1200);
  assert.strictEqual(jan.projectedLiquidity, -700);

  const feb = trajectory.find((p) => p.period === '2026-02');
  assert.strictEqual(feb.actualNetWorth, null);
  assert.strictEqual(feb.actualLiquidity, null);
  assert.strictEqual(feb.projectedNetWorth, -1350);
  assert.strictEqual(feb.projectedLiquidity, -850);
});
