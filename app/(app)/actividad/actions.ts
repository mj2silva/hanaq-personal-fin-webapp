'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  calculateInstallmentPlan,
  resolveInstallmentStartPeriod,
  toTransactionTimestamp,
} from '@/lib/activity/calculations';
import type { Database } from '@/types/database.types';

type CreateTransactionArgs = Database['public']['Functions']['create_transaction']['Args'];

export interface ActivityActionState {
  error?: string | null;
  success?: string | null;
  token?: string | null;
}

const currencySchema = z.enum(['PEN', 'USD']);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida.');
const amountSchema = z.coerce
  .number({ error: 'Ingresa un monto válido.' })
  .positive('El monto debe ser mayor a cero.')
  .finite();
const optionalUuid = z.string().uuid().optional();
const optionalRate = z.coerce.number().positive('El tipo de cambio debe ser mayor a cero.').finite().optional();

const baseFields = {
  date: dateSchema,
  description: z.string().trim().max(255).optional(),
  amount: amountSchema,
};

const splitSchema = z.object({
  debtor_name: z.string().trim().min(1, 'Cada deudor debe tener un nombre.').max(100),
  amount_owed: amountSchema,
});

const operationSchema = z.discriminatedUnion('type', [
  z.object({
    ...baseFields,
    type: z.literal('INCOME'),
    accountId: z.string().uuid('Selecciona la cuenta que recibe el ingreso.'),
    categoryId: optionalUuid,
  }),
  z.object({
    ...baseFields,
    type: z.literal('EXPENSE'),
    accountId: optionalUuid,
    creditCardId: optionalUuid,
    currency: currencySchema.optional(),
    categoryId: optionalUuid,
    installments: z.coerce.number().int().min(1).max(60).optional(),
    installmentMode: z.enum(['ZERO', 'DEFAULT', 'CUSTOM']).optional(),
    customTea: z.coerce.number().min(0).max(1000).finite().optional(),
    splits: z.array(splitSchema).max(20),
  }),
  z.object({
    ...baseFields,
    type: z.literal('TRANSFER'),
    accountId: optionalUuid,
    destinationAccountId: optionalUuid,
    investmentId: optionalUuid,
    exchangeRate: optionalRate,
  }),
  z.object({
    ...baseFields,
    type: z.literal('CC_PAYMENT'),
    accountId: z.string().uuid('Selecciona la cuenta desde la que pagas.'),
    creditCardId: z.string().uuid('Selecciona la tarjeta.'),
    currency: currencySchema,
    exchangeRate: optionalRate,
  }),
  z.object({
    ...baseFields,
    type: z.literal('LOAN_PAYMENT'),
    accountId: z.string().uuid('Selecciona la cuenta desde la que pagas.'),
    loanId: z.string().uuid('Selecciona el préstamo.'),
    exchangeRate: optionalRate,
    loanInterest: z.coerce.number().min(0).finite().refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, 'El interés debe tener como máximo dos decimales.').optional(),
  }),
  z.object({
    ...baseFields,
    type: z.literal('REFUND'),
    parentTransactionId: z.string().uuid('Selecciona el gasto que se reembolsa.'),
  }),
]);

const sharedRepaymentSchema = z.object({
  splitId: z.string().uuid(),
  accountId: z.string().uuid('Selecciona la cuenta que recibe el dinero.'),
  amount: amountSchema,
  date: dateSchema,
});

const deleteSchema = z.object({ transactionId: z.string().uuid() });

const defaultDescriptions = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
  CC_PAYMENT: 'Pago de tarjeta',
  LOAN_PAYMENT: 'Pago de préstamo',
  REFUND: 'Reembolso',
} as const;

function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function readSplits(formData: FormData): { debtor_name: string; amount_owed: string }[] {
  const names = formData.getAll('splitDebtor').map((value) => (typeof value === 'string' ? value.trim() : ''));
  const amounts = formData.getAll('splitAmount').map((value) => (typeof value === 'string' ? value.trim() : ''));
  return names
    .map((name, index) => ({ debtor_name: name, amount_owed: amounts[index] ?? '' }))
    .filter((split) => split.debtor_name !== '' || split.amount_owed !== '');
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
  return { supabase, user };
}

function failure(error: unknown): ActivityActionState {
  if (error instanceof z.ZodError) {
    return { error: error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }
  return { error: error instanceof Error ? error.message : 'No se pudo completar la operación.' };
}

interface RpcError {
  code?: string;
  message: string;
}

/** Only messages raised by our SQL functions (RAISE EXCEPTION -> P0001) are shown to the user. */
function rpcFailure(error: RpcError, fallback: string): Error {
  return new Error(error.code === 'P0001' ? error.message : fallback);
}

function revalidateActivity() {
  revalidatePath('/actividad');
  revalidatePath('/cuentas');
  revalidatePath('/dashboard');
}

export async function createOperation(
  _state: ActivityActionState | null,
  formData: FormData
): Promise<ActivityActionState> {
  try {
    const raw = {
      type: text(formData, 'type'),
      date: text(formData, 'date'),
      description: text(formData, 'description'),
      amount: text(formData, 'amount'),
      currency: text(formData, 'currency'),
      accountId: text(formData, 'accountId'),
      destinationAccountId: text(formData, 'destinationAccountId'),
      creditCardId: text(formData, 'creditCardId'),
      categoryId: text(formData, 'categoryId'),
      exchangeRate: text(formData, 'exchangeRate'),
      loanId: text(formData, 'loanId'),
      loanInterest: text(formData, 'loanInterest'),
      investmentId: text(formData, 'investmentId'),
      parentTransactionId: text(formData, 'parentTransactionId'),
      installments: text(formData, 'installments'),
      installmentMode: text(formData, 'installmentMode'),
      customTea: text(formData, 'customTea'),
      splits: readSplits(formData),
    };
    const input = operationSchema.parse(raw);
    const { supabase } = await authenticatedClient();
    const description = input.description ?? defaultDescriptions[input.type];
    const common = {
      p_type: input.type,
      p_transaction_date: toTransactionTimestamp(input.date),
      p_description: description,
      p_amount: input.amount,
    } as const;

    let args: CreateTransactionArgs;
    switch (input.type) {
      case 'INCOME':
        args = { ...common, p_currency: 'PEN', p_account_id: input.accountId, p_category_id: input.categoryId ?? null };
        break;
      case 'EXPENSE': {
        if (!input.accountId === !input.creditCardId) {
          throw new Error('Selecciona una cuenta o una tarjeta para registrar el gasto.');
        }
        const installments = input.creditCardId ? input.installments ?? 1 : 1;
        args = {
          ...common,
          p_currency: input.currency ?? 'PEN',
          p_account_id: input.accountId ?? null,
          p_credit_card_id: input.creditCardId ?? null,
          p_category_id: input.categoryId ?? null,
          p_splits: input.splits.map((split) => ({ debtor_name: split.debtor_name, amount_owed: split.amount_owed })),
        };
        if (installments > 1 && input.creditCardId) {
          const { data: card, error: cardError } = await supabase
            .from('credit_cards')
            .select('closing_day, default_tea')
            .eq('id', input.creditCardId)
            .maybeSingle();
          if (cardError || !card) throw new Error('La tarjeta seleccionada no existe.');
          const mode = input.installmentMode ?? 'ZERO';
          const tea = mode === 'ZERO' ? 0 : mode === 'DEFAULT' ? card.default_tea : input.customTea ?? 0;
          const plan = calculateInstallmentPlan(input.amount, installments, tea);
          args = {
            ...args,
            p_installments: installments,
            p_installment_tea: tea,
            p_installment_start_period: resolveInstallmentStartPeriod(input.date, card.closing_day),
            p_installment_principal: plan.monthlyPrincipal,
            p_installment_interest: plan.monthlyInterest,
          };
        }
        break;
      }
      case 'TRANSFER':
        args = {
          ...common,
          p_currency: 'PEN',
          p_account_id: input.accountId ?? null,
          p_destination_account_id: input.destinationAccountId ?? null,
          p_investment_id: input.investmentId ?? null,
          p_applied_exchange_rate: input.exchangeRate ?? null,
        };
        break;
      case 'CC_PAYMENT':
        args = {
          ...common,
          p_currency: input.currency,
          p_account_id: input.accountId,
          p_credit_card_id: input.creditCardId,
          p_applied_exchange_rate: input.exchangeRate ?? null,
        };
        break;
      case 'LOAN_PAYMENT':
        args = {
          ...common,
          p_currency: 'PEN',
          p_account_id: input.accountId,
          p_loan_id: input.loanId,
          p_loan_interest: input.loanInterest ?? null,
          p_applied_exchange_rate: input.exchangeRate ?? null,
        };
        break;
      case 'REFUND':
        args = { ...common, p_currency: 'PEN', p_parent_transaction_id: input.parentTransactionId };
        break;
    }

    const { error } = await supabase.rpc('create_transaction', args);
    if (error) throw rpcFailure(error, 'No se pudo registrar la operación.');
    revalidateActivity();
    return { success: 'Operación registrada correctamente.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}

export async function registerSharedRepayment(
  _state: ActivityActionState | null,
  formData: FormData
): Promise<ActivityActionState> {
  try {
    const input = sharedRepaymentSchema.parse({
      splitId: text(formData, 'splitId'),
      accountId: text(formData, 'accountId'),
      amount: text(formData, 'amount'),
      date: text(formData, 'date'),
    });
    const { supabase } = await authenticatedClient();
    const { error } = await supabase.rpc('register_shared_repayment', {
      p_split_id: input.splitId,
      p_account_id: input.accountId,
      p_amount: input.amount,
      p_transaction_date: toTransactionTimestamp(input.date),
    });
    if (error) throw rpcFailure(error, 'No se pudo registrar el cobro.');
    revalidateActivity();
    return { success: 'Cobro registrado correctamente.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteTransaction(
  _state: ActivityActionState | null,
  formData: FormData
): Promise<ActivityActionState> {
  try {
    const input = deleteSchema.parse({ transactionId: text(formData, 'transactionId') });
    const { supabase } = await authenticatedClient();
    const { error } = await supabase.rpc('delete_transaction', { p_transaction_id: input.transactionId });
    if (error) throw rpcFailure(error, 'No se pudo eliminar el movimiento.');
    revalidateActivity();
    return { success: 'Movimiento eliminado y saldos revertidos.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}

export async function editTransaction(
  _state: ActivityActionState | null,
  formData: FormData
): Promise<ActivityActionState> {
  try {
    const transactionId = z.string().uuid().parse(text(formData, 'transactionId'));
    const description = z.string().trim().min(1).max(255).parse(text(formData, 'description'));
    const changes: Record<string, string | number> = { description };
    const amount = text(formData, 'amount');
    const date = text(formData, 'date');
    const creditCardId = text(formData, 'creditCardId');
    const loanInterest = text(formData, 'loanInterest');

    if (amount && amount !== text(formData, 'originalAmount')) {
      changes.amount = amountSchema.parse(amount);
    }
    if (date && date !== text(formData, 'originalDate')) {
      changes.transaction_date = toTransactionTimestamp(dateSchema.parse(date));
    }
    if (creditCardId && creditCardId !== text(formData, 'originalCreditCardId')) {
      changes.credit_card_id = z.string().uuid().parse(creditCardId);
    }
    if (loanInterest && loanInterest !== text(formData, 'originalLoanInterest')) {
      changes.loan_interest = z.coerce.number().min(0).parse(loanInterest);
    }

    const { supabase } = await authenticatedClient();
    const { error } = await supabase.rpc('edit_transaction', { p_transaction_id: transactionId, p_changes: changes });
    if (error) throw rpcFailure(error, 'No se pudo editar el movimiento.');
    revalidateActivity();
    return { success: 'Movimiento actualizado.', token: crypto.randomUUID() };
  } catch (error) {
    return failure(error);
  }
}
