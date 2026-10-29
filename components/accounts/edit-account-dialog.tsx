'use client';

import { useActionState, useRef } from 'react';
import { updateAccount, type AccountsActionState } from '@/app/(app)/cuentas/actions';
import type { Tables } from '@/types/database.types';

const initialState: AccountsActionState = {};
const field = 'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-100';

export function EditAccountDialog({ account }: { account: Tables<'accounts'> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(updateAccount, initialState);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
        Editar
      </button>
      <dialog ref={dialogRef} className="fixed inset-0 m-auto max-h-[90vh] w-[min(92vw,32rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/45 backdrop:backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
        <form action={action} className="p-6">
          <input type="hidden" name="id" value={account.id} />
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">Editar cuenta</h3><p className="text-sm text-zinc-500">Actualiza los datos de esta cuenta.</p></div><button type="button" onClick={() => dialogRef.current?.close()} aria-label="Cerrar" className="text-xl text-zinc-500">×</button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Nombre<input name="name" required defaultValue={account.name} className={field} /></label>
            <label className="text-sm">Tipo<select name="type" defaultValue={account.type} className={field}><option value="BANK_ACCOUNT">Cuenta bancaria</option><option value="CASH_BOX">Caja de efectivo</option></select></label>
            <label className="text-sm">Banco<input name="bankName" defaultValue={account.bank_name ?? ''} className={field} /></label>
            <label className="text-sm">Moneda<select name="currency" defaultValue={account.currency} className={field}><option value="PEN">PEN</option><option value="USD">USD</option></select></label>
            <label className="text-sm">Saldo inicial<input name="balance" required type="number" min="0" step="0.01" defaultValue={account.initial_balance} className={field} /></label>
            <label className="text-sm">TREA %<input name="trea" required type="number" min="0" max="100" step="0.01" defaultValue={account.trea_percentage ?? ''} className={field} /></label>
          </div>
          {state.error && <p className="mt-4 text-sm text-red-600" role="alert">{state.error}</p>}
          {state.success && <p className="mt-4 text-sm text-emerald-600" role="status">{state.success}</p>}
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => dialogRef.current?.close()} className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600">Cancelar</button><button disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">{pending ? 'Guardando...' : 'Guardar cambios'}</button></div>
        </form>
      </dialog>
    </>
  );
}
