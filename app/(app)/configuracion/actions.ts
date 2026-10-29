'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { CategoryType, CurrencyCode } from '@/types/database.types';

export interface ConfigurationActionState {
  error?: string | null;
  success?: string | null;
}

const categorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(100),
  type: z.enum(['INCOME', 'EXPENSE']),
});

const exchangeRateSchema = z.object({
  rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.'),
  usdToPenRate: z.coerce.number().positive('El tipo de cambio debe ser mayor a cero.').finite(),
});

const onboardingSchema = z.object({
  exchangeRate: z.coerce.number().positive('El tipo de cambio debe ser mayor a cero.').finite(),
  accountName: z.string().trim().min(1, 'Indica el nombre de la cuenta.').max(100),
  accountType: z.enum(['BANK_ACCOUNT', 'CASH_BOX']),
  accountBankName: z.string().trim().max(100).optional(),
  accountCurrency: z.enum(['PEN', 'USD']),
  accountBalance: z.coerce.number().min(0, 'El saldo inicial no puede ser negativo.').finite(),
  cardName: z.string().trim().max(100).optional(),
  cardBankName: z.string().trim().max(100).optional(),
  cardLimitPen: z.coerce.number().min(0).finite().optional(),
  cardLimitUsd: z.coerce.number().min(0).finite().optional(),
  cardDebtPen: z.coerce.number().min(0).finite().optional(),
  cardDebtUsd: z.coerce.number().min(0).finite().optional(),
  cardClosingDay: z.coerce.number().int().min(1).max(31).optional(),
  cardPaymentDueDay: z.coerce.number().int().min(1).max(31).optional(),
});

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
  }

  return { supabase, user };
}

function actionError(error: unknown): ConfigurationActionState {
  return {
    error: error instanceof Error ? error.message : 'No se pudo completar la operación.',
  };
}

export async function createCategory(
  _previousState: ConfigurationActionState | null,
  formData: FormData
): Promise<ConfigurationActionState> {
  try {
    const input = categorySchema.parse({
      name: formData.get('name'),
      type: formData.get('type'),
    });
    const { supabase, user } = await getAuthenticatedUser();
    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name: input.name,
      type: input.type as CategoryType,
    });

    if (error) throw new Error('No se pudo crear la categoría.');
    revalidatePath('/configuracion');
    return { success: 'Categoría creada correctamente.' };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCategory(
  _previousState: ConfigurationActionState | null,
  formData: FormData
): Promise<ConfigurationActionState> {
  try {
    const id = z.string().uuid().parse(formData.get('id'));
    const input = categorySchema.parse({
      name: formData.get('name'),
      type: formData.get('type'),
    });
    const { supabase, user } = await getAuthenticatedUser();
    const { error } = await supabase
      .from('categories')
      .update({ name: input.name, type: input.type as CategoryType })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error('No se pudo actualizar la categoría.');
    revalidatePath('/configuracion');
    return { success: 'Categoría actualizada correctamente.' };
  } catch (error) {
    return actionError(error);
  }
}

export async function toggleCategory(
  _previousState: ConfigurationActionState | null,
  formData: FormData
): Promise<ConfigurationActionState> {
  try {
    const id = z.string().uuid().parse(formData.get('id'));
    const isActive = z.enum(['true', 'false']).parse(formData.get('isActive')) === 'true';
    const { supabase, user } = await getAuthenticatedUser();
    const { error } = await supabase
      .from('categories')
      .update({ is_active: !isActive })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error('No se pudo cambiar el estado de la categoría.');
    revalidatePath('/configuracion');
    return { success: isActive ? 'Categoría desactivada.' : 'Categoría activada.' };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveExchangeRate(
  _previousState: ConfigurationActionState | null,
  formData: FormData
): Promise<ConfigurationActionState> {
  try {
    const input = exchangeRateSchema.parse({
      rateDate: formData.get('rateDate'),
      usdToPenRate: formData.get('usdToPenRate'),
    });
    const { supabase, user } = await getAuthenticatedUser();
    const { error } = await supabase.from('exchange_rates').upsert(
      {
        user_id: user.id,
        rate_date: input.rateDate,
        usd_to_pen_rate: input.usdToPenRate,
      },
      { onConflict: 'user_id,rate_date' }
    );

    if (error) throw new Error('No se pudo guardar el tipo de cambio.');
    revalidatePath('/configuracion');
    return { success: 'Tipo de cambio guardado correctamente.' };
  } catch (error) {
    return actionError(error);
  }
}

export async function completeOnboarding(
  _previousState: ConfigurationActionState | null,
  formData: FormData
): Promise<ConfigurationActionState> {
  try {
    const raw = {
      exchangeRate: formData.get('exchangeRate'),
      accountName: formData.get('accountName'),
      accountType: formData.get('accountType'),
      accountBankName: formData.get('accountBankName') || undefined,
      accountCurrency: formData.get('accountCurrency'),
      accountBalance: formData.get('accountBalance'),
      cardName: formData.get('cardName') || undefined,
      cardBankName: formData.get('cardBankName') || undefined,
      cardLimitPen: formData.get('cardLimitPen') || undefined,
      cardLimitUsd: formData.get('cardLimitUsd') || undefined,
      cardDebtPen: formData.get('cardDebtPen') || undefined,
      cardDebtUsd: formData.get('cardDebtUsd') || undefined,
      cardClosingDay: formData.get('cardClosingDay') || undefined,
      cardPaymentDueDay: formData.get('cardPaymentDueDay') || undefined,
    };
    const input = onboardingSchema.parse(raw);
    const { supabase, user } = await getAuthenticatedUser();

    const { data: existingSettings, error: settingsReadError } = await supabase
      .from('user_settings')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsReadError) throw new Error('No se pudo leer el estado del onboarding.');
    if (existingSettings?.onboarding_completed) {
      return { error: 'El onboarding ya fue completado. Puedes editar tus datos desde Configuración.' };
    }

    const { error: rateError } = await supabase.from('exchange_rates').upsert(
      { user_id: user.id, rate_date: new Date().toISOString().slice(0, 10), usd_to_pen_rate: input.exchangeRate },
      { onConflict: 'user_id,rate_date' }
    );
    if (rateError) throw new Error('No se pudo guardar el tipo de cambio inicial.');

    const { error: accountError } = await supabase.from('accounts').insert({
      user_id: user.id,
      name: input.accountName,
      type: input.accountType,
      bank_name: input.accountBankName || null,
      currency: input.accountCurrency,
      initial_balance: input.accountBalance,
      current_balance: input.accountBalance,
    });
    if (accountError) throw new Error('No se pudo crear la cuenta inicial.');

    if (input.cardName) {
      const { error: cardError } = await supabase.from('credit_cards').insert({
        user_id: user.id,
        name: input.cardName,
        bank_name: input.cardBankName || null,
        credit_limit_pen: input.cardLimitPen ?? 0,
        credit_limit_usd: input.cardLimitUsd ?? 0,
        initial_debt_pen: input.cardDebtPen ?? 0,
        initial_debt_usd: input.cardDebtUsd ?? 0,
        current_debt_pen: input.cardDebtPen ?? 0,
        current_debt_usd: input.cardDebtUsd ?? 0,
        closing_day: input.cardClosingDay ?? 1,
        payment_due_day: input.cardPaymentDueDay ?? 1,
      });
      if (cardError) throw new Error('No se pudo crear la tarjeta inicial.');
    }

    const { error: settingsError } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      base_currency: 'PEN' as CurrencyCode,
      onboarding_completed: true,
    });
    if (settingsError) throw new Error('No se pudo finalizar el onboarding.');

    revalidatePath('/configuracion');
    revalidatePath('/dashboard');
    revalidatePath('/cuentas');
    return { success: 'Configuración inicial completada correctamente.' };
  } catch (error) {
    return actionError(error);
  }
}
