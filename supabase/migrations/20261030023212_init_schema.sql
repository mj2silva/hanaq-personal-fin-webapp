SET local check_function_bodies = off;

CREATE TABLE "public"."accounts" (
  "id"      uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid                   NOT NULL,
  "name"    character varying(100) NOT NULL,
  CONSTRAINT "accounts_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."accounts"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."budgets" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"           uuid                     NOT NULL,
  "category_id"       uuid                     NOT NULL,
  "period_year_month" character varying(7)     NOT NULL,
  "limit_amount_pen"  numeric(12,2)            NOT NULL,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "budgets_limit_amount_pen_check" CHECK ((limit_amount_pen >= (0)::numeric)),
  CONSTRAINT "budgets_pkey" PRIMARY KEY (id),
  CONSTRAINT "budgets_user_id_category_id_period_year_month_key" UNIQUE (user_id, category_id, period_year_month)
);

ALTER TABLE "public"."budgets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."categories" (
  "id"      uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid                   NOT NULL,
  "name"    character varying(100) NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."credit_card_statements" (
  "id"                              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                         uuid                     NOT NULL,
  "credit_card_id"                  uuid                     NOT NULL,
  "period_year_month"               character varying(7)     NOT NULL,
  "closing_date"                    date                     NOT NULL,
  "due_date"                        date                     NOT NULL,
  "statement_balance_pen"           numeric(12,2)            NOT NULL DEFAULT 0.00,
  "statement_balance_usd"           numeric(12,2)            NOT NULL DEFAULT 0.00,
  "paid_amount_pen"                 numeric(12,2)            NOT NULL DEFAULT 0.00,
  "paid_amount_usd"                 numeric(12,2)            NOT NULL DEFAULT 0.00,
  "calculated_desgravamen_pen"      numeric(8,2)             NOT NULL DEFAULT 0.00,
  "manual_desgravamen_override_pen" numeric(8,2),
  "is_paid"                         boolean                  NOT NULL DEFAULT false,
  "created_at"                      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "credit_card_statements_credit_card_id_period_year_month_key" UNIQUE (credit_card_id, period_year_month),
  CONSTRAINT "credit_card_statements_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."credit_card_statements"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."credit_cards" (
  "id"                  uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "user_id"             uuid                   NOT NULL,
  "name"                character varying(100) NOT NULL,
  "bank_name"           character varying(100),
  "is_bimonetary"       boolean                NOT NULL DEFAULT true,
  "initial_debt_pen"    numeric(12,2)          NOT NULL DEFAULT 0.00,
  "initial_debt_usd"    numeric(12,2)          NOT NULL DEFAULT 0.00,
  "current_debt_pen"    numeric(12,2)          NOT NULL DEFAULT 0.00,
  "current_debt_usd"    numeric(12,2)          NOT NULL DEFAULT 0.00,
  "default_tea"         numeric(5,2)           NOT NULL DEFAULT 0.00,
  "closing_day"         integer                NOT NULL,
  "payment_due_day"     integer                NOT NULL,
  "desgravamen_rate"    numeric(6,4)           NOT NULL DEFAULT 0.0000,
  "desgravamen_max_pen" numeric(8,2)           NOT NULL DEFAULT 0.00,
  "has_annual_fee"      boolean                NOT NULL DEFAULT false,
  "annual_fee_amount"   numeric(8,2),
  CONSTRAINT "credit_cards_closing_day_check" CHECK (((closing_day >= 1) AND (closing_day <= 31))),
  CONSTRAINT "credit_cards_payment_due_day_check" CHECK (((payment_due_day >= 1) AND (payment_due_day <= 31))),
  CONSTRAINT "credit_cards_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."credit_cards"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."exchange_rates" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"         uuid                     NOT NULL,
  "rate_date"       date                     NOT NULL,
  "usd_to_pen_rate" numeric(10,4)            NOT NULL,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "exchange_rates_pkey" PRIMARY KEY (id),
  CONSTRAINT "exchange_rates_usd_to_pen_rate_check" CHECK ((usd_to_pen_rate > (0)::numeric)),
  CONSTRAINT "exchange_rates_user_id_rate_date_key" UNIQUE (user_id, rate_date)
);

ALTER TABLE "public"."exchange_rates"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."fixed_expenses_template" (
  "id"               uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "user_id"          uuid                   NOT NULL,
  "name"             character varying(100) NOT NULL,
  "category_id"      uuid                   NOT NULL,
  "estimated_amount" numeric(12,2)          NOT NULL,
  CONSTRAINT "fixed_expenses_template_estimated_amount_check" CHECK ((estimated_amount > (0)::numeric)),
  CONSTRAINT "fixed_expenses_template_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."fixed_expenses_template"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."installment_plans" (
  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                  uuid                     NOT NULL,
  "transaction_id"           uuid                     NOT NULL,
  "credit_card_id"           uuid                     NOT NULL,
  "start_period_year_month"  character varying(7)     NOT NULL,
  "total_installments"       integer                  NOT NULL,
  "remaining_installments"   integer                  NOT NULL,
  "applied_tea"              numeric(5,2)             NOT NULL DEFAULT 0.00,
  "monthly_principal_amount" numeric(12,2)            NOT NULL,
  "monthly_interest_amount"  numeric(12,2)            NOT NULL DEFAULT 0.00,
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "installment_plans_pkey" PRIMARY KEY (id),
  CONSTRAINT "installment_plans_remaining_installments_check" CHECK ((remaining_installments >= 0)),
  CONSTRAINT "installment_plans_total_installments_check" CHECK ((total_installments > 1)),
  CONSTRAINT "installment_plans_transaction_id_key" UNIQUE (transaction_id)
);

ALTER TABLE "public"."installment_plans"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."investment_monthly_logs" (
  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"               uuid                     NOT NULL,
  "investment_id"         uuid                     NOT NULL,
  "period_year_month"     character varying(7)     NOT NULL,
  "profit_or_loss_amount" numeric(12,2)            NOT NULL,
  "recorded_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "investment_monthly_logs_investment_id_period_year_month_key" UNIQUE (investment_id, period_year_month),
  CONSTRAINT "investment_monthly_logs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."investment_monthly_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."investments" (
  "id"      uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid                   NOT NULL,
  "name"    character varying(100) NOT NULL,
  CONSTRAINT "investments_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."investments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."loans" (
  "id"          uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     uuid                   NOT NULL,
  "lender_name" character varying(100) NOT NULL,
  CONSTRAINT "loans_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."loans"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."monthly_fixed_checklist" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"           uuid                     NOT NULL,
  "fixed_expense_id"  uuid                     NOT NULL,
  "period_year_month" character varying(7)     NOT NULL,
  "estimated_amount"  numeric(12,2)            NOT NULL,
  "actual_amount"     numeric(12,2),
  "is_paid"           boolean                  NOT NULL DEFAULT false,
  "paid_at"           timestamp with time zone,
  "transaction_id"    uuid,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "monthly_fixed_checklist_fixed_expense_id_period_year_month_key" UNIQUE (fixed_expense_id, period_year_month),
  CONSTRAINT "monthly_fixed_checklist_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."monthly_fixed_checklist"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."projected_events" (
  "id"                  uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "user_id"             uuid                   NOT NULL,
  "name"                character varying(100) NOT NULL,
  "expected_year_month" character varying(7)   NOT NULL,
  "amount"              numeric(12,2)          NOT NULL,
  CONSTRAINT "projected_events_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "projected_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."projected_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."shared_expense_splits" (
  "id"             uuid                   NOT NULL DEFAULT gen_random_uuid(),
  "user_id"        uuid                   NOT NULL,
  "transaction_id" uuid                   NOT NULL,
  "debtor_name"    character varying(100) NOT NULL,
  CONSTRAINT "shared_expense_splits_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."shared_expense_splits"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."transactions" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"          uuid                     NOT NULL,
  "transaction_date" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "transactions_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."transactions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_settings" (
  "user_id" uuid NOT NULL,
  CONSTRAINT "user_settings_pkey" PRIMARY KEY (user_id)
);

ALTER TABLE "public"."user_settings"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."account_type" AS ENUM (
  'BANK_ACCOUNT',
  'CASH_BOX'
);

ALTER TABLE "public"."accounts"
  ADD COLUMN "type" public.account_type NOT NULL;

ALTER TABLE "public"."accounts"
  ADD COLUMN "bank_name" character varying(100);

CREATE TYPE "public"."category_type" AS ENUM (
  'INCOME',
  'EXPENSE'
);

ALTER TABLE "public"."categories"
  ADD COLUMN "type" public.category_type NOT NULL;

ALTER TABLE "public"."categories"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."categories"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE TYPE "public"."currency_code" AS ENUM (
  'PEN',
  'USD'
);

ALTER TABLE "public"."accounts"
  ADD COLUMN "currency" public.currency_code NOT NULL DEFAULT 'PEN'::public.currency_code;

ALTER TABLE "public"."accounts"
  ADD COLUMN "initial_balance" numeric(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE "public"."accounts"
  ADD COLUMN "current_balance" numeric(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE "public"."accounts"
  ADD COLUMN "trea_percentage" numeric(5,2) DEFAULT 0.00;

ALTER TABLE "public"."accounts"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."accounts"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."credit_cards"
  ADD COLUMN "annual_fee_currency" public.currency_code DEFAULT 'PEN'::public.currency_code;

ALTER TABLE "public"."credit_cards"
  ADD COLUMN "annual_fee_month" integer;

ALTER TABLE "public"."fixed_expenses_template"
  ADD COLUMN "currency" public.currency_code NOT NULL DEFAULT 'PEN'::public.currency_code;

ALTER TABLE "public"."fixed_expenses_template"
  ADD COLUMN "due_day" integer NOT NULL;

ALTER TABLE "public"."fixed_expenses_template"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."fixed_expenses_template"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."investments"
  ADD COLUMN "currency" public.currency_code NOT NULL DEFAULT 'PEN'::public.currency_code;

ALTER TABLE "public"."investments"
  ADD COLUMN "initial_capital" numeric(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE "public"."investments"
  ADD COLUMN "current_value" numeric(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE "public"."investments"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."investments"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."loans"
  ADD COLUMN "currency" public.currency_code NOT NULL DEFAULT 'PEN'::public.currency_code;

ALTER TABLE "public"."loans"
  ADD COLUMN "initial_amount" numeric(12,2) NOT NULL;

ALTER TABLE "public"."loans"
  ADD COLUMN "current_balance" numeric(12,2) NOT NULL;

ALTER TABLE "public"."loans"
  ADD COLUMN "tea_percentage" numeric(5,2) NOT NULL DEFAULT 0.00;

ALTER TABLE "public"."loans"
  ADD COLUMN "monthly_installment_amount" numeric(12,2) NOT NULL;

ALTER TABLE "public"."loans"
  ADD COLUMN "total_installments" integer NOT NULL;

ALTER TABLE "public"."loans"
  ADD COLUMN "remaining_installments" integer NOT NULL;

ALTER TABLE "public"."loans"
  ADD COLUMN "payment_due_day" integer NOT NULL;

ALTER TABLE "public"."loans"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."loans"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."projected_events"
  ADD COLUMN "currency" public.currency_code NOT NULL DEFAULT 'PEN'::public.currency_code;

ALTER TABLE "public"."projected_events"
  ADD COLUMN "category_id" uuid;

ALTER TABLE "public"."projected_events"
  ADD COLUMN "target_account_id" uuid;

ALTER TABLE "public"."projected_events"
  ADD COLUMN "is_recurring_monthly" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."projected_events"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."projected_events"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."shared_expense_splits"
  ADD COLUMN "currency" public.currency_code NOT NULL DEFAULT 'PEN'::public.currency_code;

ALTER TABLE "public"."shared_expense_splits"
  ADD COLUMN "amount_owed" numeric(12,2) NOT NULL;

ALTER TABLE "public"."shared_expense_splits"
  ADD COLUMN "amount_paid" numeric(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE "public"."user_settings"
  ADD COLUMN "base_currency" public.currency_code NOT NULL DEFAULT 'PEN'::public.currency_code;

ALTER TABLE "public"."user_settings"
  ADD COLUMN "include_cash_in_balance" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."user_settings"
  ADD COLUMN "onboarding_completed" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."user_settings"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."user_settings"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE TYPE "public"."exemption_rule_type" AS ENUM (
  'NONE',
  'MIN_MONTHLY_SPEND',
  'MIN_ANNUAL_SPEND'
);

ALTER TABLE "public"."credit_cards"
  ADD COLUMN "exemption_rule" public.exemption_rule_type NOT NULL DEFAULT 'NONE'::public.exemption_rule_type;

ALTER TABLE "public"."credit_cards"
  ADD COLUMN "exemption_min_amount" numeric(12,2);

ALTER TABLE "public"."credit_cards"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."credit_cards"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."credit_cards"
  ADD COLUMN "credit_limit_currency" public.currency_code NOT NULL DEFAULT 'PEN'::public.currency_code;

ALTER TABLE "public"."credit_cards"
  ADD COLUMN "credit_limit_amount" numeric(12,2) NOT NULL DEFAULT 0.00;

ALTER TABLE "public"."credit_cards"
  ADD COLUMN "credit_limit_alert_percentage" numeric(5,2) NOT NULL DEFAULT 70.00;

CREATE TYPE "public"."split_status" AS ENUM (
  'PENDING',
  'PARTIAL',
  'PAID'
);

ALTER TABLE "public"."shared_expense_splits"
  ADD COLUMN "status" public.split_status NOT NULL DEFAULT 'PENDING'::public.split_status;

ALTER TABLE "public"."shared_expense_splits"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE TYPE "public"."transaction_type" AS ENUM (
  'INCOME',
  'EXPENSE',
  'TRANSFER',
  'CC_PAYMENT',
  'REFUND',
  'SHARED_REPAYMENT',
  'LOAN_PAYMENT'
);

ALTER TABLE "public"."transactions"
  ADD COLUMN "type" public.transaction_type NOT NULL;

ALTER TABLE "public"."transactions"
  ADD COLUMN "description" character varying(255) NOT NULL;

ALTER TABLE "public"."transactions"
  ADD COLUMN "amount" numeric(12,2) NOT NULL;

ALTER TABLE "public"."transactions"
  ADD COLUMN "currency" public.currency_code NOT NULL DEFAULT 'PEN'::public.currency_code;

ALTER TABLE "public"."transactions"
  ADD COLUMN "category_id" uuid;

ALTER TABLE "public"."transactions"
  ADD COLUMN "account_id" uuid;

ALTER TABLE "public"."transactions"
  ADD COLUMN "destination_account_id" uuid;

ALTER TABLE "public"."transactions"
  ADD COLUMN "credit_card_id" uuid;

ALTER TABLE "public"."transactions"
  ADD COLUMN "applied_exchange_rate" numeric(10,4);

ALTER TABLE "public"."transactions"
  ADD COLUMN "converted_amount" numeric(12,2);

ALTER TABLE "public"."transactions"
  ADD COLUMN "is_installment" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."transactions"
  ADD COLUMN "is_shared_expense" boolean NOT NULL DEFAULT false;

ALTER TABLE "public"."transactions"
  ADD COLUMN "parent_transaction_id" uuid;

ALTER TABLE "public"."transactions"
  ADD COLUMN "loan_id" uuid;

ALTER TABLE "public"."transactions"
  ADD COLUMN "investment_id" uuid;

ALTER TABLE "public"."transactions"
  ADD COLUMN "shared_split_id" uuid;

ALTER TABLE "public"."transactions"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.adjust_account_balance (
  p_account_id uuid,
  p_delta      numeric
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_balance NUMERIC;
BEGIN
    UPDATE public.accounts
    SET current_balance = current_balance + p_delta
    WHERE id = p_account_id AND user_id = auth.uid()
    RETURNING current_balance INTO v_balance;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cuenta seleccionada no existe.';
    END IF;
    IF v_balance < 0 THEN
        RAISE EXCEPTION 'Saldo insuficiente en la cuenta seleccionada.';
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_card_debt (
  p_card_id  uuid,
  p_currency public.currency_code,
  p_delta    numeric,
  p_rate     numeric              DEFAULT NULL::numeric
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_debt NUMERIC;
    v_debt_pen NUMERIC;
    v_debt_usd NUMERIC;
    v_limit NUMERIC;
    v_limit_currency currency_code;
    v_limit_delta NUMERIC;
BEGIN
    IF p_currency = 'PEN' THEN
        UPDATE public.credit_cards
        SET current_debt_pen = greatest(0, current_debt_pen + p_delta)
        WHERE id = p_card_id AND user_id = auth.uid()
        RETURNING current_debt_pen, credit_limit_currency, credit_limit_amount INTO v_debt, v_limit_currency, v_limit;
    ELSE
        UPDATE public.credit_cards
        SET current_debt_usd = greatest(0, current_debt_usd + p_delta)
        WHERE id = p_card_id AND user_id = auth.uid()
        RETURNING current_debt_usd, credit_limit_currency, credit_limit_amount INTO v_debt, v_limit_currency, v_limit;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La tarjeta seleccionada no existe.';
    END IF;
    SELECT current_debt_pen, current_debt_usd
    INTO v_debt_pen, v_debt_usd
    FROM public.credit_cards
    WHERE id = p_card_id AND user_id = auth.uid();
    v_limit_delta := public.convert_amount(p_delta, p_currency, v_limit_currency, p_rate);
    v_debt := public.convert_amount(v_debt_pen, 'PEN', v_limit_currency, p_rate)
        + public.convert_amount(v_debt_usd, 'USD', v_limit_currency, p_rate);
    IF p_delta > 0 AND v_limit > 0 AND v_debt > v_limit THEN
        RAISE EXCEPTION 'La operación excede la línea de crédito disponible en %.', p_currency;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_investment_value (
  p_investment_id uuid,
  p_delta         numeric
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_value NUMERIC;
BEGIN
    UPDATE public.investments
    SET current_value = current_value + p_delta
    WHERE id = p_investment_id AND user_id = auth.uid()
    RETURNING current_value INTO v_value;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La inversión seleccionada no existe.';
    END IF;
    IF v_value < 0 THEN
        RAISE EXCEPTION 'El valor de la inversión no es suficiente para esta operación.';
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_loan (
  p_loan_id            uuid,
  p_balance_delta      numeric,
  p_installments_delta integer
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_remaining INT;
    v_total INT;
BEGIN
    SELECT remaining_installments, total_installments
    INTO v_remaining, v_total
    FROM public.loans
    WHERE id = p_loan_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El préstamo seleccionado no existe.';
    END IF;
    IF v_remaining + p_installments_delta < 0 THEN
        RAISE EXCEPTION 'El préstamo no tiene cuotas pendientes.';
    END IF;

    UPDATE public.loans
    SET current_balance = greatest(0, current_balance + p_balance_delta),
        remaining_installments = least(v_total, v_remaining + p_installments_delta)
    WHERE id = p_loan_id AND user_id = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_statement_payment (
  p_card_id   uuid,
  p_currency  public.currency_code,
  p_amount    numeric,
  p_direction integer
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_statement public.credit_card_statements;
    v_paid_pen NUMERIC;
    v_paid_usd NUMERIC;
BEGIN
    IF p_direction = 1 THEN
        SELECT * INTO v_statement
        FROM public.credit_card_statements
        WHERE credit_card_id = p_card_id AND user_id = auth.uid() AND is_paid = FALSE
        ORDER BY period_year_month ASC
        LIMIT 1
        FOR UPDATE;
    ELSE
        SELECT * INTO v_statement
        FROM public.credit_card_statements
        WHERE credit_card_id = p_card_id AND user_id = auth.uid()
          AND ((p_currency = 'PEN' AND paid_amount_pen > 0) OR (p_currency = 'USD' AND paid_amount_usd > 0))
        ORDER BY period_year_month DESC
        LIMIT 1
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_paid_pen := v_statement.paid_amount_pen;
    v_paid_usd := v_statement.paid_amount_usd;
    IF p_currency = 'PEN' THEN
        v_paid_pen := greatest(0, v_paid_pen + p_direction * p_amount);
    ELSE
        v_paid_usd := greatest(0, v_paid_usd + p_direction * p_amount);
    END IF;

    UPDATE public.credit_card_statements
    SET paid_amount_pen = v_paid_pen,
        paid_amount_usd = v_paid_usd,
        is_paid = (v_statement.statement_balance_pen + v_statement.statement_balance_usd > 0
            AND v_paid_pen >= v_statement.statement_balance_pen
            AND v_paid_usd >= v_statement.statement_balance_usd)
    WHERE id = v_statement.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_transaction_effects (
  t           public.transactions,
  p_direction integer
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
BEGIN
    IF t.type = 'INCOME' THEN
        PERFORM public.adjust_account_balance(t.account_id, p_direction * t.amount);

    ELSIF t.type = 'EXPENSE' THEN
        IF t.account_id IS NOT NULL THEN
            PERFORM public.adjust_account_balance(t.account_id, -p_direction * t.amount);
        ELSE
            PERFORM public.adjust_card_debt(t.credit_card_id, t.currency, p_direction * t.amount, t.applied_exchange_rate);
        END IF;

    ELSIF t.type = 'TRANSFER' THEN
        IF t.account_id IS NOT NULL THEN
            PERFORM public.adjust_account_balance(t.account_id, -p_direction * t.amount);
        END IF;
        IF t.destination_account_id IS NOT NULL THEN
            PERFORM public.adjust_account_balance(t.destination_account_id, p_direction * coalesce(t.converted_amount, t.amount));
        END IF;
        IF t.investment_id IS NOT NULL THEN
            IF t.account_id IS NOT NULL THEN
                PERFORM public.adjust_investment_value(t.investment_id, p_direction * coalesce(t.converted_amount, t.amount));
            ELSE
                PERFORM public.adjust_investment_value(t.investment_id, -p_direction * t.amount);
            END IF;
        END IF;

    ELSIF t.type = 'CC_PAYMENT' THEN
        PERFORM public.adjust_account_balance(t.account_id, -p_direction * coalesce(t.converted_amount, t.amount));
        PERFORM public.adjust_card_debt(t.credit_card_id, t.currency, -p_direction * t.amount, t.applied_exchange_rate);
        PERFORM public.apply_statement_payment(t.credit_card_id, t.currency, t.amount, p_direction);

    ELSIF t.type = 'LOAN_PAYMENT' THEN
        PERFORM public.adjust_account_balance(t.account_id, -p_direction * coalesce(t.converted_amount, t.amount));
        PERFORM public.adjust_loan(t.loan_id, -p_direction * t.amount, -p_direction);

    ELSIF t.type = 'REFUND' THEN
        IF t.account_id IS NOT NULL THEN
            PERFORM public.adjust_account_balance(t.account_id, p_direction * t.amount);
        ELSE
            PERFORM public.adjust_card_debt(t.credit_card_id, t.currency, -p_direction * t.amount);
        END IF;

    ELSIF t.type = 'SHARED_REPAYMENT' THEN
        PERFORM public.adjust_account_balance(t.account_id, p_direction * t.amount);
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.convert_amount (
  p_amount numeric,
  p_from   public.currency_code,
  p_to     public.currency_code,
  p_rate   numeric
)
  RETURNS numeric
  LANGUAGE plpgsql
  IMMUTABLE
  AS $function$
BEGIN
    IF p_from = p_to THEN
        RETURN round(p_amount, 2);
    END IF;
    IF p_amount = 0 THEN
        RETURN 0;
    END IF;
    IF p_rate IS NULL OR p_rate <= 0 THEN
        RAISE EXCEPTION 'Debes indicar el tipo de cambio aplicado a la operación.';
    END IF;
    IF p_from = 'USD' THEN
        RETURN round(p_amount * p_rate, 2);
    END IF;
    RETURN round(p_amount / p_rate, 2);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_transaction (
  p_type                     public.transaction_type,
  p_transaction_date         timestamp with time zone,
  p_description              text,
  p_amount                   numeric,
  p_currency                 public.currency_code,
  p_category_id              uuid                     DEFAULT NULL::uuid,
  p_account_id               uuid                     DEFAULT NULL::uuid,
  p_destination_account_id   uuid                     DEFAULT NULL::uuid,
  p_credit_card_id           uuid                     DEFAULT NULL::uuid,
  p_applied_exchange_rate    numeric                  DEFAULT NULL::numeric,
  p_loan_id                  uuid                     DEFAULT NULL::uuid,
  p_investment_id            uuid                     DEFAULT NULL::uuid,
  p_parent_transaction_id    uuid                     DEFAULT NULL::uuid,
  p_installments             integer                  DEFAULT 1,
  p_installment_tea          numeric                  DEFAULT 0,
  p_installment_start_period text                     DEFAULT NULL::text,
  p_installment_principal    numeric                  DEFAULT NULL::numeric,
  p_installment_interest     numeric                  DEFAULT NULL::numeric,
  p_splits                   jsonb                    DEFAULT '[]'::jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_user UUID := auth.uid();
    v_account public.accounts;
    v_dest public.accounts;
    v_card public.credit_cards;
    v_loan public.loans;
    v_inv public.investments;
    v_parent public.transactions;
    v_category public.categories;
    v_tx public.transactions;
    v_currency currency_code := p_currency;
    v_account_id UUID := p_account_id;
    v_card_id UUID := p_credit_card_id;
    v_category_id UUID := p_category_id;
    v_rate NUMERIC := NULL;
    v_converted NUMERIC := NULL;
    v_is_installment BOOLEAN := FALSE;
    v_split JSONB;
    v_owed NUMERIC;
    v_owed_total NUMERIC := 0;
    v_splits_count INT := coalesce(jsonb_array_length(p_splits), 0);
    v_refunded NUMERIC;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a cero.';
    END IF;
    IF p_description IS NULL OR length(btrim(p_description)) = 0 THEN
        RAISE EXCEPTION 'La descripción es obligatoria.';
    END IF;
    IF p_type = 'SHARED_REPAYMENT' THEN
        RAISE EXCEPTION 'Los cobros compartidos se registran desde la pestaña Por Cobrar.';
    END IF;

    -- Categoría (opcional, debe coincidir con el tipo de operación)
    IF p_category_id IS NOT NULL THEN
        SELECT * INTO v_category FROM public.categories WHERE id = p_category_id AND user_id = v_user;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'La categoría seleccionada no existe.';
        END IF;
        IF (p_type = 'INCOME' AND v_category.type <> 'INCOME') OR (p_type = 'EXPENSE' AND v_category.type <> 'EXPENSE') THEN
            RAISE EXCEPTION 'La categoría no corresponde al tipo de operación.';
        END IF;
    END IF;

    IF p_type = 'INCOME' THEN
        IF p_account_id IS NULL THEN
            RAISE EXCEPTION 'Selecciona la cuenta que recibe el ingreso.';
        END IF;
        SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id AND user_id = v_user AND is_active FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'La cuenta seleccionada no existe.';
        END IF;
        v_currency := v_account.currency;
        v_card_id := NULL;

    ELSIF p_type = 'EXPENSE' THEN
        IF (p_account_id IS NULL) = (p_credit_card_id IS NULL) THEN
            RAISE EXCEPTION 'Selecciona una cuenta o una tarjeta para registrar el gasto.';
        END IF;
        IF p_account_id IS NOT NULL THEN
            SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id AND user_id = v_user AND is_active FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'La cuenta seleccionada no existe.';
            END IF;
            v_currency := v_account.currency;
            IF p_installments > 1 THEN
                RAISE EXCEPTION 'Las compras en cuotas solo aplican a tarjetas de crédito.';
            END IF;
        ELSE
            SELECT * INTO v_card FROM public.credit_cards WHERE id = p_credit_card_id AND user_id = v_user AND is_active FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'La tarjeta seleccionada no existe.';
            END IF;
            IF p_currency = 'USD' AND NOT v_card.is_bimonetary THEN
                RAISE EXCEPTION 'La tarjeta seleccionada no admite consumos en USD.';
            END IF;
            v_currency := p_currency;
            IF p_installments > 1 THEN
                IF p_installment_start_period IS NULL OR p_installment_start_period !~ '^\d{4}-(0[1-9]|1[0-2])$'
                   OR p_installment_principal IS NULL OR p_installment_principal <= 0
                   OR p_installment_interest IS NULL OR p_installment_interest < 0 THEN
                    RAISE EXCEPTION 'Los datos del plan de cuotas no son válidos.';
                END IF;
                v_is_installment := TRUE;
            END IF;
        END IF;
        IF v_splits_count > 0 THEN
            FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits) LOOP
                v_owed := (v_split ->> 'amount_owed')::NUMERIC;
                IF coalesce(btrim(v_split ->> 'debtor_name'), '') = '' OR v_owed IS NULL OR v_owed <= 0 THEN
                    RAISE EXCEPTION 'Cada deudor debe tener un nombre y un monto mayor a cero.';
                END IF;
                v_owed_total := v_owed_total + v_owed;
            END LOOP;
            IF v_owed_total > p_amount THEN
                RAISE EXCEPTION 'El monto por cobrar no puede superar el total del gasto.';
            END IF;
        END IF;

    ELSIF p_type = 'TRANSFER' THEN
        IF p_account_id IS NOT NULL AND p_destination_account_id IS NOT NULL AND p_investment_id IS NULL THEN
            IF p_account_id = p_destination_account_id THEN
                RAISE EXCEPTION 'La cuenta de origen y destino deben ser distintas.';
            END IF;
            SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id AND user_id = v_user AND is_active FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'La cuenta de origen no existe.';
            END IF;
            SELECT * INTO v_dest FROM public.accounts WHERE id = p_destination_account_id AND user_id = v_user AND is_active FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'La cuenta de destino no existe.';
            END IF;
            v_currency := v_account.currency;
            IF v_account.currency <> v_dest.currency THEN
                v_rate := p_applied_exchange_rate;
                v_converted := public.convert_amount(p_amount, v_account.currency, v_dest.currency, v_rate);
            END IF;
        ELSIF p_account_id IS NOT NULL AND p_investment_id IS NOT NULL AND p_destination_account_id IS NULL THEN
            SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id AND user_id = v_user AND is_active FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'La cuenta de origen no existe.';
            END IF;
            SELECT * INTO v_inv FROM public.investments WHERE id = p_investment_id AND user_id = v_user AND is_active FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'La inversión seleccionada no existe.';
            END IF;
            v_currency := v_account.currency;
            IF v_account.currency <> v_inv.currency THEN
                v_rate := p_applied_exchange_rate;
                v_converted := public.convert_amount(p_amount, v_account.currency, v_inv.currency, v_rate);
            END IF;
        ELSIF p_account_id IS NULL AND p_investment_id IS NOT NULL AND p_destination_account_id IS NOT NULL THEN
            SELECT * INTO v_inv FROM public.investments WHERE id = p_investment_id AND user_id = v_user AND is_active FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'La inversión seleccionada no existe.';
            END IF;
            SELECT * INTO v_dest FROM public.accounts WHERE id = p_destination_account_id AND user_id = v_user AND is_active FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'La cuenta de destino no existe.';
            END IF;
            v_currency := v_inv.currency;
            IF v_inv.currency <> v_dest.currency THEN
                v_rate := p_applied_exchange_rate;
                v_converted := public.convert_amount(p_amount, v_inv.currency, v_dest.currency, v_rate);
            END IF;
        ELSE
            RAISE EXCEPTION 'La transferencia requiere un origen y un destino válidos.';
        END IF;
        v_card_id := NULL;

    ELSIF p_type = 'CC_PAYMENT' THEN
        IF p_account_id IS NULL OR p_credit_card_id IS NULL THEN
            RAISE EXCEPTION 'Selecciona la tarjeta y la cuenta desde la que pagas.';
        END IF;
        SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id AND user_id = v_user AND is_active FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'La cuenta seleccionada no existe.';
        END IF;
        SELECT * INTO v_card FROM public.credit_cards WHERE id = p_credit_card_id AND user_id = v_user AND is_active FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'La tarjeta seleccionada no existe.';
        END IF;
        v_currency := p_currency;
        IF (v_currency = 'PEN' AND p_amount > v_card.current_debt_pen) OR (v_currency = 'USD' AND p_amount > v_card.current_debt_usd) THEN
            RAISE EXCEPTION 'El pago excede la deuda actual de la tarjeta en %.', v_currency;
        END IF;
        IF v_account.currency <> v_currency THEN
            v_rate := p_applied_exchange_rate;
            v_converted := public.convert_amount(p_amount, v_currency, v_account.currency, v_rate);
        END IF;

    ELSIF p_type = 'LOAN_PAYMENT' THEN
        IF p_account_id IS NULL OR p_loan_id IS NULL THEN
            RAISE EXCEPTION 'Selecciona el préstamo y la cuenta desde la que pagas.';
        END IF;
        SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id AND user_id = v_user AND is_active FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'La cuenta seleccionada no existe.';
        END IF;
        SELECT * INTO v_loan FROM public.loans WHERE id = p_loan_id AND user_id = v_user AND is_active FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El préstamo seleccionado no existe.';
        END IF;
        IF v_loan.remaining_installments <= 0 THEN
            RAISE EXCEPTION 'El préstamo no tiene cuotas pendientes.';
        END IF;
        v_currency := v_loan.currency;
        IF v_account.currency <> v_currency THEN
            v_rate := p_applied_exchange_rate;
            v_converted := public.convert_amount(p_amount, v_currency, v_account.currency, v_rate);
        END IF;
        v_card_id := NULL;

    ELSIF p_type = 'REFUND' THEN
        IF p_parent_transaction_id IS NULL THEN
            RAISE EXCEPTION 'Selecciona el gasto que se reembolsa.';
        END IF;
        SELECT * INTO v_parent FROM public.transactions
        WHERE id = p_parent_transaction_id AND user_id = v_user AND type = 'EXPENSE' FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El gasto original no existe.';
        END IF;
        SELECT coalesce(sum(amount), 0) INTO v_refunded
        FROM public.transactions
        WHERE parent_transaction_id = v_parent.id AND type = 'REFUND';
        IF p_amount > v_parent.amount - v_refunded THEN
            RAISE EXCEPTION 'El reembolso supera el monto pendiente de reembolsar del gasto original.';
        END IF;
        v_currency := v_parent.currency;
        v_account_id := v_parent.account_id;
        v_card_id := v_parent.credit_card_id;
        v_category_id := v_parent.category_id;
    ELSE
        RAISE EXCEPTION 'Tipo de operación no soportado.';
    END IF;

    INSERT INTO public.transactions (
        user_id, transaction_date, type, description, amount, currency, category_id,
        account_id, destination_account_id, credit_card_id, applied_exchange_rate, converted_amount,
        is_installment, is_shared_expense, parent_transaction_id, loan_id, investment_id
    ) VALUES (
        v_user, coalesce(p_transaction_date, NOW()), p_type, btrim(p_description), round(p_amount, 2), v_currency, v_category_id,
        CASE WHEN p_type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'CC_PAYMENT', 'LOAN_PAYMENT', 'REFUND') THEN v_account_id ELSE NULL END,
        CASE WHEN p_type = 'TRANSFER' THEN p_destination_account_id ELSE NULL END,
        v_card_id, v_rate, v_converted,
        v_is_installment, v_splits_count > 0,
        CASE WHEN p_type = 'REFUND' THEN p_parent_transaction_id ELSE NULL END,
        CASE WHEN p_type = 'LOAN_PAYMENT' THEN p_loan_id ELSE NULL END,
        CASE WHEN p_type = 'TRANSFER' THEN p_investment_id ELSE NULL END
    ) RETURNING * INTO v_tx;

    IF v_is_installment THEN
        INSERT INTO public.installment_plans (
            user_id, transaction_id, credit_card_id, start_period_year_month, total_installments,
            remaining_installments, applied_tea, monthly_principal_amount, monthly_interest_amount
        ) VALUES (
            v_user, v_tx.id, v_card_id, p_installment_start_period, p_installments,
            p_installments, coalesce(p_installment_tea, 0), p_installment_principal, p_installment_interest
        );
    END IF;

    IF v_splits_count > 0 THEN
        INSERT INTO public.shared_expense_splits (user_id, transaction_id, debtor_name, currency, amount_owed)
        SELECT v_user, v_tx.id, btrim(s ->> 'debtor_name'), v_currency, round((s ->> 'amount_owed')::NUMERIC, 2)
        FROM jsonb_array_elements(p_splits) AS s;
    END IF;

    PERFORM public.apply_transaction_effects(v_tx, 1);

    RETURN v_tx.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_transaction (
  p_transaction_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_user UUID := auth.uid();
    v_tx public.transactions;
    v_split public.shared_expense_splits;
    v_paid NUMERIC;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    END IF;

    SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id AND user_id = v_user FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El movimiento no existe.';
    END IF;

    IF v_tx.type = 'EXPENSE' THEN
        IF EXISTS (SELECT 1 FROM public.transactions WHERE parent_transaction_id = v_tx.id) THEN
            RAISE EXCEPTION 'Elimina primero los reembolsos asociados a este gasto.';
        END IF;
        IF EXISTS (
            SELECT 1 FROM public.shared_expense_splits WHERE transaction_id = v_tx.id AND amount_paid > 0
        ) THEN
            RAISE EXCEPTION 'Elimina primero los cobros registrados de este gasto compartido.';
        END IF;
    END IF;

    IF v_tx.type = 'SHARED_REPAYMENT' AND v_tx.shared_split_id IS NOT NULL THEN
        SELECT * INTO v_split FROM public.shared_expense_splits WHERE id = v_tx.shared_split_id FOR UPDATE;
        IF FOUND THEN
            v_paid := greatest(0, v_split.amount_paid - v_tx.amount);
            UPDATE public.shared_expense_splits
            SET amount_paid = v_paid,
                status = CASE
                    WHEN v_paid >= amount_owed THEN 'PAID'::split_status
                    WHEN v_paid > 0 THEN 'PARTIAL'::split_status
                    ELSE 'PENDING'::split_status
                END
            WHERE id = v_split.id;
        END IF;
    END IF;

    PERFORM public.apply_transaction_effects(v_tx, -1);

    DELETE FROM public.transactions WHERE id = v_tx.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.register_shared_repayment (
  p_split_id         uuid,
  p_account_id       uuid,
  p_amount           numeric,
  p_transaction_date timestamp with time zone DEFAULT NULL::timestamp WITH time zone,
  p_description      text                     DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_user UUID := auth.uid();
    v_split public.shared_expense_splits;
    v_account public.accounts;
    v_origin public.transactions;
    v_tx public.transactions;
    v_paid NUMERIC;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El monto cobrado debe ser mayor a cero.';
    END IF;

    SELECT * INTO v_split FROM public.shared_expense_splits WHERE id = p_split_id AND user_id = v_user FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La deuda seleccionada no existe.';
    END IF;
    IF p_amount > v_split.amount_owed - v_split.amount_paid THEN
        RAISE EXCEPTION 'El cobro supera el saldo pendiente de la deuda.';
    END IF;

    SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id AND user_id = v_user AND is_active FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cuenta que recibe el dinero no existe.';
    END IF;
    IF v_account.currency <> v_split.currency THEN
        RAISE EXCEPTION 'La cuenta receptora debe estar en la misma moneda de la deuda (%).', v_split.currency;
    END IF;

    SELECT * INTO v_origin FROM public.transactions WHERE id = v_split.transaction_id AND user_id = v_user;

    INSERT INTO public.transactions (
        user_id, transaction_date, type, description, amount, currency, category_id, account_id, shared_split_id
    ) VALUES (
        v_user, coalesce(p_transaction_date, NOW()), 'SHARED_REPAYMENT',
        coalesce(nullif(btrim(p_description), ''), 'Cobro de ' || v_split.debtor_name),
        round(p_amount, 2), v_split.currency, v_origin.category_id, p_account_id, v_split.id
    ) RETURNING * INTO v_tx;

    v_paid := v_split.amount_paid + round(p_amount, 2);
    UPDATE public.shared_expense_splits
    SET amount_paid = v_paid,
        status = CASE WHEN v_paid >= amount_owed THEN 'PAID'::split_status ELSE 'PARTIAL'::split_status END
    WHERE id = v_split.id;

    PERFORM public.apply_transaction_effects(v_tx, 1);

    RETURN v_tx.id;
END;
$function$;

ALTER TABLE "public"."accounts"
  ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."budgets"
  ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."budgets"
  ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."credit_card_statements"
  ADD CONSTRAINT "credit_card_statements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."credit_cards"
  ADD CONSTRAINT "credit_cards_annual_fee_month_check" CHECK (((annual_fee_month >= 1) AND (annual_fee_month <= 12)));

ALTER TABLE "public"."credit_cards"
  ADD CONSTRAINT "credit_cards_credit_limit_alert_percentage_check" CHECK (((credit_limit_alert_percentage >= (0)::numeric) AND (credit_limit_alert_percentage <= (100)::numeric)));

ALTER TABLE "public"."credit_cards"
  ADD CONSTRAINT "credit_cards_credit_limit_amount_check" CHECK ((credit_limit_amount >= (0)::numeric));

ALTER TABLE "public"."credit_card_statements"
  ADD CONSTRAINT "credit_card_statements_credit_card_id_fkey" FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE;

ALTER TABLE "public"."credit_cards"
  ADD CONSTRAINT "credit_cards_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."exchange_rates"
  ADD CONSTRAINT "exchange_rates_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."fixed_expenses_template"
  ADD CONSTRAINT "fixed_expenses_template_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;

ALTER TABLE "public"."fixed_expenses_template"
  ADD CONSTRAINT "fixed_expenses_template_due_day_check" CHECK (((due_day >= 1) AND (due_day <= 31)));

ALTER TABLE "public"."fixed_expenses_template"
  ADD CONSTRAINT "fixed_expenses_template_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."installment_plans"
  ADD CONSTRAINT "installment_plans_credit_card_id_fkey" FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE;

ALTER TABLE "public"."installment_plans"
  ADD CONSTRAINT "installment_plans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."investment_monthly_logs"
  ADD CONSTRAINT "investment_monthly_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."investment_monthly_logs"
  ADD CONSTRAINT "investment_monthly_logs_investment_id_fkey" FOREIGN KEY (investment_id) REFERENCES public.investments(id) ON DELETE CASCADE;

ALTER TABLE "public"."investments"
  ADD CONSTRAINT "investments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."loans"
  ADD CONSTRAINT "loans_payment_due_day_check" CHECK (((payment_due_day >= 1) AND (payment_due_day <= 31)));

ALTER TABLE "public"."loans"
  ADD CONSTRAINT "loans_remaining_installments_check" CHECK ((remaining_installments >= 0));

ALTER TABLE "public"."loans"
  ADD CONSTRAINT "loans_total_installments_check" CHECK ((total_installments > 0));

ALTER TABLE "public"."loans"
  ADD CONSTRAINT "loans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."monthly_fixed_checklist"
  ADD CONSTRAINT "monthly_fixed_checklist_fixed_expense_id_fkey" FOREIGN KEY (fixed_expense_id) REFERENCES public.fixed_expenses_template(id) ON DELETE CASCADE;

ALTER TABLE "public"."monthly_fixed_checklist"
  ADD CONSTRAINT "monthly_fixed_checklist_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."projected_events"
  ADD CONSTRAINT "projected_events_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE "public"."projected_events"
  ADD CONSTRAINT "projected_events_target_account_id_fkey" FOREIGN KEY (target_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

ALTER TABLE "public"."projected_events"
  ADD CONSTRAINT "projected_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."shared_expense_splits"
  ADD CONSTRAINT "shared_expense_splits_amount_owed_check" CHECK ((amount_owed > (0)::numeric));

ALTER TABLE "public"."shared_expense_splits"
  ADD CONSTRAINT "shared_expense_splits_amount_paid_check" CHECK ((amount_paid >= (0)::numeric));

ALTER TABLE "public"."shared_expense_splits"
  ADD CONSTRAINT "shared_expense_splits_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "fk_transactions_shared_split" FOREIGN KEY (shared_split_id) REFERENCES public.shared_expense_splits(id) ON DELETE SET NULL;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_amount_check" CHECK ((amount > (0)::numeric));

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_credit_card_id_fkey" FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE RESTRICT;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_destination_account_id_fkey" FOREIGN KEY (destination_account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_investment_id_fkey" FOREIGN KEY (investment_id) REFERENCES public.investments(id) ON DELETE SET NULL;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_loan_id_fkey" FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE SET NULL;

ALTER TABLE "public"."installment_plans"
  ADD CONSTRAINT "installment_plans_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;

ALTER TABLE "public"."monthly_fixed_checklist"
  ADD CONSTRAINT "monthly_fixed_checklist_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE "public"."shared_expense_splits"
  ADD CONSTRAINT "shared_expense_splits_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_parent_transaction_id_fkey" FOREIGN KEY (parent_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_settings"
  ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_budgets_user_period ON public.budgets USING btree (user_id, period_year_month);

CREATE INDEX idx_checklist_user_period ON public.monthly_fixed_checklist USING btree (user_id, period_year_month);

CREATE INDEX idx_shared_splits_status ON public.shared_expense_splits USING btree (user_id, status);

CREATE INDEX idx_transactions_category ON public.transactions USING btree (user_id, category_id);

CREATE INDEX idx_transactions_type ON public.transactions USING btree (user_id, TYPE);

CREATE INDEX idx_transactions_user_date ON public.transactions USING btree (user_id, transaction_date DESC);

CREATE POLICY "Acceso total exclusivo al propietario (accounts)" ON "public"."accounts"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (budgets)" ON "public"."budgets"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (categories)" ON "public"."categories"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (credit_card_statements)" ON "public"."credit_card_statements"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (credit_cards)" ON "public"."credit_cards"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (exchange_rates)" ON "public"."exchange_rates"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (fixed_expenses_template)" ON "public"."fixed_expenses_template"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (installment_plans)" ON "public"."installment_plans"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (investment_monthly_logs)" ON "public"."investment_monthly_logs"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (investments)" ON "public"."investments"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (loans)" ON "public"."loans"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (monthly_fixed_checklist)" ON "public"."monthly_fixed_checklist"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (projected_events)" ON "public"."projected_events"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (shared_expense_splits)" ON "public"."shared_expense_splits"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (transactions)" ON "public"."transactions"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Acceso total exclusivo al propietario (user_settings)" ON "public"."user_settings"
  FOR ALL
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

REVOKE ALL ON FUNCTION "public"."adjust_account_balance"(uuid, numeric) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."adjust_account_balance"(uuid, numeric) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."adjust_account_balance"(uuid, numeric) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."adjust_account_balance"(uuid, numeric) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."adjust_account_balance"(uuid, numeric) TO "service_role";

REVOKE ALL ON FUNCTION "public"."adjust_card_debt"(uuid, public.currency_code, numeric, numeric) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."adjust_card_debt"(uuid, public.currency_code, numeric, numeric) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."adjust_card_debt"(uuid, public.currency_code, numeric, numeric) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."adjust_card_debt"(uuid, public.currency_code, numeric, numeric) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."adjust_card_debt"(uuid, public.currency_code, numeric, numeric) TO "service_role";

REVOKE ALL ON FUNCTION "public"."adjust_investment_value"(uuid, numeric) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."adjust_investment_value"(uuid, numeric) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."adjust_investment_value"(uuid, numeric) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."adjust_investment_value"(uuid, numeric) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."adjust_investment_value"(uuid, numeric) TO "service_role";

REVOKE ALL ON FUNCTION "public"."adjust_loan"(uuid, numeric, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."adjust_loan"(uuid, numeric, integer) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."adjust_loan"(uuid, numeric, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."adjust_loan"(uuid, numeric, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."adjust_loan"(uuid, numeric, integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."apply_statement_payment"(uuid, public.currency_code, numeric, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."apply_statement_payment"(uuid, public.currency_code, numeric, integer) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."apply_statement_payment"(uuid, public.currency_code, numeric, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."apply_statement_payment"(uuid, public.currency_code, numeric, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."apply_statement_payment"(uuid, public.currency_code, numeric, integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."apply_transaction_effects"(public.transactions, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."apply_transaction_effects"(public.transactions, integer) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."apply_transaction_effects"(public.transactions, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."apply_transaction_effects"(public.transactions, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."apply_transaction_effects"(public.transactions, integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."convert_amount"(numeric, public.currency_code, public.currency_code, numeric) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."convert_amount"(numeric, public.currency_code, public.currency_code, numeric) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."convert_amount"(numeric, public.currency_code, public.currency_code, numeric) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."convert_amount"(numeric, public.currency_code, public.currency_code, numeric) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."convert_amount"(numeric, public.currency_code, public.currency_code, numeric) TO "service_role";

REVOKE ALL
  ON FUNCTION "public"."create_transaction"(public.transaction_type, timestamp
    WITH time zone, text, numeric, public.currency_code, uuid, uuid, uuid, uuid, numeric, uuid, uuid, uuid, integer, numeric, text, numeric, numeric, jsonb)
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION "public"."create_transaction"(public.transaction_type, timestamp
    WITH time zone, text, numeric, public.currency_code, uuid, uuid, uuid, uuid, numeric, uuid, uuid, uuid, integer, numeric, text, numeric, numeric, jsonb)
  TO "anon", "authenticated";

REVOKE ALL
  ON FUNCTION "public"."create_transaction"(public.transaction_type, timestamp
    WITH time zone, text, numeric, public.currency_code, uuid, uuid, uuid, uuid, numeric, uuid, uuid, uuid, integer, numeric, text, numeric, numeric, jsonb)
  FROM "postgres";

GRANT EXECUTE
  ON FUNCTION "public"."create_transaction"(public.transaction_type, timestamp
    WITH time zone, text, numeric, public.currency_code, uuid, uuid, uuid, uuid, numeric, uuid, uuid, uuid, integer, numeric, text, numeric, numeric, jsonb)
  TO "postgres";

GRANT EXECUTE
  ON FUNCTION "public"."create_transaction"(public.transaction_type, timestamp
    WITH time zone, text, numeric, public.currency_code, uuid, uuid, uuid, uuid, numeric, uuid, uuid, uuid, integer, numeric, text, numeric, numeric, jsonb)
  TO "service_role";

REVOKE ALL ON FUNCTION "public"."delete_transaction"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."delete_transaction"(uuid) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."delete_transaction"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_transaction"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_transaction"(uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."register_shared_repayment"(uuid, uuid, numeric, timestamp WITH time zone, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."register_shared_repayment"(uuid, uuid, numeric, timestamp WITH time zone, text) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."register_shared_repayment"(uuid, uuid, numeric, timestamp WITH time zone, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."register_shared_repayment"(uuid, uuid, numeric, timestamp WITH time zone, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."register_shared_repayment"(uuid, uuid, numeric, timestamp WITH time zone, text) TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounts" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."accounts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounts" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."budgets" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."budgets" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."budgets" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."budgets" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."categories" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."credit_card_statements" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."credit_card_statements" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."credit_card_statements" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."credit_card_statements" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."credit_cards" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."credit_cards" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."credit_cards" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."credit_cards" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."exchange_rates" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."exchange_rates" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."exchange_rates" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."exchange_rates" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."fixed_expenses_template" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."fixed_expenses_template" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."fixed_expenses_template" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."fixed_expenses_template" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."installment_plans" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."installment_plans" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."installment_plans" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."installment_plans" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."investment_monthly_logs" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."investment_monthly_logs" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."investment_monthly_logs" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."investment_monthly_logs" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."investments" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."investments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."investments" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."investments" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."loans" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."loans" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."loans" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."loans" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."monthly_fixed_checklist" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."monthly_fixed_checklist" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."monthly_fixed_checklist" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."monthly_fixed_checklist" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projected_events" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."projected_events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projected_events" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projected_events" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shared_expense_splits" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."shared_expense_splits" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shared_expense_splits" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."shared_expense_splits" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."transactions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_settings" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."user_settings" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_settings" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_settings" TO "service_role";
