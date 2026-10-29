'use client';

import { useActionState } from 'react';
import {
  completeOnboarding,
  createCategory,
  saveExchangeRate,
  toggleCategory,
  type ConfigurationActionState,
} from '@/app/(app)/configuracion/actions';
import type { Tables } from '@/types/database.types';
import { RegistrationDialog } from '@/components/accounts/registration-dialog';

type Category = Tables<'categories'>;

const initialState: ConfigurationActionState = {};

function ActionMessage({ state }: { state: ConfigurationActionState }) {
  if (!state.error && !state.success) return null;
  return (
    <p className={state.error ? 'text-sm text-red-600' : 'text-sm text-emerald-600'} role="status">
      {state.error ?? state.success}
    </p>
  );
}

function inputClassName() {
  return 'mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100';
}

function selectClassName() {
  return `${inputClassName()} bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100`;
}

async function toggleCategoryFromForm(formData: FormData): Promise<void> {
  await toggleCategory(null, formData);
}

export function ConfigurationPanel({
  categories,
  latestRate,
  onboardingCompleted,
}: {
  categories: Category[];
  latestRate: number | null;
  onboardingCompleted: boolean;
}) {
  const [categoryState, categoryAction, categoryPending] = useActionState(createCategory, initialState);
  const [rateState, rateAction, ratePending] = useActionState(saveExchangeRate, initialState);
  const [onboardingState, onboardingAction, onboardingPending] = useActionState(
    completeOnboarding,
    initialState
  );

  return (
    <div className="space-y-6">
      {!onboardingCompleted && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/60 dark:bg-amber-950/30">
          <h2 className="text-lg font-semibold">Asistente inicial (Día 0)</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Registra el tipo de cambio y tu primera cuenta. La tarjeta es opcional.
          </p>
          <div className="mt-5">
          <RegistrationDialog title="Configuración inicial" description="Registra tu primera cuenta y, opcionalmente, una tarjeta." trigger="Iniciar configuración">
          <form action={onboardingAction} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">Tipo de cambio USD/PEN<input name="exchangeRate" type="number" step="0.0001" min="0.0001" required className={inputClassName()} /></label>
            <label className="text-sm">Nombre de cuenta<input name="accountName" required className={inputClassName()} placeholder="Cuenta principal" /></label>
            <label className="text-sm">Tipo<select name="accountType" className={selectClassName()}><option value="BANK_ACCOUNT">Cuenta bancaria</option><option value="CASH_BOX">Caja de efectivo</option></select></label>
            <label className="text-sm">Banco (opcional)<input name="accountBankName" className={inputClassName()} /></label>
            <label className="text-sm">Moneda<select name="accountCurrency" className={selectClassName()}><option value="PEN">PEN</option><option value="USD">USD</option></select></label>
            <label className="text-sm">Saldo inicial<input name="accountBalance" type="number" step="0.01" min="0" required className={inputClassName()} /></label>
            <div className="md:col-span-2 border-t border-amber-200 pt-4 dark:border-amber-900/60">
              <p className="text-sm font-semibold">Tarjeta de crédito (opcional)</p>
            </div>
            <label className="text-sm">Nombre<input name="cardName" className={inputClassName()} /></label>
            <label className="text-sm">Banco<input name="cardBankName" className={inputClassName()} /></label>
            <label className="text-sm">Línea PEN<input name="cardLimitPen" type="number" step="0.01" min="0" className={inputClassName()} /></label>
            <label className="text-sm">Línea USD<input name="cardLimitUsd" type="number" step="0.01" min="0" className={inputClassName()} /></label>
            <label className="text-sm">Deuda PEN<input name="cardDebtPen" type="number" step="0.01" min="0" className={inputClassName()} /></label>
            <label className="text-sm">Deuda USD<input name="cardDebtUsd" type="number" step="0.01" min="0" className={inputClassName()} /></label>
            <label className="text-sm">Día de cierre<input name="cardClosingDay" type="number" min="1" max="31" className={inputClassName()} /></label>
            <label className="text-sm">Día de pago<input name="cardPaymentDueDay" type="number" min="1" max="31" className={inputClassName()} /></label>
            <div className="md:col-span-2 flex items-center justify-between gap-4">
              <ActionMessage state={onboardingState} />
              <button disabled={onboardingPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
                {onboardingPending ? 'Guardando...' : 'Completar configuración'}
              </button>
            </div>
          </form>
          </RegistrationDialog>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Tipo de cambio referencial</h2>
          <p className="mt-1 text-sm text-zinc-500">Último registro: {latestRate?.toFixed(4) ?? 'Sin registrar'}</p>
          <div className="mt-4"><RegistrationDialog title="Registrar tipo de cambio" description="Añade el tipo de cambio USD/PEN de una fecha." trigger="Añadir tipo de cambio"><form action={rateAction} className="space-y-4">
            <label className="block text-sm">Fecha<input name="rateDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className={inputClassName()} /></label>
            <label className="block text-sm">USD a PEN<input name="usdToPenRate" type="number" step="0.0001" min="0.0001" defaultValue={latestRate ?? ''} required className={inputClassName()} /></label>
            <div className="flex items-center justify-between gap-4"><ActionMessage state={rateState} /><button disabled={ratePending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">{ratePending ? 'Guardando...' : 'Guardar tipo de cambio'}</button></div>
          </form></RegistrationDialog></div>
        </section>

        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold">Categorías</h2>
          <div className="mt-4"><RegistrationDialog title="Registrar categoría" description="Añade un origen de ingreso o rubro de gasto." trigger="Añadir categoría"><form action={categoryAction} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input name="name" required maxLength={100} placeholder="Ej. Alimentación" className={inputClassName()} />
            <select name="type" className={selectClassName()}><option value="EXPENSE">Gasto</option><option value="INCOME">Ingreso</option></select>
            <button disabled={categoryPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">{categoryPending ? '...' : 'Añadir'}</button>
          </form></RegistrationDialog></div>
          <ActionMessage state={categoryState} />
          <ul className="mt-5 divide-y divide-zinc-200 dark:divide-zinc-800">
            {categories.length === 0 && <li className="py-3 text-sm text-zinc-500">Todavía no hay categorías.</li>}
            {categories.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className={category.is_active ? '' : 'text-zinc-400 line-through'}>{category.name} <span className="text-xs text-zinc-500">({category.type === 'EXPENSE' ? 'Gasto' : 'Ingreso'})</span></span>
                <form action={toggleCategoryFromForm}><input type="hidden" name="id" value={category.id} /><input type="hidden" name="isActive" value={String(category.is_active)} /><button className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">{category.is_active ? 'Desactivar' : 'Activar'}</button></form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
