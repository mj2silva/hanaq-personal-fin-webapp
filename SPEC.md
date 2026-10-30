# DOCUMENTO DE ESPECIFICACIÓN TÉCNICA Y FUNCIONAL (PROMPT MAESTRO)
## Proyecto: Aplicación de Finanzas Personales y Tesorería (ERP Personal)

Actúa como un Arquitecto de Software Senior y Desarrollador Full-Stack experto en Next.js (App Router), TypeScript, Supabase (PostgreSQL) y Tailwind CSS. Tu objetivo es construir una aplicación web de finanzas personales de alta precisión contable, diseñada bajo las particularidades del sistema financiero peruano (bimoneda PEN/USD, seguro de desgravamen con tope, ciclos de facturación de tarjetas de crédito, CTS/Gratificaciones).

---

### 1. STACK TECNOLÓGICO Y ARQUITECTURA
*   **Framework Full-Stack:** Next.js (App Router) con TypeScript estricto.
*   **Estilos y UI:** Tailwind CSS + `shadcn/ui` (diseño limpio, moderno, responsivo / mobile-first) + `lucide-react` para íconos + `recharts` para gráficos.
*   **Backend y Base de Datos:** Supabase (PostgreSQL). La base de datos YA ESTÁ CREADA con RLS (Row Level Security) estricto habilitado por `user_id`.
*   **Autenticación:** Supabase Auth (`@supabase/ssr`), mediante Correo y Contraseña (aplicación de uso personal / single-tenant lógico por RLS).
*   **Mutaciones y Lógica de Servidor:** Next.js Server Actions y Server Components. Toda la lógica matemática, saldos y cruces de moneda deben procesarse de forma segura en el servidor. Validación de formularios con `react-hook-form` y `zod`.

---

### 2. MAPA DE NAVEGACIÓN Y VISTAS (UI MINIMALISTA)
La aplicación debe contar con una barra de navegación principal limpia con solo **4 secciones principales** y un acceso secundario a configuración:

#### 2.1. Patrón de registro y edición mediante popups
*   **Formularios de alta:** Los formularios de registro no deben mostrarse permanentemente dentro de las páginas. Cada módulo debe mostrar inicialmente sus registros existentes o un estado vacío descriptivo, acompañado de un botón de acción para abrir el formulario correspondiente en un popup.
*   **Ámbitos del patrón:** Este comportamiento aplica a cuentas, tarjetas de crédito, préstamos, inversiones, rendimientos mensuales, categorías, tipos de cambio y al onboarding inicial.
*   **Edición:** La edición de una cuenta, tarjeta u otra entidad debe abrirse desde un popup y permitir modificar todos los atributos editables de la entidad en un único formulario, incluyendo nombre, banco, moneda, límites, fechas, saldos iniciales y parámetros financieros cuando correspondan.
*   **Diseño de los popups:** Los popups deben utilizar una presentación minimalista, estar centrados en el viewport, tener una altura máxima con desplazamiento interno para formularios extensos y aplicar un fondo oscurecido con difuminado (`backdrop blur`) para mantener el contexto sin distraer.
*   **Accesibilidad y estados:** Los diálogos deben poder cerrarse de forma explícita, conservar los mensajes de validación y éxito/error de las acciones del servidor, y mantener una experiencia responsive en pantallas pequeñas.
*   **Campos vacíos:** Los campos numéricos y opcionales deben iniciar vacíos cuando no exista un valor introducido por el usuario; no se deben inicializar automáticamente con `0` si esto oculta el placeholder o impide distinguir un campo pendiente de completar.
*   **Selectores:** Los elementos `select` deben definir explícitamente fondo y color de texto para los temas claro y oscuro, de forma que las opciones mantengan contraste legible tanto en el control como en su lista desplegable.

1.  **Inicio (`/dashboard`):**
    *   **Resumen del Mes:** Ingresos vs. Gastos reales, Balance neto del periodo y Patrimonio total consolidado en Soles (PEN). El dashboard inicial debe mostrar únicamente información real y ofrecer un acceso rápido para registrar gastos.
    *   **Toggle de Liquidez:** Interruptor rápido para incluir o excluir el saldo de la "Caja de Efectivo" (`include_cash_in_balance`) en los cálculos de liquidez y proyecciones.
    *   **Estado de Presupuestos:** Vista detallada por categoría y resumen consolidado con total presupuestado, total gastado, diferencia disponible o excedida, porcentaje global de ejecución y alertas visuales si se supera el límite.
    *   **Simulador de Proyecciones (pestaña independiente):** Proyección del flujo de caja futuro hasta 12 meses, mes a mes, asumiendo el cumplimiento del presupuesto actual, sumando eventos futuros programados (sueldo recurrente, gratificaciones, CTS) y descontando la amortización automática de cuotas de tarjetas de crédito y préstamos vigentes. El usuario puede elegir un rango mensual, visualizar ingresos, gastos, balance, liquidez y patrimonio proyectados acumulados, y descargar ese rango en un PDF organizado en tablas, con encabezado, fecha de generación, resumen, flujo mensual y desglose completo de conceptos; no se deben mostrar allí los valores actuales del resumen real. Al pasar el mouse o enfocar las cifras mensuales de ingresos y gastos, y los indicadores acumulados de ingresos, gastos, balance, liquidez y patrimonio, se muestra el detalle de conceptos considerados para cada total.
    *   **Eventos proyectados:** El usuario puede registrar desde un popup eventos únicos o recurrentes mensuales, indicando nombre, periodo inicial, monto, moneda y categoría; la proyección debe consolidarlos en PEN. Cada evento puede editarse para simular distintos importes, periodos, monedas o categorías.
    *   **Conversión a operación real:** Un evento proyectado puede convertirse desde la pestaña de proyecciones. El sistema conserva nombre, monto, moneda y categoría, solicita la fecha real y los datos faltantes según su naturaleza —cuenta receptora para ingresos; cuenta/caja o tarjeta, y tipo de cambio cuando corresponda, para gastos— y luego lo retira de las proyecciones activas.

2.  **Actividad (`/actividad`):**
    *   **Botón de Acción Principal (CTA):** Modal o Drawer ágil para registrar una "Nueva Operación" (Ingreso, Gasto, Transferencia entre cuentas/cambio de divisas, Pago de Tarjeta, Pago de Préstamo, Reembolso).
    *   **Tab 1 - Historial de Movimientos:** Lista filtrable de todas las transacciones registradas.
    *   **Tab 2 - Por Cobrar (Gastos Compartidos):** Panel dedicado al seguimiento de deudas de amigos/terceros originadas en gastos compartidos. Permite registrar pagos parciales o totales (ej. Yape/Plin recibidos) seleccionando a qué cuenta bancaria o caja entra el dinero.

3.  **Mis Cuentas (`/cuentas`):**
    *   **Bancos y Efectivo:** Tarjetas visuales con saldos actuales en PEN y USD, indicando la TREA si es cuenta remunerada, y la "Caja de Efectivo". La creación y edición se realiza mediante popup; la edición permite actualizar el nombre, banco, tipo, moneda, saldo inicial y TREA.
    *   **Tarjetas de Crédito:** Control detallado de una única línea de crédito por tarjeta, denominada en PEN o USD, deuda actual bimonetaria (PEN y USD separados), fechas de corte y pago del ciclo actual, control del Seguro de Desgravamen (cálculo automático con opción de edición manual / override en el estado de cuenta) y progreso para exoneración de membresía anual. La línea se consume con gastos en cualquiera de las dos monedas; si la moneda del gasto difiere de la línea, se exige el tipo de cambio aplicado y se convierte el consumo antes de validar el límite. Mostrar el porcentaje de línea utilizada y una alerta configurable por tarjeta, con umbral predeterminado de 70%. La sección debe incluir un resumen general de tarjetas activas, línea total, deuda total, crédito disponible y utilización consolidada en PEN.
    *   **Préstamos e Inversiones:** Seguimiento de préstamos activos (cuotas restantes y saldo) y portafolio de inversiones con botón para registrar el rendimiento mensual (ganancia o pérdida del mes en `investment_monthly_logs`). Las altas y el registro de rendimientos se abren mediante popup.

4.  **Mi Mes (`/mi-mes`):**
    *   **Checklist de Gastos Fijos:** Lista interactiva de recibos y suscripciones recurrentes del mes (`monthly_fixed_checklist`). Al marcar un ítem como "Pagado", solicita confirmar el *monto real* (ya que servicios como luz o agua varían respecto al estimado) y la cuenta/tarjeta de origen, generando automáticamente la transacción correspondiente.
    *   **Configuración de Presupuestos:** Asignación y edición de topes mensuales en PEN por categoría de gasto.

5.  **Configuración (`/configuracion` - Acceso desde ícono de perfil/engranaje):**
    *   **Flujo de Onboarding (Día 0):** Si `onboarding_completed = false`, redirigir a un asistente inicial que se abre en popup para registrar el Tipo de Cambio base, cuentas bancarias con sus saldos iniciales del Día 0, caja de efectivo y tarjetas de crédito con sus deudas iniciales.
    *   **Catálogos:** CRUD de Orígenes de Ingreso y Categorías de Gasto (`categories`) mediante popups, manteniendo el listado o un estado vacío visible en la página.
    *   **Tipo de Cambio Referencial:** Registro del tipo de cambio del día (`exchange_rates`, USD a PEN) mediante popup, usado para consolidar el dashboard y las proyecciones.
    *   **Sincronización SUNAT:** Botón para consultar el tipo de cambio de venta publicado por SUNAT, registrar la fecha y guardarlo en `exchange_rates`, reemplazando el registro de esa fecha si ya existe.

---

### 3. REGLAS DE NEGOCIO Y CONTABILIDAD ESTRICTA (CRÍTICO)

El código debe respetar rigurosamente estas leyes financieras al ejecutar Server Actions y consultas:

1.  **Multimoneda y Tipo de Cambio (PEN base / USD):**
    *   Toda cuenta bancaria maneja una única moneda (`PEN` o `USD`). Las tarjetas de crédito pueden ser bimonetarias (`is_bimonetary = true`), llevando contabilidad separada para `current_debt_pen` y `current_debt_usd`, pero cada tarjeta tiene una única línea (`credit_limit_currency`, `credit_limit_amount`).
    *   Al registrar un gasto con tarjeta, el monto se suma a la deuda de su moneda. Para controlar la línea, se convierte a `credit_limit_currency` con `applied_exchange_rate` cuando sea necesario; la operación debe rechazarse si supera `credit_limit_amount`.
    *   El porcentaje de utilización se calcula como la deuda total convertida a `credit_limit_currency` dividida entre `credit_limit_amount`. Cuando alcanza o supera `credit_limit_alert_percentage`, la interfaz debe mostrar una alerta visual.
    *   **Dashboards y Proyecciones:** Consolidan las cifras en `PEN` utilizando el último tipo de cambio referencial registrado en `exchange_rates`.
    *   **Transferencias y Pagos Cruzados (TC Real):** Si el usuario transfiere dinero entre cuentas de distinta moneda (cambio de divisas) o paga la deuda en `USD` de una tarjeta de crédito desde una cuenta bancaria en `PEN`, el formulario debe exigir el `applied_exchange_rate` (tipo de cambio exacto de la operación) y calcular/descontar el `converted_amount` real de la cuenta origen.

2.  **Cálculo del Consumo de Presupuesto Mensual (Fórmula Estricta):**
    *   Para calcular cuánto se ha gastado en una categoría durante un mes (`YYYY-MM`) y compararlo contra `budgets.limit_amount_pen`, aplica la siguiente regla:
        *   **Gastos Directos:** Suma las transacciones `EXPENSE` del mes que **NO** sean en cuotas (`is_installment = false`).
        *   **Compras en Cuotas:** Las transacciones con `is_installment = true` restan inmediatamente de la línea de crédito de la tarjeta por el monto total, pero **NO** golpean el presupuesto del mes 1 por el total. En su lugar, suma al presupuesto del mes únicamente la cuota activa (`monthly_principal_amount + monthly_interest_amount`) registrada en `installment_plans` cuyo rango de meses cubra el periodo actual (iniciando en `start_period_year_month`).
        *   **Reembolsos (`REFUND`):** Resta los montos de transacciones tipo `REFUND` vinculadas mediante `parent_transaction_id` a gastos de esa categoría.
        *   **Gastos Compartidos (Regla Estricta):** Si el usuario paga una cuenta grupal (ej. S/ 100) y registra que un amigo le debe S/ 60 en `shared_expense_splits`, el presupuesto recibe inicialmente el golpe completo de S/ 100. Solo se descuenta del consumo del presupuesto a medida que se registran pagos reales (`SHARED_REPAYMENT` / `amount_paid`). Los pagos de tipo `SHARED_REPAYMENT` aumentan el saldo de la cuenta bancaria/caja donde se reciben, pero **jamás** se suman como ingresos (`INCOME`) en el balance de ganancias del mes.

3.  **Tarjetas de Crédito (Regulación Perú):**
    *   **Compras en Cuotas:** Al registrar un gasto con tarjeta de crédito en cuotas, permitir elegir entre 0% de interés (cuotas sin intereses), la TEA por defecto de la tarjeta (`default_tea`), o una TEA personalizada. Calcular la cuota mensual y guardar el plan en `installment_plans`. Determinar `start_period_year_month` evaluando si la fecha de compra ocurrió antes o después del `closing_day` (día de cierre) de la tarjeta.
    *   **Seguro de Desgravamen:** En cada estado de cuenta (`credit_card_statements`), calcular automáticamente el desgravamen aplicando `desgravamen_rate` sobre la deuda, teniendo como tope máximo `desgravamen_max_pen`. Permitir que el usuario edite manualmente este valor (`manual_desgravamen_override_pen`) si el banco cobra unos centavos distintos.
    *   **Membresía Anual:** Mostrar en el perfil de la tarjeta el mes de cobro (`annual_fee_month`) y una barra de progreso indicando si ya cumplió la regla de exoneración (`MIN_MONTHLY_SPEND` o `MIN_ANNUAL_SPEND`).

4.  **Integridad Transaccional (Actualización de Saldos):**
    *   Cada vez que se inserte, edite o elimine un registro en `transactions`, se debe actualizar de forma atómica (mediante transacción SQL o RPC en Supabase) el saldo de las entidades afectadas:
        *   `INCOME`: Suma a `accounts.current_balance`.
        *   `EXPENSE` (con cuenta/caja): Resta de `accounts.current_balance`.
        *   `EXPENSE` (con tarjeta): Suma a `credit_cards.current_debt_pen` o `current_debt_usd`.
        *   `TRANSFER`: Resta de `account_id` y suma a `destination_account_id` (o actualiza `investments` si `investment_id` está presente).
        *   `CC_PAYMENT`: Resta de `accounts.current_balance` y reduce `credit_cards.current_debt_pen` o `current_debt_usd` (y actualiza el estado de cuenta vigente).
        *   `LOAN_PAYMENT`: Resta de `accounts.current_balance`, reduce `loans.current_balance` y disminuye en 1 `loans.remaining_installments`.
        *   `SHARED_REPAYMENT`: Suma a `accounts.current_balance`, incrementa `shared_expense_splits.amount_paid` y actualiza el `status` (`PARTIAL` o `PAID`).

---

### 4. ESQUEMA DE BASE DE DATOS (SUPABASE POSTGRESQL ACTIVO)
La base de datos en Supabase ya tiene ejecutado el siguiente esquema exacto. Úsalo como fuente de verdad para generar los tipos de TypeScript (`database.types.ts`) y construir las consultas:

*   **ENUMs:**
    *   `currency_code`: `'PEN'`, `'USD'`
    *   `category_type`: `'INCOME'`, `'EXPENSE'`
    *   `account_type`: `'BANK_ACCOUNT'`, `'CASH_BOX'`
    *   `exemption_rule_type`: `'NONE'`, `'MIN_MONTHLY_SPEND'`, `'MIN_ANNUAL_SPEND'`
    *   `transaction_type`: `'INCOME'`, `'EXPENSE'`, `'TRANSFER'`, `'CC_PAYMENT'`, `'REFUND'`, `'SHARED_REPAYMENT'`, `'LOAN_PAYMENT'`
    *   `split_status`: `'PENDING'`, `'PARTIAL'`, `'PAID'`

*   **Tablas Principales (`public`):**
    1.  `user_settings`: `user_id` (PK), `base_currency`, `include_cash_in_balance`, `onboarding_completed`.
    2.  `exchange_rates`: `id` (PK), `user_id`, `rate_date`, `usd_to_pen_rate`.
    3.  `categories`: `id` (PK), `user_id`, `name`, `type`, `is_active`.
    4.  `accounts`: `id` (PK), `user_id`, `name`, `type`, `bank_name`, `currency`, `initial_balance`, `current_balance`, `trea_percentage`, `is_active`.
    5.  `credit_cards`: `id` (PK), `user_id`, `name`, `bank_name`, `is_bimonetary`, `credit_limit_pen`, `credit_limit_usd`, `initial_debt_pen`, `initial_debt_usd`, `current_debt_pen`, `current_debt_usd`, `default_tea`, `closing_day`, `payment_due_day`, `desgravamen_rate`, `desgravamen_max_pen`, `has_annual_fee`, `annual_fee_amount`, `annual_fee_currency`, `annual_fee_month`, `exemption_rule`, `exemption_min_amount`, `is_active`.
    6.  `credit_card_statements`: `id` (PK), `user_id`, `credit_card_id`, `period_year_month` ('YYYY-MM'), `closing_date`, `due_date`, `statement_balance_pen`, `statement_balance_usd`, `paid_amount_pen`, `paid_amount_usd`, `calculated_desgravamen_pen`, `manual_desgravamen_override_pen`, `is_paid`.
    7.  `loans`: `id` (PK), `user_id`, `lender_name`, `currency`, `initial_amount`, `current_balance`, `tea_percentage`, `monthly_installment_amount`, `total_installments`, `remaining_installments`, `payment_due_day`, `is_active`.
    8.  `investments`: `id` (PK), `user_id`, `name`, `currency`, `initial_capital`, `current_value`, `is_active`.
    9.  `investment_monthly_logs`: `id` (PK), `user_id`, `investment_id`, `period_year_month` ('YYYY-MM'), `profit_or_loss_amount`, `recorded_at`.
    10. `transactions`: `id` (PK), `user_id`, `transaction_date`, `type`, `description`, `amount`, `currency`, `category_id`, `account_id`, `destination_account_id`, `credit_card_id`, `applied_exchange_rate`, `converted_amount`, `is_installment`, `is_shared_expense`, `parent_transaction_id`, `loan_id`, `investment_id`, `shared_split_id`.
    11. `installment_plans`: `id` (PK), `user_id`, `transaction_id`, `credit_card_id`, `start_period_year_month`, `total_installments`, `remaining_installments`, `applied_tea`, `monthly_principal_amount`, `monthly_interest_amount`.
    12. `shared_expense_splits`: `id` (PK), `user_id`, `transaction_id`, `debtor_name`, `currency`, `amount_owed`, `amount_paid`, `status`.
    13. `budgets`: `id` (PK), `user_id`, `category_id`, `period_year_month` ('YYYY-MM'), `limit_amount_pen`.
    14. `fixed_expenses_template`: `id` (PK), `user_id`, `name`, `category_id`, `estimated_amount`, `currency`, `due_day`, `is_active`.
    15. `monthly_fixed_checklist`: `id` (PK), `user_id`, `fixed_expense_id`, `period_year_month` ('YYYY-MM'), `estimated_amount`, `actual_amount`, `is_paid`, `paid_at`, `transaction_id`.
    16. `projected_events`: `id` (PK), `user_id`, `name`, `expected_year_month` ('YYYY-MM'), `amount`, `currency`, `category_id`, `target_account_id`, `is_recurring_monthly`, `is_active`.

---

### 5. PLAN DE IMPLEMENTACIÓN PASO A PASO (INSTRUCCIONES PARA EL AGENTE)
Por favor, aborda el desarrollo de manera modular y secuencial. No intentes generar toda la aplicación en una sola respuesta; avanza fase por fase esperando mi confirmación:

*   **Fase 1: Setup Base, Auth y Tipos.** Configura el cliente de Supabase (`@supabase/ssr`), el middleware de protección de rutas, la pantalla de Login, el archivo de definición de tipos `database.types.ts` basado en las 16 tablas, y el Layout principal con la navegación minimalista (*Inicio, Actividad, Mis Cuentas, Mi Mes, Configuración*).
*   **Fase 2: Configuración y Onboarding (Día 0).** Crea las vistas y Server Actions para gestionar Categorías, Tipo de Cambio y el asistente de Onboarding que inicializa `user_settings`, las primeras cuentas (`accounts`) y tarjetas (`credit_cards`).
*   **Fase 3: Módulo "Mis Cuentas" (Tesorería, Préstamos e Inversiones).** Construye las vistas de detalle de cuentas bancarias, caja de efectivo, tarjetas de crédito (con su lógica de fechas de corte, desgravamen y membresía), préstamos e inversiones.
*   **Fase 4: Motor de "Actividad" (Transacciones, Cuotas y Gastos Compartidos).** Desarrolla el modal/formulario inteligente de "Nueva Operación" con sus Server Actions que actualizan saldos atómicamente, el historial de movimientos y la pestaña "Por Cobrar" (`shared_expense_splits`).
*   **Fase 5: Módulo "Mi Mes" (Presupuestos y Checklist).** Implementa la asignación de presupuestos mensuales y el checklist interactivo de gastos fijos que dispara transacciones reales al marcarse como pagado.
*   **Fase 6: "Inicio" (Dashboard y Simulador de Proyecciones).** Construye los indicadores del mes aplicando la fórmula estricta de presupuesto, el toggle de efectivo y el motor de proyección financiera a futuro.

Confirma que has comprendido toda la especificación y comienza ejecutando únicamente la **Fase 1**.