'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface AccountsActionState {
  error?: string | null;
  success?: string | null;
}

export interface LoanHistoryState extends AccountsActionState {
  previousBalance?: number;
  estimatedBalance?: number;
}

const accountSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(100),
  type: z.enum(['BANK_ACCOUNT', 'CASH_BOX']),
  bankName: z.string().trim().max(100).optional(),
  currency: z.enum(['PEN', 'USD']),
  balance: z.coerce.number().min(0, 'El saldo no puede ser negativo.').finite(),
  trea: z.coerce.number().min(0).max(100).finite(),
});

const cardSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(100),
  bankName: z.string().trim().max(100).optional(),
  limitCurrency: z.enum(['PEN', 'USD']),
  limitAmount: z.coerce.number().min(0).finite(),
  alertPercentage: z.coerce.number().min(0).max(100).finite().default(70),
  debtPen: z.coerce.number().min(0).finite(),
  debtUsd: z.coerce.number().min(0).finite(),
  closingDay: z.coerce.number().int().min(1).max(31),
  paymentDueDay: z.coerce.number().int().min(1).max(31),
  desgravamenRate: z.coerce.number().min(0).max(100).finite(),
  desgravamenMaxPen: z.coerce.number().min(0).finite(),
  exemptionRule: z.enum(['NONE', 'MIN_MONTHLY_SPEND', 'MIN_ANNUAL_SPEND']),
  exemptionMinAmount: z.coerce.number().min(0).finite(),
});

const editBalanceSchema = z.object({
  id: z.string().uuid(),
  balance: z.coerce.number().min(0).finite(),
});

const editCardBalanceSchema = z.object({
  id: z.string().uuid(),
  debtPen: z.coerce.number().min(0).finite(),
  debtUsd: z.coerce.number().min(0).finite(),
});

const updateAccountSchema = accountSchema.extend({
  id: z.string().uuid(),
});

const updateCardSchema = cardSchema.extend({
  id: z.string().uuid(),
});

const loanSchema = z.object({
  lenderName: z.string().trim().min(1, 'El acreedor es obligatorio.').max(100),
  currency: z.enum(['PEN', 'USD']),
  initialAmount: z.coerce.number().positive().finite(),
  currentBalance: z.coerce.number().min(0).finite(),
  tea: z.coerce.number().min(0).max(100).finite(),
  tcea: z.coerce.number().min(0).max(100).finite().nullable(),
  monthlyInstallment: z.coerce.number().positive().finite(),
  totalInstallments: z.coerce.number().int().positive(),
  remainingInstallments: z.coerce.number().int().min(0),
  paymentDueDay: z.coerce.number().int().min(1).max(31),
});

const investmentSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(100),
  currency: z.enum(['PEN', 'USD']),
  capital: z.coerce.number().min(0).finite(),
});

const logSchema = z.object({
  investmentId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'El periodo no es válido.'),
  profitOrLoss: z.coerce.number().finite(),
});

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
  return { supabase, user };
}

function failure(error: unknown): AccountsActionState {
  return { error: error instanceof Error ? error.message : 'No se pudo completar la operación.' };
}

export async function createAccount(
  _state: AccountsActionState | null,
  formData: FormData
): Promise<AccountsActionState> {
  try {
    const input = accountSchema.parse({
      name: formData.get('name'),
      type: formData.get('type'),
      bankName: formData.get('bankName') || undefined,
      currency: formData.get('currency'),
      balance: formData.get('balance'),
      trea: formData.get('trea'),
    });
    const { supabase, user } = await authenticatedClient();
    const { error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name: input.name,
      type: input.type,
      bank_name: input.bankName || null,
      currency: input.currency,
      initial_balance: input.balance,
      current_balance: input.balance,
      trea_percentage: input.trea,
    });
    if (error) throw new Error('No se pudo crear la cuenta.');
    revalidatePath('/cuentas');
    return { success: 'Cuenta creada correctamente.' };
  } catch (error) {
    return failure(error);
  }
}

export async function createCreditCard(
  _state: AccountsActionState | null,
  formData: FormData
): Promise<AccountsActionState> {
  try {
    const input = cardSchema.parse({
      name: formData.get('name'),
      bankName: formData.get('bankName') || undefined,
      limitCurrency: formData.get('limitCurrency'),
      limitAmount: formData.get('limitAmount'),
      alertPercentage: formData.get('alertPercentage') || undefined,
      debtPen: formData.get('debtPen'),
      debtUsd: formData.get('debtUsd'),
      closingDay: formData.get('closingDay'),
      paymentDueDay: formData.get('paymentDueDay'),
      desgravamenRate: formData.get('desgravamenRate'),
      desgravamenMaxPen: formData.get('desgravamenMaxPen'),
      exemptionRule: formData.get('exemptionRule'),
      exemptionMinAmount: formData.get('exemptionMinAmount'),
    });
    const { supabase, user } = await authenticatedClient();
    const { error } = await supabase.from('credit_cards').insert({
      user_id: user.id,
      name: input.name,
      bank_name: input.bankName || null,
      credit_limit_currency: input.limitCurrency,
      credit_limit_amount: input.limitAmount,
      credit_limit_alert_percentage: input.alertPercentage,
      initial_debt_pen: input.debtPen,
      initial_debt_usd: input.debtUsd,
      current_debt_pen: input.debtPen,
      current_debt_usd: input.debtUsd,
      closing_day: input.closingDay,
      payment_due_day: input.paymentDueDay,
      desgravamen_rate: input.desgravamenRate / 100,
      desgravamen_max_pen: input.desgravamenMaxPen,
      exemption_rule: input.exemptionRule,
      exemption_min_amount: input.exemptionMinAmount,
    });
    if (error) throw new Error('No se pudo crear la tarjeta.');
    revalidatePath('/cuentas');
    return { success: 'Tarjeta creada correctamente.' };
  } catch (error) {
    return failure(error);
  }

}

export async function updateAccountInitialBalance(
  _state: AccountsActionState | null,
  formData: FormData
): Promise<AccountsActionState> {
  try {
    const input = editBalanceSchema.parse({ id: formData.get('id'), balance: formData.get('balance') });
    const { supabase, user } = await authenticatedClient();
    const { data: account, error: readError } = await supabase.from('accounts').select('initial_balance,current_balance').eq('id', input.id).eq('user_id', user.id).maybeSingle();
    if (readError || !account) throw new Error('La cuenta no existe.');
    const { error } = await supabase.from('accounts').update({
      initial_balance: input.balance,
      current_balance: Math.max(0, account.current_balance + input.balance - account.initial_balance),
    }).eq('id', input.id).eq('user_id', user.id);
    if (error) throw new Error('No se pudo actualizar el saldo inicial de la cuenta.');
    revalidatePath('/cuentas');
    return { success: 'Saldo inicial de cuenta actualizado.' };
  } catch (error) {
    return failure(error);
  }

}

export async function updateAccount(
  _state: AccountsActionState | null,
  formData: FormData
): Promise<AccountsActionState> {
  try {
    const input = updateAccountSchema.parse({
      id: formData.get('id'),
      name: formData.get('name'),
      type: formData.get('type'),
      bankName: formData.get('bankName') || undefined,
      currency: formData.get('currency'),
      balance: formData.get('balance'),
      trea: formData.get('trea'),
    });
    const { supabase, user } = await authenticatedClient();
    const { data: account, error: readError } = await supabase.from('accounts').select('initial_balance,current_balance').eq('id', input.id).eq('user_id', user.id).maybeSingle();
    if (readError || !account) throw new Error('La cuenta no existe.');
    const { error } = await supabase.from('accounts').update({
      name: input.name,
      type: input.type,
      bank_name: input.bankName || null,
      currency: input.currency,
      initial_balance: input.balance,
      current_balance: Math.max(0, account.current_balance + input.balance - account.initial_balance),
      trea_percentage: input.trea,
    }).eq('id', input.id).eq('user_id', user.id);
    if (error) throw new Error('No se pudo actualizar la cuenta.');
    revalidatePath('/cuentas');
    return { success: 'Cuenta actualizada correctamente.' };
  } catch (error) {
    return failure(error);
  }
}

export async function updateCreditCardInitialDebt(
  _state: AccountsActionState | null,
  formData: FormData
): Promise<AccountsActionState> {
  try {
    const input = editCardBalanceSchema.parse({ id: formData.get('id'), debtPen: formData.get('debtPen'), debtUsd: formData.get('debtUsd') });
    const { supabase, user } = await authenticatedClient();
    const { data: card, error: readError } = await supabase.from('credit_cards').select('initial_debt_pen,initial_debt_usd,current_debt_pen,current_debt_usd').eq('id', input.id).eq('user_id', user.id).maybeSingle();
    if (readError || !card) throw new Error('La tarjeta no existe.');
    const { error } = await supabase.from('credit_cards').update({
      initial_debt_pen: input.debtPen,
      initial_debt_usd: input.debtUsd,
      current_debt_pen: Math.max(0, card.current_debt_pen + input.debtPen - card.initial_debt_pen),
      current_debt_usd: Math.max(0, card.current_debt_usd + input.debtUsd - card.initial_debt_usd),
    }).eq('id', input.id).eq('user_id', user.id);
    if (error) throw new Error('No se pudo actualizar la deuda inicial de la tarjeta.');
    revalidatePath('/cuentas');
    return { success: 'Deuda inicial de tarjeta actualizada.' };
  } catch (error) {
    return failure(error);
  }

}

export async function updateCreditCard(
  _state: AccountsActionState | null,
  formData: FormData
): Promise<AccountsActionState> {
  try {
    const input = updateCardSchema.parse({
      id: formData.get('id'),
      name: formData.get('name'),
      bankName: formData.get('bankName') || undefined,
      limitCurrency: formData.get('limitCurrency'),
      limitAmount: formData.get('limitAmount'),
      alertPercentage: formData.get('alertPercentage') || undefined,
      debtPen: formData.get('debtPen'),
      debtUsd: formData.get('debtUsd'),
      closingDay: formData.get('closingDay'),
      paymentDueDay: formData.get('paymentDueDay'),
      desgravamenRate: formData.get('desgravamenRate'),
      desgravamenMaxPen: formData.get('desgravamenMaxPen'),
      exemptionRule: formData.get('exemptionRule'),
      exemptionMinAmount: formData.get('exemptionMinAmount'),
    });
    const { supabase, user } = await authenticatedClient();
    const { data: card, error: readError } = await supabase.from('credit_cards').select('initial_debt_pen,initial_debt_usd,current_debt_pen,current_debt_usd').eq('id', input.id).eq('user_id', user.id).maybeSingle();
    if (readError || !card) throw new Error('La tarjeta no existe.');
    const { error } = await supabase.from('credit_cards').update({
      name: input.name,
      bank_name: input.bankName || null,
      credit_limit_currency: input.limitCurrency,
      credit_limit_amount: input.limitAmount,
      credit_limit_alert_percentage: input.alertPercentage,
      initial_debt_pen: input.debtPen,
      initial_debt_usd: input.debtUsd,
      current_debt_pen: Math.max(0, card.current_debt_pen + input.debtPen - card.initial_debt_pen),
      current_debt_usd: Math.max(0, card.current_debt_usd + input.debtUsd - card.initial_debt_usd),
      closing_day: input.closingDay,
      payment_due_day: input.paymentDueDay,
      desgravamen_rate: input.desgravamenRate / 100,
      desgravamen_max_pen: input.desgravamenMaxPen,
      exemption_rule: input.exemptionRule,
      exemption_min_amount: input.exemptionMinAmount,
    }).eq('id', input.id).eq('user_id', user.id);
    if (error) throw new Error('No se pudo actualizar la tarjeta.');
    revalidatePath('/cuentas');
    return { success: 'Tarjeta actualizada correctamente.' };
  } catch (error) {
    return failure(error);
  }
}

export async function createLoan(
  _state: AccountsActionState | null,
  formData: FormData
): Promise<AccountsActionState> {
  try {
    const input = loanSchema.parse({
      lenderName: formData.get('lenderName'),
      currency: formData.get('currency'),
      initialAmount: formData.get('initialAmount'),
      currentBalance: formData.get('currentBalance'),
      tea: formData.get('tea'),
      tcea: formData.get('tcea') === '' || formData.get('tcea') === null ? null : formData.get('tcea'),
      monthlyInstallment: formData.get('monthlyInstallment'),
      totalInstallments: formData.get('totalInstallments'),
      remainingInstallments: formData.get('remainingInstallments'),
      paymentDueDay: formData.get('paymentDueDay'),
    });
    if (input.remainingInstallments > input.totalInstallments) {
      return { error: 'Las cuotas restantes no pueden superar el total.' };
    }
    const { supabase, user } = await authenticatedClient();
    const { error } = await supabase.from('loans').insert({
      user_id: user.id,
      lender_name: input.lenderName,
      currency: input.currency,
      initial_amount: input.initialAmount,
      current_balance: input.currentBalance,
      tea_percentage: input.tea,
      tcea_percentage: input.tcea,
      monthly_installment_amount: input.monthlyInstallment,
      total_installments: input.totalInstallments,
      remaining_installments: input.remainingInstallments,
      payment_due_day: input.paymentDueDay,
    });
    if (error) throw new Error('No se pudo crear el préstamo.');
    revalidatePath('/cuentas');
    return { success: 'Préstamo creado correctamente.' };
  } catch (error) {
    return failure(error);
  }
}

export async function updateLoanRate(_state: AccountsActionState | null, formData: FormData): Promise<AccountsActionState> {
  try {
    const id = z.string().uuid().parse(formData.get('id'));
    const tea = z.coerce.number().min(0).max(100).finite().parse(formData.get('tea'));
    const raw = formData.get('tcea');
    const tcea = raw === '' || raw === null ? null : z.coerce.number().min(0).max(100).finite().parse(raw);
    const { supabase, user } = await authenticatedClient();
    const { data, error } = await supabase.from('loans').update({ tea_percentage: tea, tcea_percentage: tcea }).eq('id', id).eq('user_id', user.id).select('id').maybeSingle();
    if (error || !data) throw new Error('No se pudo actualizar el préstamo.');
    revalidatePath('/cuentas');
    revalidatePath('/actividad');
    revalidatePath('/dashboard');
    return { success: 'Tasas actualizadas correctamente.' };
  } catch (error) {
    return failure(error);
  }
}

export async function reconstructLoanHistory(state: LoanHistoryState, formData: FormData): Promise<LoanHistoryState> {
  try {
    const loanId = z.string().uuid().parse(formData.get('loanId'));
    const apply = formData.get('apply') === 'true';
    if (apply && (state.previousBalance === undefined || state.estimatedBalance === undefined)) {
      throw new Error('Primero consulta la estimación.');
    }
    const { supabase } = await authenticatedClient();
    const { data, error } = await supabase.rpc('reconstruct_loan_history', {
      p_loan_id: loanId,
      p_apply: apply,
      ...(apply ? { p_expected_previous_balance: state.previousBalance, p_expected_estimated_balance: state.estimatedBalance } : {}),
    });
    if (error) throw new Error(error.message);
    const result = z.object({ previous_balance: z.number(), estimated_balance: z.number() }).parse(data);
    if (apply) {
      revalidatePath('/cuentas');
      revalidatePath('/actividad');
      revalidatePath('/dashboard');
      return { success: 'Estimación aplicada. Contrasta el saldo con tu entidad financiera.' };
    }
    return { previousBalance: result.previous_balance, estimatedBalance: result.estimated_balance };
  } catch (error) {
    return failure(error);
  }
}

export async function createInvestment(
  _state: AccountsActionState | null,
  formData: FormData
): Promise<AccountsActionState> {
  try {
    const input = investmentSchema.parse({
      name: formData.get('name'),
      currency: formData.get('currency'),
      capital: formData.get('capital'),
    });
    const { supabase, user } = await authenticatedClient();
    const { error } = await supabase.from('investments').insert({
      user_id: user.id,
      name: input.name,
      currency: input.currency,
      initial_capital: input.capital,
      current_value: input.capital,
    });
    if (error) throw new Error('No se pudo crear la inversión.');
    revalidatePath('/cuentas');
    return { success: 'Inversión creada correctamente.' };
  } catch (error) {
    return failure(error);
  }
}

export async function recordInvestmentLog(
  _state: AccountsActionState | null,
  formData: FormData
): Promise<AccountsActionState> {
  try {
    const input = logSchema.parse({
      investmentId: formData.get('investmentId'),
      period: formData.get('period'),
      profitOrLoss: formData.get('profitOrLoss'),
    });
    const { supabase, user } = await authenticatedClient();
    const { data: investment, error: investmentError } = await supabase
      .from('investments')
      .select('current_value')
      .eq('id', input.investmentId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (investmentError || !investment) throw new Error('La inversión no existe.');

    const { data: previousLog, error: previousLogError } = await supabase
      .from('investment_monthly_logs')
      .select('profit_or_loss_amount')
      .eq('investment_id', input.investmentId)
      .eq('user_id', user.id)
      .eq('period_year_month', input.period)
      .maybeSingle();
    if (previousLogError) throw new Error('No se pudo leer el rendimiento anterior.');

    const { error: logError } = await supabase.from('investment_monthly_logs').upsert(
      { user_id: user.id, investment_id: input.investmentId, period_year_month: input.period, profit_or_loss_amount: input.profitOrLoss },
      { onConflict: 'investment_id,period_year_month' }
    );
    if (logError) throw new Error('No se pudo guardar el rendimiento.');
    const { error: valueError } = await supabase
      .from('investments')
      .update({
        current_value: Math.max(
          0,
          investment.current_value + input.profitOrLoss - (previousLog?.profit_or_loss_amount ?? 0)
        ),
      })
      .eq('id', input.investmentId)
      .eq('user_id', user.id);
    if (valueError) throw new Error('No se pudo actualizar el valor de la inversión.');
    revalidatePath('/cuentas');
    return { success: 'Rendimiento registrado correctamente.' };
  } catch (error) {
    return failure(error);
  }
}
