'use client';

import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteTransaction, type ActivityActionState } from '@/app/(app)/actividad/actions';

const initialState: ActivityActionState = {};

export function DeleteTransactionButton({ transactionId, description }: { transactionId: string; description: string }) {
  const [state, action, pending] = useActionState(deleteTransaction, initialState);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`¿Eliminar «${description}»? Se revertirán los saldos afectados.`)) event.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="transactionId" value={transactionId} />
      <button
        disabled={pending}
        aria-label={`Eliminar ${description}`}
        title="Eliminar movimiento"
        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
      {state.error && <p className="max-w-56 text-right text-xs text-red-600" role="alert">{state.error}</p>}
    </form>
  );
}
