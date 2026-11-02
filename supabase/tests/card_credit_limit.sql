BEGIN;

SELECT no_plan();

INSERT INTO auth.users (id, email) VALUES
    ('10000000-0000-0000-0000-000000000001', 'card-limit-1@example.test'),
    ('10000000-0000-0000-0000-000000000002', 'card-limit-2@example.test');

INSERT INTO public.credit_cards (id, user_id, name, closing_day, payment_due_day, credit_limit_currency, credit_limit_amount, current_debt_pen, current_debt_usd) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PEN limit', 15, 25, 'PEN', 200, 80, 10),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'USD limit', 15, 25, 'USD', 100, 120, 50),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'No rate PEN', 15, 25, 'PEN', 100, 0, 0),
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'No rate USD', 15, 25, 'USD', 100, 0, 0),
    ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Unlimited', 15, 25, 'PEN', 0, 0, 0),
    ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Rounding', 15, 25, 'USD', 0.33, 0.99, 0);

INSERT INTO public.accounts (id, user_id, name, type, currency, current_balance) VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PEN account', 'BANK_ACCOUNT', 'PEN', 1000),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'USD account', 'BANK_ACCOUNT', 'USD', 1000);

INSERT INTO public.exchange_rates (user_id, rate_date, usd_to_pen_rate) VALUES
    ('10000000-0000-0000-0000-000000000002', '2099-01-01', 1);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

SELECT lives_ok($$SELECT public.create_transaction('EXPENSE', '2020-01-01', 'same PEN', 25, 'PEN', p_credit_card_id := '20000000-0000-0000-0000-000000000003')$$, 'same-currency PEN purchase needs no rate');
SELECT lives_ok($$SELECT public.create_transaction('EXPENSE', '2020-01-01', 'same USD', 20, 'USD', p_credit_card_id := '20000000-0000-0000-0000-000000000004')$$, 'same-currency USD purchase needs no rate');
SELECT lives_ok($$SELECT public.create_transaction('EXPENSE', '2020-01-01', 'unlimited', 10, 'USD', p_credit_card_id := '20000000-0000-0000-0000-000000000005')$$, 'unlimited card needs no rate');
SELECT throws_like($$SELECT public.create_transaction('EXPENSE', '2020-01-01', 'missing PEN rate', 1, 'USD', p_credit_card_id := '20000000-0000-0000-0000-000000000003', p_applied_exchange_rate := 1)$$, '%configur%tipo de cambio%', 'opposite currency requires configured rate, ignoring client rate');
SELECT throws_like($$SELECT public.create_transaction('EXPENSE', '2020-01-01', 'missing USD rate', 1, 'PEN', p_credit_card_id := '20000000-0000-0000-0000-000000000004')$$, '%configur%tipo de cambio%', 'missing rate rejected in the other direction');
SELECT throws_like($$SELECT public.create_transaction('EXPENSE', '2020-01-01', 'missing with children', 2, 'USD', p_credit_card_id := '20000000-0000-0000-0000-000000000003', p_installments := 2, p_installment_start_period := '2026-01', p_installment_principal := 1, p_installment_interest := 0, p_splits := '[{"debtor_name":"Ana","amount_owed":1}]')$$, '%configur%tipo de cambio%', 'missing rate rolls back installment and split');
SELECT is((SELECT count(*) FROM public.transactions WHERE description LIKE 'missing %'), 0::bigint, 'missing-rate failures roll back transactions');
SELECT is((SELECT current_debt_usd FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000003'), 0::numeric, 'missing-rate failure rolls back debt');
SELECT is((SELECT count(*) FROM public.installment_plans), 0::bigint, 'missing-rate installment rolled back');
SELECT is((SELECT count(*) FROM public.shared_expense_splits), 0::bigint, 'missing-rate split rolled back');
SELECT throws_like($$SELECT public.create_transaction('EXPENSE', '2020-01-01', 'over same currency', 80, 'PEN', p_credit_card_id := '20000000-0000-0000-0000-000000000003')$$, '%excede la línea%', 'same-currency limit is enforced without a rate');

INSERT INTO public.exchange_rates (user_id, rate_date, usd_to_pen_rate) VALUES
    ('10000000-0000-0000-0000-000000000001', '2020-01-01', 2),
    ('10000000-0000-0000-0000-000000000001', '2026-01-01', 4),
    ('10000000-0000-0000-0000-000000000001', '2025-01-01', 3);

SELECT lives_ok($$SELECT public.create_transaction('EXPENSE', '2019-01-01', 'exact PEN limit', 20, 'USD', p_credit_card_id := '20000000-0000-0000-0000-000000000001', p_applied_exchange_rate := 99, p_installments := 2, p_installment_start_period := '2026-01', p_installment_principal := 10, p_installment_interest := 1, p_splits := '[{"debtor_name":"Ana","amount_owed":5}]')$$, 'latest user rate and exact PEN limit accepted for installment/shared purchase');
SELECT is((SELECT current_debt_pen FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000001'), 80::numeric, 'existing PEN debt preserved');
SELECT is((SELECT current_debt_usd FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000001'), 30::numeric, 'USD debt kept in original currency');
SELECT is((SELECT amount FROM public.transactions WHERE description = 'exact PEN limit'), 20::numeric, 'transaction keeps original amount');
SELECT is((SELECT currency::text FROM public.transactions WHERE description = 'exact PEN limit'), 'USD', 'transaction keeps original currency');
SELECT ok((SELECT applied_exchange_rate IS NULL AND converted_amount IS NULL FROM public.transactions WHERE description = 'exact PEN limit'), 'purchase has no real exchange applied');
SELECT is((SELECT monthly_principal_amount FROM public.installment_plans WHERE transaction_id = (SELECT id FROM public.transactions WHERE description = 'exact PEN limit')), 10::numeric, 'installment principal preserved');
SELECT is((SELECT monthly_interest_amount FROM public.installment_plans WHERE transaction_id = (SELECT id FROM public.transactions WHERE description = 'exact PEN limit')), 1::numeric, 'installment interest preserved');
SELECT is((SELECT currency::text FROM public.shared_expense_splits WHERE transaction_id = (SELECT id FROM public.transactions WHERE description = 'exact PEN limit')), 'USD', 'shared split uses original currency');
SELECT is((SELECT amount_owed FROM public.shared_expense_splits WHERE transaction_id = (SELECT id FROM public.transactions WHERE description = 'exact PEN limit')), 5::numeric, 'shared split preserves original amount');
SELECT throws_like($$SELECT public.create_transaction('EXPENSE', '2019-01-01', 'over PEN limit', 0.01, 'PEN', p_credit_card_id := '20000000-0000-0000-0000-000000000001', p_installments := 2, p_installment_start_period := '2026-01', p_installment_principal := 1, p_installment_interest := 0, p_splits := '[{"debtor_name":"Ana","amount_owed":0.01}]')$$, '%excede la línea%', 'existing opposite-currency debt counts when purchase matches limit currency');
SELECT is((SELECT count(*) FROM public.transactions WHERE description = 'over PEN limit'), 0::bigint, 'over-limit transaction rolled back');
SELECT is((SELECT count(*) FROM public.installment_plans), 1::bigint, 'over-limit installment rolled back');
SELECT is((SELECT count(*) FROM public.shared_expense_splits), 1::bigint, 'over-limit split rolled back');
SELECT is((SELECT current_debt_pen FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000001'), 80::numeric, 'over-limit debt rolled back');

SELECT lives_ok($$SELECT public.create_transaction('EXPENSE', '2019-01-01', 'exact USD limit', 80, 'PEN', p_credit_card_id := '20000000-0000-0000-0000-000000000002')$$, 'PEN purchase converted only for USD limit');
SELECT is((SELECT current_debt_pen FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000002'), 200::numeric, 'PEN debt kept in original currency');
SELECT is((SELECT current_debt_usd FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000002'), 50::numeric, 'existing USD debt preserved');
SELECT throws_like($$SELECT public.create_transaction('EXPENSE', '2019-01-01', 'over USD limit', 0.01, 'USD', p_credit_card_id := '20000000-0000-0000-0000-000000000002')$$, '%excede la línea%', 'USD limit rejects excess');

SELECT throws_like($$SELECT public.create_transaction('CC_PAYMENT', now(), 'payment missing actual rate', 5, 'USD', p_account_id := '30000000-0000-0000-0000-000000000001', p_credit_card_id := '20000000-0000-0000-0000-000000000001')$$, '%tipo de cambio aplicado%', 'cross-currency payment requires real rate');
SELECT throws_like($$SELECT public.create_transaction('CC_PAYMENT', now(), 'payment insufficient balance', 25, 'USD', p_account_id := '30000000-0000-0000-0000-000000000001', p_credit_card_id := '20000000-0000-0000-0000-000000000001', p_applied_exchange_rate := 100)$$, '%Saldo insuficiente%', 'insufficient funds reject payment');
SELECT is((SELECT count(*) FROM public.transactions WHERE description = 'payment insufficient balance'), 0::bigint, 'failed payment transaction rolled back');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '30000000-0000-0000-0000-000000000001'), 1000::numeric, 'failed payment account balance rolled back');
SELECT is((SELECT current_debt_usd FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000001'), 30::numeric, 'failed payment leaves debt unchanged');
SELECT lives_ok($$SELECT public.create_transaction('CC_PAYMENT', now(), 'cross payment', 5, 'USD', p_account_id := '30000000-0000-0000-0000-000000000001', p_credit_card_id := '20000000-0000-0000-0000-000000000001', p_applied_exchange_rate := 3)$$, 'cross-currency payment uses real rate');
SELECT is((SELECT converted_amount FROM public.transactions WHERE description = 'cross payment'), 15::numeric, 'payment converted using actual rate');
SELECT is((SELECT applied_exchange_rate FROM public.transactions WHERE description = 'cross payment'), 3::numeric, 'payment stores actual rate');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '30000000-0000-0000-0000-000000000001'), 985::numeric, 'payment debits converted account amount');
SELECT throws_like($$SELECT public.create_transaction('TRANSFER', now(), 'transfer missing actual rate', 10, 'PEN', p_account_id := '30000000-0000-0000-0000-000000000001', p_destination_account_id := '30000000-0000-0000-0000-000000000002')$$, '%tipo de cambio aplicado%', 'cross-currency transfer requires real rate');
SELECT lives_ok($$SELECT public.create_transaction('TRANSFER', now(), 'cross transfer', 30, 'PEN', p_account_id := '30000000-0000-0000-0000-000000000001', p_destination_account_id := '30000000-0000-0000-0000-000000000002', p_applied_exchange_rate := 3)$$, 'cross-currency transfer uses real rate');
SELECT is((SELECT converted_amount FROM public.transactions WHERE description = 'cross transfer'), 10::numeric, 'transfer stores actual converted amount');

INSERT INTO public.exchange_rates (user_id, rate_date, usd_to_pen_rate) VALUES
    ('10000000-0000-0000-0000-000000000001', '2030-01-01', 3);
SELECT lives_ok($$SELECT public.create_transaction('EXPENSE', now(), 'rounded limit', 0.01, 'PEN', p_credit_card_id := '20000000-0000-0000-0000-000000000006')$$, 'converted debt rounds to two decimals at exact limit');
SELECT throws_like($$SELECT public.create_transaction('EXPENSE', now(), 'over rounded limit', 0.01, 'PEN', p_credit_card_id := '20000000-0000-0000-0000-000000000006')$$, '%excede la línea%', 'rounding above limit rejects purchase');
SELECT is((SELECT current_debt_pen FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000006'), 1::numeric, 'rounded over-limit purchase rolls back');
UPDATE public.credit_cards SET credit_limit_amount = 1 WHERE id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
SELECT lives_ok($$SELECT public.create_transaction('REFUND', now(), 'card refund', 5, 'USD', p_parent_transaction_id := (SELECT id FROM public.transactions WHERE description = 'exact PEN limit'))$$, 'refund reduces debt after rate and limit change');
DELETE FROM public.exchange_rates WHERE user_id = '10000000-0000-0000-0000-000000000001';
SELECT throws_like($$SELECT public.create_transaction('EXPENSE', now(), 'missing existing opposite debt', 1, 'PEN', p_credit_card_id := '20000000-0000-0000-0000-000000000001')$$, '%configur%tipo de cambio%', 'same-currency purchase needs rate if opposite debt already exists');
SELECT lives_ok($$SELECT public.create_transaction('REFUND', now(), 'refund without reference', 1, 'USD', p_parent_transaction_id := (SELECT id FROM public.transactions WHERE description = 'exact PEN limit'))$$, 'refund reduces mixed debt without a reference rate');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'refund without reference'))$$, 'refund reversal without a reference rate');
SELECT lives_ok($$SELECT public.create_transaction('CC_PAYMENT', now(), 'payment without reference', 1, 'USD', p_account_id := '30000000-0000-0000-0000-000000000001', p_credit_card_id := '20000000-0000-0000-0000-000000000001', p_applied_exchange_rate := 2)$$, 'cross-currency payment needs only its actual rate');
SELECT is((SELECT converted_amount FROM public.transactions WHERE description = 'payment without reference'), 2::numeric, 'payment without reference keeps actual converted amount');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'payment without reference'))$$, 'payment reversal succeeds without reference rate');
SELECT is((SELECT current_debt_usd FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000001'), 20::numeric, 'refund and payment reduce original debt');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'card refund'))$$, 'refund reversal bypasses current limit and missing rate');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'cross payment'))$$, 'payment reversal bypasses current limit and missing rate');
SELECT is((SELECT current_debt_usd FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000001'), 30::numeric, 'refund and payment reversals restore original debt');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'exact PEN limit'))$$, 'purchase deletion needs no reference rate');
SELECT is((SELECT current_debt_usd FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000001'), 10::numeric, 'purchase deletion restores previous USD debt');
SELECT is((SELECT count(*) FROM public.installment_plans), 0::bigint, 'purchase deletion removes installment');
SELECT is((SELECT count(*) FROM public.shared_expense_splits), 0::bigint, 'purchase deletion removes split');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'cross transfer'))$$, 'transfer reversal uses stored amounts without rate');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '30000000-0000-0000-0000-000000000001'), 1000::numeric, 'payment and transfer reversals restore PEN account');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '30000000-0000-0000-0000-000000000002'), 1000::numeric, 'transfer reversal restores USD account');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'exact USD limit'))$$, 'opposite-currency purchase deletion needs no reference rate');
SELECT is((SELECT current_debt_pen FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000002'), 120::numeric, 'PEN purchase reversal restores previous debt');

INSERT INTO public.exchange_rates (user_id, rate_date, usd_to_pen_rate) VALUES
    ('10000000-0000-0000-0000-000000000001', '2031-01-01', 6);
SELECT lives_ok($$SELECT public.create_transaction('EXPENSE', now(), 'changed-rate purchase', 10, 'USD', p_credit_card_id := '20000000-0000-0000-0000-000000000003')$$, 'card purchase uses configured reference');
SELECT lives_ok($$SELECT public.create_transaction('REFUND', now(), 'changed-rate refund', 2, 'USD', p_parent_transaction_id := (SELECT id FROM public.transactions WHERE description = 'changed-rate purchase'))$$, 'refund reduces purchase debt');
SELECT lives_ok($$SELECT public.create_transaction('CC_PAYMENT', now(), 'changed-rate payment', 3, 'USD', p_account_id := '30000000-0000-0000-0000-000000000001', p_credit_card_id := '20000000-0000-0000-0000-000000000003', p_applied_exchange_rate := 2.5)$$, 'payment uses actual rate instead of reference');
SELECT is((SELECT current_debt_usd FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000003'), 5::numeric, 'refund and payment reduce original USD debt');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '30000000-0000-0000-0000-000000000001'), 992.5::numeric, 'payment debits the actual converted amount');
INSERT INTO public.exchange_rates (user_id, rate_date, usd_to_pen_rate) VALUES
    ('10000000-0000-0000-0000-000000000001', '2032-01-01', 12);
UPDATE public.credit_cards SET credit_limit_amount = 1 WHERE id = '20000000-0000-0000-0000-000000000003';
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'changed-rate refund'))$$, 'refund reversal bypasses changed reference and limit');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'changed-rate payment'))$$, 'payment reversal uses stored actual amount after reference changes');
SELECT is((SELECT current_debt_usd FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000003'), 10::numeric, 'reversals restore USD purchase debt');
SELECT is((SELECT current_balance FROM public.accounts WHERE id = '30000000-0000-0000-0000-000000000001'), 1000::numeric, 'payment reversal restores account balance using actual rate');
SELECT lives_ok($$SELECT public.delete_transaction((SELECT id FROM public.transactions WHERE description = 'changed-rate purchase'))$$, 'purchase deletion bypasses changed reference and limit');
SELECT is((SELECT current_debt_usd FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000003'), 0::numeric, 'purchase deletion restores previous USD debt');
SELECT is((SELECT current_debt_pen FROM public.credit_cards WHERE id = '20000000-0000-0000-0000-000000000003'), 25::numeric, 'purchase deletion preserves previous PEN debt');

SELECT * FROM finish();
ROLLBACK;