-- ============================================================================
-- 1. EXTENSIONES Y TIPOS PERSONALIZADOS (ENUMS)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE currency_code AS ENUM ('PEN', 'USD');
CREATE TYPE category_type AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE account_type AS ENUM ('BANK_ACCOUNT', 'CASH_BOX');
CREATE TYPE exemption_rule_type AS ENUM ('NONE', 'MIN_MONTHLY_SPEND', 'MIN_ANNUAL_SPEND');
CREATE TYPE transaction_type AS ENUM (
    'INCOME',
    'EXPENSE',
    'TRANSFER',
    'CC_PAYMENT',
    'REFUND',
    'SHARED_REPAYMENT',
    'LOAN_PAYMENT'
);
CREATE TYPE split_status AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- ============================================================================
-- 2. CONFIGURACIÓN Y CATÁLOGOS BASE
-- ============================================================================

-- Configuración general y estado del Onboarding (Día 0)
CREATE TABLE public.user_settings (
                                      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                                      base_currency currency_code NOT NULL DEFAULT 'PEN',
                                      include_cash_in_balance BOOLEAN NOT NULL DEFAULT TRUE,
                                      onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
                                      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tipos de cambio referenciales por día
CREATE TABLE public.exchange_rates (
                                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                       rate_date DATE NOT NULL,
                                       usd_to_pen_rate NUMERIC(10, 4) NOT NULL CHECK (usd_to_pen_rate > 0),
                                       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                       UNIQUE (user_id, rate_date)
);

-- Orígenes de ingresos y Categorías de gastos
CREATE TABLE public.categories (
                                   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                   name VARCHAR(100) NOT NULL,
                                   type category_type NOT NULL,
                                   is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. MÓDULO DE TESORERÍA (CUENTAS Y TARJETAS DE CRÉDITO)
-- ============================================================================

-- Cuentas Bancarias y Caja de Efectivo
CREATE TABLE public.accounts (
                                 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                 user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                 name VARCHAR(100) NOT NULL,
                                 type account_type NOT NULL,
                                 bank_name VARCHAR(100),
                                 currency currency_code NOT NULL DEFAULT 'PEN',
                                 initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                 current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                 trea_percentage NUMERIC(5, 2) DEFAULT 0.00,
                                 is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tarjetas de Crédito (Adaptado a regulación peruana y bimoneda)
CREATE TABLE public.credit_cards (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                     name VARCHAR(100) NOT NULL,
                                     bank_name VARCHAR(100),
                                     is_bimonetary BOOLEAN NOT NULL DEFAULT TRUE,
                                     credit_limit_pen NUMERIC(12, 2) NOT NULL CHECK (credit_limit_pen >= 0),
                                     initial_debt_pen NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                     initial_debt_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                     current_debt_pen NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                     current_debt_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                     default_tea NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                                     closing_day INT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
                                     payment_due_day INT NOT NULL CHECK (payment_due_day BETWEEN 1 AND 31),
    -- Seguro de desgravamen
                                     desgravamen_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0000,
                                     desgravamen_max_pen NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    -- Membresía anual
                                     has_annual_fee BOOLEAN NOT NULL DEFAULT FALSE,
                                     annual_fee_amount NUMERIC(8, 2),
                                     annual_fee_currency currency_code DEFAULT 'PEN',
                                     annual_fee_month INT CHECK (annual_fee_month BETWEEN 1 AND 12),
                                     exemption_rule exemption_rule_type NOT NULL DEFAULT 'NONE',
                                     exemption_min_amount NUMERIC(12, 2),
                                     is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Estados de Cuenta Mensuales de Tarjetas de Crédito
CREATE TABLE public.credit_card_statements (
                                               id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                               user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                               credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
                                               period_year_month VARCHAR(7) NOT NULL, -- Formato 'YYYY-MM'
                                               closing_date DATE NOT NULL,
                                               due_date DATE NOT NULL,
                                               statement_balance_pen NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                               statement_balance_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                               paid_amount_pen NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                               paid_amount_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                               calculated_desgravamen_pen NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
                                               manual_desgravamen_override_pen NUMERIC(8, 2),
                                               is_paid BOOLEAN NOT NULL DEFAULT FALSE,
                                               created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                               UNIQUE (credit_card_id, period_year_month)
);

-- ============================================================================
-- 4. PRÉSTAMOS E INVERSIONES (Creadas antes de transactions por las FKs)
-- ============================================================================

-- Préstamos Personales / Deudas a Terceros
CREATE TABLE public.loans (
                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                              lender_name VARCHAR(100) NOT NULL,
                              currency currency_code NOT NULL DEFAULT 'PEN',
                              initial_amount NUMERIC(12, 2) NOT NULL,
                              current_balance NUMERIC(12, 2) NOT NULL,
                              tea_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                              monthly_installment_amount NUMERIC(12, 2) NOT NULL,
                              total_installments INT NOT NULL CHECK (total_installments > 0),
                              remaining_installments INT NOT NULL CHECK (remaining_installments >= 0),
                              payment_due_day INT NOT NULL CHECK (payment_due_day BETWEEN 1 AND 31),
                              is_active BOOLEAN NOT NULL DEFAULT TRUE,
                              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Instrumentos de Inversión
CREATE TABLE public.investments (
                                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                    name VARCHAR(100) NOT NULL,
                                    currency currency_code NOT NULL DEFAULT 'PEN',
                                    initial_capital NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                    current_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historial Mensual de Rendimiento de Inversiones
CREATE TABLE public.investment_monthly_logs (
                                                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                                investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
                                                period_year_month VARCHAR(7) NOT NULL, -- Formato 'YYYY-MM'
                                                profit_or_loss_amount NUMERIC(12, 2) NOT NULL, -- Positivo = Ganancia, Negativo = Pérdida
                                                recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                                UNIQUE (investment_id, period_year_month)
);

-- ============================================================================
-- 5. MOTOR DE TRANSACCIONES, CUOTAS Y GASTOS COMPARTIDOS
-- ============================================================================

-- Tabla Central de Movimientos
CREATE TABLE public.transactions (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                     transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                     type transaction_type NOT NULL,
                                     description VARCHAR(255) NOT NULL,
                                     amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
                                     currency currency_code NOT NULL DEFAULT 'PEN',
                                     category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

    -- Orígenes y Destinos
                                     account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
                                     destination_account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
                                     credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE RESTRICT,

    -- Cruce de divisas / Multimoneda
                                     applied_exchange_rate NUMERIC(10, 4),
                                     converted_amount NUMERIC(12, 2),

    -- Flags y relaciones especiales
                                     is_installment BOOLEAN NOT NULL DEFAULT FALSE,
                                     is_shared_expense BOOLEAN NOT NULL DEFAULT FALSE,
                                     parent_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL, -- Para REFUND
                                     loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL, -- Para LOAN_PAYMENT
                                     investment_id UUID REFERENCES public.investments(id) ON DELETE SET NULL, -- Para aportes/retiros de inversión
                                     shared_split_id UUID, -- Se vincula abajo mediante ALTER TABLE para evitar dependencia circular

                                     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Desglose de Compras en Cuotas con Tarjeta de Crédito
CREATE TABLE public.installment_plans (
                                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                          transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
                                          credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
                                          start_period_year_month VARCHAR(7) NOT NULL, -- 'YYYY-MM' del primer cobro según fecha de corte
                                          total_installments INT NOT NULL CHECK (total_installments > 1),
                                          remaining_installments INT NOT NULL CHECK (remaining_installments >= 0),
                                          applied_tea NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- 0.00 para cuotas sin intereses
                                          monthly_principal_amount NUMERIC(12, 2) NOT NULL,
                                          monthly_interest_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                                          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cuentas por Cobrar / División de Gastos Compartidos
CREATE TABLE public.shared_expense_splits (
                                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                              transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE, -- Gasto original
                                              debtor_name VARCHAR(100) NOT NULL,
                                              currency currency_code NOT NULL DEFAULT 'PEN',
                                              amount_owed NUMERIC(12, 2) NOT NULL CHECK (amount_owed > 0),
                                              amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
                                              status split_status NOT NULL DEFAULT 'PENDING',
                                              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vincular transactions.shared_split_id con shared_expense_splits (Para pagos de tipo SHARED_REPAYMENT)
ALTER TABLE public.transactions
    ADD CONSTRAINT fk_transactions_shared_split
        FOREIGN KEY (shared_split_id) REFERENCES public.shared_expense_splits(id) ON DELETE SET NULL;

-- ============================================================================
-- 6. PRESUPUESTOS, CHECKLIST DE GASTOS FIJOS Y PROYECCIONES
-- ============================================================================

-- Presupuesto Mensual por Categoría
CREATE TABLE public.budgets (
                                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
                                period_year_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
                                limit_amount_pen NUMERIC(12, 2) NOT NULL CHECK (limit_amount_pen >= 0),
                                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                UNIQUE (user_id, category_id, period_year_month)
);

-- Plantilla de Gastos Fijos Recurrentes
CREATE TABLE public.fixed_expenses_template (
                                                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                                name VARCHAR(100) NOT NULL,
                                                category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
                                                estimated_amount NUMERIC(12, 2) NOT NULL CHECK (estimated_amount > 0),
                                                currency currency_code NOT NULL DEFAULT 'PEN',
                                                due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
                                                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checklist Interactivo del Mes (Mi Mes)
CREATE TABLE public.monthly_fixed_checklist (
                                                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                                fixed_expense_id UUID NOT NULL REFERENCES public.fixed_expenses_template(id) ON DELETE CASCADE,
                                                period_year_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
                                                estimated_amount NUMERIC(12, 2) NOT NULL,
                                                actual_amount NUMERIC(12, 2),
                                                is_paid BOOLEAN NOT NULL DEFAULT FALSE,
                                                paid_at TIMESTAMPTZ,
                                                transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
                                                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                                UNIQUE (fixed_expense_id, period_year_month)
);

-- Eventos e Ingresos Futuros para el Simulador de Proyecciones
CREATE TABLE public.projected_events (
                                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                         user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                                         name VARCHAR(100) NOT NULL,
                                         expected_year_month VARCHAR(7) NOT NULL, -- 'YYYY-MM' (Mes de inicio si es recurrente, o mes único)
                                         amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
                                         currency currency_code NOT NULL DEFAULT 'PEN',
                                         category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
                                         target_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
                                         is_recurring_monthly BOOLEAN NOT NULL DEFAULT FALSE,
                                         is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. ÍNDICES DE RENDIMIENTO
-- ============================================================================
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_category ON public.transactions(user_id, category_id);
CREATE INDEX idx_transactions_type ON public.transactions(user_id, type);
CREATE INDEX idx_budgets_user_period ON public.budgets(user_id, period_year_month);
CREATE INDEX idx_checklist_user_period ON public.monthly_fixed_checklist(user_id, period_year_month);
CREATE INDEX idx_shared_splits_status ON public.shared_expense_splits(user_id, status);

-- ============================================================================
-- 8. SEGURIDAD RLS (ROW LEVEL SECURITY) Y PERMISOS DE API
-- ============================================================================
-- Dado que desactivaste "Automatically expose new tables", otorgamos permisos
-- explícitos solo al rol 'authenticated' (usuarios logueados) y activamos RLS.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

DO $$
DECLARE
t_name text;
BEGIN
FOR t_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        -- 1. Asegurar que RLS esté activo en cada tabla
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);

        -- 2. Crear política estricta: el usuario solo puede ver, crear, editar o borrar sus propios registros
EXECUTE format('
            CREATE POLICY "Acceso total exclusivo al propietario (%I)"
            ON public.%I
            FOR ALL
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
        ', t_name, t_name);
END LOOP;
END $$;