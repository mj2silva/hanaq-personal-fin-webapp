import type { Currency } from '@/lib/activity/calculations';
import type { Tables } from '@/types/database.types';

export type Account = Tables<'accounts'>;
export type CreditCard = Tables<'credit_cards'>;
export type Loan = Tables<'loans'>;
export type Investment = Tables<'investments'>;
export type Category = Tables<'categories'>;
export type Transaction = Tables<'transactions'>;
export type SharedSplit = Tables<'shared_expense_splits'>;

export type OperationType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'CC_PAYMENT' | 'LOAN_PAYMENT' | 'REFUND';

export interface RefundableExpense {
  id: string;
  description: string;
  currency: Currency;
  remaining: number;
  date: string;
}

export interface InstallmentSummary {
  total: number;
  monthlyTotal: number;
}

export interface NameMaps {
  accounts: Record<string, string>;
  cards: Record<string, string>;
  loans: Record<string, string>;
  investments: Record<string, string>;
  categories: Record<string, string>;
}

export interface OperationReferenceData {
  accounts: Account[];
  cards: CreditCard[];
  loans: Loan[];
  investments: Investment[];
  categories: Category[];
  refundable: RefundableExpense[];
  exchangeRate: number | null;
  today: string;
}

export interface SharedSplitView extends SharedSplit {
  originDescription: string;
  originDate: string | null;
}
