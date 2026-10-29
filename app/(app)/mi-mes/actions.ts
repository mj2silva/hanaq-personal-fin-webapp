'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { toTransactionTimestamp } from '@/lib/activity/calculations';
import type { Database } from '@/types/database.types';

export interface MonthActionState {
  error?: string | null;
  success?: string | null;
  token?: string | null;
}

const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El periodo no es válido.');
const amountSchema = z.coerce.number().finite().nonnegative('El monto no puede ser negativo.');

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
  return { supabase, user };
}

function value(formData: FormData, name: string) {
  const raw = formData.get(name);
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
}

function failure(error: unknown): MonthActionState {
  if (error instanceof z.ZodError) return { error: error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  return { error: error instanceof Error ? error.message : 'No se pudo completar la operación.' };
}

function revalidateMonth() {
  revalidatePath('/mi-mes');
  revalidatePath('/actividad');
  revalidatePath('/cuentas');
  revalidatePath('/dashboard');
}

export async function saveBudget(
  _state: MonthActionState | null,
  formData: FormData
): Promise<MonthActionState> {
  try {
    const categoryId = z.string().uuid().parse(value(formData, 'categoryId'));
    const period = periodSchema.parse(value(formData, 'period'));
    const limit = amountSchema.parse(value(formData, 'limitAmountPen'));
    const { supabase, user } = await authenticatedClient();
    const { error } = await supabase.from('budgets').upsert(
      {
        user_id: user.id,
        category_id: categoryId,
        period_year_month: period,
        limit_amount_pen: limit,
      },
      { onConflict: 'user_id,category_id,period_year_month' }
    );
    if (error) throw new Error('No se pudo guardar el presupuesto.');
    revalidateMonth();
    return { success: 'Presupuesto guardado.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}

export async function saveFixedExpense(
  _state: MonthActionState | null,
  formData: FormData
): Promise<MonthActionState> {
  try {
    const input = {
      id: value(formData, 'id'),
      name: z.string().trim().min(1).max(100).parse(value(formData, 'name')),
      category_id: z.string().uuid().parse(value(formData, 'categoryId')),
      estimated_amount: z.coerce.number().positive().finite().parse(value(formData, 'estimatedAmount')),
      currency: z.enum(['PEN', 'USD']).parse(value(formData, 'currency')),
      due_day: z.coerce.number().int().min(1).max(31).parse(value(formData, 'dueDay')),
    };
    const { supabase, user } = await authenticatedClient();
    const query = input.id
      ? supabase.from('fixed_expenses_template').update({
          name: input.name,
          category_id: input.category_id,
          estimated_amount: input.estimated_amount,
          currency: input.currency,
          due_day: input.due_day,
        }).eq('id', input.id).eq('user_id', user.id)
      : supabase.from('fixed_expenses_template').insert({ ...input, user_id: user.id });
    const { error } = await query;
    if (error) throw new Error('No se pudo guardar el gasto fijo.');
    revalidateMonth();
    return { success: 'Gasto fijo guardado.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}

export async function toggleFixedExpense(
  _state: MonthActionState | null,
  formData: FormData
): Promise<MonthActionState> {
  try {
    const id = z.string().uuid().parse(value(formData, 'id'));
    const active = z.enum(['true', 'false']).transform((raw) => raw === 'true').parse(value(formData, 'isActive'));
    const { supabase, user } = await authenticatedClient();
    const { error } = await supabase.from('fixed_expenses_template')
      .update({ is_active: !active })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error('No se pudo actualizar el gasto fijo.');
    revalidateMonth();
    return { success: 'Gasto fijo actualizado.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}

export async function payFixedExpense(
  _state: MonthActionState | null,
  formData: FormData
): Promise<MonthActionState> {
  try {
    const fixedExpenseId = z.string().uuid().parse(value(formData, 'fixedExpenseId'));
    const period = periodSchema.parse(value(formData, 'period'));
    const actualAmount = z.coerce.number().positive().finite().parse(value(formData, 'actualAmount'));
    const accountId = z.string().uuid().optional().parse(value(formData, 'accountId'));
    const creditCardId = z.string().uuid().optional().parse(value(formData, 'creditCardId'));
    if ((accountId ? 1 : 0) + (creditCardId ? 1 : 0) !== 1) {
      throw new Error('Selecciona una cuenta o una tarjeta de origen.');
    }

    const { supabase, user } = await authenticatedClient();
    const { data: template, error: templateError } = await supabase
      .from('fixed_expenses_template')
      .select('name, category_id, currency')
      .eq('id', fixedExpenseId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (templateError || !template) throw new Error('El gasto fijo no existe.');

    const { data: existing, error: existingError } = await supabase
      .from('monthly_fixed_checklist')
      .select('id, is_paid')
      .eq('fixed_expense_id', fixedExpenseId)
      .eq('period_year_month', period)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existingError) throw new Error('No se pudo consultar el checklist.');
    if (existing?.is_paid) throw new Error('Este gasto fijo ya fue marcado como pagado.');

    type CreateArgs = Database['public']['Functions']['create_transaction']['Args'];
    const args: CreateArgs = {
      p_type: 'EXPENSE',
      p_transaction_date: toTransactionTimestamp(`${period}-01`),
      p_description: template.name,
      p_amount: actualAmount,
      p_currency: template.currency,
      p_category_id: template.category_id,
      p_account_id: accountId ?? null,
      p_credit_card_id: creditCardId ?? null,
    };
    const { data: transactionId, error: transactionError } = await supabase.rpc('create_transaction', args);
    if (transactionError || !transactionId) {
      throw new Error(transactionError?.message ?? 'No se pudo registrar el pago.');
    }

    const checklist = {
      user_id: user.id,
      fixed_expense_id: fixedExpenseId,
      period_year_month: period,
      estimated_amount: actualAmount,
      actual_amount: actualAmount,
      is_paid: true,
      paid_at: new Date().toISOString(),
      transaction_id: transactionId,
    };
    const checklistQuery = existing
      ? supabase.from('monthly_fixed_checklist').update(checklist).eq('id', existing.id).eq('user_id', user.id)
      : supabase.from('monthly_fixed_checklist').insert(checklist);
    const { error: checklistError } = await checklistQuery;
    if (checklistError) throw new Error('El pago se registró, pero no se pudo actualizar el checklist.');
    revalidateMonth();
    return { success: 'Gasto fijo pagado y movimiento registrado.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}

export async function reverseFixedExpense(
  _state: MonthActionState | null,
  formData: FormData
): Promise<MonthActionState> {
  try {
    const checklistId = z.string().uuid().parse(value(formData, 'checklistId'));
    const { supabase, user } = await authenticatedClient();
    const { data: checklist, error: checklistError } = await supabase
      .from('monthly_fixed_checklist')
      .select('transaction_id, is_paid')
      .eq('id', checklistId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (checklistError || !checklist) throw new Error('El pago del checklist no existe.');
    if (!checklist.is_paid || !checklist.transaction_id) throw new Error('Este gasto no tiene un pago que revertir.');

    const { error: transactionError } = await supabase.rpc('delete_transaction', {
      p_transaction_id: checklist.transaction_id,
    });
    if (transactionError) throw new Error(transactionError.message || 'No se pudo revertir la transacción.');
    const { error: updateError } = await supabase
      .from('monthly_fixed_checklist')
      .update({ is_paid: false, actual_amount: null, paid_at: null, transaction_id: null })
      .eq('id', checklistId)
      .eq('user_id', user.id);
    if (updateError) throw new Error('La transacción se revirtió, pero no se pudo actualizar el checklist.');
    revalidateMonth();
    return { success: 'Pago revertido y saldo restaurado.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}
