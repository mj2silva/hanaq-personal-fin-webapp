import { roundMoney } from '../activity/calculations.ts';
import { calculateMonthTotals } from '../dashboard/calculations.ts';
import { calculateBudgetUsage, isInstallmentActive, type BudgetUsageInput, type FixedExpenseUsageInput, type InstallmentUsageInput, type SharedRepaymentInput } from '../month/calculations.ts';

export interface HistoryBudget {
  categoryId: string;
  period: string;
  amountPen: number;
}

export interface HistoryInput {
  transactions: BudgetUsageInput[];
  installments: InstallmentUsageInput[];
  repayments: SharedRepaymentInput[];
  fixedExpenses: FixedExpenseUsageInput[];
  budgets: HistoryBudget[];
  rate: number | null;
}

export interface HistoryCategory {
  categoryId: string | null;
  budget: number;
  usage: number;
}

export interface HistoryMonth {
  period: string;
  income: number;
  expenses: number;
  net: number;
  categories: HistoryCategory[];
}

export interface HistoryYear {
  months: HistoryMonth[];
  income: number;
  expenses: number;
  net: number;
  categories: HistoryCategory[];
}

export function calculateHistoryMonth(period: string, input: HistoryInput): HistoryMonth {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('El periodo no es válido.');
  const byId = new Map(input.transactions.map((transaction) => [transaction.id, transaction]));
  const transactions = input.transactions.map((transaction) => ({
    ...transaction,
    categoryId: transaction.type === 'REFUND' && transaction.parentTransactionId
      ? byId.get(transaction.parentTransactionId)?.categoryId ?? transaction.categoryId
      : transaction.categoryId,
  }));
  const fixedIds = new Set(input.fixedExpenses.flatMap((expense) => expense.transactionId ? [expense.transactionId] : []));
  const totals = calculateMonthTotals(period, [
    ...transactions.filter((transaction) => !fixedIds.has(transaction.id)),
    ...input.fixedExpenses.map((expense) => ({ type: 'EXPENSE', amount: expense.amount, currency: expense.currency, transactionDate: `${expense.period}-01`, isInstallment: false })),
  ], input.installments, input.rate);
  const categoryIds = new Set<string | null>();
  input.budgets.filter((budget) => budget.period === period).forEach((budget) => categoryIds.add(budget.categoryId));
  transactions.filter((transaction) => transaction.type === 'EXPENSE' && !transaction.isInstallment && !fixedIds.has(transaction.id) && transaction.transactionDate.slice(0, 7) === period).forEach((transaction) => categoryIds.add(transaction.categoryId));
  input.installments.filter((plan) => isInstallmentActive(period, plan.startPeriod, plan.totalInstallments)).forEach((plan) => categoryIds.add(plan.categoryId));
  input.fixedExpenses.filter((expense) => expense.period === period).forEach((expense) => categoryIds.add(expense.categoryId));
  const categories = [...categoryIds].map((categoryId) => ({
    categoryId,
    budget: roundMoney(input.budgets.filter((budget) => budget.period === period && budget.categoryId === categoryId).reduce((sum, budget) => sum + budget.amountPen, 0)),
    usage: calculateBudgetUsage(categoryId, period, transactions, input.installments, input.repayments, input.rate, input.fixedExpenses),
  }));
  return { period, ...totals, categories };
}

export function calculateHistoryYear(throughPeriod: string, input: HistoryInput): HistoryYear {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(throughPeriod)) throw new Error('El periodo no es válido.');
  const [year, lastMonth] = throughPeriod.split('-');
  const months = Array.from({ length: Number(lastMonth) }, (_, index) => calculateHistoryMonth(`${year}-${String(index + 1).padStart(2, '0')}`, input));
  const categories = new Map<string | null, HistoryCategory>();
  for (const month of months) {
    for (const category of month.categories) {
      const current = categories.get(category.categoryId) ?? { categoryId: category.categoryId, budget: 0, usage: 0 };
      current.budget = roundMoney(current.budget + category.budget);
      current.usage = roundMoney(current.usage + category.usage);
      categories.set(category.categoryId, current);
    }
  }
  return {
    months,
    income: roundMoney(months.reduce((sum, month) => sum + month.income, 0)),
    expenses: roundMoney(months.reduce((sum, month) => sum + month.expenses, 0)),
    net: roundMoney(months.reduce((sum, month) => sum + month.net, 0)),
    categories: [...categories.values()],
  };
}