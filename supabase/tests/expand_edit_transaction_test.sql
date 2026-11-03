BEGIN;

-- Setup test user
INSERT INTO auth.users (id) VALUES ('a1111111-1111-4111-a111-111111111111') ON CONFLICT DO NOTHING;
SELECT set_config('request.jwt.claim.sub', 'a1111111-1111-4111-a111-111111111111', true);

-- Accounts
INSERT INTO public.accounts (id, user_id, name, type, currency, current_balance)
VALUES 
    ('b1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', 'Cuenta Origen', 'BANK_ACCOUNT', 'PEN', 1000),
    ('b2222222-2222-4222-a222-222222222222', 'a1111111-1111-4111-a111-111111111111', 'Cuenta Destino', 'BANK_ACCOUNT', 'PEN', 500);

-- Credit cards (closing day 15)
INSERT INTO public.credit_cards (id, user_id, name, closing_day, payment_due_day, credit_limit_currency, credit_limit_amount, current_debt_pen, current_debt_usd, is_active)
VALUES
    ('c1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', 'Visa 15', 15, 25, 'PEN', 5000, 200, 0, true),
    ('c2222222-2222-4222-a222-222222222222', 'a1111111-1111-4111-a111-111111111111', 'Mastercard 20', 20, 30, 'PEN', 5000, 0, 0, true);

-- Loan
INSERT INTO public.loans (id, user_id, lender_name, currency, initial_amount, current_balance, tea_percentage, monthly_installment_amount, total_installments, remaining_installments, payment_due_day, is_active)
VALUES
    ('d1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', 'BCP Loan', 'PEN', 10000, 9000, 10, 500, 24, 20, 15, true);

-- 1. Transfer test: transfer 200 from b1 to b2
INSERT INTO public.transactions (id, user_id, type, description, amount, currency, account_id, destination_account_id, transaction_date)
VALUES ('e1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', 'TRANSFER', 'Transferencia test', 200, 'PEN', 'b1111111-1111-4111-a111-111111111111', 'b2222222-2222-4222-a222-222222222222', now());

DO $test$
BEGIN
    -- Edit transfer amount to 300
    PERFORM public.edit_transaction('e1111111-1111-4111-a111-111111111111', '{"amount": 300, "description": "Transferencia actualizada"}');
    IF (SELECT current_balance FROM public.accounts WHERE id = 'b1111111-1111-4111-a111-111111111111') <> 900 THEN
        RAISE EXCEPTION 'Transfer balance adjustment failed for source account';
    END IF;
    IF (SELECT current_balance FROM public.accounts WHERE id = 'b2222222-2222-4222-a222-222222222222') <> 600 THEN
        RAISE EXCEPTION 'Transfer balance adjustment failed for dest account';
    END IF;
END;
$test$;

-- 2. Card expense test: 100 on Visa 15 within cycle
INSERT INTO public.transactions (id, user_id, type, description, amount, currency, credit_card_id, transaction_date)
VALUES ('e2222222-2222-4222-a222-222222222222', 'a1111111-1111-4111-a111-111111111111', 'EXPENSE', 'Compra tarjeta', 100, 'PEN', 'c1111111-1111-4111-a111-111111111111', now());

DO $test$
DECLARE
    v_failed boolean := false;
BEGIN
    -- Edit amount to 150
    PERFORM public.edit_transaction('e2222222-2222-4222-a222-222222222222', '{"amount": 150}');
    IF (SELECT current_debt_pen FROM public.credit_cards WHERE id = 'c1111111-1111-4111-a111-111111111111') <> 250 THEN
        RAISE EXCEPTION 'Card debt adjustment failed: expected 250, got %', (SELECT current_debt_pen FROM public.credit_cards WHERE id = 'c1111111-1111-4111-a111-111111111111');
    END IF;

    -- Switch card to Mastercard 20
    PERFORM public.edit_transaction('e2222222-2222-4222-a222-222222222222', '{"credit_card_id": "c2222222-2222-4222-a222-222222222222"}');
    IF (SELECT current_debt_pen FROM public.credit_cards WHERE id = 'c1111111-1111-4111-a111-111111111111') <> 100 THEN
        RAISE EXCEPTION 'Card debt revert failed on old card: expected 100';
    END IF;
    IF (SELECT current_debt_pen FROM public.credit_cards WHERE id = 'c2222222-2222-4222-a222-222222222222') <> 150 THEN
        RAISE EXCEPTION 'Card debt apply failed on new card: expected 150';
    END IF;
END;
$test$;

-- 3. Card payment test: CC_PAYMENT of 100 from b1 to c2
INSERT INTO public.transactions (id, user_id, type, description, amount, currency, account_id, credit_card_id, transaction_date)
VALUES ('e3333333-3333-4333-a333-333333333333', 'a1111111-1111-4111-a111-111111111111', 'CC_PAYMENT', 'Pago tarjeta', 100, 'PEN', 'b1111111-1111-4111-a111-111111111111', 'c2222222-2222-4222-a222-222222222222', now());

DO $test$
BEGIN
    -- Edit payment to 120
    PERFORM public.edit_transaction('e3333333-3333-4333-a333-333333333333', '{"amount": 120}');
    IF (SELECT current_debt_pen FROM public.credit_cards WHERE id = 'c2222222-2222-4222-a222-222222222222') <> 130 THEN
        RAISE EXCEPTION 'CC payment debt adjustment failed: expected 130, got %', (SELECT current_debt_pen FROM public.credit_cards WHERE id = 'c2222222-2222-4222-a222-222222222222');
    END IF;
END;
$test$;

-- 4. Installments test
INSERT INTO public.transactions (id, user_id, type, description, amount, currency, credit_card_id, transaction_date, is_installment)
VALUES ('e4444444-4444-4444-a444-444444444444', 'a1111111-1111-4111-a111-111111111111', 'EXPENSE', 'Compra cuotas', 600, 'PEN', 'c1111111-1111-4111-a111-111111111111', now(), true);

INSERT INTO public.installment_plans (id, transaction_id, user_id, credit_card_id, total_installments, remaining_installments, monthly_principal_amount, monthly_interest_amount, start_period_year_month)
VALUES ('f4444444-4444-4444-a444-444444444444', 'e4444444-4444-4444-a444-444444444444', 'a1111111-1111-4111-a111-111111111111', 'c1111111-1111-4111-a111-111111111111', 6, 6, 100, 0, '2026-11');

DO $test$
BEGIN
    -- Edit installment amount to 900
    PERFORM public.edit_transaction('e4444444-4444-4444-a444-444444444444', '{"amount": 900}');
    IF (SELECT monthly_principal_amount FROM public.installment_plans WHERE id = 'f4444444-4444-4444-a444-444444444444') <> 150 THEN
        RAISE EXCEPTION 'Installment plan monthly principal failed to update';
    END IF;
END;
$test$;

-- 5. Shared expense test
INSERT INTO public.transactions (id, user_id, type, description, amount, currency, account_id, transaction_date, is_shared_expense)
VALUES ('e5555555-5555-4555-a555-555555555555', 'a1111111-1111-4111-a111-111111111111', 'EXPENSE', 'Cena amigos', 200, 'PEN', 'b1111111-1111-4111-a111-111111111111', now(), true);

INSERT INTO public.shared_expense_splits (id, transaction_id, user_id, debtor_name, amount_owed, amount_paid, currency, status)
VALUES ('f5555555-5555-4555-a555-555555555555', 'e5555555-5555-4555-a555-555555555555', 'a1111111-1111-4111-a111-111111111111', 'Juan', 100, 0, 'PEN', 'PENDING');

DO $test$
DECLARE
    v_failed boolean := false;
BEGIN
    -- Edit shared expense amount
    PERFORM public.edit_transaction('e5555555-5555-4555-a555-555555555555', '{"amount": 250}');
    
    -- Now simulate repayment made
    UPDATE public.shared_expense_splits SET amount_paid = 50, status = 'PARTIAL' WHERE id = 'f5555555-5555-4555-a555-555555555555';
    BEGIN
        PERFORM public.edit_transaction('e5555555-5555-4555-a555-555555555555', '{"amount": 300}');
    EXCEPTION WHEN OTHERS THEN
        v_failed := true;
    END;
    IF NOT v_failed THEN
        RAISE EXCEPTION 'Expected shared expense edit to fail when repayment exists';
    END IF;
END;
$test$;

-- 6. Loan payment test (last payment)
-- Préstamo tiene saldo actual 9000. Registramos un pago de 500 (interés 71.74, capital 428.26).
INSERT INTO public.transactions (id, user_id, type, description, amount, currency, account_id, loan_id, transaction_date, loan_interest, loan_principal, created_at)
VALUES ('e6666666-6666-4666-a666-666666666666', 'a1111111-1111-4111-a111-111111111111', 'LOAN_PAYMENT', 'Cuota 4', 500, 'PEN', 'b1111111-1111-4111-a111-111111111111', 'd1111111-1111-4111-a111-111111111111', now(), 71.74, 428.26, now());

DO $test$
DECLARE
    v_failed boolean := false;
BEGIN
    -- Edit loan payment with explicit interest
    PERFORM public.edit_transaction('e6666666-6666-4666-a666-666666666666', '{"amount": 600, "loan_interest": 70}');
    IF (SELECT current_balance FROM public.loans WHERE id = 'd1111111-1111-4111-a111-111111111111') <> (9000 + 428.26 - 530) THEN
        RAISE EXCEPTION 'Loan balance incorrect after edit: got %', (SELECT current_balance FROM public.loans WHERE id = 'd1111111-1111-4111-a111-111111111111');
    END IF;

    -- Add a subsequent payment
    INSERT INTO public.transactions (id, user_id, type, description, amount, currency, account_id, loan_id, transaction_date, loan_interest, loan_principal, created_at)
    VALUES ('e7777777-7777-4777-a777-777777777777', 'a1111111-1111-4111-a111-111111111111', 'LOAN_PAYMENT', 'Cuota 5', 500, 'PEN', 'b1111111-1111-4111-a111-111111111111', 'd1111111-1111-4111-a111-111111111111', now() + interval '1 day', 70, 430, now() + interval '1 day');

    -- Attempt to edit previous payment (e6) should fail because it is not the last payment
    BEGIN
        PERFORM public.edit_transaction('e6666666-6666-4666-a666-666666666666', '{"amount": 700}');
    EXCEPTION WHEN OTHERS THEN
        v_failed := true;
    END;
    IF NOT v_failed THEN
        RAISE EXCEPTION 'Expected edit to fail on non-last loan payment';
    END IF;
END;
$test$;

ROLLBACK;
