ALTER TABLE public.credit_cards
    ADD COLUMN IF NOT EXISTS credit_limit_currency currency_code NOT NULL DEFAULT 'PEN',
    ADD COLUMN IF NOT EXISTS credit_limit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00
        CHECK (credit_limit_amount >= 0);

UPDATE public.credit_cards
SET credit_limit_currency = 'USD',
    credit_limit_amount = credit_limit_usd
WHERE credit_limit_usd > 0 AND credit_limit_pen = 0;

UPDATE public.credit_cards
SET credit_limit_currency = 'PEN',
    credit_limit_amount = credit_limit_pen
WHERE credit_limit_pen > 0;

ALTER TABLE public.credit_cards
    DROP COLUMN IF EXISTS credit_limit_pen,
    DROP COLUMN IF EXISTS credit_limit_usd;
