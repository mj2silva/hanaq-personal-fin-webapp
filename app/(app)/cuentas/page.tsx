import type { Metadata } from 'next';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AccountsPanel } from '@/components/accounts/accounts-panel';
import { calculateCardSpending } from '@/lib/accounts/credit-card-calculations';

export const metadata: Metadata = {
  title: 'Mis Cuentas | Finanzas Personales',
  description: 'Control de cuentas bancarias, caja de efectivo, tarjetas de crédito, préstamos e inversiones.',
};

async function CuentasContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: accounts, error: accountsError }, { data: cards, error: cardsError }, { data: loans, error: loansError }, { data: investments, error: investmentsError }, { data: rate }, { data: transactions, error: transactionsError }] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true).order('type').order('name'),
    supabase.from('credit_cards').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('loans').select('*').eq('user_id', user.id).eq('is_active', true).order('lender_name'),
    supabase.from('investments').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('exchange_rates').select('usd_to_pen_rate').eq('user_id', user.id).order('rate_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('transactions').select('credit_card_id, transaction_date, amount, currency, type').eq('user_id', user.id).not('credit_card_id', 'is', null),
  ]);
  if (accountsError || cardsError || loansError || investmentsError || transactionsError) throw new Error('No se pudo cargar el módulo de cuentas.');

  const exchangeRate = rate?.usd_to_pen_rate ?? null;
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const currentYear = now.getUTCFullYear().toString();
  const cardsWithSpend = (cards ?? []).map((card) => {
    const expenses = (transactions ?? []).filter(
      (transaction) => transaction.credit_card_id === card.id && transaction.type === 'EXPENSE'
    );
    const monthlySpending = calculateCardSpending(expenses, currentMonth, exchangeRate);
    const annualSpending = calculateCardSpending(expenses, currentYear, exchangeRate);
    return {
      ...card,
      monthlySpend: monthlySpending.pen,
      annualSpend: annualSpending.pen,
      monthlySpendUsd: monthlySpending.usd,
      annualSpendUsd: annualSpending.usd,
      monthlySpendRequiresRate: monthlySpending.requiresReferenceRate,
      annualSpendRequiresRate: annualSpending.requiresReferenceRate,
    };
  });

  return <div className="space-y-8">
    <div><h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">Mis Cuentas</h1><p className="text-sm text-zinc-500 dark:text-zinc-400">Tesorería, crédito, préstamos e inversiones con saldos separados por moneda.</p></div>
    <AccountsPanel accounts={accounts ?? []} cards={cardsWithSpend} loans={loans ?? []} investments={investments ?? []} exchangeRate={exchangeRate} />
  </div>;
}

export default function CuentasPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Cargando cuentas...
        </div>
      }
    >
      <CuentasContent />
    </Suspense>
  );
}
