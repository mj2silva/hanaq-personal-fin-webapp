import { convertAmount, roundMoney, type Currency } from '../activity/calculations';

export interface CreditCardBalance {
  credit_limit_amount: number;
  credit_limit_currency: Currency;
  current_debt_pen: number;
  current_debt_usd: number;
}

export interface CreditCardLineUsage {
  debtInLimitCurrency: number | null;
  available: number | null;
  usagePercentage: number | null;
  requiresReferenceRate: boolean;
}

export interface CreditCardTotals {
  limitPen: number | null;
  debtPen: number | null;
  availablePen: number | null;
  usagePercentage: number | null;
  requiresReferenceRate: boolean;
}

export interface CreditCardSpending {
  pen: number | null;
  usd: number;
  requiresReferenceRate: boolean;
}

interface CardTransaction {
  transaction_date: string;
  amount: number;
  currency: Currency;
}

function convertReferenceAmount(amount: number, from: Currency, to: Currency, rate: number | null): number | null {
  if (from === to || amount === 0) return roundMoney(amount);
  if (!rate || !Number.isFinite(rate) || rate <= 0) return null;
  return convertAmount(amount, from, to, rate);
}

export function calculateCardLineUsage(card: CreditCardBalance, rate: number | null): CreditCardLineUsage {
  const ownCurrencyDebt = card.credit_limit_currency === 'PEN' ? card.current_debt_pen : card.current_debt_usd;
  const oppositeCurrencyDebt = card.credit_limit_currency === 'PEN' ? card.current_debt_usd : card.current_debt_pen;
  const oppositeCurrency = card.credit_limit_currency === 'PEN' ? 'USD' : 'PEN';
  const convertedDebt = convertReferenceAmount(oppositeCurrencyDebt, oppositeCurrency, card.credit_limit_currency, rate);
  const requiresReferenceRate = convertedDebt === null;
  const debtInLimitCurrency = convertedDebt === null ? null : roundMoney(ownCurrencyDebt + convertedDebt);
  const available = debtInLimitCurrency === null ? null : roundMoney(card.credit_limit_amount - debtInLimitCurrency);

  return {
    debtInLimitCurrency,
    available,
    usagePercentage: debtInLimitCurrency === null || card.credit_limit_amount <= 0
      ? null
      : (debtInLimitCurrency / card.credit_limit_amount) * 100,
    requiresReferenceRate,
  };
}

export function calculateCreditCardTotals(cards: CreditCardBalance[], rate: number | null): CreditCardTotals {
  let limitPen: number | null = 0;
  let debtPen: number | null = 0;

  for (const card of cards) {
    const cardLimitPen = card.credit_limit_currency === 'PEN'
      ? card.credit_limit_amount
      : convertReferenceAmount(card.credit_limit_amount, 'USD', 'PEN', rate);
    const cardDebtUsdPen = convertReferenceAmount(card.current_debt_usd, 'USD', 'PEN', rate);

    if (limitPen !== null) limitPen = cardLimitPen === null ? null : roundMoney(limitPen + cardLimitPen);
    if (debtPen !== null) debtPen = cardDebtUsdPen === null ? null : roundMoney(debtPen + card.current_debt_pen + cardDebtUsdPen);
  }

  const availablePen = limitPen === null || debtPen === null ? null : roundMoney(limitPen - debtPen);
  return {
    limitPen,
    debtPen,
    availablePen,
    usagePercentage: limitPen === null || debtPen === null || limitPen <= 0 ? null : (debtPen / limitPen) * 100,
    requiresReferenceRate: limitPen === null || debtPen === null,
  };
}

export function calculateCardSpending(
  transactions: CardTransaction[],
  periodPrefix: string,
  rate: number | null
): CreditCardSpending {
  const currentPeriodTransactions = transactions.filter((transaction) => transaction.transaction_date.startsWith(periodPrefix));
  const pen = currentPeriodTransactions
    .filter((transaction) => transaction.currency === 'PEN')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const usd = currentPeriodTransactions
    .filter((transaction) => transaction.currency === 'USD')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const convertedUsd = convertReferenceAmount(usd, 'USD', 'PEN', rate);

  return {
    pen: convertedUsd === null ? null : roundMoney(pen + convertedUsd),
    usd: roundMoney(usd),
    requiresReferenceRate: convertedUsd === null,
  };
}