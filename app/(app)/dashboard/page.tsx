import type { Metadata } from 'next';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { calculateBudgetUsage, type BudgetUsageInput, type FixedExpenseUsageInput, type InstallmentUsageInput, type SharedRepaymentInput } from '@/lib/month/calculations';
import { buildProjection, buildFinancialTrajectory, calculateMonthTotals, type DashboardInstallment, type DashboardTransaction, type ProjectionEvent } from '@/lib/dashboard/calculations';
import { convertAmount } from '@/lib/activity/calculations';
import { DashboardPanel } from '@/components/dashboard/dashboard-panel';

export const metadata: Metadata = {
  title: 'Inicio | Finanzas Personales',
  description: 'Resumen financiero, balance neto y proyecciones de tesorería.',
};

function currentPeriod() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).format(new Date());
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const period = currentPeriod();
  const [
    { data: settings, error: settingsError },
    { data: accounts, error: accountsError },
    { data: cards, error: cardsError },
    { data: loans, error: loansError },
    { data: investments, error: investmentsError },
    { data: categories, error: categoriesError },
    { data: budgets, error: budgetsError },
    { data: transactions, error: transactionsError },
    { data: plans, error: plansError },
    { data: events, error: eventsError },
    { data: rate, error: rateError },
    { data: checklists, error: checklistsError },
    { data: templates, error: templatesError },
    { data: repaymentTransactions, error: repaymentTransactionsError },
    { data: sharedSplits, error: sharedSplitsError },
  ] = await Promise.all([
    supabase.from('user_settings').select('include_cash_in_balance').eq('user_id', user.id).maybeSingle(),
    supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('credit_cards').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('loans').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('investments').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('categories').select('*').eq('user_id', user.id),
    supabase.from('budgets').select('*').eq('user_id', user.id).eq('period_year_month', period),
    supabase.from('transactions').select('*').eq('user_id', user.id),
    supabase.from('installment_plans').select('*').eq('user_id', user.id),
    supabase.from('projected_events').select('*').eq('user_id', user.id).eq('is_active', true).order('expected_year_month'),
    supabase.from('exchange_rates').select('usd_to_pen_rate').eq('user_id', user.id).order('rate_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('monthly_fixed_checklist').select('*').eq('user_id', user.id).eq('period_year_month', period),
    supabase.from('fixed_expenses_template').select('*').eq('user_id', user.id),
    supabase.from('transactions').select('amount, currency, shared_split_id, transaction_date').eq('user_id', user.id).eq('type', 'SHARED_REPAYMENT'),
    supabase.from('shared_expense_splits').select('id, transaction_id').eq('user_id', user.id),
  ]);
  if (settingsError || accountsError || cardsError || loansError || investmentsError || categoriesError || budgetsError || transactionsError || plansError || eventsError || rateError || checklistsError || templatesError || repaymentTransactionsError || sharedSplitsError) {
    throw new Error('No se pudo cargar el dashboard.');
  }

  const exchangeRate = rate?.usd_to_pen_rate ?? 1;
  const toPen = (amount: number, currency: 'PEN' | 'USD') => convertAmount(amount, currency, 'PEN', exchangeRate);
  const transactionRows: DashboardTransaction[] = (transactions ?? []).map((transaction) => ({
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    transactionDate: transaction.transaction_date,
    isInstallment: transaction.is_installment,
  }));
  const transactionById = new Map((transactions ?? []).map((transaction) => [transaction.id, transaction]));
  const installmentRows: DashboardInstallment[] = (plans ?? []).flatMap((plan) => {
    const transaction = transactionById.get(plan.transaction_id);
    return transaction ? [{ startPeriod: plan.start_period_year_month, totalInstallments: plan.total_installments, monthlyTotal: plan.monthly_principal_amount + plan.monthly_interest_amount, currency: transaction.currency }] : [];
  });
  const totals = calculateMonthTotals(period, transactionRows, installmentRows, exchangeRate);
  const accountLiquidity = (accounts ?? [])
    .filter((account) => settings?.include_cash_in_balance !== false || account.type !== 'CASH_BOX')
    .reduce((sum, account) => sum + toPen(account.current_balance, account.currency), 0);
  const accountNetWorth = (accounts ?? []).reduce((sum, account) => sum + toPen(account.current_balance, account.currency), 0);
  const cardDebt = (cards ?? []).reduce((sum, card) => sum + toPen(card.current_debt_pen, 'PEN') + toPen(card.current_debt_usd, 'USD'), 0);
  const loanDebt = (loans ?? []).reduce((sum, loan) => sum + toPen(loan.current_balance, loan.currency), 0);
  const investmentValue = (investments ?? []).reduce((sum, investment) => sum + toPen(investment.current_value, investment.currency), 0);
  const netWorth = accountNetWorth + investmentValue - cardDebt - loanDebt;
  const transactionRowsForBudget: BudgetUsageInput[] = (transactions ?? []).map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    categoryId: transaction.type === 'REFUND' && transaction.parent_transaction_id
      ? transactionById.get(transaction.parent_transaction_id)?.category_id ?? transaction.category_id
      : transaction.category_id,
    transactionDate: transaction.transaction_date,
    isInstallment: transaction.is_installment,
    parentTransactionId: transaction.parent_transaction_id,
    sharedSplitId: transaction.shared_split_id,
  }));
  const categoryById = new Map((categories ?? []).map((category) => [category.id, category]));
  const fixedExpenseUsage: FixedExpenseUsageInput[] = (checklists ?? []).filter((entry) => entry.is_paid && entry.actual_amount !== null).flatMap((entry) => {
    const template = (templates ?? []).find((item) => item.id === entry.fixed_expense_id);
    if (!template || entry.actual_amount === null) return [];
    const transaction = entry.transaction_id ? transactionById.get(entry.transaction_id) : undefined;
    return [{ transactionId: entry.transaction_id, categoryId: template.category_id, amount: transaction?.amount ?? entry.actual_amount, currency: transaction?.currency ?? template.currency, period }];
  });
  const transactionCategoryById = new Map((transactions ?? []).map((transaction) => [transaction.id, transaction.category_id]));
  const sharedRepayments: SharedRepaymentInput[] = (repaymentTransactions ?? []).map((transaction) => ({
    amount: transaction.amount,
    currency: transaction.currency,
    splitId: transaction.shared_split_id,
    transactionDate: transaction.transaction_date,
    categoryId: transaction.shared_split_id ? transactionCategoryById.get((sharedSplits ?? []).find((split) => split.id === transaction.shared_split_id)?.transaction_id ?? '') ?? null : null,
  }));
  const budgetsWithUsage = (budgets ?? []).map((budget) => ({
    ...budget,
    usage: calculateBudgetUsage(
      budget.category_id,
      period,
      transactionRowsForBudget,
      (plans ?? []).flatMap((plan): InstallmentUsageInput[] => {
        const transaction = transactionById.get(plan.transaction_id);
        return transaction ? [{ transactionId: plan.transaction_id, categoryId: transaction.category_id, startPeriod: plan.start_period_year_month, totalInstallments: plan.total_installments, monthlyTotal: plan.monthly_principal_amount + plan.monthly_interest_amount, currency: transaction.currency }] : [];
      }),
      sharedRepayments,
      exchangeRate,
      fixedExpenseUsage
    ),
  }));
  const projectionEvents: ProjectionEvent[] = (events ?? []).map((event) => ({
    name: event.name,
    expectedPeriod: event.expected_year_month,
    amount: event.amount,
    currency: event.currency,
    isRecurring: event.is_recurring_monthly,
    categoryType: event.category_id ? categoryById.get(event.category_id)?.type ?? null : null,
  }));
  const projectionBudget = budgetsWithUsage.reduce((sum, budget) => sum + budget.limit_amount_pen, 0);
  const loanPaymentPen = (loans ?? []).reduce((sum, loan) => sum + toPen(loan.monthly_installment_amount, loan.currency), 0);
  const projections = buildProjection(period, 12, projectionEvents, projectionBudget, installmentRows, loanPaymentPen, exchangeRate);
  const financialTrajectory = buildFinancialTrajectory(period, projections, transactionRows, installmentRows, exchangeRate, netWorth, accountLiquidity);
  return <DashboardPanel
    period={period}
    totals={totals}
    netWorth={netWorth}
    liquidity={accountLiquidity}
    includeCash={settings?.include_cash_in_balance !== false}
    budgets={budgetsWithUsage}
    categories={categories ?? []}
    events={(events ?? []).map((event) => ({ ...event, categoryName: event.category_id ? categoryById.get(event.category_id)?.name ?? '' : '', categoryType: event.category_id ? categoryById.get(event.category_id)?.type ?? null : null }))}
    projections={projections}
    financialTrajectory={financialTrajectory}
    operationData={{
      accounts: accounts ?? [],
      cards: cards ?? [],
      loans: loans ?? [],
      investments: investments ?? [],
      categories: categories ?? [],
      refundable: [],
      exchangeRate,
      today: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date()),
    }}
  />;
}

export default function DashboardPage() {
  return <Suspense fallback={<div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">Cargando dashboard...</div>}><DashboardContent /></Suspense>;
}
