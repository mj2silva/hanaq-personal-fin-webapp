BEGIN;

INSERT INTO auth.users (id) VALUES ('f31e3d59-99bb-4a81-91a6-f06339d5fd61');
SELECT set_config('request.jwt.claim.sub', 'f31e3d59-99bb-4a81-91a6-f06339d5fd61', true);
INSERT INTO public.accounts (id, user_id, name, type, currency, current_balance)
VALUES ('b31e3d59-99bb-4a81-91a6-f06339d5fd61', 'f31e3d59-99bb-4a81-91a6-f06339d5fd61', 'Cuenta', 'BANK_ACCOUNT', 'PEN', 150);
INSERT INTO public.transactions (id, user_id, type, description, amount, currency, transaction_date)
VALUES ('ed83aaba-0d2f-4d51-97b9-4c36db6a8541', 'f31e3d59-99bb-4a81-91a6-f06339d5fd61',
        'INCOME', 'Antes', 100, 'PEN', now());

DO $test$
DECLARE
    v_result jsonb;
    v_changes jsonb;
    v_failed boolean;
BEGIN
    v_result := public.edit_transaction('ed83aaba-0d2f-4d51-97b9-4c36db6a8541', '{"description":" Después "}');
    IF v_result->>'transaction_id' <> 'ed83aaba-0d2f-4d51-97b9-4c36db6a8541'
       OR NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = 'ed83aaba-0d2f-4d51-97b9-4c36db6a8541'
                      AND description = 'Después' AND amount = 100) THEN
        RAISE EXCEPTION 'La edición no preservó el movimiento.';
    END IF;
    FOREACH v_changes IN ARRAY ARRAY['{}'::jsonb, '[]'::jsonb, '{"amount":200}'::jsonb,
        '{"description":"ok","amount":200}'::jsonb, '{"description":null}'::jsonb,
        '{"description":" "}'::jsonb] LOOP
        v_failed := false;
        BEGIN
            PERFORM public.edit_transaction('ed83aaba-0d2f-4d51-97b9-4c36db6a8541', v_changes);
        EXCEPTION WHEN OTHERS THEN v_failed := true;
        END;
        IF NOT v_failed THEN RAISE EXCEPTION 'Se aceptó un cambio inválido: %', v_changes; END IF;
    END LOOP;
    PERFORM set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', true);
    v_failed := false;
    BEGIN
        PERFORM public.edit_transaction('ed83aaba-0d2f-4d51-97b9-4c36db6a8541', '{"description":"otro"}');
    EXCEPTION WHEN OTHERS THEN v_failed := true;
    END;
    IF NOT v_failed OR NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = 'ed83aaba-0d2f-4d51-97b9-4c36db6a8541'
                                  AND description = 'Después' AND amount = 100) THEN
        RAISE EXCEPTION 'No se aisló el movimiento de otro usuario.';
    END IF;
END;
$test$;

INSERT INTO public.transactions (id, user_id, type, description, amount, currency, transaction_date, account_id)
VALUES ('ed83aaba-0d2f-4d51-97b9-4c36db6a8542', 'f31e3d59-99bb-4a81-91a6-f06339d5fd61', 'INCOME', 'Ingreso', 100, 'PEN', '2026-01-01', 'b31e3d59-99bb-4a81-91a6-f06339d5fd61'),
       ('ed83aaba-0d2f-4d51-97b9-4c36db6a8543', 'f31e3d59-99bb-4a81-91a6-f06339d5fd61', 'EXPENSE', 'Gasto', 50, 'PEN', '2026-01-01', 'b31e3d59-99bb-4a81-91a6-f06339d5fd61');

DO $test$
DECLARE
    v_failed boolean;
    v_changes jsonb;
BEGIN
    PERFORM set_config('request.jwt.claim.sub', 'f31e3d59-99bb-4a81-91a6-f06339d5fd61', true);
    PERFORM public.edit_transaction('ed83aaba-0d2f-4d51-97b9-4c36db6a8542', '{"amount":120,"transaction_date":"2026-02-01T00:00:00Z"}');
    PERFORM public.edit_transaction('ed83aaba-0d2f-4d51-97b9-4c36db6a8543', '{"amount":80}');
    IF (SELECT current_balance FROM public.accounts WHERE id = 'b31e3d59-99bb-4a81-91a6-f06339d5fd61') <> 140
       OR NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = 'ed83aaba-0d2f-4d51-97b9-4c36db6a8542' AND amount = 120 AND transaction_date = '2026-02-01T00:00:00Z') THEN
        RAISE EXCEPTION 'Saldos o movimiento incorrectos.';
    END IF;
    FOREACH v_changes IN ARRAY ARRAY['{"amount":0}'::jsonb, '{"amount":1.001}'::jsonb, '{"amount":"5"}'::jsonb,
        '{"transaction_date":null}'::jsonb, '{"amount":500,"description":"no guardar"}'::jsonb] LOOP
        v_failed := false;
        BEGIN
            PERFORM public.edit_transaction('ed83aaba-0d2f-4d51-97b9-4c36db6a8543', v_changes);
        EXCEPTION WHEN OTHERS THEN v_failed := true;
        END;
        IF NOT v_failed THEN RAISE EXCEPTION 'Se aceptó un cambio inválido: %', v_changes; END IF;
    END LOOP;
    IF (SELECT current_balance FROM public.accounts WHERE id = 'b31e3d59-99bb-4a81-91a6-f06339d5fd61') <> 140
       OR NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = 'ed83aaba-0d2f-4d51-97b9-4c36db6a8543' AND amount = 80 AND description = 'Gasto') THEN
        RAISE EXCEPTION 'El rechazo no fue atómico.';
    END IF;
    INSERT INTO public.transactions (user_id, type, description, amount, currency, transaction_date, parent_transaction_id)
    VALUES ('f31e3d59-99bb-4a81-91a6-f06339d5fd61', 'REFUND', 'Reembolso', 10, 'PEN', now(), 'ed83aaba-0d2f-4d51-97b9-4c36db6a8543');
    v_failed := false;
    BEGIN
        PERFORM public.edit_transaction('ed83aaba-0d2f-4d51-97b9-4c36db6a8543', '{"transaction_date":"2026-02-01"}');
    EXCEPTION WHEN OTHERS THEN v_failed := true;
    END;
    IF NOT v_failed THEN RAISE EXCEPTION 'Se aceptó un gasto con dependencias.'; END IF;
END;
$test$;

ROLLBACK;