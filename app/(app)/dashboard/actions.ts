'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { toTransactionTimestamp } from '@/lib/activity/calculations';

export interface DashboardActionState {
  error?: string | null;
  success?: string | null;
  token?: string | null;
}

const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const eventSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  expectedYearMonth: period,
  amount: z.coerce.number().positive().finite(),
  currency: z.enum(['PEN', 'USD']),
  categoryId: z.string().uuid().optional(),
  isRecurringMonthly: z.enum(['true', 'false']).transform((value) => value === 'true'),
});
const convertEventSchema = z.object({
  eventId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
  accountId: z.string().uuid().optional(),
  creditCardId: z.string().uuid().optional(),
  exchangeRate: z.coerce.number().positive().finite().optional(),
});

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
  return { supabase, user };
}

function value(formData: FormData, name: string) {
  const raw = formData.get(name);
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function failure(error: unknown): DashboardActionState {
  return { error: error instanceof Error ? error.message : 'No se pudo completar la operación.' };
}

export async function updateCashSetting(
  _state: DashboardActionState | null,
  formData: FormData
): Promise<DashboardActionState> {
  try {
    const includeCash = z.enum(['true', 'false']).parse(value(formData, 'includeCash')).toString() === 'true';
    const { supabase, user } = await authenticatedClient();
    const { error } = await supabase.from('user_settings').upsert({ user_id: user.id, include_cash_in_balance: includeCash });
    if (error) throw new Error('No se pudo actualizar la configuración de liquidez.');
    revalidatePath('/dashboard');
    return { success: 'Configuración de liquidez actualizada.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}

export async function saveProjectedEvent(
  _state: DashboardActionState | null,
  formData: FormData
): Promise<DashboardActionState> {
  try {
    const input = eventSchema.parse({
      id: value(formData, 'id'),
      name: value(formData, 'name'),
      expectedYearMonth: value(formData, 'expectedYearMonth'),
      amount: value(formData, 'amount'),
      currency: value(formData, 'currency'),
      categoryId: value(formData, 'categoryId'),
      isRecurringMonthly: formData.getAll('isRecurringMonthly').includes('true') ? 'true' : 'false',
    });
    const { supabase, user } = await authenticatedClient();
    const payload = {
      user_id: user.id,
      name: input.name,
      expected_year_month: input.expectedYearMonth,
      amount: input.amount,
      currency: input.currency,
      category_id: input.categoryId ?? null,
      is_recurring_monthly: input.isRecurringMonthly,
    };
    const query = input.id
      ? supabase.from('projected_events').update(payload).eq('id', input.id).eq('user_id', user.id)
      : supabase.from('projected_events').insert(payload);
    const { error } = await query;
    if (error) throw new Error('No se pudo guardar el evento proyectado.');
    revalidatePath('/dashboard');
    return { success: 'Evento proyectado guardado.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteProjectedEvent(
  _state: DashboardActionState | null,
  formData: FormData
): Promise<DashboardActionState> {
  try {
    const id = z.string().uuid().parse(value(formData, 'id'));
    const { supabase, user } = await authenticatedClient();
    const { error } = await supabase.from('projected_events').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error('No se pudo eliminar el evento proyectado.');
    revalidatePath('/dashboard');
    return { success: 'Evento proyectado eliminado.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}

export async function convertProjectedEvent(
    _state: DashboardActionState | null,
    formData: FormData
  ): Promise<DashboardActionState> {
    try {
      const input = convertEventSchema.parse({
        eventId: value(formData, 'eventId'),
        date: value(formData, 'date'),
        accountId: value(formData, 'accountId'),
        creditCardId: value(formData, 'creditCardId'),
        exchangeRate: value(formData, 'exchangeRate'),
      });
      const { supabase, user } = await authenticatedClient();
      const { data: event, error: eventError } = await supabase
        .from('projected_events')
        .select('id, name, amount, currency, category_id, is_active')
        .eq('id', input.eventId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (eventError || !event || !event.is_active) throw new Error('El evento proyectado ya no está disponible.');

      const { data: category } = event.category_id
        ? await supabase.from('categories').select('type').eq('id', event.category_id).eq('user_id', user.id).maybeSingle()
        : { data: null };
      const type = category?.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME';
      if (type === 'INCOME' && !input.accountId) throw new Error('Selecciona la cuenta que recibirá el ingreso.');
      if (type === 'EXPENSE' && Boolean(input.accountId) === Boolean(input.creditCardId)) {
        throw new Error('Selecciona una cuenta o una tarjeta para registrar el gasto.');
      }

      const common = {
        p_type: type,
        p_transaction_date: toTransactionTimestamp(input.date),
        p_description: event.name,
        p_amount: event.amount,
        p_currency: event.currency,
        p_category_id: event.category_id,
        p_account_id: input.accountId ?? null,
        p_credit_card_id: input.creditCardId ?? null,
        p_applied_exchange_rate: input.exchangeRate ?? null,
      } as const;
      const { error: transactionError } = await supabase.rpc('create_transaction', common);
      if (transactionError) {
        throw new Error(transactionError.code === 'P0001' ? transactionError.message : 'No se pudo convertir el evento en una operación.');
      }
      const { error: deactivateError } = await supabase
        .from('projected_events')
        .update({ is_active: false })
        .eq('id', event.id)
        .eq('user_id', user.id);
      if (deactivateError) throw new Error('La operación se registró, pero no se pudo cerrar el evento proyectado.');
      revalidatePath('/dashboard');
      revalidatePath('/actividad');
      revalidatePath('/cuentas');
      return { success: 'Evento convertido en operación real.', token: crypto.randomUUID() };
    } catch (error) {
      return failure(error);
    }
}
