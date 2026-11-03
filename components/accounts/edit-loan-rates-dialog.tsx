'use client';

import { useActionState, useRef } from 'react';
import { updateLoanRate, type AccountsActionState } from '@/app/(app)/cuentas/actions';
import type { Tables } from '@/types/database.types';

const initialState: AccountsActionState = {};
const field = 'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-100';

export function EditLoanRatesDialog({ loan }: { loan: Tables<'loans'> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(updateLoanRate, initialState);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Editar tasas
      </button>
      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto max-h-[90vh] w-[min(92vw,32rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/45 backdrop:backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <form action={action} className="p-6">
          <input type="hidden" name="id" value={loan.id} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Editar tasas del préstamo</h3>
              <p className="text-sm text-zinc-500">{loan.lender_name}</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
              className="text-xl text-zinc-500"
            >
              ×
            </button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              TEA %
              <input
                name="tea"
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={loan.tea_percentage}
                className={field}
              />
            </label>
            <label className="text-sm">
              TCEA % (opcional)
              <input
                name="tcea"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={loan.tcea_percentage ?? ''}
                placeholder="Informativa"
                className={field}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            La TEA estima el interés mensual de futuros pagos; la TCEA es de referencia informativa. Los cambios no modifican pagos anteriores.
          </p>
          {state.error && <p className="mt-4 text-sm text-red-600" role="alert">{state.error}</p>}
          {state.success && <p className="mt-4 text-sm text-emerald-600" role="status">{state.success}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400"
            >
              Cerrar
            </button>
            <button
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? 'Guardando...' : 'Guardar tasas'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
