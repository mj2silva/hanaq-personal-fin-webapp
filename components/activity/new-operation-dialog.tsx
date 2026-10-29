'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createOperation, type ActivityActionState } from '@/app/(app)/actividad/actions';
import {
  calculateInstallmentPlan,
  convertAmount,
  resolveInstallmentStartPeriod,
  type Currency,
} from '@/lib/activity/calculations';
import { formatMoney } from '@/lib/format';
import { dialogClass, fieldClass, primaryButtonClass, selectClass } from './styles';
import type { OperationReferenceData, OperationType } from './types';

const initialState: ActivityActionState = {};

const OPERATION_LABELS: Record<OperationType, string> = {
  EXPENSE: 'Gasto',
  INCOME: 'Ingreso',
  TRANSFER: 'Transferencia',
  CC_PAYMENT: 'Pago de tarjeta',
  LOAN_PAYMENT: 'Pago de préstamo',
  REFUND: 'Reembolso',
};

const OPERATION_ORDER: OperationType[] = ['EXPENSE', 'INCOME', 'TRANSFER', 'CC_PAYMENT', 'LOAN_PAYMENT', 'REFUND'];

type TransferKind = 'ACCOUNT' | 'TO_INVESTMENT' | 'FROM_INVESTMENT';
type InstallmentMode = 'ZERO' | 'DEFAULT' | 'CUSTOM';

interface SplitRow {
  id: number;
  name: string;
  amount: string;
}

export function NewOperationDialog({ data }: { data: OperationReferenceData }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(createOperation, initialState);

  useEffect(() => {
    if (state.token) dialogRef.current?.close();
  }, [state.token]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-50 shadow-xs transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>Nueva Operación</span>
      </button>
      <dialog ref={dialogRef} className={dialogClass} aria-labelledby="new-operation-title">
        <OperationForm
          key={state.token ?? 'initial'}
          data={data}
          action={action}
          pending={pending}
          error={state.error ?? null}
          onCancel={() => dialogRef.current?.close()}
        />
      </dialog>
    </>
  );
}

function OperationForm({
  data,
  action,
  pending,
  error,
  onCancel,
}: {
  data: OperationReferenceData;
  action: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
}) {
  const [type, setType] = useState<OperationType>('EXPENSE');
  const [source, setSource] = useState<'ACCOUNT' | 'CARD'>('ACCOUNT');
  const [transferKind, setTransferKind] = useState<TransferKind>('ACCOUNT');
  const [accountId, setAccountId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [cardId, setCardId] = useState('');
  const [loanId, setLoanId] = useState('');
  const [investmentId, setInvestmentId] = useState('');
  const [parentId, setParentId] = useState('');
  const [cardCurrency, setCardCurrency] = useState<Currency>('PEN');
  const [date, setDate] = useState(data.today);
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [installments, setInstallments] = useState('');
  const [installmentMode, setInstallmentMode] = useState<InstallmentMode>('ZERO');
  const [customTea, setCustomTea] = useState('');
  const [shared, setShared] = useState(false);
  const [splits, setSplits] = useState<SplitRow[]>([{ id: 1, name: '', amount: '' }]);

  const account = data.accounts.find((item) => item.id === accountId);
  const destination = data.accounts.find((item) => item.id === destinationId);
  const card = data.cards.find((item) => item.id === cardId);
  const loan = data.loans.find((item) => item.id === loanId);
  const investment = data.investments.find((item) => item.id === investmentId);
  const parent = data.refundable.find((item) => item.id === parentId);

  const cardCurrencyOptions: Currency[] = card && !card.is_bimonetary ? ['PEN'] : ['PEN', 'USD'];
  const effectiveCardCurrency: Currency = cardCurrencyOptions.includes(cardCurrency) ? cardCurrency : 'PEN';
  const amountNumber = Number(amount);

  let amountCurrency: Currency | null = null;
  let targetCurrency: Currency | null = null;
  if (type === 'INCOME') {
    amountCurrency = account?.currency ?? null;
  } else if (type === 'EXPENSE') {
    amountCurrency = source === 'ACCOUNT' ? account?.currency ?? null : effectiveCardCurrency;
    targetCurrency = source === 'CARD' ? card?.credit_limit_currency ?? null : null;
  } else if (type === 'TRANSFER') {
    if (transferKind === 'ACCOUNT') {
      amountCurrency = account?.currency ?? null;
      targetCurrency = destination?.currency ?? null;
    } else if (transferKind === 'TO_INVESTMENT') {
      amountCurrency = account?.currency ?? null;
      targetCurrency = investment?.currency ?? null;
    } else {
      amountCurrency = investment?.currency ?? null;
      targetCurrency = destination?.currency ?? null;
    }
  } else if (type === 'CC_PAYMENT') {
    amountCurrency = effectiveCardCurrency;
    targetCurrency = account?.currency ?? null;
  } else if (type === 'LOAN_PAYMENT') {
    amountCurrency = loan?.currency ?? null;
    targetCurrency = account?.currency ?? null;
  } else {
    amountCurrency = parent?.currency ?? null;
  }

  const needsRate = amountCurrency !== null && targetCurrency !== null && amountCurrency !== targetCurrency;
  const rateNumber = Number(rate);
  const converted =
    needsRate && amountCurrency && targetCurrency && amountNumber > 0 && rateNumber > 0
      ? convertAmount(amountNumber, amountCurrency, targetCurrency, rateNumber)
      : null;

  const installmentCount = Number(installments);
  const hasInstallments = type === 'EXPENSE' && source === 'CARD' && installmentCount > 1;
  let installmentPreview: { monthlyTotal: number; startPeriod: string } | null = null;
  if (hasInstallments && card && amountNumber > 0) {
    const tea = installmentMode === 'ZERO' ? 0 : installmentMode === 'DEFAULT' ? card.default_tea : Math.max(0, Number(customTea) || 0);
    if (Number.isInteger(installmentCount) && installmentCount <= 60 && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      installmentPreview = {
        monthlyTotal: calculateInstallmentPlan(amountNumber, installmentCount, tea).monthlyTotal,
        startPeriod: resolveInstallmentStartPeriod(date, card.closing_day),
      };
    }
  }

  const splitsTotal = splits.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const categoryType = type === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const categories = data.categories.filter((category) => category.is_active && category.type === categoryType);

  function changeType(next: OperationType) {
    setType(next);
    setSource('ACCOUNT');
    setTransferKind('ACCOUNT');
    setAccountId('');
    setDestinationId('');
    setCardId('');
    setLoanId('');
    setInvestmentId('');
    setParentId('');
    setRate('');
    setInstallments('');
    setShared(false);
  }

  const accountOptions = data.accounts.map((item) => (
    <option key={item.id} value={item.id}>
      {item.name} · {formatMoney(item.current_balance, item.currency)}
    </option>
  ));

  const accountSelect = (name: string, label: string, value: string, onChange: (next: string) => void) => (
    <label className="text-sm">
      {label}
      <select name={name} required value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
        <option value="">Selecciona una cuenta</option>
        {accountOptions}
      </select>
    </label>
  );

  return (
    <form action={action} className="p-6">
      <input type="hidden" name="type" value={type} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id="new-operation-title" className="text-lg font-semibold">Nueva operación</h3>
          <p className="text-sm text-zinc-500">Registra un movimiento y actualiza tus saldos automáticamente.</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Cerrar" className="text-xl text-zinc-500">×</button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Tipo de operación">
        {OPERATION_ORDER.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={type === option}
            onClick={() => changeType(option)}
            className={
              type === option
                ? 'rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }
          >
            {OPERATION_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Fecha
          <input name="date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={fieldClass} />
        </label>
        <label className="text-sm">
          Monto{amountCurrency ? ` (${amountCurrency})` : ''}
          <input
            name="amount"
            required
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={type === 'LOAN_PAYMENT' && loan ? loan.monthly_installment_amount.toFixed(2) : 'Ej. 150.00'}
            className={fieldClass}
          />
        </label>

        {type === 'INCOME' && accountSelect('accountId', 'Cuenta que recibe', accountId, setAccountId)}

        {type === 'EXPENSE' && (
          <>
            <div className="text-sm sm:col-span-2">
              <span>Se paga con</span>
              <div className="mt-1 grid grid-cols-2 gap-2" role="group" aria-label="Medio de pago">
                {(['ACCOUNT', 'CARD'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={source === option}
                    onClick={() => {
                      setSource(option);
                      setAccountId('');
                      setCardId('');
                      setInstallments('');
                    }}
                    className={
                      source === option
                        ? 'rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }
                  >
                    {option === 'ACCOUNT' ? 'Cuenta o efectivo' : 'Tarjeta de crédito'}
                  </button>
                ))}
              </div>
            </div>
            {source === 'ACCOUNT' ? (
              accountSelect('accountId', 'Cuenta', accountId, setAccountId)
            ) : (
              <>
                <label className="text-sm">
                  Tarjeta
                  <select name="creditCardId" required value={cardId} onChange={(event) => setCardId(event.target.value)} className={selectClass}>
                    <option value="">Selecciona una tarjeta</option>
                    {data.cards.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Moneda del consumo
                  <select name="currency" value={effectiveCardCurrency} onChange={(event) => setCardCurrency(event.target.value as Currency)} className={selectClass}>
                    {cardCurrencyOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Número de cuotas (opcional)
                  <input
                    name="installments"
                    type="number"
                    min="1"
                    max="60"
                    step="1"
                    value={installments}
                    onChange={(event) => setInstallments(event.target.value)}
                    placeholder="Sin cuotas"
                    className={fieldClass}
                  />
                </label>
                {hasInstallments && card && (
                  <>
                    <label className="text-sm">
                      Intereses
                      <select
                        name="installmentMode"
                        value={installmentMode}
                        onChange={(event) => setInstallmentMode(event.target.value as InstallmentMode)}
                        className={selectClass}
                      >
                        <option value="ZERO">Cuotas sin intereses (0%)</option>
                        <option value="DEFAULT">TEA de la tarjeta ({card.default_tea}%)</option>
                        <option value="CUSTOM">TEA personalizada</option>
                      </select>
                    </label>
                    {installmentMode === 'CUSTOM' && (
                      <label className="text-sm">
                        TEA %
                        <input
                          name="customTea"
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={customTea}
                          onChange={(event) => setCustomTea(event.target.value)}
                          placeholder="Ej. 39.99"
                          className={fieldClass}
                        />
                      </label>
                    )}
                    {installmentPreview && amountCurrency && (
                      <p className="rounded-lg bg-zinc-100 p-3 text-xs text-zinc-600 sm:col-span-2 dark:bg-zinc-800 dark:text-zinc-300">
                        Cuota mensual estimada: <strong>{formatMoney(installmentPreview.monthlyTotal, amountCurrency)}</strong> · primer cobro en el periodo{' '}
                        <strong>{installmentPreview.startPeriod}</strong>. La compra reduce la línea por el monto total.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {type === 'TRANSFER' && (
          <>
            <label className="text-sm sm:col-span-2">
              Tipo de transferencia
              <select
                value={transferKind}
                onChange={(event) => {
                  setTransferKind(event.target.value as TransferKind);
                  setAccountId('');
                  setDestinationId('');
                  setInvestmentId('');
                  setRate('');
                }}
                className={selectClass}
              >
                <option value="ACCOUNT">Entre cuentas (incluye cambio de divisas)</option>
                <option value="TO_INVESTMENT">Aporte a una inversión</option>
                <option value="FROM_INVESTMENT">Retiro de una inversión</option>
              </select>
            </label>
            {transferKind !== 'FROM_INVESTMENT' && accountSelect('accountId', 'Cuenta de origen', accountId, setAccountId)}
            {transferKind === 'ACCOUNT' && accountSelect('destinationAccountId', 'Cuenta de destino', destinationId, setDestinationId)}
            {transferKind !== 'ACCOUNT' && (
              <label className="text-sm">
                Inversión
                <select name="investmentId" required value={investmentId} onChange={(event) => setInvestmentId(event.target.value)} className={selectClass}>
                  <option value="">Selecciona una inversión</option>
                  {data.investments.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} · {formatMoney(item.current_value, item.currency)}</option>
                  ))}
                </select>
              </label>
            )}
            {transferKind === 'FROM_INVESTMENT' && accountSelect('destinationAccountId', 'Cuenta de destino', destinationId, setDestinationId)}
          </>
        )}

        {type === 'CC_PAYMENT' && (
          <>
            <label className="text-sm">
              Tarjeta
              <select name="creditCardId" required value={cardId} onChange={(event) => setCardId(event.target.value)} className={selectClass}>
                <option value="">Selecciona una tarjeta</option>
                {data.cards.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · PEN {item.current_debt_pen.toFixed(2)} / USD {item.current_debt_usd.toFixed(2)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Deuda que se paga
              <select name="currency" value={effectiveCardCurrency} onChange={(event) => setCardCurrency(event.target.value as Currency)} className={selectClass}>
                {cardCurrencyOptions.map((option) => (
                  <option key={option} value={option}>Deuda en {option}</option>
                ))}
              </select>
            </label>
            {accountSelect('accountId', 'Cuenta desde la que pagas', accountId, setAccountId)}
          </>
        )}

        {type === 'LOAN_PAYMENT' && (
          <>
            <label className="text-sm">
              Préstamo
              <select name="loanId" required value={loanId} onChange={(event) => setLoanId(event.target.value)} className={selectClass}>
                <option value="">Selecciona un préstamo</option>
                {data.loans.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.lender_name} · {item.remaining_installments} cuotas
                  </option>
                ))}
              </select>
            </label>
            {accountSelect('accountId', 'Cuenta desde la que pagas', accountId, setAccountId)}
          </>
        )}

        {type === 'REFUND' && (
          <label className="text-sm sm:col-span-2">
            Gasto que se reembolsa
            <select name="parentTransactionId" required value={parentId} onChange={(event) => setParentId(event.target.value)} className={selectClass}>
              <option value="">Selecciona un gasto</option>
              {data.refundable.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.description} · pendiente {formatMoney(item.remaining, item.currency)}
                </option>
              ))}
            </select>
            {data.refundable.length === 0 && <span className="mt-1 block text-xs text-zinc-500">No hay gastos pendientes de reembolso.</span>}
            {parent && <span className="mt-1 block text-xs text-zinc-500">El dinero vuelve a la cuenta o tarjeta del gasto original.</span>}
          </label>
        )}

        {needsRate && amountCurrency && targetCurrency && (
          <div className="sm:col-span-2">
            <label className="text-sm">
              Tipo de cambio aplicado (USD → PEN)
              <input
                name="exchangeRate"
                required
                type="number"
                min="0.0001"
                step="0.0001"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder={data.exchangeRate ? `Referencial ${data.exchangeRate.toFixed(4)}` : 'Ej. 3.7500'}
                className={fieldClass}
              />
            </label>
            {converted !== null && (
              <p className="mt-2 text-xs text-zinc-500">
                {type === 'TRANSFER'
                  ? `Se acreditarán ${formatMoney(converted, targetCurrency)} en el destino.`
                  : `Se descontarán ${formatMoney(converted, targetCurrency)} de tu cuenta.`}
              </p>
            )}
          </div>
        )}

        {(type === 'INCOME' || type === 'EXPENSE') && (
          <label className="text-sm">
            {type === 'INCOME' ? 'Origen del ingreso' : 'Categoría'} (opcional)
            <select name="categoryId" defaultValue="" className={selectClass}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
        )}

        <label className={type === 'INCOME' || type === 'EXPENSE' ? 'text-sm' : 'text-sm sm:col-span-2'}>
          Descripción (opcional)
          <input name="description" maxLength={255} placeholder="Ej. Almuerzo con amigos" className={fieldClass} />
        </label>
      </div>

      {type === 'EXPENSE' && (
        <div className="mt-5 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={shared} onChange={(event) => setShared(event.target.checked)} className="h-4 w-4" />
            Gasto compartido (alguien me debe parte de este gasto)
          </label>
          {shared && (
            <div className="mt-4 space-y-3">
              {splits.map((row) => (
                <div key={row.id} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
                  <label className="text-xs">
                    Deudor
                    <input
                      name="splitDebtor"
                      value={row.name}
                      onChange={(event) => setSplits((rows) => rows.map((item) => (item.id === row.id ? { ...item, name: event.target.value } : item)))}
                      placeholder="Nombre"
                      className={fieldClass}
                    />
                  </label>
                  <label className="text-xs">
                    Monto
                    <input
                      name="splitAmount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.amount}
                      onChange={(event) => setSplits((rows) => rows.map((item) => (item.id === row.id ? { ...item, amount: event.target.value } : item)))}
                      placeholder="0.00"
                      className={fieldClass}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label="Quitar deudor"
                    disabled={splits.length === 1}
                    onClick={() => setSplits((rows) => rows.filter((item) => item.id !== row.id))}
                    className="mb-1 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <button
                  type="button"
                  onClick={() => setSplits((rows) => [...rows, { id: Math.max(0, ...rows.map((item) => item.id)) + 1, name: '', amount: '' }])}
                  className="font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                >
                  + Añadir deudor
                </button>
                {amountCurrency && amountNumber > 0 && (
                  <span>
                    Tu parte: {formatMoney(Math.max(0, amountNumber - splitsTotal), amountCurrency)}. El presupuesto recibe el gasto completo hasta que te paguen.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">Cancelar</button>
        <button disabled={pending} className={primaryButtonClass}>{pending ? 'Guardando...' : 'Registrar operación'}</button>
      </div>
    </form>
  );
}
