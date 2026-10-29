import type { Metadata } from 'next';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { MonthPanel, type MonthItem } from '@/components/month/month-panel';
import { calculateBudgetUsage, type BudgetUsageInput, type FixedExpenseUsageInput, type InstallmentUsageInput, type SharedRepaymentInput } from '@/lib/month/calculations';

export const metadata: Metadata = {
  title: 'Mi Mes | Finanzas Personales',
  description: 'Checklist de gastos fijos y configuración de presupuestos mensuales por categoría.',
};

function currentPeriod() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).format(new Date());
}

async function MiMesContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const period = currentPeriod();
  const [
    { data: categories, error: categoriesError },
    { data: budgets, error: budgetsError },
    { data: templates, error: templatesError },
    { data: checklist, error: checklistError },
    { data: accounts, error: accountsError },
    { data: cards, error: cardsError },
    { data: transactions, error: transactionsError },
    { data: plans, error: plansError },
    { data: repaymentTransactions, error: repaymentTransactionsError },
    { data: sharedSplits, error: sharedSplitsError },
    { data: rate, error: rateError },
  ] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
    supabase.from('budgets').select('*').eq('user_id', user.id).eq('period_year_month', period),
    supabase.from('fixed_expenses_template').select('*').eq('user_id', user.id).order('due_day').order('name'),
    supabase.from('monthly_fixed_checklist').select('*').eq('user_id', user.id).eq('period_year_month', period),
    supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('credit_cards').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('transactions').select('*').eq('user_id', user.id),
    supabase.from('installment_plans').select('*').eq('user_id', user.id),
    supabase.from('transactions').select('amount, currency, shared_split_id, transaction_date').eq('user_id', user.id).eq('type', 'SHARED_REPAYMENT'),
    supabase.from('shared_expense_splits').select('id, transaction_id').eq('user_id', user.id),
    supabase.from('exchange_rates').select('usd_to_pen_rate').eq('user_id', user.id).order('rate_date', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (categoriesError || budgetsError || templatesError || checklistError || accountsError || cardsError || transactionsError || plansError || repaymentTransactionsError || sharedSplitsError || rateError) {
    throw new Error('No se pudo cargar Mi Mes.');
  }
  const categoryMap = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const checklistMap = new Map((checklist ?? []).map((entry) => [entry.fixed_expense_id, entry]));
  const items: MonthItem[] = (templates ?? []).map((template) => ({
    ...template,
    categoryName: categoryMap.get(template.category_id) ?? 'Sin categoría',
    checklist: checklistMap.get(template.id) ?? null,
  }));
  const transactionRows: BudgetUsageInput[] = (transactions ?? []).map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    categoryId: transaction.category_id,
    transactionDate: transaction.transaction_date,
    isInstallment: transaction.is_installment,
    parentTransactionId: transaction.parent_transaction_id,
    sharedSplitId: transaction.shared_split_id,
  }));
  const transactionById = new Map((transactions ?? []).map((transaction) => [transaction.id, transaction]));
  const transactionCategoryById = new Map((transactions ?? []).map((transaction) => [transaction.id, transaction.category_id]));
  const installmentRows: InstallmentUsageInput[] = (plans ?? []).flatMap((plan) => {
    const transaction = transactionById.get(plan.transaction_id);
    if (!transaction) return [];
    return [{
      transactionId: plan.transaction_id,
      categoryId: transaction.category_id,
      startPeriod: plan.start_period_year_month,
      totalInstallments: plan.total_installments,
      monthlyTotal: plan.monthly_principal_amount + plan.monthly_interest_amount,
      currency: transaction.currency,
    }];
  });
  const sharedRepayments: SharedRepaymentInput[] = (repaymentTransactions ?? []).map((transaction) => ({
    amount: transaction.amount,
    currency: transaction.currency,
    splitId: transaction.shared_split_id,
    transactionDate: transaction.transaction_date,
    categoryId: transaction.shared_split_id
      ? transactionCategoryById.get((sharedSplits ?? []).find((split) => split.id === transaction.shared_split_id)?.transaction_id ?? '') ?? null
      : null,
  }));
  const fixedExpenseUsage: FixedExpenseUsageInput[] = (checklist ?? [])
      .filter((entry) => entry.is_paid && entry.actual_amount !== null)
      .flatMap((entry) => {
        const template = (templates ?? []).find((item) => item.id === entry.fixed_expense_id);
        const actualAmount = entry.actual_amount;
        if (!template || actualAmount === null) return [];
        const transaction = entry.transaction_id ? transactionById.get(entry.transaction_id) : undefined;
        return [{
          transactionId: entry.transaction_id,
          categoryId: template.category_id,
          amount: transaction?.amount ?? actualAmount,
          currency: transaction?.currency ?? template.currency,
          period,
        }];
      });
  const usageByCategory = new Map((categories ?? []).map((category) => [
    category.id,
    calculateBudgetUsage(
      category.id,
      period,
      transactionRows.map((transaction) => ({
        ...transaction,
        categoryId: transaction.type === 'REFUND' && transaction.parentTransactionId
          ? transactionCategoryById.get(transaction.parentTransactionId) ?? transaction.categoryId
          : transaction.categoryId,
      })),
      installmentRows,
      sharedRepayments,
      rate?.usd_to_pen_rate ?? null,
      fixedExpenseUsage
    ),
  ]));
  const budgetsWithUsage = (budgets ?? []).map((budget) => ({ ...budget, usage: usageByCategory.get(budget.category_id) ?? 0 }));
  return <MonthPanel period={period} categories={categories ?? []} budgets={budgetsWithUsage} items={items} accounts={accounts ?? []} cards={cards ?? []} />;
}

export default function MiMesPage() {
  return <Suspense fallback={<div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">Cargando Mi Mes...</div>}><MiMesContent /></Suspense>;
}
