-- Función helper para validar si una fecha (timestamptz o text en zona Lima)
-- cae en el ciclo de facturación actual de una tarjeta de crédito.
-- El ciclo actual termina en el corte del mes actual si hoy <= closing_day,
-- o en el corte del mes siguiente si hoy > closing_day.
-- El inicio del ciclo actual es el día siguiente al corte anterior.

CREATE OR REPLACE FUNCTION public.is_in_current_billing_cycle(
    p_date timestamptz,
    p_closing_day integer,
    p_ref_date timestamptz DEFAULT now()
)
RETURNS boolean LANGUAGE plpgsql STABLE AS $function$
DECLARE
    v_ref_date date;
    v_tx_date date;
    v_ref_day integer;
    v_cycle_start date;
    v_cycle_end date;
    v_prev_month date;
    v_curr_month date;
    v_next_month date;
BEGIN
    IF p_date IS NULL OR p_closing_day IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Manejo en zona horaria America/Lima (UTC-5)
    v_ref_date := (p_ref_date AT TIME ZONE 'America/Lima')::date;
    v_tx_date := (p_date AT TIME ZONE 'America/Lima')::date;
    v_ref_day := extract(day from v_ref_date)::integer;

    IF v_ref_day <= p_closing_day THEN
        -- El ciclo actual cierra este mes
        v_curr_month := date_trunc('month', v_ref_date)::date;
        v_prev_month := (date_trunc('month', v_ref_date) - interval '1 month')::date;
        
        -- Fin de ciclo: día de corte del mes actual (ajustado a fin de mes si el mes tiene menos días)
        v_cycle_end := make_date(
            extract(year from v_curr_month)::int,
            extract(month from v_curr_month)::int,
            least(p_closing_day, extract(day from (v_curr_month + interval '1 month - 1 day')::date)::int)
        );
        -- Inicio de ciclo: día de corte del mes anterior + 1 día
        v_cycle_start := make_date(
            extract(year from v_prev_month)::int,
            extract(month from v_prev_month)::int,
            least(p_closing_day, extract(day from (v_prev_month + interval '1 month - 1 day')::date)::int)
        ) + 1;
    ELSE
        -- El ciclo actual cierra el mes siguiente
        v_curr_month := date_trunc('month', v_ref_date)::date;
        v_next_month := (date_trunc('month', v_ref_date) + interval '1 month')::date;

        -- Fin de ciclo: día de corte del mes siguiente
        v_cycle_end := make_date(
            extract(year from v_next_month)::int,
            extract(month from v_next_month)::int,
            least(p_closing_day, extract(day from (v_next_month + interval '1 month - 1 day')::date)::int)
        );
        -- Inicio de ciclo: día de corte del mes actual + 1 día
        v_cycle_start := make_date(
            extract(year from v_curr_month)::int,
            extract(month from v_curr_month)::int,
            least(p_closing_day, extract(day from (v_curr_month + interval '1 month - 1 day')::date)::int)
        ) + 1;
    END IF;

    RETURN v_tx_date >= v_cycle_start AND v_tx_date <= v_cycle_end;
END;
$function$;

REVOKE ALL ON FUNCTION public.is_in_current_billing_cycle(timestamptz, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_in_current_billing_cycle(timestamptz, integer, timestamptz) TO anon, authenticated, service_role;
