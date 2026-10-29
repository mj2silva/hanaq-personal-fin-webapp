ALTER TABLE public.credit_cards
    ADD COLUMN IF NOT EXISTS credit_limit_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00
    CHECK (credit_limit_usd >= 0);