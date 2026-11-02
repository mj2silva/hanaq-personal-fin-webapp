import type { Metadata } from 'next';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { calculateHistoryMonth, calculateHistoryYear, type HistoryInput } from '@/lib/history/calculations';
import { historyYearEnd, resolveHistoryPeriod } from '@/lib/history/period';
import { HistoryPanel } from '@/components/history/history-panel';

export const metadata: Metadata = {
  title: 'Historial | Finanzas Personales',
  description: 'Consulta mensual y resumen anual de tus finanzas.',
};

async function fetchAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await fetchPage(from, from + size - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < size) return { data: rows, error: null };
  }
}

async function HistoryContent({ searchParams }: { searchParams: Promise<{ mes?: string | string[] }> }) {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const current = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).format(new Date());
  const period = resolveHistoryPeriod((await searchParams).mes, current);
  const through = historyYearEnd(period, current);
  const [categoriesResult, budgetsResult, templatesResult, checklistResult, transactionsResult, plansResult, splitsResult, rateResult] = await Promise.all([
    fetchAll((from, to) => supabase.from('categories').select('*').eq('user_id', user.id).order('id').range(from, to)),
    fetchAll((from, to) => supabase.from('budgets').select('*').eq('user_id', user.id).order('id').range(from, to)),
    fetchAll((from, to) => supabase.from('fixed_expenses_template').select('*').eq('user_id', user.id).order('id').range(from, to)),
    fetchAll((from, to) => supabase.from('monthly_fixed_checklist').select('*').eq('user_id', user.id).order('id').range(from, to)),
    fetchAll((from, to) => supabase.from('transactions').select('*').eq('user_id', user.id).order('id').range(from, to)),
    fetchAll((from, to) => supabase.from('installment_plans').select('*').eq('user_id', user.id).order('id').range(from, to)),
    fetchAll((from, to) => supabase.from('shared_expense_splits').select('id, transaction_id').eq('user_id', user.id).order('id').range(from, to)),
    supabase.from('exchange_rates').select('usd_to_pen_rate').eq('user_id', user.id).order('rate_date', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if ([categoriesResult, budgetsResult, templatesResult, checklistResult, transactionsResult, plansResult, splitsResult, rateResult].some((result) => result.error)) {
    throw new Error('No se pudo cargar el historial.');
  }
  const transactions = transactionsResult.data ?? [];
  const templates = templatesResult.data ?? [];
  const transactionById = new Map(transactions.map((transaction) => [transaction.id, transaction]));
  const splitById = new Map((splitsResult.data ?? []).map((split) => [split.id, split.transaction_id]));
  const input: HistoryInput = {
    transactions: transactions.map((transaction) => ({ id: transaction.id, type: transaction.type, amount: transaction.amount, currency: transaction.currency, categoryId: transaction.category_id, transactionDate: transaction.transaction_date, isInstallment: transaction.is_installment, parentTransactionId: transaction.parent_transaction_id, sharedSplitId: transaction.shared_split_id })),
    installments: (plansResult.data ?? []).flatMap((plan) => {
      const transaction = transactionById.get(plan.transaction_id);
      return transaction ? [{ transactionId: plan.transaction_id, categoryId: transaction.category_id, startPeriod: plan.start_period_year_month, totalInstallments: plan.total_installments, monthlyTotal: plan.monthly_principal_amount + plan.monthly_interest_amount, currency: transaction.currency }] : [];
    }),
    repayments: transactions.filter((transaction) => transaction.type === 'SHARED_REPAYMENT').map((transaction) => ({ amount: transaction.amount, currency: transaction.currency, splitId: transaction.shared_split_id, transactionDate: transaction.transaction_date, categoryId: transaction.shared_split_id ? transactionById.get(splitById.get(transaction.shared_split_id) ?? '')?.category_id ?? null : null })),
    fixedExpenses: (checklistResult.data ?? []).filter((entry) => entry.is_paid && entry.actual_amount !== null).flatMap((entry) => {
      const template = templates.find((item) => item.id === entry.fixed_expense_id);
      if (!template || entry.actual_amount === null) return [];
      const transaction = entry.transaction_id ? transactionById.get(entry.transaction_id) : undefined;
      return [{ transactionId: entry.transaction_id, categoryId: template.category_id, amount: transaction?.amount ?? entry.actual_amount, currency: transaction?.currency ?? template.currency, period: entry.period_year_month }];
    }),
    budgets: (budgetsResult.data ?? []).map((budget) => ({ categoryId: budget.category_id, period: budget.period_year_month, amountPen: budget.limit_amount_pen })),
    rate: rateResult.data?.usd_to_pen_rate ?? null,
  };
  let month = null;
  let year = null;
  let error = null;
  try {
    month = calculateHistoryMonth(period, input);
    year = calculateHistoryYear(through, input);
  } catch (caught) {
    if (!(caught instanceof Error) || !caught.message.includes('tipo de cambio')) throw caught;
    error = 'Falta un tipo de cambio válido para calcular los importes en USD. Regístralo en Configuración.';
  }
  return <HistoryPanel period={period} current={current} through={through} month={month} year={year} categories={categoriesResult.data ?? []} error={error} />;
}

export default function HistoryPage({ searchParams }: { searchParams: Promise<{ mes?: string | string[] }> }) {
  return <Suspense fallback={<div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">Cargando historial...</div>}><HistoryContent searchParams={searchParams} /></Suspense>;
}