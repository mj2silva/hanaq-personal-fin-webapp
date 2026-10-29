ALTER TABLE public.credit_cards
    ADD COLUMN IF NOT EXISTS credit_limit_alert_percentage NUMERIC(5, 2) NOT NULL DEFAULT 70.00
        CHECK (credit_limit_alert_percentage BETWEEN 0 AND 100);
