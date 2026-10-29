import { convertAmount, roundMoney, type Currency } from '@/lib/activity/calculations';

export interface BudgetUsageInput {
  id: string;
  type: string;
  amount: number;
  currency: Currency;
  categoryId: string | null;
  transactionDate: string;
  isInstallment: boolean;
  parentTransactionId: string | null;
  sharedSplitId: string | null;
}

export interface InstallmentUsageInput {
  transactionId: string;
  categoryId: string | null;
  startPeriod: string;
  totalInstallments: number;
  monthlyTotal: number;
  currency: Currency;
}

export interface SharedRepaymentInput {
  amount: number;
  currency: Currency;
  splitId: string | null;
  transactionDate: string;
  categoryId: string | null;
}

export interface FixedExpenseUsageInput {
  transactionId: string | null;
  categoryId: string;
  amount: number;
  currency: Currency;
  period: string;
}

export function isInstallmentActive(period: string, startPeriod: string, totalInstallments: number): boolean {
  const [year, month] = startPeriod.split('-').map(Number);
  const [targetYear, targetMonth] = period.split('-').map(Number);
  const offset = (targetYear - year) * 12 + targetMonth - month;
  return offset >= 0 && offset < totalInstallments;
}

export function calculateBudgetUsage(
  categoryId: string,
  period: string,
  transactions: BudgetUsageInput[],
  installments: InstallmentUsageInput[],
  sharedRepayments: SharedRepaymentInput[],
  rate: number | null,
  fixedExpenses: FixedExpenseUsageInput[] = []
): number {
  const toPen = (amount: number, currency: Currency) => convertAmount(amount, currency, 'PEN', rate);
  const fixedTransactionIds = new Set(
    fixedExpenses
      .map((expense) => expense.transactionId)
      .filter((id): id is string => id !== null)
  );
  const direct = transactions
    .filter((transaction) =>
      transaction.categoryId === categoryId &&
      transaction.type === 'EXPENSE' &&
      !transaction.isInstallment &&
      !fixedTransactionIds.has(transaction.id) &&
      transaction.transactionDate.slice(0, 7) === period
    )
    .reduce((sum, transaction) => sum + toPen(transaction.amount, transaction.currency), 0);
  const fixed = fixedExpenses
    .filter((expense) => expense.categoryId === categoryId && expense.period === period)
    .reduce((sum, expense) => sum + toPen(expense.amount, expense.currency), 0);
  const installmentTotal = installments
    .filter((plan) =>
      plan.categoryId === categoryId &&
      isInstallmentActive(period, plan.startPeriod, plan.totalInstallments)
    )
    .reduce((sum, plan) => sum + toPen(plan.monthlyTotal, plan.currency), 0);
  const refunds = transactions
    .filter((transaction) =>
      transaction.type === 'REFUND' &&
      transaction.parentTransactionId &&
      transaction.transactionDate.slice(0, 7) === period
    )
    .reduce((sum, transaction) => sum + toPen(transaction.amount, transaction.currency), 0);
  const repayments = sharedRepayments
    .filter((repayment) => repayment.categoryId === categoryId && repayment.transactionDate.slice(0, 7) === period)
    .reduce((sum, repayment) => sum + toPen(repayment.amount, repayment.currency), 0);

  return Math.max(0, roundMoney(direct + fixed + installmentTotal - refunds - repayments));
}
