-- Migration to expand edit_transaction support:
-- 1. Simple transfers (same currency, adjusting source and destination account balances).
-- 2. Direct card expenses and payments within current billing cycle (and card change if within target card's current cycle).
-- 3. Installment purchases if within current cycle and no payments made yet (remaining = total).
-- 4. Loan payments only for the last payment on the loan (reverting and recalculating interest/principal with TEA or explicit interest).
-- 5. Shared expenses only if no repayments have been collected yet.

CREATE OR REPLACE FUNCTION public.is_in_current_billing_cycle(
    p_date timestamptz,
    p_closing_day integer,
    p_ref_date timestamptz DEFAULT now()
)
RETURNS boolean LANGUAGE plpgsql STABLE AS $function$
DECLARE
    v_ref_date date;
    v_tx_date date;
    v_ref_day integer;
    v_cycle_start date;
    v_cycle_end date;
    v_prev_month date;
    v_curr_month date;
    v_next_month date;
BEGIN
    IF p_date IS NULL OR p_closing_day IS NULL THEN
        RETURN FALSE;
    END IF;
    
    v_ref_date := (p_ref_date AT TIME ZONE 'America/Lima')::date;
    v_tx_date := (p_date AT TIME ZONE 'America/Lima')::date;
    v_ref_day := extract(day from v_ref_date)::integer;

    IF v_ref_day <= p_closing_day THEN
        v_curr_month := date_trunc('month', v_ref_date)::date;
        v_prev_month := (date_trunc('month', v_ref_date) - interval '1 month')::date;
        
        v_cycle_end := make_date(
            extract(year from v_curr_month)::int,
            extract(month from v_curr_month)::int,
            least(p_closing_day, extract(day from (v_curr_month + interval '1 month - 1 day')::date)::int)
        );
        v_cycle_start := make_date(
            extract(year from v_prev_month)::int,
            extract(month from v_prev_month)::int,
            least(p_closing_day, extract(day from (v_prev_month + interval '1 month - 1 day')::date)::int)
        ) + 1;
    ELSE
        v_curr_month := date_trunc('month', v_ref_date)::date;
        v_next_month := (date_trunc('month', v_ref_date) + interval '1 month')::date;

        v_cycle_end := make_date(
            extract(year from v_next_month)::int,
            extract(month from v_next_month)::int,
            least(p_closing_day, extract(day from (v_next_month + interval '1 month - 1 day')::date)::int)
        );
        v_cycle_start := make_date(
            extract(year from v_curr_month)::int,
            extract(month from v_curr_month)::int,
            least(p_closing_day, extract(day from (v_curr_month + interval '1 month - 1 day')::date)::int)
        ) + 1;
    END IF;

    RETURN v_tx_date >= v_cycle_start AND v_tx_date <= v_cycle_end;
END;
$function$;

REVOKE ALL ON FUNCTION public.is_in_current_billing_cycle(timestamptz, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_in_current_billing_cycle(timestamptz, integer, timestamptz) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.edit_transaction(p_transaction_id uuid, p_changes jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $function$
DECLARE
    v_user uuid := auth.uid();
    v_tx public.transactions;
    v_description text;
    v_amount numeric;
    v_date timestamptz;
    v_account_id uuid;
    v_dest_account_id uuid;
    v_credit_card_id uuid;
    v_loan_interest numeric;
    
    v_card public.credit_cards;
    v_new_card public.credit_cards;
    v_account public.accounts;
    v_dest_account public.accounts;
    v_loan public.loans;
    v_plan public.installment_plans;
    v_split public.shared_expense_splits;
    v_calc_interest numeric;
    v_calc_principal numeric;
    v_restored_loan_balance numeric;
    v_new_loan_balance numeric;
    v_allowed_keys text[] := ARRAY['description', 'amount', 'transaction_date', 'account_id', 'destination_account_id', 'credit_card_id', 'loan_interest'];
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    END IF;
    IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' OR p_changes = '{}'::jsonb THEN
        RAISE EXCEPTION 'Los cambios deben ser un objeto no vacío.';
    END IF;
    IF (p_changes - v_allowed_keys) <> '{}'::jsonb THEN
        RAISE EXCEPTION 'Campo no admitido para edición.';
    END IF;

    SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id AND user_id = v_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'El movimiento no existe.'; END IF;

    -- Default values from existing transaction
    v_description := v_tx.description;
    v_amount := v_tx.amount;
    v_date := v_tx.transaction_date;
    v_account_id := v_tx.account_id;
    v_dest_account_id := v_tx.destination_account_id;
    v_credit_card_id := v_tx.credit_card_id;

    -- Validate description if present
    IF p_changes ? 'description' THEN
        IF jsonb_typeof(p_changes->'description') IS DISTINCT FROM 'string' THEN
            RAISE EXCEPTION 'La descripción debe ser texto.';
        END IF;
        v_description := btrim(p_changes->>'description');
        IF length(v_description) = 0 OR length(v_description) > 255 THEN
            RAISE EXCEPTION 'La descripción debe tener entre 1 y 255 caracteres.';
        END IF;
    END IF;

    -- If only description is changed, we can update directly without financial alterations
    IF (p_changes - ARRAY['description']) = '{}'::jsonb THEN
        UPDATE public.transactions SET description = v_description WHERE id = p_transaction_id AND user_id = v_user;
        RETURN jsonb_build_object('transaction_id', p_transaction_id, 'warnings', '[]'::jsonb);
    END IF;

    -- Validate date if present
    IF p_changes ? 'transaction_date' THEN
        IF jsonb_typeof(p_changes->'transaction_date') IS DISTINCT FROM 'string' THEN
            RAISE EXCEPTION 'La fecha debe ser texto.';
        END IF;
        v_date := (p_changes->>'transaction_date')::timestamptz;
        IF NOT isfinite(v_date) THEN RAISE EXCEPTION 'La fecha no es válida.'; END IF;
    END IF;

    -- Validate amount if present
    IF p_changes ? 'amount' THEN
        IF jsonb_typeof(p_changes->'amount') IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'El monto debe ser numérico.';
        END IF;
        v_amount := (p_changes->>'amount')::numeric;
        IF v_amount <= 0 OR v_amount > 9999999999.99 OR v_amount <> round(v_amount, 2) THEN
            RAISE EXCEPTION 'El monto debe ser positivo y tener como máximo dos decimales.';
        END IF;
    END IF;

    -- Evaluate operation type and validate financial constraints
    -------------------------------------------------------------------------
    -- 1. INCOME or SIMPLE ACCOUNT EXPENSE (without card, installments, loan, splits)
    -------------------------------------------------------------------------
    IF v_tx.type IN ('INCOME', 'EXPENSE') AND v_tx.credit_card_id IS NULL AND NOT v_tx.is_installment AND NOT v_tx.is_shared_expense THEN
        IF v_tx.account_id IS NULL OR v_tx.destination_account_id IS NOT NULL OR v_tx.investment_id IS NOT NULL
           OR v_tx.loan_id IS NOT NULL OR v_tx.parent_transaction_id IS NOT NULL OR v_tx.shared_split_id IS NOT NULL
           OR v_tx.converted_amount IS NOT NULL OR v_tx.applied_exchange_rate IS NOT NULL THEN
            RAISE EXCEPTION 'Solo se pueden editar ingresos y gastos simples de cuenta.';
        END IF;
        IF (p_changes - ARRAY['description', 'amount', 'transaction_date']) <> '{}'::jsonb THEN
            RAISE EXCEPTION 'Campo no admitido para edición de ingreso o gasto simple.';
        END IF;
        IF EXISTS (SELECT 1 FROM public.transactions WHERE parent_transaction_id = v_tx.id)
            OR EXISTS (SELECT 1 FROM public.shared_expense_splits WHERE transaction_id = v_tx.id)
            OR EXISTS (SELECT 1 FROM public.installment_plans WHERE transaction_id = v_tx.id)
            OR EXISTS (SELECT 1 FROM public.monthly_fixed_checklist WHERE transaction_id = v_tx.id) THEN
            RAISE EXCEPTION 'No se puede editar un movimiento con dependencias.';
        END IF;

        SELECT * INTO v_account FROM public.accounts WHERE id = v_tx.account_id AND user_id = v_user FOR UPDATE;
        IF NOT FOUND OR v_account.currency <> v_tx.currency THEN
            RAISE EXCEPTION 'La cuenta o moneda del movimiento no es válida.';
        END IF;

        IF v_amount <> v_tx.amount THEN
            PERFORM public.adjust_account_balance(v_tx.account_id,
                CASE WHEN v_tx.type = 'INCOME' THEN v_amount - v_tx.amount ELSE v_tx.amount - v_amount END);
        END IF;

        UPDATE public.transactions SET description = v_description, amount = v_amount, transaction_date = v_date
        WHERE id = p_transaction_id AND user_id = v_user;
        RETURN jsonb_build_object('transaction_id', p_transaction_id, 'warnings', '[]'::jsonb);

    -------------------------------------------------------------------------
    -- 2. SIMPLE TRANSFER (same currency accounts, no fx)
    -------------------------------------------------------------------------
    ELSIF v_tx.type = 'TRANSFER' THEN
        IF v_tx.account_id IS NULL OR v_tx.destination_account_id IS NULL
           OR v_tx.converted_amount IS NOT NULL OR v_tx.applied_exchange_rate IS NOT NULL
           OR v_tx.investment_id IS NOT NULL THEN
            RAISE EXCEPTION 'Solo se pueden editar transferencias simples de la misma moneda.';
        END IF;
        IF (p_changes - ARRAY['description', 'amount', 'transaction_date']) <> '{}'::jsonb THEN
            RAISE EXCEPTION 'Campo no admitido para edición de transferencia.';
        END IF;

        -- Lock both accounts in deterministic order
        IF v_tx.account_id < v_tx.destination_account_id THEN
            PERFORM 1 FROM public.accounts WHERE id = v_tx.account_id AND user_id = v_user FOR UPDATE;
            PERFORM 1 FROM public.accounts WHERE id = v_tx.destination_account_id AND user_id = v_user FOR UPDATE;
        ELSE
            PERFORM 1 FROM public.accounts WHERE id = v_tx.destination_account_id AND user_id = v_user FOR UPDATE;
            PERFORM 1 FROM public.accounts WHERE id = v_tx.account_id AND user_id = v_user FOR UPDATE;
        END IF;

        IF v_amount <> v_tx.amount THEN
            -- Difference: if new amount is greater, source loses more and dest gains more
            -- Revert old amount: source + v_tx.amount, dest - v_tx.amount
            -- Apply new amount: source - v_amount, dest + v_amount
            -- Net adjustment: source: v_tx.amount - v_amount; dest: v_amount - v_tx.amount
            PERFORM public.adjust_account_balance(v_tx.account_id, v_tx.amount - v_amount);
            PERFORM public.adjust_account_balance(v_tx.destination_account_id, v_amount - v_tx.amount);
        END IF;

        UPDATE public.transactions SET description = v_description, amount = v_amount, transaction_date = v_date
        WHERE id = p_transaction_id AND user_id = v_user;
        RETURN jsonb_build_object('transaction_id', p_transaction_id, 'warnings', '[]'::jsonb);

    -------------------------------------------------------------------------
    -- 3. DIRECT CARD EXPENSE (without installments, without shared splits)
    -------------------------------------------------------------------------
    ELSIF v_tx.type = 'EXPENSE' AND v_tx.credit_card_id IS NOT NULL AND NOT v_tx.is_installment AND NOT v_tx.is_shared_expense THEN
        IF (p_changes - ARRAY['description', 'amount', 'transaction_date', 'credit_card_id']) <> '{}'::jsonb THEN
            RAISE EXCEPTION 'Campo no admitido para edición de gasto de tarjeta.';
        END IF;
        IF EXISTS (SELECT 1 FROM public.transactions WHERE parent_transaction_id = v_tx.id)
           OR EXISTS (SELECT 1 FROM public.monthly_fixed_checklist WHERE transaction_id = v_tx.id) THEN
            RAISE EXCEPTION 'No se puede editar un gasto con dependencias.';
        END IF;

        SELECT * INTO v_card FROM public.credit_cards WHERE id = v_tx.credit_card_id AND user_id = v_user FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'La tarjeta original no existe.'; END IF;

        -- Validate that the existing transaction date is within the current billing cycle of the card
        IF NOT public.is_in_current_billing_cycle(v_tx.transaction_date, v_card.closing_day) THEN
            RAISE EXCEPTION 'Solo se pueden editar gastos que pertenezcan al ciclo de facturación actual de la tarjeta.';
        END IF;

        IF p_changes ? 'credit_card_id' THEN
            v_credit_card_id := (p_changes->>'credit_card_id')::uuid;
        END IF;

        IF v_credit_card_id <> v_tx.credit_card_id THEN
            SELECT * INTO v_new_card FROM public.credit_cards WHERE id = v_credit_card_id AND user_id = v_user FOR UPDATE;
            IF NOT FOUND OR NOT v_new_card.is_active THEN
                RAISE EXCEPTION 'La nueva tarjeta no es válida o está inactiva.';
            END IF;
            -- Validate that the date falls into the new card's current billing cycle
            IF NOT public.is_in_current_billing_cycle(v_date, v_new_card.closing_day) THEN
                RAISE EXCEPTION 'La fecha del gasto no se encuentra dentro del ciclo de facturación actual de la nueva tarjeta.';
            END IF;
            -- Revert debt from old card
            PERFORM public.adjust_card_debt(v_tx.credit_card_id, v_tx.currency, -v_tx.amount, NULL, false);
            -- Apply debt to new card
            PERFORM public.adjust_card_debt(v_new_card.id, v_tx.currency, v_amount, NULL, true);
        ELSE
            -- Same card, check if date still in current billing cycle
            IF NOT public.is_in_current_billing_cycle(v_date, v_card.closing_day) THEN
                RAISE EXCEPTION 'La nueva fecha debe encontrarse dentro del ciclo de facturación actual.';
            END IF;
            IF v_amount <> v_tx.amount THEN
                PERFORM public.adjust_card_debt(v_card.id, v_tx.currency, v_amount - v_tx.amount, NULL, (v_amount > v_tx.amount));
            END IF;
        END IF;

        UPDATE public.transactions SET description = v_description, amount = v_amount, transaction_date = v_date, credit_card_id = v_credit_card_id
        WHERE id = p_transaction_id AND user_id = v_user;
        RETURN jsonb_build_object('transaction_id', p_transaction_id, 'warnings', '[]'::jsonb);

    -------------------------------------------------------------------------
    -- 4. DIRECT CREDIT CARD PAYMENT (CC_PAYMENT)
    -------------------------------------------------------------------------
    ELSIF v_tx.type = 'CC_PAYMENT' THEN
        IF (p_changes - ARRAY['description', 'amount', 'transaction_date']) <> '{}'::jsonb THEN
            RAISE EXCEPTION 'Campo no admitido para edición de pago de tarjeta.';
        END IF;
        IF v_tx.credit_card_id IS NULL OR v_tx.account_id IS NULL
           OR v_tx.converted_amount IS NOT NULL OR v_tx.applied_exchange_rate IS NOT NULL THEN
            RAISE EXCEPTION 'Solo se admiten pagos directos de tarjeta en la misma moneda.';
        END IF;

        SELECT * INTO v_card FROM public.credit_cards WHERE id = v_tx.credit_card_id AND user_id = v_user FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'La tarjeta de crédito no existe.'; END IF;

        IF NOT public.is_in_current_billing_cycle(v_tx.transaction_date, v_card.closing_day) THEN
            RAISE EXCEPTION 'Solo se pueden editar pagos que pertenezcan al ciclo de facturación actual de la tarjeta.';
        END IF;
        IF NOT public.is_in_current_billing_cycle(v_date, v_card.closing_day) THEN
            RAISE EXCEPTION 'La nueva fecha debe pertenecer al ciclo de facturación actual de la tarjeta.';
        END IF;

        SELECT * INTO v_account FROM public.accounts WHERE id = v_tx.account_id AND user_id = v_user FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'La cuenta asociada al pago no existe.'; END IF;

        IF v_amount <> v_tx.amount THEN
            -- Paying more means account loses more (v_tx.amount - v_amount), card debt decreases more (-(v_amount - v_tx.amount) = v_tx.amount - v_amount)
            PERFORM public.adjust_account_balance(v_account.id, v_tx.amount - v_amount);
            PERFORM public.adjust_card_debt(v_card.id, v_tx.currency, v_tx.amount - v_amount, NULL, false);
        END IF;

        UPDATE public.transactions SET description = v_description, amount = v_amount, transaction_date = v_date
        WHERE id = p_transaction_id AND user_id = v_user;
        RETURN jsonb_build_object('transaction_id', p_transaction_id, 'warnings', '[]'::jsonb);

    -------------------------------------------------------------------------
    -- 5. INSTALLMENT CARD EXPENSE (is_installment = true)
    -------------------------------------------------------------------------
    ELSIF v_tx.type = 'EXPENSE' AND v_tx.is_installment THEN
        IF (p_changes - ARRAY['description', 'amount', 'transaction_date', 'credit_card_id']) <> '{}'::jsonb THEN
            RAISE EXCEPTION 'Campo no admitido para edición de compra en cuotas.';
        END IF;

        SELECT * INTO v_plan FROM public.installment_plans WHERE transaction_id = v_tx.id AND user_id = v_user FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'El plan de cuotas no existe.'; END IF;

        -- Must have NO payments made to this installment plan yet (remaining == total)
        IF v_plan.remaining_installments <> v_plan.total_installments THEN
            RAISE EXCEPTION 'No se puede editar un gasto en cuotas si ya se han realizado pagos a sus cuotas.';
        END IF;

        SELECT * INTO v_card FROM public.credit_cards WHERE id = v_tx.credit_card_id AND user_id = v_user FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'La tarjeta de crédito no existe.'; END IF;

        IF NOT public.is_in_current_billing_cycle(v_tx.transaction_date, v_card.closing_day) THEN
            RAISE EXCEPTION 'Solo se pueden editar compras en cuotas que pertenezcan al ciclo de facturación actual.';
        END IF;

        IF p_changes ? 'credit_card_id' THEN
            v_credit_card_id := (p_changes->>'credit_card_id')::uuid;
        END IF;

        IF v_credit_card_id <> v_tx.credit_card_id THEN
            SELECT * INTO v_new_card FROM public.credit_cards WHERE id = v_credit_card_id AND user_id = v_user FOR UPDATE;
            IF NOT FOUND OR NOT v_new_card.is_active THEN
                RAISE EXCEPTION 'La nueva tarjeta no es válida o está inactiva.';
            END IF;
            IF NOT public.is_in_current_billing_cycle(v_date, v_new_card.closing_day) THEN
                RAISE EXCEPTION 'La fecha de la compra no se encuentra dentro del ciclo de facturación actual de la nueva tarjeta.';
            END IF;
            -- Revert debt from old card
            PERFORM public.adjust_card_debt(v_tx.credit_card_id, v_tx.currency, -v_tx.amount, NULL, false);
            -- Apply debt to new card
            PERFORM public.adjust_card_debt(v_new_card.id, v_tx.currency, v_amount, NULL, true);
        ELSE
            IF NOT public.is_in_current_billing_cycle(v_date, v_card.closing_day) THEN
                RAISE EXCEPTION 'La nueva fecha debe pertenecer al ciclo de facturación actual.';
            END IF;
            IF v_amount <> v_tx.amount THEN
                PERFORM public.adjust_card_debt(v_card.id, v_tx.currency, v_amount - v_tx.amount, NULL, (v_amount > v_tx.amount));
            END IF;
        END IF;

        -- Update installment_plan monthly principal and credit_card_id if changed
        UPDATE public.installment_plans
        SET monthly_principal_amount = CASE WHEN v_amount <> v_tx.amount THEN round(v_amount / v_plan.total_installments, 2) ELSE monthly_principal_amount END,
            credit_card_id = v_credit_card_id
        WHERE id = v_plan.id;

        UPDATE public.transactions SET description = v_description, amount = v_amount, transaction_date = v_date, credit_card_id = v_credit_card_id
        WHERE id = p_transaction_id AND user_id = v_user;
        RETURN jsonb_build_object('transaction_id', p_transaction_id, 'warnings', '[]'::jsonb);

    -------------------------------------------------------------------------
    -- 6. SHARED EXPENSE (is_shared_expense = true)
    -------------------------------------------------------------------------
    ELSIF v_tx.type = 'EXPENSE' AND v_tx.is_shared_expense THEN
        IF (p_changes - ARRAY['description', 'amount', 'transaction_date']) <> '{}'::jsonb THEN
            RAISE EXCEPTION 'Campo no admitido para edición de gasto compartido.';
        END IF;

        -- Must NOT have any repayments/refunds recorded
        IF EXISTS (SELECT 1 FROM public.transactions WHERE parent_transaction_id = v_tx.id) THEN
            RAISE EXCEPTION 'No se puede editar un gasto compartido que ya tiene reembolsos asociados.';
        END IF;
        IF EXISTS (SELECT 1 FROM public.shared_expense_splits WHERE transaction_id = v_tx.id AND amount_paid > 0) THEN
            RAISE EXCEPTION 'Solo se puede editar un gasto compartido si aún no ha habido un reembolso o cobro.';
        END IF;

        -- If it was paid via account
        IF v_tx.account_id IS NOT NULL THEN
            SELECT * INTO v_account FROM public.accounts WHERE id = v_tx.account_id AND user_id = v_user FOR UPDATE;
            IF v_amount <> v_tx.amount THEN
                PERFORM public.adjust_account_balance(v_account.id, v_tx.amount - v_amount);
            END IF;
        ELSIF v_tx.credit_card_id IS NOT NULL THEN
            SELECT * INTO v_card FROM public.credit_cards WHERE id = v_tx.credit_card_id AND user_id = v_user FOR UPDATE;
            IF NOT public.is_in_current_billing_cycle(v_tx.transaction_date, v_card.closing_day)
               OR NOT public.is_in_current_billing_cycle(v_date, v_card.closing_day) THEN
                RAISE EXCEPTION 'El gasto compartido con tarjeta debe pertenecer al ciclo de facturación actual.';
            END IF;
            IF v_amount <> v_tx.amount THEN
                PERFORM public.adjust_card_debt(v_card.id, v_tx.currency, v_amount - v_tx.amount, NULL, (v_amount > v_tx.amount));
            END IF;
        END IF;

        -- Update or keep split intact? The requirement says:
        -- "Y en los gastos compartidos solo si aún no ha habido un reembolso."
        UPDATE public.transactions SET description = v_description, amount = v_amount, transaction_date = v_date
        WHERE id = p_transaction_id AND user_id = v_user;
        RETURN jsonb_build_object('transaction_id', p_transaction_id, 'warnings', '[]'::jsonb);

    -------------------------------------------------------------------------
    -- 7. LOAN PAYMENT (LOAN_PAYMENT - Only last payment supported)
    -------------------------------------------------------------------------
    ELSIF v_tx.type = 'LOAN_PAYMENT' THEN
        IF (p_changes - ARRAY['description', 'amount', 'transaction_date', 'loan_interest']) <> '{}'::jsonb THEN
            RAISE EXCEPTION 'Campo no admitido para edición de pago de préstamo.';
        END IF;

        -- Lock account and loan
        SELECT * INTO v_account FROM public.accounts WHERE id = v_tx.account_id AND user_id = v_user FOR UPDATE;
        SELECT * INTO v_loan FROM public.loans WHERE id = v_tx.loan_id AND user_id = v_user FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'El préstamo no existe.'; END IF;

        -- Verify this is the LAST payment recorded on the loan
        IF EXISTS (
            SELECT 1 FROM public.transactions
            WHERE loan_id = v_tx.loan_id AND user_id = v_user AND type = 'LOAN_PAYMENT'
              AND (transaction_date > v_tx.transaction_date OR (transaction_date = v_tx.transaction_date AND created_at > v_tx.created_at))
        ) THEN
            RAISE EXCEPTION 'Solo se permite editar el último pago realizado del préstamo.';
        END IF;

        -- Restore previous loan balance before this payment
        IF v_tx.loan_principal IS NOT NULL THEN
            v_restored_loan_balance := v_loan.current_balance + v_tx.loan_principal;
        ELSE
            v_restored_loan_balance := v_loan.current_balance + v_tx.amount;
        END IF;

        -- Parse explicit interest if provided
        IF p_changes ? 'loan_interest' AND p_changes->>'loan_interest' IS NOT NULL THEN
            IF jsonb_typeof(p_changes->'loan_interest') IS DISTINCT FROM 'number' THEN
                RAISE EXCEPTION 'El interés debe ser numérico.';
            END IF;
            v_loan_interest := (p_changes->>'loan_interest')::numeric;
            IF v_loan_interest < 0 OR v_loan_interest <> round(v_loan_interest, 2) THEN
                RAISE EXCEPTION 'El interés no puede ser negativo y debe tener como máximo dos decimales.';
            END IF;
            IF v_loan_interest >= v_amount THEN
                RAISE EXCEPTION 'El pago debe ser mayor que el interés.';
            END IF;
            v_calc_interest := v_loan_interest;
            v_calc_principal := v_amount - v_calc_interest;
        ELSE
            -- Estimate interest with TEA
            IF v_loan.tea_percentage < 0 THEN RAISE EXCEPTION 'La TEA del préstamo no es válida.'; END IF;
            v_calc_interest := round(v_restored_loan_balance * (power(1 + v_loan.tea_percentage / 100, 1::numeric / 12) - 1), 2);
            IF v_amount <= v_calc_interest THEN
                RAISE EXCEPTION 'El pago debe ser mayor que el interés estimado (%).', v_calc_interest;
            END IF;
            v_calc_principal := v_amount - v_calc_interest;
        END IF;

        IF v_calc_principal > v_restored_loan_balance THEN
            RAISE EXCEPTION 'La amortización no puede exceder el saldo pendiente del préstamo.';
        END IF;

        -- If this was the last remaining installment, it must pay off the rest
        -- Note: before editing this payment, remaining_installments was decremented by 1.
        -- When this payment was made, was it the final installment? (remaining_installments = 0)
        IF v_loan.remaining_installments = 0 AND (v_restored_loan_balance - v_calc_principal) > 0 THEN
            RAISE EXCEPTION 'La última cuota del préstamo debe liquidar la totalidad del saldo restante.';
        END IF;

        -- Adjust account balance
        IF v_amount <> v_tx.amount THEN
            PERFORM public.adjust_account_balance(v_account.id, v_tx.amount - v_amount);
        END IF;

        -- Update loan current balance
        v_new_loan_balance := round(v_restored_loan_balance - v_calc_principal, 2);
        UPDATE public.loans SET current_balance = v_new_loan_balance WHERE id = v_loan.id;

        -- Update transaction row
        UPDATE public.transactions
        SET description = v_description,
            amount = v_amount,
            transaction_date = v_date,
            loan_interest = v_calc_interest,
            loan_principal = v_calc_principal
        WHERE id = p_transaction_id AND user_id = v_user;

        RETURN jsonb_build_object('transaction_id', p_transaction_id, 'warnings', '[]'::jsonb);
    ELSE
        RAISE EXCEPTION 'Operación no soportada para edición.';
    END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.edit_transaction(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_transaction(uuid, jsonb) TO authenticated, service_role;
