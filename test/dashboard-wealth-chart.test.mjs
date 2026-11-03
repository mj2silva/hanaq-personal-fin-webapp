import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWealthProjection } from '../lib/dashboard/calculations.ts';

test('buildWealthProjection compares current balances with accumulated monthly projections', () => {
  const projection = buildWealthProjection('2026-11', [
    { period: '2026-11', income: 300, expenses: 174.88, net: 125.12, incomeDetails: [], expenseDetails: [] },
    { period: '2026-12', income: 50, expenses: 80.23, net: -30.23, incomeDetails: [], expenseDetails: [] },
    { period: '2027-01', income: 180, expenses: 100, net: 80, incomeDetails: [], expenseDetails: [] },
  ], 1000.125, 400.555);

  assert.deepStrictEqual(projection, [
    { period: '2026-11', actualNetWorth: 1000.13, actualLiquidity: 400.56, projectedNetWorth: 1125.25, projectedLiquidity: 525.68 },
    { period: '2026-12', actualNetWorth: null, actualLiquidity: null, projectedNetWorth: 1095.02, projectedLiquidity: 495.45 },
    { period: '2027-01', actualNetWorth: null, actualLiquidity: null, projectedNetWorth: 1175.02, projectedLiquidity: 575.45 },
  ]);
});

test('buildWealthProjection retains current balances and leaves forecast empty when there are no projections', () => {
  assert.deepStrictEqual(buildWealthProjection('2026-12', [], -250.444, 0), [
    { period: '2026-12', actualNetWorth: -250.44, actualLiquidity: 0, projectedNetWorth: null, projectedLiquidity: null },
  ]);
});
