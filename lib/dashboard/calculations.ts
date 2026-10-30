import { convertAmount, roundMoney, type Currency } from '@/lib/activity/calculations';

export interface DashboardTransaction {
  type: string;
  amount: number;
  currency: Currency;
  transactionDate: string;
  isInstallment: boolean;
}

export interface DashboardInstallment {
  startPeriod: string;
  totalInstallments: number;
  monthlyTotal: number;
  currency: Currency;
}

export interface ProjectionEvent {
  name: string;
  expectedPeriod: string;
  amount: number;
  currency: Currency;
  isRecurring: boolean;
  categoryType: 'INCOME' | 'EXPENSE' | null;
}

export interface ProjectionMonth {
  period: string;
  income: number;
  expenses: number;
  net: number;
  incomeDetails: ProjectionDetail[];
  expenseDetails: ProjectionDetail[];
}

export interface ProjectionDetail {
  label: string;
  amount: number;
}

export function calculateMonthTotals(
  period: string,
  transactions: DashboardTransaction[],
  installments: DashboardInstallment[],
  rate: number | null
) {
  const toPen = (amount: number, currency: Currency) => convertAmount(amount, currency, 'PEN', rate);
  const income = transactions
    .filter((transaction) => transaction.type === 'INCOME' && transaction.transactionDate.slice(0, 7) === period)
    .reduce((sum, transaction) => sum + toPen(transaction.amount, transaction.currency), 0);
  const directExpenses = transactions
    .filter((transaction) => transaction.type === 'EXPENSE' && !transaction.isInstallment && transaction.transactionDate.slice(0, 7) === period)
    .reduce((sum, transaction) => sum + toPen(transaction.amount, transaction.currency), 0);
  const refunds = transactions
    .filter((transaction) => transaction.type === 'REFUND' && transaction.transactionDate.slice(0, 7) === period)
    .reduce((sum, transaction) => sum + toPen(transaction.amount, transaction.currency), 0);
  const installmentExpenses = installments
    .filter((installment) => {
      const [year, month] = installment.startPeriod.split('-').map(Number);
      const [targetYear, targetMonth] = period.split('-').map(Number);
      const offset = (targetYear - year) * 12 + targetMonth - month;
      return offset >= 0 && offset < installment.totalInstallments;
    })
    .reduce((sum, installment) => sum + toPen(installment.monthlyTotal, installment.currency), 0);
  const expenses = Math.max(0, roundMoney(directExpenses + installmentExpenses - refunds));
  return { income: roundMoney(income), expenses, net: roundMoney(income - expenses) };
}

export function buildProjection(
  startPeriod: string,
  months: number,
  events: ProjectionEvent[],
  budgetsPen: number,
  installments: DashboardInstallment[],
  loanPaymentPen: number,
  rate: number | null
): ProjectionMonth[] {
  const periods: string[] = [];
  let [year, month] = startPeriod.split('-').map(Number);
  for (let index = 0; index < months; index += 1) {
    periods.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return periods.map((period) => {
    const toPen = (amount: number, currency: Currency) => convertAmount(amount, currency, 'PEN', rate);
    const eventTotals = events
      .filter((event) => event.isRecurring ? event.expectedPeriod <= period : event.expectedPeriod === period)
      .reduce(
        (totals, event) => {
          const amount = toPen(event.amount, event.currency);
          if (event.categoryType === 'EXPENSE') totals.expenses += amount;
          else totals.income += amount;
          return totals;
        },
        { income: 0, expenses: 0 }
      );
    const installmentExpenses = installments
      .filter((installment) => {
        const [startYear, startMonth] = installment.startPeriod.split('-').map(Number);
        const [targetYear, targetMonth] = period.split('-').map(Number);
        const offset = (targetYear - startYear) * 12 + targetMonth - startMonth;
        return offset >= 0 && offset < installment.totalInstallments;
      })
      .reduce((sum, installment) => sum + toPen(installment.monthlyTotal, installment.currency), 0);
    const incomeDetails = events
      .filter((event) => event.isRecurring ? event.expectedPeriod <= period : event.expectedPeriod === period)
      .filter((event) => event.categoryType !== 'EXPENSE')
      .map((event) => ({ label: event.name, amount: roundMoney(toPen(event.amount, event.currency)) }));
    const expenseDetails: ProjectionDetail[] = events
      .filter((event) => event.isRecurring ? event.expectedPeriod <= period : event.expectedPeriod === period)
      .filter((event) => event.categoryType === 'EXPENSE')
      .map((event) => ({ label: event.name, amount: roundMoney(toPen(event.amount, event.currency)) }));
    if (budgetsPen > 0) expenseDetails.push({ label: 'Presupuestos del mes', amount: roundMoney(budgetsPen) });
    if (installmentExpenses > 0) expenseDetails.push({ label: 'Cuotas de tarjetas', amount: roundMoney(installmentExpenses) });
    if (loanPaymentPen > 0) expenseDetails.push({ label: 'Cuotas de préstamos', amount: roundMoney(loanPaymentPen) });
    const expenses = roundMoney(eventTotals.expenses + budgetsPen + installmentExpenses + loanPaymentPen);
    const income = roundMoney(eventTotals.income);
    return { period, income, expenses, net: roundMoney(income - expenses), incomeDetails, expenseDetails };
  });
}
