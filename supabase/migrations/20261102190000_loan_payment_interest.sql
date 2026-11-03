-- One monthly period per payment, irrespective of the transaction date.
-- NULL breakdowns retain the original legacy reversal behaviour.
ALTER TABLE public.transactions
    ADD COLUMN loan_interest numeric(12,2),
    ADD COLUMN loan_principal numeric(12,2),
    ADD COLUMN loan_breakdown_estimated boolean,
    ADD COLUMN loan_payment_order bigint;

ALTER TABLE public.loans ADD COLUMN loan_history_reconstructed boolean NOT NULL DEFAULT false,
    ADD COLUMN loan_payment_counter bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.apply_transaction_effects(t public.transactions, p_direction integer)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE
    v_loan public.loans;
    v_interest numeric;
    v_principal numeric;
    v_order bigint;
BEGIN
    IF t.type = 'INCOME' THEN
        PERFORM public.adjust_account_balance(t.account_id, p_direction * t.amount);
    ELSIF t.type = 'EXPENSE' THEN
        IF t.account_id IS NOT NULL THEN
            PERFORM public.adjust_account_balance(t.account_id, -p_direction * t.amount);
        ELSE
            PERFORM public.adjust_card_debt(t.credit_card_id, t.currency, p_direction * t.amount, NULL, p_direction = 1);
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
        PERFORM public.adjust_card_debt(t.credit_card_id, t.currency, -p_direction * t.amount, NULL, FALSE);
        PERFORM public.apply_statement_payment(t.credit_card_id, t.currency, t.amount, p_direction);
    ELSIF t.type = 'LOAN_PAYMENT' THEN
        PERFORM public.adjust_account_balance(t.account_id, -p_direction * coalesce(t.converted_amount, t.amount));
        SELECT * INTO v_loan FROM public.loans WHERE id = t.loan_id AND user_id = auth.uid() FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'El préstamo seleccionado no existe.';
        END IF;
        IF p_direction = 1 THEN
            IF v_loan.tea_percentage < 0 OR v_loan.current_balance <= 0 THEN
                RAISE EXCEPTION 'La tasa o el saldo del préstamo no son válidos.';
            END IF;
            v_interest := round(v_loan.current_balance * (power(1 + v_loan.tea_percentage / 100, 1::numeric / 12) - 1), 2);
            IF t.amount < v_interest THEN
                RAISE EXCEPTION 'El pago no cubre el interés mensual.';
            END IF;
            IF t.amount = v_interest THEN
                RAISE EXCEPTION 'El pago debe reducir el capital.';
            END IF;
            IF t.amount > v_loan.current_balance + v_interest THEN
                RAISE EXCEPTION 'El pago excede el saldo más el interés mensual.';
            END IF;
            v_principal := t.amount - v_interest;
            IF v_loan.remaining_installments = 1 AND v_principal <> v_loan.current_balance THEN
                RAISE EXCEPTION 'La última cuota debe liquidar el saldo del préstamo.';
            END IF;
            UPDATE public.loans SET loan_payment_counter = loan_payment_counter + 1
                WHERE id = t.loan_id RETURNING loan_payment_counter INTO v_order;
            UPDATE public.transactions SET loan_interest = v_interest, loan_principal = v_principal,
                loan_breakdown_estimated = false, loan_payment_order = v_order WHERE id = t.id AND user_id = auth.uid();
        ELSIF p_direction = -1 THEN
            IF EXISTS (SELECT 1 FROM public.transactions other
                WHERE other.loan_id = t.loan_id AND other.type = 'LOAN_PAYMENT' AND other.id <> t.id
                AND (CASE WHEN t.loan_payment_order IS NULL THEN
                    other.loan_payment_order IS NOT NULL OR other.transaction_date >= t.transaction_date
                    ELSE other.loan_payment_order > t.loan_payment_order END)) THEN
                RAISE EXCEPTION 'Elimina primero los pagos posteriores o de orden histórico ambiguo.';
            END IF;
            v_principal := coalesce(t.loan_principal, t.amount);
        ELSE
            RAISE EXCEPTION 'Dirección de operación inválida.';
        END IF;
        PERFORM public.adjust_loan(t.loan_id, -p_direction * v_principal, -p_direction);
    ELSIF t.type = 'REFUND' THEN
        IF t.account_id IS NOT NULL THEN
            PERFORM public.adjust_account_balance(t.account_id, p_direction * t.amount);
        ELSE
            PERFORM public.adjust_card_debt(t.credit_card_id, t.currency, -p_direction * t.amount, NULL, FALSE);
        END IF;
    ELSIF t.type = 'SHARED_REPAYMENT' THEN
        PERFORM public.adjust_account_balance(t.account_id, p_direction * t.amount);
    END IF;
END;
$function$;

-- Lock in the same account-then-loan order as create_transaction, before locking
-- the payment row. Reconstruction holds the loan lock before touching payments.
CREATE OR REPLACE FUNCTION public.delete_transaction(p_transaction_id uuid)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE
    v_user uuid := auth.uid();
    v_tx public.transactions;
    v_split public.shared_expense_splits;
    v_paid numeric;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    END IF;
    SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id AND user_id = v_user;
    IF NOT FOUND THEN RAISE EXCEPTION 'El movimiento no existe.'; END IF;
    IF v_tx.type = 'LOAN_PAYMENT' THEN
        PERFORM 1 FROM public.accounts WHERE id = v_tx.account_id AND user_id = v_user FOR UPDATE;
        PERFORM 1 FROM public.loans WHERE id = v_tx.loan_id AND user_id = v_user FOR UPDATE;
    END IF;
    SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id AND user_id = v_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'El movimiento no existe.'; END IF;
    IF v_tx.type = 'EXPENSE' THEN
        IF EXISTS (SELECT 1 FROM public.transactions WHERE parent_transaction_id = v_tx.id) THEN
            RAISE EXCEPTION 'Elimina primero los reembolsos asociados a este gasto.';
        END IF;
        IF EXISTS (SELECT 1 FROM public.shared_expense_splits WHERE transaction_id = v_tx.id AND amount_paid > 0) THEN
            RAISE EXCEPTION 'Elimina primero los cobros registrados de este gasto compartido.';
        END IF;
    END IF;
    IF v_tx.type = 'SHARED_REPAYMENT' AND v_tx.shared_split_id IS NOT NULL THEN
        SELECT * INTO v_split FROM public.shared_expense_splits WHERE id = v_tx.shared_split_id FOR UPDATE;
        IF FOUND THEN
            v_paid := greatest(0, v_split.amount_paid - v_tx.amount);
            UPDATE public.shared_expense_splits SET amount_paid = v_paid,
                status = CASE WHEN v_paid >= amount_owed THEN 'PAID'::split_status
                    WHEN v_paid > 0 THEN 'PARTIAL'::split_status ELSE 'PENDING'::split_status END
            WHERE id = v_split.id;
        END IF;
    END IF;
    PERFORM public.apply_transaction_effects(v_tx, -1);
    DELETE FROM public.transactions WHERE id = v_tx.id;
END;
$function$;

-- Preview by default; applying requires explicit true. Assumes the initial amount,
-- current TEA and one monthly period per recorded payment. No dates are inferred.
CREATE OR REPLACE FUNCTION public.reconstruct_loan_history(p_loan_id uuid, p_apply boolean DEFAULT false,
    p_expected_previous_balance numeric DEFAULT NULL, p_expected_estimated_balance numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql AS $function$
DECLARE
    l public.loans;
    t public.transactions;
    v_old numeric;
    v_balance numeric;
    v_interest numeric;
    v_principal numeric;
    v_count integer := 0;
    v_items jsonb := '[]'::jsonb;
    v_item jsonb;
BEGIN
    SELECT * INTO l FROM public.loans WHERE id = p_loan_id AND user_id = auth.uid() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'El préstamo seleccionado no existe.'; END IF;
    IF p_apply IS NULL OR l.loan_history_reconstructed THEN
        RAISE EXCEPTION 'La reconstrucción ya fue aplicada o la confirmación no es válida.';
    END IF;
    IF p_apply AND (p_expected_previous_balance IS NULL OR p_expected_estimated_balance IS NULL) THEN
        RAISE EXCEPTION 'Se requieren los saldos esperados de la previsualización.';
    END IF;
    IF l.tea_percentage < 0 OR l.initial_amount <= 0 OR l.current_balance < 0 THEN
        RAISE EXCEPTION 'La tasa o los saldos del préstamo no son válidos.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.transactions WHERE loan_id = l.id AND type = 'LOAN_PAYMENT'
               AND (user_id <> auth.uid() OR loan_principal IS NOT NULL OR currency <> l.currency)) THEN
        RAISE EXCEPTION 'El historial contiene pagos incompatibles con la reconstrucción.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.transactions WHERE loan_id = l.id AND type = 'LOAN_PAYMENT'
               GROUP BY transaction_date HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'El orden de pagos con la misma fecha es ambiguo.';
    END IF;
    v_old := l.initial_amount;
    v_balance := l.initial_amount;
    FOR t IN SELECT * FROM public.transactions WHERE loan_id = l.id AND user_id = auth.uid()
             AND type = 'LOAN_PAYMENT' ORDER BY transaction_date FOR UPDATE
    LOOP
        v_count := v_count + 1;
        IF t.amount > v_old THEN
            RAISE EXCEPTION 'El pago histórico excedió el saldo anterior; no se puede reconstruir.';
        END IF;
        v_old := v_old - t.amount;
        v_interest := round(v_balance * (power(1 + l.tea_percentage / 100, 1::numeric / 12) - 1), 2);
        IF v_balance <= 0 OR t.amount < v_interest OR t.amount > v_balance + v_interest THEN
            RAISE EXCEPTION 'El pago histórico % es incompatible con la estimación.', t.id;
        END IF;
        v_principal := t.amount - v_interest;
        v_balance := v_balance - v_principal;
        v_items := v_items || jsonb_build_array(jsonb_build_object('transaction_id', t.id, 'interest', v_interest, 'principal', v_principal, 'balance', v_balance));
    END LOOP;
    IF v_count = 0 OR v_old <> l.current_balance OR l.total_installments - l.remaining_installments <> v_count THEN
        RAISE EXCEPTION 'El saldo o las cuotas no coinciden con el historial completo registrado.';
    END IF;
    IF l.remaining_installments = 0 AND v_balance > 0 THEN
        RAISE EXCEPTION 'La última cuota histórica no liquida el saldo estimado del préstamo.';
    END IF;
    IF p_apply THEN
        IF l.current_balance <> p_expected_previous_balance OR v_balance <> p_expected_estimated_balance THEN
            RAISE EXCEPTION 'La estimación está obsoleta; vuelve a previsualizarla.';
        END IF;
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
            UPDATE public.transactions SET loan_interest = (v_item->>'interest')::numeric,
                loan_principal = (v_item->>'principal')::numeric, loan_breakdown_estimated = true
            WHERE id = (v_item->>'transaction_id')::uuid AND user_id = auth.uid();
        END LOOP;
        UPDATE public.loans SET current_balance = v_balance, loan_history_reconstructed = true WHERE id = l.id AND user_id = auth.uid();
    END IF;
    RETURN jsonb_build_object('estimated', true, 'applied', p_apply, 'previous_balance', l.current_balance,
        'estimated_balance', v_balance, 'payments', v_items);
END;
$function$;

REVOKE ALL ON FUNCTION public.reconstruct_loan_history(uuid, boolean, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconstruct_loan_history(uuid, boolean, numeric, numeric) TO authenticated, service_role;