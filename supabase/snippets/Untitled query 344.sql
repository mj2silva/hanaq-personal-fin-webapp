o-- Fecha y monto solo para ingresos y gastos de cuenta sin dependencias.
CREATE OR REPLACE FUNCTION public.edit_transaction(p_transaction_id uuid, p_changes jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $function$
DECLARE
    v_user uuid := auth.uid();
    v_tx public.transactions;
    v_account public.accounts;
    v_description text;
    v_amount numeric;
    v_date timestamptz;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    END IF;
    IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' OR p_changes = '{}'::jsonb THEN
        RAISE EXCEPTION 'Los cambios deben ser un objeto no vacío.';
    END IF;
    IF (p_changes - ARRAY['description', 'amount', 'transaction_date']) <> '{}'::jsonb THEN
        RAISE EXCEPTION 'Campo no admitido para edición.';
    END IF;
    SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id AND user_id = v_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'El movimiento no existe.'; END IF;
    v_description := v_tx.description;
    v_amount := v_tx.amount;
    v_date := v_tx.transaction_date;
    IF p_changes ? 'description' THEN
        IF jsonb_typeof(p_changes->'description') IS DISTINCT FROM 'string' THEN
            RAISE EXCEPTION 'La descripción debe ser texto.';
        END IF;
        v_description := btrim(p_changes->>'description');
        IF length(v_description) = 0 OR length(v_description) > 255 THEN
            RAISE EXCEPTION 'La descripción debe tener entre 1 y 255 caracteres.';
        END IF;
    END IF;
    IF p_changes ? 'amount' OR p_changes ? 'transaction_date' THEN
        IF v_tx.type NOT IN ('INCOME', 'EXPENSE') OR v_tx.account_id IS NULL
            OR v_tx.credit_card_id IS NOT NULL OR v_tx.destination_account_id IS NOT NULL
            OR v_tx.investment_id IS NOT NULL OR v_tx.loan_id IS NOT NULL
            OR v_tx.parent_transaction_id IS NOT NULL OR v_tx.shared_split_id IS NOT NULL
            OR v_tx.is_installment OR v_tx.is_shared_expense
            OR v_tx.converted_amount IS NOT NULL OR v_tx.applied_exchange_rate IS NOT NULL THEN
            RAISE EXCEPTION 'Solo se pueden editar ingresos y gastos simples de cuenta.';
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
        IF p_changes ? 'amount' THEN
            IF jsonb_typeof(p_changes->'amount') IS DISTINCT FROM 'number' THEN
                RAISE EXCEPTION 'El monto debe ser numérico.';
            END IF;
            v_amount := (p_changes->>'amount')::numeric;
            IF v_amount <= 0 OR v_amount > 9999999999.99 OR v_amount <> round(v_amount, 2) THEN
                RAISE EXCEPTION 'El monto debe ser positivo y tener como máximo dos decimales.';
            END IF;
        END IF;
        IF p_changes ? 'transaction_date' THEN
            IF jsonb_typeof(p_changes->'transaction_date') IS DISTINCT FROM 'string' THEN
                RAISE EXCEPTION 'La fecha debe ser texto.';
            END IF;
            v_date := (p_changes->>'transaction_date')::timestamptz;
            IF NOT isfinite(v_date) THEN RAISE EXCEPTION 'La fecha no es válida.'; END IF;
        END IF;
        IF v_amount <> v_tx.amount THEN
            PERFORM public.adjust_account_balance(v_tx.account_id,
                CASE WHEN v_tx.type = 'INCOME' THEN v_amount - v_tx.amount ELSE v_tx.amount - v_amount END);
        END IF;
    END IF;
    UPDATE public.transactions SET description = v_description, amount = v_amount, transaction_date = v_date
    WHERE id = p_transaction_id AND user_id = v_user;
    RETURN jsonb_build_object('transaction_id', p_transaction_id, 'warnings', '[]'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.edit_transaction(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_transaction(uuid, jsonb) TO authenticated, service_role;