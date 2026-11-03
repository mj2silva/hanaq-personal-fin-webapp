export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CurrencyCode = 'PEN' | 'USD';
export type CategoryType = 'INCOME' | 'EXPENSE';
export type AccountType = 'BANK_ACCOUNT' | 'CASH_BOX';
export type ExemptionRuleType = 'NONE' | 'MIN_MONTHLY_SPEND' | 'MIN_ANNUAL_SPEND';
export type TransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER'
  | 'CC_PAYMENT'
  | 'REFUND'
  | 'SHARED_REPAYMENT'
  | 'LOAN_PAYMENT';
export type SplitStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          bank_name: string | null;
          created_at: string;
          currency: CurrencyCode;
          current_balance: number;
          id: string;
          initial_balance: number;
          is_active: boolean;
          name: string;
          trea_percentage: number | null;
          type: AccountType;
          user_id: string;
        };
        Insert: {
          bank_name?: string | null;
          created_at?: string;
          currency?: CurrencyCode;
          current_balance?: number;
          id?: string;
          initial_balance?: number;
          is_active?: boolean;
          name: string;
          trea_percentage?: number | null;
          type: AccountType;
          user_id: string;
        };
        Update: {
          bank_name?: string | null;
          created_at?: string;
          currency?: CurrencyCode;
          current_balance?: number;
          id?: string;
          initial_balance?: number;
          is_active?: boolean;
          name?: string;
          trea_percentage?: number | null;
          type?: AccountType;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accounts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      budgets: {
        Row: {
          category_id: string;
          created_at: string;
          id: string;
          limit_amount_pen: number;
          period_year_month: string;
          user_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          id?: string;
          limit_amount_pen: number;
          period_year_month: string;
          user_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          id?: string;
          limit_amount_pen?: number;
          period_year_month?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'budgets_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'budgets_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          type: CategoryType;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          type: CategoryType;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          type?: CategoryType;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      credit_card_statements: {
        Row: {
          calculated_desgravamen_pen: number;
          closing_date: string;
          created_at: string;
          credit_card_id: string;
          due_date: string;
          id: string;
          is_paid: boolean;
          manual_desgravamen_override_pen: number | null;
          paid_amount_pen: number;
          paid_amount_usd: number;
          period_year_month: string;
          statement_balance_pen: number;
          statement_balance_usd: number;
          user_id: string;
        };
        Insert: {
          calculated_desgravamen_pen?: number;
          closing_date: string;
          created_at?: string;
          credit_card_id: string;
          due_date: string;
          id?: string;
          is_paid?: boolean;
          manual_desgravamen_override_pen?: number | null;
          paid_amount_pen?: number;
          paid_amount_usd?: number;
          period_year_month: string;
          statement_balance_pen?: number;
          statement_balance_usd?: number;
          user_id: string;
        };
        Update: {
          calculated_desgravamen_pen?: number;
          closing_date?: string;
          created_at?: string;
          credit_card_id?: string;
          due_date?: string;
          id?: string;
          is_paid?: boolean;
          manual_desgravamen_override_pen?: number | null;
          paid_amount_pen?: number;
          paid_amount_usd?: number;
          period_year_month?: string;
          statement_balance_pen?: number;
          statement_balance_usd?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_card_statements_credit_card_id_fkey';
            columns: ['credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credit_card_statements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      credit_cards: {
        Row: {
          annual_fee_amount: number | null;
          annual_fee_currency: CurrencyCode | null;
          annual_fee_month: number | null;
          bank_name: string | null;
          closing_day: number;
          created_at: string;
          credit_limit_amount: number;
          credit_limit_alert_percentage: number;
          credit_limit_currency: CurrencyCode;
          current_debt_pen: number;
          current_debt_usd: number;
          default_tea: number;
          desgravamen_max_pen: number;
          desgravamen_rate: number;
          exemption_min_amount: number | null;
          exemption_rule: ExemptionRuleType;
          has_annual_fee: boolean;
          id: string;
          initial_debt_pen: number;
          initial_debt_usd: number;
          is_active: boolean;
          is_bimonetary: boolean;
          name: string;
          payment_due_day: number;
          user_id: string;
        };
        Insert: {
          annual_fee_amount?: number | null;
          annual_fee_currency?: CurrencyCode | null;
          annual_fee_month?: number | null;
          bank_name?: string | null;
          closing_day: number;
          created_at?: string;
          credit_limit_amount: number;
          credit_limit_alert_percentage?: number;
          credit_limit_currency?: CurrencyCode;
          current_debt_pen?: number;
          current_debt_usd?: number;
          default_tea?: number;
          desgravamen_max_pen?: number;
          desgravamen_rate?: number;
          exemption_min_amount?: number | null;
          exemption_rule?: ExemptionRuleType;
          has_annual_fee?: boolean;
          id?: string;
          initial_debt_pen?: number;
          initial_debt_usd?: number;
          is_active?: boolean;
          is_bimonetary?: boolean;
          name: string;
          payment_due_day: number;
          user_id: string;
        };
        Update: {
          annual_fee_amount?: number | null;
          annual_fee_currency?: CurrencyCode | null;
          annual_fee_month?: number | null;
          bank_name?: string | null;
          closing_day?: number;
          created_at?: string;
          credit_limit_amount?: number;
          credit_limit_alert_percentage?: number;
          credit_limit_currency?: CurrencyCode;
          current_debt_pen?: number;
          current_debt_usd?: number;
          default_tea?: number;
          desgravamen_max_pen?: number;
          desgravamen_rate?: number;
          exemption_min_amount?: number | null;
          exemption_rule?: ExemptionRuleType;
          has_annual_fee?: boolean;
          id?: string;
          initial_debt_pen?: number;
          initial_debt_usd?: number;
          is_active?: boolean;
          is_bimonetary?: boolean;
          name?: string;
          payment_due_day?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credit_cards_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      exchange_rates: {
        Row: {
          created_at: string;
          id: string;
          rate_date: string;
          usd_to_pen_rate: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          rate_date: string;
          usd_to_pen_rate: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          rate_date?: string;
          usd_to_pen_rate?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exchange_rates_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      fixed_expenses_template: {
        Row: {
          category_id: string;
          created_at: string;
          currency: CurrencyCode;
          due_day: number;
          estimated_amount: number;
          id: string;
          is_active: boolean;
          name: string;
          user_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          currency?: CurrencyCode;
          due_day: number;
          estimated_amount: number;
          id?: string;
          is_active?: boolean;
          name: string;
          user_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          currency?: CurrencyCode;
          due_day?: number;
          estimated_amount?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fixed_expenses_template_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fixed_expenses_template_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      installment_plans: {
        Row: {
          applied_tea: number;
          created_at: string;
          credit_card_id: string;
          id: string;
          monthly_interest_amount: number;
          monthly_principal_amount: number;
          remaining_installments: number;
          start_period_year_month: string;
          total_installments: number;
          transaction_id: string;
          user_id: string;
        };
        Insert: {
          applied_tea?: number;
          created_at?: string;
          credit_card_id: string;
          id?: string;
          monthly_interest_amount?: number;
          monthly_principal_amount: number;
          remaining_installments: number;
          start_period_year_month: string;
          total_installments: number;
          transaction_id: string;
          user_id: string;
        };
        Update: {
          applied_tea?: number;
          created_at?: string;
          credit_card_id?: string;
          id?: string;
          monthly_interest_amount?: number;
          monthly_principal_amount?: number;
          remaining_installments?: number;
          start_period_year_month?: string;
          total_installments?: number;
          transaction_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'installment_plans_credit_card_id_fkey';
            columns: ['credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'installment_plans_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: true;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'installment_plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      investment_monthly_logs: {
        Row: {
          id: string;
          investment_id: string;
          period_year_month: string;
          profit_or_loss_amount: number;
          recorded_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          investment_id: string;
          period_year_month: string;
          profit_or_loss_amount: number;
          recorded_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          investment_id?: string;
          period_year_month?: string;
          profit_or_loss_amount?: number;
          recorded_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'investment_monthly_logs_investment_id_fkey';
            columns: ['investment_id'];
            isOneToOne: false;
            referencedRelation: 'investments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'investment_monthly_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      investments: {
        Row: {
          created_at: string;
          currency: CurrencyCode;
          current_value: number;
          id: string;
          initial_capital: number;
          is_active: boolean;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: CurrencyCode;
          current_value?: number;
          id?: string;
          initial_capital?: number;
          is_active?: boolean;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: CurrencyCode;
          current_value?: number;
          id?: string;
          initial_capital?: number;
          is_active?: boolean;
          name?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'investments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      loans: {
        Row: {
          created_at: string;
          currency: CurrencyCode;
          current_balance: number;
          id: string;
          initial_amount: number;
          is_active: boolean;
          lender_name: string;
          monthly_installment_amount: number;
          payment_due_day: number;
          remaining_installments: number;
          tea_percentage: number;
          tcea_percentage: number | null;
          total_installments: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: CurrencyCode;
          current_balance: number;
          id?: string;
          initial_amount: number;
          is_active?: boolean;
          lender_name: string;
          monthly_installment_amount: number;
          payment_due_day: number;
          remaining_installments: number;
          tea_percentage?: number;
          tcea_percentage?: number | null;
          total_installments: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          currency?: CurrencyCode;
          current_balance?: number;
          id?: string;
          initial_amount?: number;
          is_active?: boolean;
          lender_name?: string;
          monthly_installment_amount?: number;
          payment_due_day?: number;
          remaining_installments?: number;
          tea_percentage?: number;
          tcea_percentage?: number | null;
          total_installments?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'loans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      monthly_fixed_checklist: {
        Row: {
          actual_amount: number | null;
          created_at: string;
          estimated_amount: number;
          fixed_expense_id: string;
          id: string;
          is_paid: boolean;
          paid_at: string | null;
          period_year_month: string;
          transaction_id: string | null;
          user_id: string;
        };
        Insert: {
          actual_amount?: number | null;
          created_at?: string;
          estimated_amount: number;
          fixed_expense_id: string;
          id?: string;
          is_paid?: boolean;
          paid_at?: string | null;
          period_year_month: string;
          transaction_id?: string | null;
          user_id: string;
        };
        Update: {
          actual_amount?: number | null;
          created_at?: string;
          estimated_amount?: number;
          fixed_expense_id?: string;
          id?: string;
          is_paid?: boolean;
          paid_at?: string | null;
          period_year_month?: string;
          transaction_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'monthly_fixed_checklist_fixed_expense_id_fkey';
            columns: ['fixed_expense_id'];
            isOneToOne: false;
            referencedRelation: 'fixed_expenses_template';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'monthly_fixed_checklist_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'monthly_fixed_checklist_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      projected_events: {
        Row: {
          amount: number;
          category_id: string | null;
          created_at: string;
          currency: CurrencyCode;
          expected_year_month: string;
          id: string;
          is_active: boolean;
          is_recurring_monthly: boolean;
          name: string;
          target_account_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          category_id?: string | null;
          created_at?: string;
          currency?: CurrencyCode;
          expected_year_month: string;
          id?: string;
          is_active?: boolean;
          is_recurring_monthly?: boolean;
          name: string;
          target_account_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          category_id?: string | null;
          created_at?: string;
          currency?: CurrencyCode;
          expected_year_month?: string;
          id?: string;
          is_active?: boolean;
          is_recurring_monthly?: boolean;
          name?: string;
          target_account_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projected_events_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projected_events_target_account_id_fkey';
            columns: ['target_account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projected_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      shared_expense_splits: {
        Row: {
          amount_owed: number;
          amount_paid: number;
          created_at: string;
          currency: CurrencyCode;
          debtor_name: string;
          id: string;
          status: SplitStatus;
          transaction_id: string;
          user_id: string;
        };
        Insert: {
          amount_owed: number;
          amount_paid?: number;
          created_at?: string;
          currency?: CurrencyCode;
          debtor_name: string;
          id?: string;
          status?: SplitStatus;
          transaction_id: string;
          user_id: string;
        };
        Update: {
          amount_owed?: number;
          amount_paid?: number;
          created_at?: string;
          currency?: CurrencyCode;
          debtor_name?: string;
          id?: string;
          status?: SplitStatus;
          transaction_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shared_expense_splits_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shared_expense_splits_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          account_id: string | null;
          amount: number;
          applied_exchange_rate: number | null;
          category_id: string | null;
          converted_amount: number | null;
          created_at: string;
          credit_card_id: string | null;
          currency: CurrencyCode;
          description: string;
          destination_account_id: string | null;
          id: string;
          investment_id: string | null;
          is_installment: boolean;
          is_shared_expense: boolean;
          loan_id: string | null;
          parent_transaction_id: string | null;
          shared_split_id: string | null;
          transaction_date: string;
          type: TransactionType;
          user_id: string;
        };
        Insert: {
          account_id?: string | null;
          amount: number;
          applied_exchange_rate?: number | null;
          category_id?: string | null;
          converted_amount?: number | null;
          created_at?: string;
          credit_card_id?: string | null;
          currency?: CurrencyCode;
          description: string;
          destination_account_id?: string | null;
          id?: string;
          investment_id?: string | null;
          is_installment?: boolean;
          is_shared_expense?: boolean;
          loan_id?: string | null;
          parent_transaction_id?: string | null;
          shared_split_id?: string | null;
          transaction_date?: string;
          type: TransactionType;
          user_id: string;
        };
        Update: {
          account_id?: string | null;
          amount?: number;
          applied_exchange_rate?: number | null;
          category_id?: string | null;
          converted_amount?: number | null;
          created_at?: string;
          credit_card_id?: string | null;
          currency?: CurrencyCode;
          description?: string;
          destination_account_id?: string | null;
          id?: string;
          investment_id?: string | null;
          is_installment?: boolean;
          is_shared_expense?: boolean;
          loan_id?: string | null;
          parent_transaction_id?: string | null;
          shared_split_id?: string | null;
          transaction_date?: string;
          type?: TransactionType;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_transactions_shared_split';
            columns: ['shared_split_id'];
            isOneToOne: false;
            referencedRelation: 'shared_expense_splits';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_credit_card_id_fkey';
            columns: ['credit_card_id'];
            isOneToOne: false;
            referencedRelation: 'credit_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_destination_account_id_fkey';
            columns: ['destination_account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_investment_id_fkey';
            columns: ['investment_id'];
            isOneToOne: false;
            referencedRelation: 'investments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_loan_id_fkey';
            columns: ['loan_id'];
            isOneToOne: false;
            referencedRelation: 'loans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_parent_transaction_id_fkey';
            columns: ['parent_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_settings: {
        Row: {
          base_currency: CurrencyCode;
          created_at: string;
          include_cash_in_balance: boolean;
          onboarding_completed: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          base_currency?: CurrencyCode;
          created_at?: string;
          include_cash_in_balance?: boolean;
          onboarding_completed?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          base_currency?: CurrencyCode;
          created_at?: string;
          include_cash_in_balance?: boolean;
          onboarding_completed?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      edit_transaction: {
        Args: { p_transaction_id: string; p_changes: Json };
        Returns: Json;
      };
      reconstruct_loan_history: {
        Args: {
          p_loan_id: string;
          p_apply?: boolean;
          p_expected_previous_balance?: number;
          p_expected_estimated_balance?: number;
        };
        Returns: Json;
      };
      create_transaction: {
        Args: {
          p_type: TransactionType;
          p_transaction_date: string;
          p_description: string;
          p_amount: number;
          p_currency: CurrencyCode;
          p_category_id?: string | null;
          p_account_id?: string | null;
          p_destination_account_id?: string | null;
          p_credit_card_id?: string | null;
          p_applied_exchange_rate?: number | null;
          p_loan_id?: string | null;
          p_loan_interest?: number | null;
          p_investment_id?: string | null;
          p_parent_transaction_id?: string | null;
          p_installments?: number;
          p_installment_tea?: number;
          p_installment_start_period?: string | null;
          p_installment_principal?: number | null;
          p_installment_interest?: number | null;
          p_splits?: Json;
        };
        Returns: string;
      };
      register_shared_repayment: {
        Args: {
          p_split_id: string;
          p_account_id: string;
          p_amount: number;
          p_transaction_date?: string | null;
          p_description?: string | null;
        };
        Returns: string;
      };
      delete_transaction: {
        Args: {
          p_transaction_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      account_type: AccountType;
      category_type: CategoryType;
      currency_code: CurrencyCode;
      exemption_rule_type: ExemptionRuleType;
      split_status: SplitStatus;
      transaction_type: TransactionType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
    ? Database['public']['Enums'][PublicEnumNameOrOptions]
    : never;

export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
