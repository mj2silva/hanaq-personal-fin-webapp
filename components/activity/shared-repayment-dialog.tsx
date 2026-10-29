'use client';

import { useActionState, useEffect, useRef } from 'react';
import { registerSharedRepayment, type ActivityActionState } from '@/app/(app)/actividad/actions';
import { formatMoney } from '@/lib/format';
import { dialogClass, fieldClass, primaryButtonClass, selectClass } from './styles';
import type { Account, SharedSplitView } from './types';

const initialState: ActivityActionState = {};

export function SharedRepaymentDialog({
  split,
  accounts,
  today,
}: {
  split: SharedSplitView;
  accounts: Account[];
  today: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(registerSharedRepayment, initialState);
  const pendingAmount = Math.max(0, split.amount_owed - split.amount_paid);
  const compatibleAccounts = accounts.filter((account) => account.currency === split.currency);

  useEffect(() => {
    if (state.token) dialogRef.current?.close();
  }, [state.token]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Registrar cobro
      </button>
      <dialog ref={dialogRef} className={`${dialogClass} w-[min(94vw,28rem)]`} aria-labelledby={`repayment-title-${split.id}`}>
        <form key={state.token ?? 'initial'} action={action} className="p-6">
          <input type="hidden" name="splitId" value={split.id} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id={`repayment-title-${split.id}`} className="text-lg font-semibold">Registrar cobro</h3>
              <p className="text-sm text-zinc-500">
                {split.debtor_name} te debe {formatMoney(pendingAmount, split.currency)} por «{split.originDescription}».
              </p>
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Cerrar" className="text-xl text-zinc-500">×</button>
          </div>
          <div className="mt-5 grid gap-4">
            <label className="text-sm">
              Cuenta que recibe el dinero ({split.currency})
              <select name="accountId" required defaultValue="" className={selectClass}>
                <option value="">Selecciona una cuenta</option>
                {compatibleAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name} · {formatMoney(account.current_balance, account.currency)}</option>
                ))}
              </select>
              {compatibleAccounts.length === 0 && (
                <span className="mt-1 block text-xs text-red-600">No tienes cuentas activas en {split.currency}.</span>
              )}
            </label>
            <label className="text-sm">
              Monto cobrado ({split.currency})
              <input
                name="amount"
                required
                type="number"
                min="0.01"
                max={pendingAmount}
                step="0.01"
                placeholder={`Máximo ${pendingAmount.toFixed(2)}`}
                className={fieldClass}
              />
            </label>
            <label className="text-sm">
              Fecha
              <input name="date" type="date" required defaultValue={today} className={fieldClass} />
            </label>
            <p className="text-xs text-zinc-500">
              El cobro aumenta el saldo de la cuenta y reduce el consumo del presupuesto; no se contabiliza como ingreso.
            </p>
          </div>
          {state.error && <p className="mt-4 text-sm text-red-600" role="alert">{state.error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">Cancelar</button>
            <button disabled={pending || compatibleAccounts.length === 0} className={primaryButtonClass}>{pending ? 'Guardando...' : 'Registrar cobro'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
