BEGIN;
SELECT no_plan();
INSERT INTO auth.users (id, email) VALUES ('12000000-0000-0000-0000-000000000001', 'tcea@example.test');
INSERT INTO public.accounts (id, user_id, name, type, currency, current_balance) VALUES
('32000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Account', 'BANK_ACCOUNT', 'PEN', 5000);
INSERT INTO public.loans (id, user_id, lender_name, currency, initial_amount, current_balance, tea_percentage, tcea_percentage, monthly_installment_amount, total_installments, remaining_installments, payment_due_day) VALUES
('42000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'TCEA', 'PEN', 1000, 1000, 0, 12, 100, 12, 12, 1),
('42000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', 'History', 'PEN', 1000, 900, 0, 12, 100, 12, 11, 1);
INSERT INTO public.transactions (user_id, transaction_date, type, description, amount, currency, account_id, loan_id) VALUES
('12000000-0000-0000-0000-000000000001', '2020-01-01', 'LOAN_PAYMENT', 'historical', 100, 'PEN', '32000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);
SELECT lives_ok($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'tcea payment', 100, 'PEN', p_account_id := '32000000-0000-0000-0000-000000000001', p_loan_id := '42000000-0000-0000-0000-000000000001')$$, 'TCEA payment');
SELECT is((SELECT loan_interest FROM public.transactions WHERE description = 'tcea payment'), 0::numeric, 'payment uses TEA instead of TCEA');
UPDATE public.loans SET tcea_percentage = 0 WHERE id = '42000000-0000-0000-0000-000000000001';
SELECT is((SELECT loan_interest FROM public.transactions WHERE description = 'tcea payment'), 0::numeric, 'rate edit preserves stored history');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'tcea payment'))$$, 'reversal uses stored principal');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '42000000-0000-0000-0000-000000000001'), 1000::numeric, 'reversal restores balance');
SELECT is((public.reconstruct_loan_history('42000000-0000-0000-0000-000000000002')->>'estimated_balance')::numeric, 900::numeric, 'history preview uses TEA instead of TCEA');
SELECT ok((SELECT loan_principal IS NULL FROM public.transactions WHERE description = 'historical'), 'preview leaves historical payment unchanged');
UPDATE public.loans SET tea_percentage = 12, tcea_percentage = NULL WHERE id = '42000000-0000-0000-0000-000000000002';
SELECT is((public.reconstruct_loan_history('42000000-0000-0000-0000-000000000002')->>'estimated_balance')::numeric, 909.49::numeric, 'history falls back to TEA');
UPDATE public.loans SET tcea_percentage = 0 WHERE id = '42000000-0000-0000-0000-000000000002';
SELECT is((public.reconstruct_loan_history('42000000-0000-0000-0000-000000000002')->>'estimated_balance')::numeric, 909.49::numeric, 'zero TCEA does not override TEA');
SELECT throws_ok($$UPDATE public.loans SET tcea_percentage = -1 WHERE id = '42000000-0000-0000-0000-000000000002'$$, '23514', NULL, 'negative TCEA rejected');
SELECT throws_like($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'negative', 100, 'PEN', p_account_id := '32000000-0000-0000-0000-000000000001', p_loan_id := '42000000-0000-0000-0000-000000000001', p_loan_interest := -1)$$, '%interés debe%', 'negative interest rejected');
SELECT throws_like($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'fraction', 100, 'PEN', p_account_id := '32000000-0000-0000-0000-000000000001', p_loan_id := '42000000-0000-0000-0000-000000000001', p_loan_interest := 1.001)$$, '%interés debe%', 'fractional cent rejected');
SELECT throws_like($$SELECT public.create_transaction('INCOME', now(), 'wrong type', 100, 'PEN', p_account_id := '32000000-0000-0000-0000-000000000001', p_loan_interest := 0)$$, '%solo se admite%', 'interest rejected for other types');
SELECT throws_like($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'interest only', 100, 'PEN', p_account_id := '32000000-0000-0000-0000-000000000001', p_loan_id := '42000000-0000-0000-0000-000000000001', p_loan_interest := 100)$$, '%capital%', 'payment must exceed actual interest');
SELECT throws_like($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'too large', 1011, 'PEN', p_account_id := '32000000-0000-0000-0000-000000000001', p_loan_id := '42000000-0000-0000-0000-000000000001', p_loan_interest := 10)$$, '%excede el saldo%', 'actual interest still enforces payoff limit');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '32000000-0000-0000-0000-000000000001'), 5000::numeric, 'rejections are atomic');
SELECT lives_ok($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'actual interest', 100, 'PEN', p_account_id := '32000000-0000-0000-0000-000000000001', p_loan_id := '42000000-0000-0000-0000-000000000001', p_loan_interest := 15.25)$$, 'actual interest accepted');
SELECT ok((SELECT loan_interest = 15.25 AND loan_principal = 84.75 AND NOT loan_breakdown_estimated FROM public.transactions WHERE description = 'actual interest'), 'actual breakdown stored');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '42000000-0000-0000-0000-000000000001'), 915.25::numeric, 'actual principal applied');
UPDATE public.loans SET tea_percentage = 25 WHERE id = '42000000-0000-0000-0000-000000000001';
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'actual interest'))$$, 'actual payment reversible after rate change');
SELECT ok((SELECT current_balance = 1000 AND remaining_installments = 12 FROM public.loans WHERE id = '42000000-0000-0000-0000-000000000001'), 'loan restored exactly');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '32000000-0000-0000-0000-000000000001'), 5000::numeric, 'account restored exactly');
SELECT lives_ok($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'zero interest', 100, 'PEN', p_account_id := '32000000-0000-0000-0000-000000000001', p_loan_id := '42000000-0000-0000-0000-000000000001', p_loan_interest := 0)$$, 'zero actual interest accepted');
SELECT is((SELECT loan_interest FROM public.transactions WHERE description = 'zero interest'), 0::numeric, 'zero is not replaced by estimate');
SELECT * FROM finish();
ROLLBACK;