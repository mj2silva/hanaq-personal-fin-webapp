'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { editTransaction, type ActivityActionState } from '@/app/(app)/actividad/actions';
import { dialogClass, fieldClass, primaryButtonClass, selectClass } from './styles';
import type { OperationReferenceData, Transaction } from './types';

const initialState: ActivityActionState = {};

export function EditTransactionDialog({
  transaction,
  cards = [],
  transactions = [],
}: {
  transaction: Transaction;
  cards?: OperationReferenceData['cards'];
  transactions?: Transaction[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(editTransaction, initialState);
  const date = new Date(transaction.transaction_date).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  useEffect(() => {
    if (state.token) dialogRef.current?.close();
  }, [state.token]);

  // Determine what kind of financial editing is permitted
  const isSimpleIncomeExpense =
    (transaction.type === 'INCOME' || transaction.type === 'EXPENSE') &&
    Boolean(transaction.account_id) &&
    !transaction.is_installment &&
    !transaction.is_shared_expense &&
    !transaction.credit_card_id;

  const isSimpleTransfer =
    transaction.type === 'TRANSFER' &&
    Boolean(transaction.account_id) &&
    Boolean(transaction.destination_account_id) &&
    !transaction.investment_id &&
    transaction.converted_amount === null;

  const isDirectCardExpense =
    transaction.type === 'EXPENSE' &&
    Boolean(transaction.credit_card_id) &&
    !transaction.is_installment &&
    !transaction.is_shared_expense;

  const isCardPayment =
    transaction.type === 'CC_PAYMENT' &&
    Boolean(transaction.credit_card_id) &&
    Boolean(transaction.account_id) &&
    transaction.converted_amount === null;

  const isInstallmentExpense =
    transaction.type === 'EXPENSE' &&
    Boolean(transaction.credit_card_id) &&
    transaction.is_installment;

  const isSharedExpense =
    transaction.type === 'EXPENSE' &&
    transaction.is_shared_expense;

  // For loan payments, verify if it is the latest payment recorded on the loan
  const isLatestLoanPayment = (() => {
    if (transaction.type !== 'LOAN_PAYMENT' || !transaction.loan_id) return false;
    const loanPayments = transactions.filter(
      (t) => t.loan_id === transaction.loan_id && t.type === 'LOAN_PAYMENT'
    );
    if (loanPayments.length === 0) return true;
    const latest = loanPayments.reduce((prev, curr) => {
      if (curr.transaction_date > prev.transaction_date) return curr;
      if (curr.transaction_date === prev.transaction_date && curr.created_at > prev.created_at) return curr;
      return prev;
    }, loanPayments[0]);
    return latest.id === transaction.id;
  })();

  const canEditAmountAndDate =
    isSimpleIncomeExpense ||
    isSimpleTransfer ||
    isDirectCardExpense ||
    isCardPayment ||
    isInstallmentExpense ||
    isSharedExpense ||
    isLatestLoanPayment;

  const canChangeCard = isDirectCardExpense || isInstallmentExpense;
  const canEditLoanInterest = isLatestLoanPayment;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`Editar ${transaction.description}`}
        title="Editar movimiento"
        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        className={`${dialogClass} w-[min(94vw,28rem)]`}
        aria-labelledby={`edit-title-${transaction.id}`}
      >
        <form key={state.token ?? 'initial'} action={action} className="p-6">
          <h3 id={`edit-title-${transaction.id}`} className="text-lg font-semibold">
            Editar movimiento
          </h3>
          <input type="hidden" name="transactionId" value={transaction.id} />
          <div className="mt-5 grid gap-4">
            <label className="text-sm">
              Descripción
              <input
                name="description"
                defaultValue={transaction.description}
                maxLength={255}
                required
                className={fieldClass}
              />
            </label>

            {canEditAmountAndDate ? (
              <>
                <input type="hidden" name="originalAmount" value={transaction.amount} />
                <input type="hidden" name="originalDate" value={date} />
                <label className="text-sm">
                  Monto ({transaction.currency})
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={transaction.amount}
                    required
                    className={fieldClass}
                  />
                </label>
                <label className="text-sm">
                  Fecha
                  <input
                    name="date"
                    type="date"
                    defaultValue={date}
                    required
                    className={fieldClass}
                  />
                </label>

                {canChangeCard && (
                  <>
                    <input type="hidden" name="originalCreditCardId" value={transaction.credit_card_id ?? ''} />
                    <label className="text-sm">
                      Tarjeta de crédito
                      <select
                        name="creditCardId"
                        defaultValue={transaction.credit_card_id ?? ''}
                        className={selectClass}
                      >
                        {cards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (corte día {c.closing_day})
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                {canEditLoanInterest && (
                  <>
                    <input type="hidden" name="originalLoanInterest" value={transaction.loan_interest ?? ''} />
                    <label className="text-sm">
                      Interés del pago (opcional, calculo con TEA si vacío)
                      <input
                        name="loanInterest"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={transaction.loan_interest ?? ''}
                        placeholder="Estimado por TEA"
                        className={fieldClass}
                      />
                    </label>
                  </>
                )}

                <p className="text-xs text-zinc-500">
                  {isDirectCardExpense || isInstallmentExpense || isCardPayment
                    ? 'La fecha debe encontrarse dentro del ciclo de facturación actual de la tarjeta.'
                    : isLatestLoanPayment
                      ? 'Solo se puede editar el último pago del préstamo registrado.'
                      : isSharedExpense
                        ? 'Solo se puede editar el monto si aún no tiene cobros o reembolsos.'
                        : 'Ajustará automáticamente los saldos correspondientes.'}
                </p>
              </>
            ) : (
              <p className="text-xs text-zinc-500">
                {transaction.type === 'LOAN_PAYMENT'
                  ? 'Solo se puede editar el monto del último pago realizado en este préstamo.'
                  : 'Por ahora solo se puede modificar la descripción de este tipo de movimiento.'}
              </p>
            )}
          </div>
          {state.error && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300"
            >
              Cancelar
            </button>
            <button disabled={pending} className={primaryButtonClass}>
              {pending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
