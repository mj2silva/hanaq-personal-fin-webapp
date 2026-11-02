'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2, PieChart } from 'lucide-react';
import { RegistrationDialog } from '@/components/accounts/registration-dialog';
import { selectClass, fieldClass, primaryButtonClass } from '@/components/activity/styles';
import {
  copyPreviousBudgets,
  payFixedExpense,
  reverseFixedExpense,
  saveBudget,
  saveFixedExpense,
  toggleFixedExpense,
  type MonthActionState,
} from '@/app/(app)/mi-mes/actions';
import type { Tables } from '@/types/database.types';

type Category = Tables<'categories'>;
type Budget = Tables<'budgets'>;
type FixedExpense = Tables<'fixed_expenses_template'>;
type Checklist = Tables<'monthly_fixed_checklist'>;
type Account = Tables<'accounts'>;
type Card = Tables<'credit_cards'>;
type BudgetWithUsage = Budget & { usage: number };

export interface MonthItem extends FixedExpense {
  categoryName: string;
  checklist: Checklist | null;
}

function Message({ state }: { state: MonthActionState }) {
  if (!state.error && !state.success) return null;
  return <p className={state.error ? 'text-sm text-red-600' : 'text-sm text-emerald-600'} role="status">{state.error ?? state.success}</p>;
}

function ActionForm({
  action,
  submitLabel = 'Guardar',
  children,
}: {
  action: (state: MonthActionState | null, formData: FormData) => Promise<MonthActionState>;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-4">{children}<div className="flex items-center justify-between gap-3"><Message state={state} /><button className={primaryButtonClass} disabled={pending}>{pending ? 'Guardando...' : submitLabel}</button></div></form>;
}

function BudgetDialog({
  period,
  category,
  budget,
}: {
  period: string;
  category: Category;
  budget?: BudgetWithUsage;
}) {
  return (
    <RegistrationDialog
      title={budget ? `Editar presupuesto de ${category.name}` : 'Configurar presupuesto'}
      description="Define el tope mensual de una categoría en soles."
      trigger={budget ? 'Editar' : 'Configurar presupuesto'}
    >
      <ActionForm action={saveBudget}>
        <input type="hidden" name="period" value={period} />
        <input type="hidden" name="categoryId" value={category.id} />
        <label className="block text-sm">
          Categoría
          <input value={category.name} readOnly className={fieldClass} />
        </label>
        <label className="block text-sm">
          Tope mensual PEN
          <input
            name="limitAmountPen"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={budget?.limit_amount_pen}
            placeholder="0.00"
            className={fieldClass}
          />
        </label>
      </ActionForm>
    </RegistrationDialog>
  );
}

function BudgetConfigurationDialog({
  period,
  categories,
  budgets,
}: {
  period: string;
  categories: Category[];
  budgets: BudgetWithUsage[];
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const budgetByCategory = new Map(budgets.map((budget) => [budget.category_id, budget]));
  const selectedBudget = budgetByCategory.get(categoryId);

  return (
    <RegistrationDialog
      title="Configurar presupuesto"
      description="Define o actualiza el tope mensual de una categoría en soles."
      trigger="Configurar presupuesto"
    >
      <ActionForm action={saveBudget}>
        <input type="hidden" name="period" value={period} />
        <label className="block text-sm">
          Categoría
          <select
            name="categoryId"
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={selectClass}
          >
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          Tope mensual PEN
          <input
            key={categoryId}
            name="limitAmountPen"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={selectedBudget?.limit_amount_pen}
            placeholder="0.00"
            className={fieldClass}
          />
        </label>
      </ActionForm>
    </RegistrationDialog>
  );
}

export function MonthPanel({
  period,
  categories,
  budgets,
  items,
  accounts,
  cards,
}: {
  period: string;
  categories: Category[];
  budgets: BudgetWithUsage[];
  items: MonthItem[];
  accounts: Account[];
  cards: Card[];
}) {
  const expenseCategories = categories.filter((category) => category.type === 'EXPENSE' && category.is_active);
  const budgetByCategory = new Map(budgets.map((budget) => [budget.category_id, budget]));
  const [toggleState, toggleAction] = useActionState(toggleFixedExpense, {});
  const [copyState, copyAction, copyPending] = useActionState(copyPreviousBudgets, {});

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">Mi Mes</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Presupuestos y gastos fijos de {period}.</p>
        </div>
        <BudgetConfigurationDialog period={period} categories={expenseCategories} budgets={budgets} />
      </div>

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2.5"><PieChart className="h-5 w-5" /><h2 className="text-lg font-semibold">Presupuestos por categoría</h2></div>
        <form action={copyAction} className="mt-4 flex flex-wrap items-center gap-3">
          <button className={primaryButtonClass} disabled={copyPending}>{copyPending ? 'Copiando...' : 'Copiar presupuestos del mes anterior'}</button>
          <Message state={copyState} />
        </form>
        {expenseCategories.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Crea una categoría de gasto en Configuración para asignar presupuestos.</p> : (
          <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {expenseCategories.map((category) => {
              const budget = budgetByCategory.get(category.id);
              const usage = budget?.usage ?? 0;
              const percentage = budget && budget.limit_amount_pen > 0 ? Math.round((usage / budget.limit_amount_pen) * 100) : 0;
              return <li key={category.id} className="space-y-2 py-3 text-sm"><div className="flex items-center justify-between gap-4"><span>{category.name}</span><span className="flex items-center gap-3 text-zinc-500">{budget ? `S/ ${usage.toFixed(2)} de S/ ${budget.limit_amount_pen.toFixed(2)}` : 'Sin tope'}{budget && <BudgetDialog period={period} category={category} budget={budget} />}</span></div>{budget && <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className={`h-full rounded-full ${percentage > 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, percentage)}%` }} /></div>}</li>;
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5"><CheckCircle2 className="h-5 w-5" /><div><h2 className="text-lg font-semibold">Checklist de gastos fijos</h2><p className="text-sm text-zinc-500">Marca cada recibo con el monto real y el origen del pago.</p></div></div>
          <RegistrationDialog title="Añadir gasto fijo" description="Crea una plantilla para tus recibos y suscripciones." trigger="Añadir gasto fijo">
            <ActionForm action={saveFixedExpense}>
              <label className="block text-sm">Nombre<input name="name" required maxLength={100} placeholder="Internet, luz..." className={fieldClass} /></label>
              <label className="block text-sm">Categoría<select name="categoryId" required className={selectClass}>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm">Monto estimado<input name="estimatedAmount" type="number" min="0.01" step="0.01" required placeholder="0.00" className={fieldClass} /></label><label className="text-sm">Moneda<select name="currency" className={selectClass}><option value="PEN">PEN</option><option value="USD">USD</option></select></label><label className="text-sm">Día de vencimiento<input name="dueDay" type="number" min="1" max="31" required placeholder="15" className={fieldClass} /></label></div>
            </ActionForm>
          </RegistrationDialog>
        </div>
        <Message state={toggleState} />
        {items.length === 0 ? <p className="mt-5 text-sm text-zinc-500">Todavía no hay gastos fijos configurados.</p> : <ul className="mt-5 divide-y divide-zinc-200 dark:divide-zinc-800">
          {items.map((item) => <li key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-medium">{item.name}</p><p className="text-xs text-zinc-500">{item.categoryName} · {item.currency} {item.estimated_amount.toFixed(2)} · vence el día {item.due_day}</p>{item.checklist?.is_paid && <p className="text-xs text-emerald-600">Pagado: {item.checklist.actual_amount?.toFixed(2)}</p>}</div>
            <div className="flex items-center gap-3">
              <RegistrationDialog title={`Editar ${item.name}`} description="Actualiza la plantilla del gasto fijo." trigger="Editar">
                <ActionForm action={saveFixedExpense}>
                  <input type="hidden" name="id" value={item.id} />
                  <label className="block text-sm">Nombre<input name="name" required maxLength={100} defaultValue={item.name} className={fieldClass} /></label>
                  <label className="block text-sm">Categoría<select name="categoryId" required defaultValue={item.category_id} className={selectClass}>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                  <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm">Monto estimado<input name="estimatedAmount" type="number" min="0.01" step="0.01" required defaultValue={item.estimated_amount} className={fieldClass} /></label><label className="text-sm">Moneda<select name="currency" defaultValue={item.currency} className={selectClass}><option value="PEN">PEN</option><option value="USD">USD</option></select></label><label className="text-sm">Día de vencimiento<input name="dueDay" type="number" min="1" max="31" required defaultValue={item.due_day} className={fieldClass} /></label></div>
                </ActionForm>
              </RegistrationDialog>
              <form action={toggleAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="isActive" value={String(item.is_active)} /><button className="text-xs font-semibold text-zinc-500">{item.is_active ? 'Desactivar' : 'Activar'}</button></form>
              {item.is_active && !item.checklist?.is_paid && <RegistrationDialog title={`Pagar ${item.name}`} description="El monto real puede diferir del estimado." trigger="Marcar pagado"><ActionForm action={payFixedExpense}><input type="hidden" name="fixedExpenseId" value={item.id} /><input type="hidden" name="period" value={period} /><label className="block text-sm">Monto real<input name="actualAmount" type="number" min="0.01" step="0.01" defaultValue={item.estimated_amount} required className={fieldClass} /></label><label className="block text-sm">Cuenta<select name="accountId" className={selectClass}><option value="">Selecciona una cuenta</option>{accounts.filter((account) => account.is_active).map((account) => <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>)}</select></label><label className="block text-sm">Tarjeta<select name="creditCardId" className={selectClass}><option value="">Selecciona una tarjeta</option>{cards.filter((card) => card.is_active).map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label></ActionForm></RegistrationDialog>}
              {item.checklist?.is_paid && <ActionForm action={reverseFixedExpense} submitLabel="Revertir pago"><input type="hidden" name="checklistId" value={item.checklist.id} /></ActionForm>}
            </div>
          </li>)}
        </ul>}
      </section>
    </div>
  );
}
