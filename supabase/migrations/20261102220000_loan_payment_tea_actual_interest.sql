-- Preserve the existing engine and its controls while switching estimates to TEA.
DO $migration$
DECLARE
    v_definition text;
    v_updated text;
BEGIN
    SELECT pg_get_functiondef('public.apply_transaction_effects(public.transactions,integer)'::regprocedure) INTO v_definition;
    v_updated := replace(v_definition, 'coalesce(v_loan.tcea_percentage, v_loan.tea_percentage)', 'v_loan.tea_percentage');
    IF v_updated = v_definition THEN RAISE EXCEPTION 'No se encontró la tasa del motor de pagos.'; END IF;
    v_definition := v_updated;
    v_updated := replace(v_definition,
        'v_interest := round(v_loan.current_balance * (power(1 + v_loan.tea_percentage / 100, 1::numeric / 12) - 1), 2);',
        'v_interest := coalesce(t.loan_interest, round(v_loan.current_balance * (power(1 + v_loan.tea_percentage / 100, 1::numeric / 12) - 1), 2));');
    IF v_updated = v_definition THEN RAISE EXCEPTION 'No se encontró el cálculo de interés.'; END IF;
    EXECUTE v_updated;

    SELECT pg_get_functiondef('public.reconstruct_loan_history(uuid,boolean,numeric,numeric)'::regprocedure) INTO v_definition;
    v_updated := replace(v_definition, 'coalesce(l.tcea_percentage, l.tea_percentage)', 'l.tea_percentage');
    IF v_updated = v_definition THEN RAISE EXCEPTION 'No se encontró la tasa de reconstrucción.'; END IF;
    EXECUTE v_updated;

    SELECT pg_get_functiondef('public.create_transaction(public.transaction_type,timestamp with time zone,text,numeric,public.currency_code,uuid,uuid,uuid,uuid,numeric,uuid,uuid,uuid,integer,numeric,text,numeric,numeric,jsonb)'::regprocedure) INTO v_definition;
    v_updated := replace(v_definition, 'p_splits jsonb DEFAULT ''[]''::jsonb)', 'p_splits jsonb DEFAULT ''[]''::jsonb, p_loan_interest numeric DEFAULT NULL::numeric)');
    IF v_updated = v_definition THEN RAISE EXCEPTION 'No se encontró la firma de create_transaction.'; END IF;
    v_definition := v_updated;
    v_updated := replace(v_definition, '    -- Categoría (opcional, debe coincidir con el tipo de operación)', $insert$
    IF p_loan_interest IS NOT NULL THEN
        IF p_type IS DISTINCT FROM 'LOAN_PAYMENT' THEN
            RAISE EXCEPTION 'El interés solo se admite para pagos de préstamos.';
        END IF;
        IF p_loan_interest::text IN ('NaN', 'Infinity', '-Infinity') OR p_loan_interest < 0
            OR p_loan_interest <> round(p_loan_interest, 2) OR p_loan_interest > 9999999999.99 THEN
            RAISE EXCEPTION 'El interés debe ser no negativo y tener como máximo dos decimales.';
        END IF;
    END IF;

    -- Categoría (opcional, debe coincidir con el tipo de operación)$insert$);
    IF v_updated = v_definition THEN RAISE EXCEPTION 'No se encontró el punto de validación.'; END IF;
    v_definition := v_updated;
    v_updated := replace(v_definition, '    PERFORM public.apply_transaction_effects(v_tx, 1);',
        '    v_tx.loan_interest := p_loan_interest;
    PERFORM public.apply_transaction_effects(v_tx, 1);');
    IF v_updated = v_definition THEN RAISE EXCEPTION 'No se encontró el punto de aplicación.'; END IF;
    DROP FUNCTION public.create_transaction(public.transaction_type,timestamp with time zone,text,numeric,public.currency_code,uuid,uuid,uuid,uuid,numeric,uuid,uuid,uuid,integer,numeric,text,numeric,numeric,jsonb);
    EXECUTE v_updated;
END;
$migration$;

REVOKE ALL ON FUNCTION public.create_transaction(public.transaction_type,timestamptz,text,numeric,public.currency_code,uuid,uuid,uuid,uuid,numeric,uuid,uuid,uuid,integer,numeric,text,numeric,numeric,jsonb,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_transaction(public.transaction_type,timestamptz,text,numeric,public.currency_code,uuid,uuid,uuid,uuid,numeric,uuid,uuid,uuid,integer,numeric,text,numeric,numeric,jsonb,numeric) TO anon, authenticated, postgres, service_role;