'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { editTransaction, type ActivityActionState } from '@/app/(app)/actividad/actions';
import { dialogClass, fieldClass, primaryButtonClass } from './styles';
import type { Transaction } from './types';

const initialState: ActivityActionState = {};

export function EditTransactionDialog({ transaction }: { transaction: Transaction }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(editTransaction, initialState);
  const date = new Date(transaction.transaction_date).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const financialEdit = transaction.type === 'INCOME' || (transaction.type === 'EXPENSE' && !!transaction.account_id);

  useEffect(() => {
    if (state.token) dialogRef.current?.close();
  }, [state.token]);

  return <>
    <button type="button" onClick={() => dialogRef.current?.showModal()} aria-label={`Editar ${transaction.description}`} title="Editar movimiento" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
    <dialog ref={dialogRef} className={`${dialogClass} w-[min(94vw,28rem)]`} aria-labelledby={`edit-title-${transaction.id}`}>
      <form key={state.token ?? 'initial'} action={action} className="p-6">
        <h3 id={`edit-title-${transaction.id}`} className="text-lg font-semibold">Editar movimiento</h3>
        <input type="hidden" name="transactionId" value={transaction.id} />
        <div className="mt-5 grid gap-4">
          <label className="text-sm">Descripción<input name="description" defaultValue={transaction.description} maxLength={255} required className={fieldClass} /></label>
          {financialEdit ? <>
            <input type="hidden" name="originalAmount" value={transaction.amount} />
            <input type="hidden" name="originalDate" value={date} />
            <label className="text-sm">Monto ({transaction.currency})<input name="amount" type="number" min="0.01" step="0.01" defaultValue={transaction.amount} required className={fieldClass} /></label>
            <label className="text-sm">Fecha<input name="date" type="date" defaultValue={date} required className={fieldClass} /></label>
            <p className="text-xs text-zinc-500">Los movimientos con operaciones relacionadas pueden impedir cambios de monto o fecha.</p>
          </> : <p className="text-xs text-zinc-500">Por ahora solo se puede modificar la descripción de este tipo de movimiento.</p>}
        </div>
        {state.error && <p className="mt-4 text-sm text-red-600" role="alert">{state.error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => dialogRef.current?.close()} className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">Cancelar</button>
          <button disabled={pending} className={primaryButtonClass}>{pending ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </form>
    </dialog>
  </>;
}