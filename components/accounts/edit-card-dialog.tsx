'use client';

import { useActionState, useRef } from 'react';
import { updateCreditCard, type AccountsActionState } from '@/app/(app)/cuentas/actions';
import type { Tables } from '@/types/database.types';

const initialState: AccountsActionState = {};
const field = 'mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-100';

export function EditCardDialog({ card }: { card: Tables<'credit_cards'> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(updateCreditCard, initialState);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Editar</button>
      <dialog ref={dialogRef} className="fixed inset-0 m-auto max-h-[90vh] w-[min(92vw,38rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/45 backdrop:backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
        <form action={action} className="p-6">
          <input type="hidden" name="id" value={card.id} />
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">Editar tarjeta</h3><p className="text-sm text-zinc-500">Actualiza línea, deuda inicial y condiciones.</p></div><button type="button" onClick={() => dialogRef.current?.close()} aria-label="Cerrar" className="text-xl text-zinc-500">×</button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Nombre<input name="name" required defaultValue={card.name} className={field} /></label><label className="text-sm">Banco<input name="bankName" defaultValue={card.bank_name ?? ''} className={field} /></label>
            <label className="text-sm">Moneda de la línea<select name="limitCurrency" defaultValue={card.credit_limit_currency} className={field}><option value="PEN">PEN</option><option value="USD">USD</option></select></label><label className="text-sm">Línea de crédito<input name="limitAmount" required type="number" min="0" step="0.01" defaultValue={card.credit_limit_amount} className={field} /></label>
            <label className="text-sm">Alerta de utilización %<input name="alertPercentage" required type="number" min="0" max="100" step="1" defaultValue={card.credit_limit_alert_percentage} className={field} /></label>
            <label className="text-sm">Deuda inicial PEN<input name="debtPen" required type="number" min="0" step="0.01" defaultValue={card.initial_debt_pen} className={field} /></label><label className="text-sm">Deuda inicial USD<input name="debtUsd" required type="number" min="0" step="0.01" defaultValue={card.initial_debt_usd} className={field} /></label>
            <label className="text-sm">Día de cierre<input name="closingDay" required type="number" min="1" max="31" defaultValue={card.closing_day} className={field} /></label><label className="text-sm">Día de pago<input name="paymentDueDay" required type="number" min="1" max="31" defaultValue={card.payment_due_day} className={field} /></label>
            <label className="text-sm">Desgravamen %<input name="desgravamenRate" required type="number" min="0" step="0.0001" defaultValue={(card.desgravamen_rate * 100).toFixed(4)} className={field} /></label><label className="text-sm">Tope desgravamen PEN<input name="desgravamenMaxPen" required type="number" min="0" step="0.01" defaultValue={card.desgravamen_max_pen} className={field} /></label>
            <label className="text-sm">Regla de exoneración<select name="exemptionRule" defaultValue={card.exemption_rule} className={field}><option value="NONE">Sin exoneración</option><option value="MIN_MONTHLY_SPEND">Consumo mensual mínimo</option><option value="MIN_ANNUAL_SPEND">Consumo anual mínimo</option></select></label><label className="text-sm">Meta de exoneración<input name="exemptionMinAmount" required type="number" min="0" step="0.01" defaultValue={card.exemption_min_amount ?? ''} className={field} /></label>
          </div>
          {state.error && <p className="mt-4 text-sm text-red-600" role="alert">{state.error}</p>}{state.success && <p className="mt-4 text-sm text-emerald-600" role="status">{state.success}</p>}
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => dialogRef.current?.close()} className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600">Cancelar</button><button disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">{pending ? 'Guardando...' : 'Guardar cambios'}</button></div>
        </form>
      </dialog>
    </>
  );
}
