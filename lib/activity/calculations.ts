export type Currency = 'PEN' | 'USD';

export interface InstallmentPlanAmounts {
  monthlyPrincipal: number;
  monthlyInterest: number;
  monthlyTotal: number;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLoanPayment(balance: number, teaPercent: number, payment: number, actualInterest: number | null = null) {
  const interest = actualInterest ?? roundMoney(balance * (Math.pow(1 + teaPercent / 100, 1 / 12) - 1));
  const principal = roundMoney(payment - interest);
  return { interest, principal, remaining: roundMoney(balance - principal) };
}

/**
 * Converts an amount between PEN and USD using the applied exchange rate (USD -> PEN).
 * Mirrors public.convert_amount in the activity engine migration.
 */
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rate: number | null | undefined
): number {
  if (from === to) return roundMoney(amount);
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('Debes indicar el tipo de cambio aplicado a la operación.');
  }
  return from === 'USD' ? roundMoney(amount * rate) : roundMoney(amount / rate);
}

/**
 * French-amortization installment: the monthly principal is the flat share of the purchase and
 * the monthly interest is the difference to the constant total payment (principal + interest).
 */
export function calculateInstallmentPlan(
  principal: number,
  installments: number,
  teaPercent: number
): InstallmentPlanAmounts {
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error('El monto de la compra debe ser mayor a cero.');
  }
  if (!Number.isInteger(installments) || installments < 2) {
    throw new Error('Las cuotas deben ser al menos 2.');
  }
  if (!Number.isFinite(teaPercent) || teaPercent < 0) {
    throw new Error('La TEA no puede ser negativa.');
  }

  const monthlyPrincipal = roundMoney(principal / installments);
  if (teaPercent === 0) {
    return { monthlyPrincipal, monthlyInterest: 0, monthlyTotal: monthlyPrincipal };
  }

  const monthlyRate = Math.pow(1 + teaPercent / 100, 1 / 12) - 1;
  const payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -installments));
  const monthlyInterest = Math.max(0, roundMoney(payment - principal / installments));
  return {
    monthlyPrincipal,
    monthlyInterest,
    monthlyTotal: roundMoney(monthlyPrincipal + monthlyInterest),
  };
}

/**
 * Period (YYYY-MM) of the first installment charge: purchases made on or before the closing day
 * are billed in the current month's statement; later purchases move to the next month.
 */
export function resolveInstallmentStartPeriod(purchaseDate: string, closingDay: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(purchaseDate);
  if (!match) throw new Error('La fecha de la compra no es válida.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (day <= closingDay) return `${match[1]}-${match[2]}`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/** Noon in Lima (UTC-5, no DST) keeps the calendar day stable across time zones. */
export function toTransactionTimestamp(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('La fecha no es válida.');
  return `${date}T12:00:00-05:00`;
}

export function derivedSharedStatus(amountOwed: number, amountPaid: number): 'PENDING' | 'PARTIAL' | 'PAID' {
  if (amountPaid >= amountOwed) return 'PAID';
  return amountPaid > 0 ? 'PARTIAL' : 'PENDING';
}
