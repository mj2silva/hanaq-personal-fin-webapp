import type { Metadata } from 'next';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ActivityPanel } from '@/components/activity/activity-panel';
import type {
  InstallmentSummary,
  NameMaps,
  RefundableExpense,
  SharedSplitView,
} from '@/components/activity/types';

export const metadata: Metadata = {
  title: 'Actividad | Finanzas Personales',
  description: 'Historial de movimientos, transacciones y seguimiento de gastos compartidos por cobrar.',
};

const HISTORY_LIMIT = 300;

function indexNames<T extends { id: string }>(rows: T[], label: (row: T) => string): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.id, label(row)]));
}

async function ActividadContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: accounts, error: accountsError },
    { data: cards, error: cardsError },
    { data: loans, error: loansError },
    { data: investments, error: investmentsError },
    { data: categories, error: categoriesError },
    { data: rate },
    { data: transactions, error: transactionsError },
    { data: splits, error: splitsError },
    { data: plans, error: plansError },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id).order('name'),
    supabase.from('credit_cards').select('*').eq('user_id', user.id).order('name'),
    supabase.from('loans').select('*').eq('user_id', user.id).order('lender_name'),
    supabase.from('investments').select('*').eq('user_id', user.id).order('name'),
    supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
    supabase.from('exchange_rates').select('usd_to_pen_rate').eq('user_id', user.id).order('rate_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('transactions').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(HISTORY_LIMIT),
    supabase.from('shared_expense_splits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('installment_plans').select('transaction_id, total_installments, monthly_principal_amount, monthly_interest_amount').eq('user_id', user.id),
  ]);
  if (accountsError || cardsError || loansError || investmentsError || categoriesError || transactionsError || splitsError || plansError) {
    throw new Error('No se pudo cargar la actividad.');
  }

  const allAccounts = accounts ?? [];
  const allCards = cards ?? [];
  const allLoans = loans ?? [];
  const allInvestments = investments ?? [];
  const allCategories = categories ?? [];
  const history = transactions ?? [];
  const rawSplits = splits ?? [];

  const loadedIds = new Set(history.map((transaction) => transaction.id));
  const missingOriginIds = rawSplits.map((split) => split.transaction_id).filter((id) => !loadedIds.has(id));
  const { data: extraOrigins, error: originsError } = missingOriginIds.length
    ? await supabase.from('transactions').select('*').eq('user_id', user.id).in('id', missingOriginIds)
    : { data: [], error: null };
  if (originsError) throw new Error('No se pudo cargar la actividad.');
  const originById = new Map([...history, ...(extraOrigins ?? [])].map((transaction) => [transaction.id, transaction]));

  const splitViews: SharedSplitView[] = rawSplits.map((split) => {
    const origin = originById.get(split.transaction_id);
    return {
      ...split,
      originDescription: origin?.description ?? 'Gasto compartido',
      originDate: origin?.transaction_date ?? null,
    };
  });

  const installments: Record<string, InstallmentSummary> = Object.fromEntries(
    (plans ?? []).map((plan) => [
      plan.transaction_id,
      {
        total: plan.total_installments,
        monthlyTotal: plan.monthly_principal_amount + plan.monthly_interest_amount,
      },
    ])
  );

  const refundedByParent = new Map<string, number>();
  for (const transaction of history) {
    if (transaction.type === 'REFUND' && transaction.parent_transaction_id) {
      refundedByParent.set(
        transaction.parent_transaction_id,
        (refundedByParent.get(transaction.parent_transaction_id) ?? 0) + transaction.amount
      );
    }
  }
  const refundable: RefundableExpense[] = history
    .filter((transaction) => transaction.type === 'EXPENSE')
    .map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      currency: transaction.currency,
      remaining: Math.round((transaction.amount - (refundedByParent.get(transaction.id) ?? 0)) * 100) / 100,
      date: transaction.transaction_date,
    }))
    .filter((expense) => expense.remaining > 0);

  const names: NameMaps = {
    accounts: indexNames(allAccounts, (account) => account.name),
    cards: indexNames(allCards, (card) => card.name),
    loans: indexNames(allLoans, (loan) => loan.lender_name),
    investments: indexNames(allInvestments, (investment) => investment.name),
    categories: indexNames(allCategories, (category) => category.name),
  };

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  return (
    <ActivityPanel
      data={{
        accounts: allAccounts.filter((account) => account.is_active),
        cards: allCards.filter((card) => card.is_active),
        loans: allLoans.filter((loan) => loan.is_active && loan.remaining_installments > 0),
        investments: allInvestments.filter((investment) => investment.is_active),
        categories: allCategories,
        refundable,
        exchangeRate: rate?.usd_to_pen_rate ?? null,
        today,
      }}
      transactions={history}
      splits={splitViews}
      names={names}
      installments={installments}
    />
  );
}

export default function ActividadPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Cargando actividad...
        </div>
      }
    >
      <ActividadContent />
    </Suspense>
  );
}
