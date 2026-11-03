BEGIN;
SELECT no_plan();
INSERT INTO auth.users (id, email) VALUES ('11000000-0000-0000-0000-000000000001', 'loan-interest@example.test');
INSERT INTO public.accounts (id, user_id, name, type, currency, current_balance) VALUES
('31000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Account', 'BANK_ACCOUNT', 'PEN', 5000);
INSERT INTO public.loans (id, user_id, lender_name, currency, initial_amount, current_balance, tea_percentage, monthly_installment_amount, total_installments, remaining_installments, payment_due_day) VALUES
('41000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'New', 'PEN', 1000, 1000, 12, 100, 12, 12, 1),
('41000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'History', 'PEN', 1000, 800, 12, 100, 12, 10, 1),
('41000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', 'Bad history', 'PEN', 1000, 899, 12, 100, 12, 11, 1),
('41000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', 'Ambiguous', 'PEN', 1000, 800, 12, 100, 12, 10, 1),
('41000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000001', 'Last payment', 'PEN', 1000, 1000, 12, 100, 1, 1, 1),
('41000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000001', 'Exhausted history', 'PEN', 1000, 800, 12, 100, 2, 0, 1),
('41000000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000001', 'Paid history', 'PEN', 1000, 0, 0, 500, 2, 0, 1);
INSERT INTO public.transactions (user_id, transaction_date, type, description, amount, currency, account_id, loan_id) VALUES
('11000000-0000-0000-0000-000000000001', '2020-01-01', 'LOAN_PAYMENT', 'old one', 100, 'PEN', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002'),
('11000000-0000-0000-0000-000000000001', '2020-02-01', 'LOAN_PAYMENT', 'old two', 100, 'PEN', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002'),
('11000000-0000-0000-0000-000000000001', '2020-01-01', 'LOAN_PAYMENT', 'bad', 100, 'PEN', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003'),
('11000000-0000-0000-0000-000000000001', '2020-01-01', 'LOAN_PAYMENT', 'ambiguous one', 100, 'PEN', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004'),
('11000000-0000-0000-0000-000000000001', '2020-01-01', 'LOAN_PAYMENT', 'ambiguous two', 100, 'PEN', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004'),
('11000000-0000-0000-0000-000000000001', '2020-01-01', 'LOAN_PAYMENT', 'exhausted one', 100, 'PEN', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000006'),
('11000000-0000-0000-0000-000000000001', '2020-02-01', 'LOAN_PAYMENT', 'exhausted two', 100, 'PEN', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000006'),
('11000000-0000-0000-0000-000000000001', '2020-01-01', 'LOAN_PAYMENT', 'paid one', 500, 'PEN', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000007'),
('11000000-0000-0000-0000-000000000001', '2020-02-01', 'LOAN_PAYMENT', 'paid two', 500, 'PEN', '31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000007');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
SELECT throws_like($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'partial last', 100, 'PEN', p_account_id := '31000000-0000-0000-0000-000000000001', p_loan_id := '41000000-0000-0000-0000-000000000005')$$, '%última cuota%', 'last installment must pay off loan');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '31000000-0000-0000-0000-000000000001'), 5000::numeric, 'rejected last payment leaves account intact');
SELECT is((SELECT remaining_installments FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000005'), 1, 'rejected last payment leaves installment intact');
SELECT is((SELECT count(*) FROM public.transactions WHERE description = 'partial last'), 0::bigint, 'rejected last payment leaves no transaction');
SELECT lives_ok($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'exact last', 1009.49, 'PEN', p_account_id := '31000000-0000-0000-0000-000000000001', p_loan_id := '41000000-0000-0000-0000-000000000005')$$, 'exact last installment accepted');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000005'), 0::numeric, 'last payment clears balance');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'exact last'))$$, 'last payment reversible');
SELECT throws_like($$SELECT public.reconstruct_loan_history('41000000-0000-0000-0000-000000000006')$$, '%última cuota%', 'exhausted history preview rejected');
SELECT throws_like($$SELECT public.reconstruct_loan_history('41000000-0000-0000-0000-000000000006', true, 800, 818.12)$$, '%última cuota%', 'exhausted history apply rejected');
SELECT ok((SELECT current_balance = 800 AND NOT loan_history_reconstructed FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000006'), 'rejected history leaves loan unchanged');
SELECT ok((SELECT bool_and(loan_principal IS NULL) FROM public.transactions WHERE loan_id = '41000000-0000-0000-0000-000000000006'), 'rejected history leaves breakdowns unchanged');
SELECT is((public.reconstruct_loan_history('41000000-0000-0000-0000-000000000007')->>'estimated_balance')::numeric, 0::numeric, 'paid history preview accepted');
SELECT lives_ok($$SELECT public.reconstruct_loan_history('41000000-0000-0000-0000-000000000007', true, 0, 0)$$, 'paid history apply accepted');
SELECT throws_like($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'too small', 1, 'PEN', p_account_id := '31000000-0000-0000-0000-000000000001', p_loan_id := '41000000-0000-0000-0000-000000000001')$$, '%no cubre el interés%', 'interest minimum');
SELECT throws_like($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'interest only', 9.49, 'PEN', p_account_id := '31000000-0000-0000-0000-000000000001', p_loan_id := '41000000-0000-0000-0000-000000000001')$$, '%capital%', 'interest-only payment rejected');
SELECT throws_like($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'too large', 1010, 'PEN', p_account_id := '31000000-0000-0000-0000-000000000001', p_loan_id := '41000000-0000-0000-0000-000000000001')$$, '%excede el saldo%', 'overpayment rejected');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '31000000-0000-0000-0000-000000000001'), 5000::numeric, 'failures are atomic');
SELECT lives_ok($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'new payment', 100, 'PEN', p_account_id := '31000000-0000-0000-0000-000000000001', p_loan_id := '41000000-0000-0000-0000-000000000001')$$, 'payment accepted');
SELECT is((SELECT loan_interest FROM public.transactions WHERE description = 'new payment'), 9.49::numeric, 'monthly TEA interest');
SELECT is((SELECT loan_principal FROM public.transactions WHERE description = 'new payment'), 90.51::numeric, 'principal stored');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000001'), 909.49::numeric, 'principal reduces balance');
SELECT lives_ok($$SELECT public.create_transaction('LOAN_PAYMENT', '2010-01-01', 'later payment', 100, 'PEN', p_account_id := '31000000-0000-0000-0000-000000000001', p_loan_id := '41000000-0000-0000-0000-000000000001')$$, 'backdated second payment');
SELECT throws_like($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'new payment'))$$, '%posteriores%', 'cannot delete earlier applied payment');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'later payment'))$$, 'latest applied payment reversible');
UPDATE public.loans SET tea_percentage = 0 WHERE id = '41000000-0000-0000-0000-000000000001';
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'new payment'))$$, 'reversal uses stored principal');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000001'), 1000::numeric, 'balance restored');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '31000000-0000-0000-0000-000000000001'), 5000::numeric, 'account restored');
SELECT lives_ok($$SELECT public.create_transaction('LOAN_PAYMENT', now(), 'zero rate payoff', 1000, 'PEN', p_account_id := '31000000-0000-0000-0000-000000000001', p_loan_id := '41000000-0000-0000-0000-000000000001')$$, 'zero-rate exact payoff');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000001'), 0::numeric, 'exact payoff leaves zero');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'zero rate payoff'))$$, 'payoff reversal');
SELECT is((public.reconstruct_loan_history('41000000-0000-0000-0000-000000000002')->>'estimated_balance')::numeric, 818.12::numeric, 'history preview');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000002'), 800::numeric, 'preview does not apply');
SELECT throws_like($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'old one'))$$, '%posteriores%', 'legacy earlier payment cannot be deleted');
SELECT throws_like($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'ambiguous one'))$$, '%ambiguo%', 'ambiguous legacy order rejected');
SELECT lives_ok($$SELECT public.create_transaction('LOAN_PAYMENT', '2010-01-01', 'new after legacy', 100, 'PEN', p_account_id := '31000000-0000-0000-0000-000000000001', p_loan_id := '41000000-0000-0000-0000-000000000002')$$, 'new payment after legacy');
SELECT throws_like($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'old two'))$$, '%posteriores%', 'new payment follows legacy regardless of date');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'new after legacy'))$$, 'new payment after legacy reversible');
SELECT throws_like($$SELECT public.reconstruct_loan_history('41000000-0000-0000-0000-000000000002', true)$$, '%esperados%', 'apply requires expectations');
SELECT throws_like($$SELECT public.reconstruct_loan_history('41000000-0000-0000-0000-000000000002', true, 800, 818.13)$$, '%obsoleta%', 'stale estimate rejected');
SELECT throws_like($$SELECT public.reconstruct_loan_history('41000000-0000-0000-0000-000000000002', true, 799, 818.12)$$, '%obsoleta%', 'stale previous balance rejected');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000002'), 800::numeric, 'stale apply leaves balance unchanged');
SELECT ok((SELECT bool_and(loan_principal IS NULL) FROM public.transactions WHERE loan_id = '41000000-0000-0000-0000-000000000002'), 'stale apply leaves breakdowns unchanged');
SELECT lives_ok($$SELECT public.reconstruct_loan_history('41000000-0000-0000-0000-000000000002', true, 800, 818.12)$$, 'apply history');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000002'), 818.12::numeric, 'estimated balance applied');
SELECT throws_like($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'old one'))$$, '%posteriores%', 'reconstructed earlier payment cannot be deleted');
SELECT throws_like($$SELECT public.reconstruct_loan_history('41000000-0000-0000-0000-000000000002', true)$$, '%ya fue aplicada%', 'cannot apply twice');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'old two'))$$, 'estimated payment can be reversed');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000002'), 909.49::numeric, 'estimated principal restored');
SELECT throws_like($$SELECT public.reconstruct_loan_history('41000000-0000-0000-0000-000000000003', true, 899, 909.49)$$, '%no coinciden%', 'inconsistent history rejected');
SELECT ok((SELECT loan_principal IS NULL FROM public.transactions WHERE description = 'bad'), 'failed reconstruction rolled back');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'bad'))$$, 'legacy payment reversal');
SELECT is((SELECT current_balance FROM public.loans WHERE id = '41000000-0000-0000-0000-000000000003'), 999::numeric, 'legacy reversal retains original full-amount behaviour');
SELECT * FROM finish();
ROLLBACK;