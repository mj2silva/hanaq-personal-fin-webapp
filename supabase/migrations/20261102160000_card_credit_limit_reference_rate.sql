-- Keep the legacy rate parameter for callers, but never use it for card limits.
-- Updating the row holds its lock until the surrounding transaction completes.
CREATE OR REPLACE FUNCTION public.adjust_card_debt(
    p_card_id uuid,
    p_currency public.currency_code,
    p_delta numeric,
    p_rate numeric,
    p_validate_limit boolean
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    v_card public.credit_cards;
    v_opposite_currency public.currency_code;
    v_opposite_debt numeric;
    v_limit_debt numeric;
    v_reference_rate numeric;
BEGIN
    UPDATE public.credit_cards
    SET current_debt_pen = CASE WHEN p_currency = 'PEN' THEN greatest(0, current_debt_pen + p_delta) ELSE current_debt_pen END,
        current_debt_usd = CASE WHEN p_currency = 'USD' THEN greatest(0, current_debt_usd + p_delta) ELSE current_debt_usd END
    WHERE id = p_card_id AND user_id = auth.uid()
    RETURNING * INTO v_card;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La tarjeta seleccionada no existe.';
    END IF;

    IF p_validate_limit AND v_card.credit_limit_amount > 0 THEN
        IF v_card.credit_limit_currency = 'PEN' THEN
            v_limit_debt := v_card.current_debt_pen;
            v_opposite_currency := 'USD';
            v_opposite_debt := v_card.current_debt_usd;
        ELSE
            v_limit_debt := v_card.current_debt_usd;
            v_opposite_currency := 'PEN';
            v_opposite_debt := v_card.current_debt_pen;
        END IF;

        IF v_opposite_debt <> 0 THEN
            SELECT usd_to_pen_rate INTO v_reference_rate
            FROM public.exchange_rates
            WHERE user_id = auth.uid()
            ORDER BY rate_date DESC
            LIMIT 1;

            IF v_reference_rate IS NULL THEN
                RAISE EXCEPTION 'Debes configurar un tipo de cambio referencial para validar la línea de crédito.';
            END IF;

            v_limit_debt := v_limit_debt + public.convert_amount(
                v_opposite_debt, v_opposite_currency, v_card.credit_limit_currency, v_reference_rate
            );
        END IF;

        IF v_limit_debt > v_card.credit_limit_amount THEN
            RAISE EXCEPTION 'La operación excede la línea de crédito disponible en %.', v_card.credit_limit_currency;
        END IF;
    END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.adjust_card_debt(uuid, public.currency_code, numeric, numeric, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_card_debt(uuid, public.currency_code, numeric, numeric, boolean) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.adjust_card_debt(
    p_card_id uuid,
    p_currency public.currency_code,
    p_delta numeric,
    p_rate numeric DEFAULT NULL::numeric
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM public.adjust_card_debt(p_card_id, p_currency, p_delta, NULL, p_delta > 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_transaction_effects(
    t public.transactions,
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
        PERFORM public.adjust_loan(t.loan_id, -p_direction * t.amount, -p_direction);

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