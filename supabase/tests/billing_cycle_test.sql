BEGIN;

DO $test$
BEGIN
    IF NOT public.is_in_current_billing_cycle('2026-11-02T12:00:00-05:00', 15, '2026-11-02T12:00:00-05:00') THEN
        RAISE EXCEPTION 'Test 1 failed';
    END IF;
    IF NOT public.is_in_current_billing_cycle('2026-10-16T12:00:00-05:00', 15, '2026-11-02T12:00:00-05:00') THEN
        RAISE EXCEPTION 'Test 2 failed';
    END IF;
    IF public.is_in_current_billing_cycle('2026-10-15T12:00:00-05:00', 15, '2026-11-02T12:00:00-05:00') THEN
        RAISE EXCEPTION 'Test 3 failed';
    END IF;
    IF NOT public.is_in_current_billing_cycle('2026-11-02T12:00:00-05:00', 1, '2026-11-02T12:00:00-05:00') THEN
        RAISE EXCEPTION 'Test 4 failed';
    END IF;
    IF public.is_in_current_billing_cycle('2026-11-01T12:00:00-05:00', 1, '2026-11-02T12:00:00-05:00') THEN
        RAISE EXCEPTION 'Test 5 failed';
    END IF;
END;
$test$;

ROLLBACK;
