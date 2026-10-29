'use client';

import { useState } from 'react';
import { ArrowLeftRight, Receipt, Users } from 'lucide-react';
import { formatMoney, formatShortDate, toLimaMonth } from '@/lib/format';
import { DeleteTransactionButton } from './delete-transaction-button';
import { NewOperationDialog } from './new-operation-dialog';
import { SharedRepaymentDialog } from './shared-repayment-dialog';
import { fieldClass, selectClass } from './styles';
import type {
  InstallmentSummary,
  NameMaps,
  OperationReferenceData,
  SharedSplitView,
  Transaction,
} from './types';

type Tab = 'history' | 'receivable';

const TYPE_LABELS: Record<Transaction['type'], string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
  CC_PAYMENT: 'Pago de tarjeta',
  REFUND: 'Reembolso',
  SHARED_REPAYMENT: 'Cobro compartido',
  LOAN_PAYMENT: 'Pago de préstamo',
};

const STATUS_LABELS: Record<SharedSplitView['status'], string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  PAID: 'Pagado',
};

function amountTone(type: Transaction['type']): string {
  if (type === 'INCOME' || type === 'REFUND' || type === 'SHARED_REPAYMENT') return 'text-emerald-600 dark:text-emerald-400';
  if (type === 'EXPENSE') return 'text-rose-600 dark:text-rose-400';
  return 'text-zinc-900 dark:text-zinc-100';
}

function amountSign(type: Transaction['type']): string {
  if (type === 'INCOME' || type === 'REFUND' || type === 'SHARED_REPAYMENT') return '+';
  if (type === 'EXPENSE') return '-';
  return '';
}

function describeFlow(transaction: Transaction, names: NameMaps): string {
  const account = transaction.account_id ? names.accounts[transaction.account_id] : undefined;
  const destination = transaction.destination_account_id ? names.accounts[transaction.destination_account_id] : undefined;
  const card = transaction.credit_card_id ? names.cards[transaction.credit_card_id] : undefined;
  const loan = transaction.loan_id ? names.loans[transaction.loan_id] : undefined;
  const investment = transaction.investment_id ? names.investments[transaction.investment_id] : undefined;

  switch (transaction.type) {
    case 'TRANSFER':
      return `${account ?? investment ?? '—'} → ${destination ?? investment ?? '—'}`;
    case 'CC_PAYMENT':
      return `${account ?? '—'} → ${card ?? 'Tarjeta'}`;
    case 'LOAN_PAYMENT':
      return `${account ?? '—'} → ${loan ?? 'Préstamo'}`;
    default:
      return card ?? account ?? '—';
  }
}

export function ActivityPanel({
  data,
  transactions,
  splits,
  names,
  installments,
}: {
  data: OperationReferenceData;
  transactions: Transaction[];
  splits: SharedSplitView[];
  names: NameMaps;
  installments: Record<string, InstallmentSummary>;
}) {
  const [tab, setTab] = useState<Tab>('history');
  const [typeFilter, setTypeFilter] = useState<'ALL' | Transaction['type']>('ALL');
  const [monthFilter, setMonthFilter] = useState('');
  const [search, setSearch] = useState('');

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = transactions.filter((transaction) => {
    if (typeFilter !== 'ALL' && transaction.type !== typeFilter) return false;
    if (monthFilter && toLimaMonth(transaction.transaction_date) !== monthFilter) return false;
    if (normalizedSearch && !transaction.description.toLowerCase().includes(normalizedSearch)) return false;
    return true;
  });

  const openSplits = splits.filter((split) => split.status !== 'PAID');
  const settledSplits = splits.filter((split) => split.status === 'PAID');
  const pendingByCurrency = openSplits.reduce<Record<'PEN' | 'USD', number>>(
    (totals, split) => ({ ...totals, [split.currency]: totals[split.currency] + (split.amount_owed - split.amount_paid) }),
    { PEN: 0, USD: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">Actividad</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Historial de operaciones contables y control de cuentas por cobrar de gastos compartidos.
          </p>
        </div>
        <NewOperationDialog data={data} />
      </div>

      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-4" role="tablist" aria-label="Secciones de actividad">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'history'}
            onClick={() => setTab('history')}
            className={
              tab === 'history'
                ? 'flex items-center gap-2 border-b-2 border-zinc-900 pb-3 text-sm font-semibold text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'flex items-center gap-2 border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }
          >
            <Receipt className="h-4 w-4" aria-hidden="true" />
            <span>Historial de Movimientos</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'receivable'}
            onClick={() => setTab('receivable')}
            className={
              tab === 'receivable'
                ? 'flex items-center gap-2 border-b-2 border-zinc-900 pb-3 text-sm font-semibold text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'flex items-center gap-2 border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>Por Cobrar (Gastos Compartidos)</span>
            {openSplits.length > 0 && (
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                {openSplits.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {tab === 'history' && (
        <section role="tabpanel" aria-label="Historial de movimientos" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-zinc-500">
              Buscar
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Descripción" className={fieldClass} />
            </label>
            <label className="text-xs text-zinc-500">
              Tipo
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'ALL' | Transaction['type'])} className={selectClass}>
                <option value="ALL">Todos</option>
                {(Object.keys(TYPE_LABELS) as Transaction['type'][]).map((type) => (
                  <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Mes
              <input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className={fieldClass} />
            </label>
          </div>

          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <ArrowLeftRight className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Sin transacciones registradas</h3>
              <p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Usa «Nueva Operación» para registrar ingresos, gastos, transferencias, pagos de tarjeta o préstamos.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              Ningún movimiento coincide con los filtros.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200/80 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {filtered.map((transaction) => {
                const installment = installments[transaction.id];
                const category = transaction.category_id ? names.categories[transaction.category_id] : undefined;
                return (
                  <li key={transaction.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{transaction.description}</p>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {TYPE_LABELS[transaction.type]}
                        </span>
                        {installment && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            {installment.total} cuotas de {formatMoney(installment.monthlyTotal, transaction.currency)}
                          </span>
                        )}
                        {transaction.is_shared_expense && (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                            Compartido
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatShortDate(transaction.transaction_date)} · {describeFlow(transaction, names)}
                        {category ? ` · ${category}` : ''}
                        {transaction.applied_exchange_rate ? ` · TC ${transaction.applied_exchange_rate.toFixed(4)}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${amountTone(transaction.type)}`}>
                          {amountSign(transaction.type)}{formatMoney(transaction.amount, transaction.currency)}
                        </p>
                        {transaction.converted_amount !== null && (
                          <p className="text-xs text-zinc-500">≈ {formatMoney(transaction.converted_amount, transaction.currency === 'USD' ? 'PEN' : 'USD')}</p>
                        )}
                      </div>
                      <DeleteTransactionButton transactionId={transaction.id} description={transaction.description} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === 'receivable' && (
        <section role="tabpanel" aria-label="Gastos compartidos por cobrar" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">Pendiente por cobrar (PEN)</p>
              <p className="mt-1 text-xl font-bold">{formatMoney(pendingByCurrency.PEN, 'PEN')}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-500">Pendiente por cobrar (USD)</p>
              <p className="mt-1 text-xl font-bold">{formatMoney(pendingByCurrency.USD, 'USD')}</p>
            </div>
          </div>

          {splits.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Nadie te debe dinero</h3>
              <p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Al registrar un gasto marcado como compartido, las deudas de tus amigos aparecerán aquí para registrar sus pagos (Yape/Plin).
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200/80 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {[...openSplits, ...settledSplits].map((split) => {
                const pendingAmount = Math.max(0, split.amount_owed - split.amount_paid);
                const progress = split.amount_owed > 0 ? Math.min(100, (split.amount_paid / split.amount_owed) * 100) : 0;
                return (
                  <li key={split.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{split.debtor_name}</p>
                        <span
                          className={
                            split.status === 'PAID'
                              ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : split.status === 'PARTIAL'
                                ? 'rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                : 'rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                          }
                        >
                          {STATUS_LABELS[split.status]}
                        </span>
                      </div>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {split.originDescription}
                        {split.originDate ? ` · ${formatShortDate(split.originDate)}` : ''}
                      </p>
                      <div className="h-1.5 w-full max-w-xs rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-zinc-500">
                        Cobrado {formatMoney(split.amount_paid, split.currency)} de {formatMoney(split.amount_owed, split.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-semibold">{formatMoney(pendingAmount, split.currency)}</p>
                      {split.status !== 'PAID' && <SharedRepaymentDialog split={split} accounts={data.accounts} today={data.today} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
