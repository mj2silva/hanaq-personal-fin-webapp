-- ============================================================================
-- FASE 4: MOTOR DE ACTIVIDAD
-- Funciones atómicas (una sola transacción SQL) para registrar, cobrar y
-- eliminar movimientos actualizando saldos de cuentas, tarjetas, préstamos e
-- inversiones. Se ejecutan con los permisos del usuario (SECURITY INVOKER),
-- por lo que RLS sigue aplicando sobre todas las tablas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Utilidades
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.convert_amount(
    p_amount NUMERIC,
    p_from currency_code,
    p_to currency_code,
    p_rate NUMERIC
) RETURNS NUMERIC
    LANGUAGE plpgsql
    IMMUTABLE
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.adjust_account_balance(p_account_id UUID, p_delta NUMERIC)
    RETURNS VOID
    LANGUAGE plpgsql
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.adjust_card_debt(p_card_id UUID, p_currency currency_code, p_delta NUMERIC, p_rate NUMERIC DEFAULT NULL)
    RETURNS VOID
    LANGUAGE plpgsql
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.adjust_investment_value(p_investment_id UUID, p_delta NUMERIC)
    RETURNS VOID
    LANGUAGE plpgsql
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.adjust_loan(p_loan_id UUID, p_balance_delta NUMERIC, p_installments_delta INT)
    RETURNS VOID
    LANGUAGE plpgsql
AS $$
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
$$;

-- Aplica (+1) o revierte (-1) el estado de cuenta vigente más antiguo sin pagar.
CREATE OR REPLACE FUNCTION public.apply_statement_payment(
    p_card_id UUID,
    p_currency currency_code,
    p_amount NUMERIC,
    p_direction INT
) RETURNS VOID
    LANGUAGE plpgsql
AS $$
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
$$;

-- ----------------------------------------------------------------------------
-- Efectos contables de una transacción (p_direction = 1 aplica, -1 revierte)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_transaction_effects(t public.transactions, p_direction INT)
    RETURNS VOID
    LANGUAGE plpgsql
AS $$
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
$$;

-- ----------------------------------------------------------------------------
-- Registrar una nueva operación
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_transaction(
    p_type transaction_type,
    p_transaction_date TIMESTAMPTZ,
    p_description TEXT,
    p_amount NUMERIC,
    p_currency currency_code,
    p_category_id UUID DEFAULT NULL,
    p_account_id UUID DEFAULT NULL,
    p_destination_account_id UUID DEFAULT NULL,
    p_credit_card_id UUID DEFAULT NULL,
    p_applied_exchange_rate NUMERIC DEFAULT NULL,
    p_loan_id UUID DEFAULT NULL,
    p_investment_id UUID DEFAULT NULL,
    p_parent_transaction_id UUID DEFAULT NULL,
    p_installments INT DEFAULT 1,
    p_installment_tea NUMERIC DEFAULT 0,
    p_installment_start_period TEXT DEFAULT NULL,
    p_installment_principal NUMERIC DEFAULT NULL,
    p_installment_interest NUMERIC DEFAULT NULL,
    p_splits JSONB DEFAULT '[]'::JSONB
) RETURNS UUID
    LANGUAGE plpgsql
AS $$
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
$$;

-- ----------------------------------------------------------------------------
-- Registrar el cobro (parcial o total) de un gasto compartido
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_shared_repayment(
    p_split_id UUID,
    p_account_id UUID,
    p_amount NUMERIC,
    p_transaction_date TIMESTAMPTZ DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS UUID
    LANGUAGE plpgsql
AS $$
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
$$;

-- ----------------------------------------------------------------------------
-- Eliminar una transacción revirtiendo sus efectos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_transaction(p_transaction_id UUID)
    RETURNS VOID
    LANGUAGE plpgsql
AS $$
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
$$;

-- ----------------------------------------------------------------------------
-- Permisos: solo usuarios autenticados pueden ejecutar las funciones
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.convert_amount(NUMERIC, currency_code, currency_code, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_account_balance(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_card_debt(UUID, currency_code, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_investment_value(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_loan(UUID, NUMERIC, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_statement_payment(UUID, currency_code, NUMERIC, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_transaction_effects(public.transactions, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_transaction(transaction_type, TIMESTAMPTZ, TEXT, NUMERIC, currency_code, UUID, UUID, UUID, UUID, NUMERIC, UUID, UUID, UUID, INT, NUMERIC, TEXT, NUMERIC, NUMERIC, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_shared_repayment(UUID, UUID, NUMERIC, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_transaction(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.convert_amount(NUMERIC, currency_code, currency_code, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_account_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_card_debt(UUID, currency_code, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_investment_value(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_loan(UUID, NUMERIC, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_statement_payment(UUID, currency_code, NUMERIC, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_transaction_effects(public.transactions, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_transaction(transaction_type, TIMESTAMPTZ, TEXT, NUMERIC, currency_code, UUID, UUID, UUID, UUID, NUMERIC, UUID, UUID, UUID, INT, NUMERIC, TEXT, NUMERIC, NUMERIC, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_shared_repayment(UUID, UUID, NUMERIC, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_transaction(UUID) TO authenticated;
