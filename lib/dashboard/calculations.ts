import { convertAmount, roundMoney, type Currency } from '../activity/calculations.ts';

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

export interface ProjectionComparisonMonth {
  period: string;
  actualIncome: number | null;
  actualExpenses: number | null;
  actualNet: number | null;
  projectedIncome: number | null;
  projectedExpenses: number | null;
  projectedNet: number | null;
}

export interface WealthProjectionPoint {
  period: string;
  actualNetWorth: number | null;
  actualLiquidity: number | null;
  projectedNetWorth: number | null;
  projectedLiquidity: number | null;
}

export interface FinancialTrajectoryPoint {
  period: string;
  actualIncome: number | null;
  actualExpenses: number | null;
  actualNet: number | null;
  actualNetWorth: number | null;
  actualLiquidity: number | null;
  projectedIncome: number | null;
  projectedExpenses: number | null;
  projectedNet: number | null;
  projectedNetWorth: number | null;
  projectedLiquidity: number | null;
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

function shiftPeriod(period: string, offset: number) {
  const [year, month] = period.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function buildProjectionComparison(
  startPeriod: string,
  projections: ProjectionMonth[],
  transactions: DashboardTransaction[],
  installments: DashboardInstallment[],
  rate: number | null
): ProjectionComparisonMonth[] {
  const actualPeriods = Array.from({ length: 7 }, (_, index) => shiftPeriod(startPeriod, index - 6));
  const projectedByPeriod = new Map(projections.map((projection) => [projection.period, projection]));
  const periods = Array.from(new Set([...actualPeriods, ...projectedByPeriod.keys()])).sort();

  return periods.map((period) => {
    const actual = actualPeriods.includes(period)
      ? calculateMonthTotals(period, transactions, installments, rate)
      : null;
    const projected = projectedByPeriod.get(period);
    return {
      period,
      actualIncome: actual?.income ?? null,
      actualExpenses: actual?.expenses ?? null,
      actualNet: actual?.net ?? null,
      projectedIncome: projected?.income ?? null,
      projectedExpenses: projected?.expenses ?? null,
      projectedNet: projected?.net ?? null,
    };
  });
}

export function buildWealthProjection(
  startPeriod: string,
  projections: ProjectionMonth[],
  currentNetWorth: number,
  currentLiquidity: number
): WealthProjectionPoint[] {
  let netWorth = roundMoney(currentNetWorth);
  let liquidity = roundMoney(currentLiquidity);
  const points: WealthProjectionPoint[] = [{
    period: startPeriod,
    actualNetWorth: netWorth,
    actualLiquidity: liquidity,
    projectedNetWorth: null,
    projectedLiquidity: null,
  }];

  projections.forEach((projection) => {
    netWorth = roundMoney(netWorth + projection.net);
    liquidity = roundMoney(liquidity + projection.net);
    const point = {
      period: projection.period,
      actualNetWorth: null,
      actualLiquidity: null,
      projectedNetWorth: netWorth,
      projectedLiquidity: liquidity,
    };
    const existingPoint = points.find((item) => item.period === projection.period);
    if (existingPoint) {
      existingPoint.projectedNetWorth = netWorth;
      existingPoint.projectedLiquidity = liquidity;
    } else {
      points.push(point);
    }
  });

  return points;
}

export function buildFinancialTrajectory(
  startPeriod: string,
  projections: ProjectionMonth[],
  transactions: DashboardTransaction[],
  installments: DashboardInstallment[],
  rate: number | null,
  currentNetWorth: number,
  currentLiquidity: number
): FinancialTrajectoryPoint[] {
  const comparison = buildProjectionComparison(startPeriod, projections, transactions, installments, rate);
  const wealth = buildWealthProjection(startPeriod, projections, currentNetWorth, currentLiquidity);
  const comparisonByPeriod = new Map(comparison.map((point) => [point.period, point]));
  const wealthByPeriod = new Map(wealth.map((point) => [point.period, point]));
  const periods = Array.from(new Set([...comparisonByPeriod.keys(), ...wealthByPeriod.keys()])).sort();

  return periods.map((period) => {
    const comp = comparisonByPeriod.get(period);
    const wealthPoint = wealthByPeriod.get(period);
    return {
      period,
      actualIncome: comp?.actualIncome ?? null,
      actualExpenses: comp?.actualExpenses ?? null,
      actualNet: comp?.actualNet ?? null,
      actualNetWorth: wealthPoint?.actualNetWorth ?? null,
      actualLiquidity: wealthPoint?.actualLiquidity ?? null,
      projectedIncome: comp?.projectedIncome ?? null,
      projectedExpenses: comp?.projectedExpenses ?? null,
      projectedNet: comp?.projectedNet ?? null,
      projectedNetWorth: wealthPoint?.projectedNetWorth ?? null,
      projectedLiquidity: wealthPoint?.projectedLiquidity ?? null,
    };
  });
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
