import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBudgetUsage } from '../lib/month/calculations.ts';
import { calculateHistoryMonth, calculateHistoryYear } from '../lib/history/calculations.ts';

test('refunds only reduce the category of the original expense', () => {
  const transactions = [
    { id: 'a', type: 'EXPENSE', amount: 100, currency: 'PEN', categoryId: 'food', transactionDate: '2026-01-01', isInstallment: false, parentTransactionId: null, sharedSplitId: null },
    { id: 'b', type: 'EXPENSE', amount: 80, currency: 'PEN', categoryId: 'rent', transactionDate: '2026-01-01', isInstallment: false, parentTransactionId: null, sharedSplitId: null },
    { id: 'r', type: 'REFUND', amount: 20, currency: 'PEN', categoryId: 'food', transactionDate: '2026-01-02', isInstallment: false, parentTransactionId: 'a', sharedSplitId: null },
  ];
  assert.equal(calculateBudgetUsage('food', '2026-01', transactions, [], [], null), 80);
  assert.equal(calculateBudgetUsage('rent', '2026-01', transactions, [], [], null), 80);
});

const transaction = (id, type, amount, categoryId, date, extra = {}) => ({
  id, type, amount, categoryId, transactionDate: date, currency: 'PEN', isInstallment: false,
  parentTransactionId: null, sharedSplitId: null, ...extra,
});

test('history aggregates installments, fixed payments, categories and annual totals', () => {
  const input = {
    transactions: [
      transaction('income', 'INCOME', 500, null, '2026-01-03'),
      transaction('fixed', 'EXPENSE', 50, 'rent', '2026-02-01'),
      transaction('food', 'EXPENSE', 100, 'food', '2026-01-04'),
      transaction('refund', 'REFUND', 20, 'wrong', '2026-01-05', { parentTransactionId: 'food' }),
      transaction('purchase', 'EXPENSE', 300, 'old', '2025-12-01', { isInstallment: true }),
    ],
    installments: [{ transactionId: 'purchase', categoryId: 'old', startPeriod: '2025-12', totalInstallments: 3, monthlyTotal: 10, currency: 'USD' }],
    fixedExpenses: [{ transactionId: 'fixed', categoryId: 'rent', amount: 50, currency: 'PEN', period: '2026-01' }],
    repayments: [{ categoryId: 'food', amount: 10, currency: 'PEN', transactionDate: '2026-01-06', splitId: 's' }],
    budgets: [{ categoryId: 'food', period: '2026-01', amountPen: 150 }, { categoryId: 'food', period: '2026-02', amountPen: 120 }],
    rate: 4,
  };
  const january = calculateHistoryMonth('2026-01', input);
  assert.deepEqual({ income: january.income, expenses: january.expenses, net: january.net }, { income: 500, expenses: 170, net: 330 });
  assert.deepEqual(january.categories.find((category) => category.categoryId === 'food'), { categoryId: 'food', budget: 150, usage: 70 });
  assert.deepEqual(january.categories.find((category) => category.categoryId === 'old'), { categoryId: 'old', budget: 0, usage: 40 });
  assert.equal(january.categories.find((category) => category.categoryId === 'rent').usage, 50);
  const year = calculateHistoryYear('2026-03', input);
  assert.equal(year.months.length, 3);
  assert.equal(year.expenses, 210);
  assert.equal(year.net, 290);
  assert.deepEqual(year.categories.find((category) => category.categoryId === 'food'), { categoryId: 'food', budget: 270, usage: 70 });
  assert.deepEqual(year.months[2].categories, []);
});

test('history requires conversion rate only for relevant USD amounts and validates periods', () => {
  const input = { transactions: [transaction('usd', 'EXPENSE', 10, null, '2024-01-01', { currency: 'USD' })], installments: [], fixedExpenses: [], repayments: [], budgets: [], rate: null };
  assert.throws(() => calculateHistoryMonth('2024-01', input), /tipo de cambio/);
  assert.equal(calculateHistoryMonth('2024-02', input).expenses, 0);
  assert.equal(calculateHistoryMonth('2024-01', { ...input, rate: 3.5 }).categories[0].usage, 35);
  assert.throws(() => calculateHistoryYear('2024-13', input), /periodo/);
});