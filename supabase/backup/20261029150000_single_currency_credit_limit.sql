ALTER TABLE public.credit_cards
    ADD COLUMN IF NOT EXISTS credit_limit_currency currency_code NOT NULL DEFAULT 'PEN',
    ADD COLUMN IF NOT EXISTS credit_limit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00
        CHECK (credit_limit_amount >= 0);

DO $$
DECLARE
    has_pen_column BOOLEAN;
    has_usd_column BOOLEAN;
BEGIN
    /*
     * The previous migrations were optional during development, so an existing
     * database may have neither, one, or both legacy columns. Dynamic SQL
     * avoids resolving a missing column when this migration is replayed.
     */
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'credit_cards'
          AND column_name = 'credit_limit_pen'
    ) INTO has_pen_column;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'credit_cards'
          AND column_name = 'credit_limit_usd'
    ) INTO has_usd_column;

    IF has_pen_column AND has_usd_column THEN
        EXECUTE $sql$
            UPDATE public.credit_cards
            SET credit_limit_currency = 'USD',
                credit_limit_amount = credit_limit_usd
            WHERE credit_limit_usd > 0 AND credit_limit_pen = 0
        $sql$;

        EXECUTE $sql$
            UPDATE public.credit_cards
            SET credit_limit_currency = 'PEN',
                credit_limit_amount = credit_limit_pen
            WHERE credit_limit_pen > 0
        $sql$;
    ELSIF has_usd_column THEN
        EXECUTE $sql$
            UPDATE public.credit_cards
            SET credit_limit_currency = 'USD',
                credit_limit_amount = credit_limit_usd
            WHERE credit_limit_usd > 0
        $sql$;
    ELSIF has_pen_column THEN
        EXECUTE $sql$
            UPDATE public.credit_cards
            SET credit_limit_currency = 'PEN',
                credit_limit_amount = credit_limit_pen
            WHERE credit_limit_pen > 0
        $sql$;
    END IF;
END
$$;

ALTER TABLE public.credit_cards
    DROP COLUMN IF EXISTS credit_limit_pen,
    DROP COLUMN IF EXISTS credit_limit_usd;
