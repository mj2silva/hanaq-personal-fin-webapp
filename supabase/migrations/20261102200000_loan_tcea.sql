ALTER TABLE public.loans ADD COLUMN tcea_percentage numeric(5,2)
    CHECK (tcea_percentage >= 0 AND tcea_percentage <= 100);

-- Preserve the existing payment and reconstruction logic, replacing only the
-- annual rate used by the monthly estimate. Existing breakdowns are untouched.
DO $migration$
DECLARE
    v_definition text;
    v_updated text;
BEGIN
    SELECT pg_get_functiondef('public.apply_transaction_effects(public.transactions,integer)'::regprocedure) INTO v_definition;
    v_updated := replace(v_definition, 'v_loan.tea_percentage', 'coalesce(v_loan.tcea_percentage, v_loan.tea_percentage)');
    IF v_updated = v_definition THEN
        RAISE EXCEPTION 'No se encontró la tasa del motor de pagos de préstamos.';
    END IF;
    EXECUTE v_updated;

    SELECT pg_get_functiondef('public.reconstruct_loan_history(uuid,boolean,numeric,numeric)'::regprocedure) INTO v_definition;
    v_updated := replace(v_definition, 'l.tea_percentage', 'coalesce(l.tcea_percentage, l.tea_percentage)');
    IF v_updated = v_definition THEN
        RAISE EXCEPTION 'No se encontró la tasa del motor de reconstrucción de préstamos.';
    END IF;
    EXECUTE v_updated;
END;
$migration$;