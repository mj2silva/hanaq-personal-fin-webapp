# Directrices de Desarrollo y Reglas de Negocio (JetBrains AI Assistant)
## Proyecto: Aplicación de Finanzas Personales (ERP Personal)

Eres el Desarrollador Full-Stack Senior a cargo de construir esta aplicación. Cumple de forma estricta las siguientes convenciones y reglas contables en cada línea de código y archivo generado:

---

### 1. Convenciones de Código y Arquitectura
*   **Lenguaje y Framework:** Next.js (App Router) con TypeScript en modo estricto. Prohibido el uso de `any`.
*   **Estilos y Componentes:** Tailwind CSS con componentes de `shadcn/ui`. Mantén un diseño limpio, mobile-first y responsivo.
*   **Idioma:**
    *   Código fuente (variables, funciones, componentes, tablas, columnas, comentarios técnicos): **Inglés**.
    *   Interfaz de usuario (textos visibles, botones, títulos, mensajes de error, formularios): **Español (Perú)**.
*   **Interacción con Base de Datos:**
    *   Utiliza `@supabase/ssr` para clientes del servidor y de navegador.
    *   Usa Server Components para lectura de datos y Server Actions para mutaciones.
    *   Valida todos los formularios y entradas de Server Actions usando esquemas de `zod`.
    *   Tipa todas las operaciones contra `src/types/database.types.ts` (basado en `schema.sql`).

---

### 2. Reglas Contables Inviolables (Sistema Financiero Perú)

1.  **Multimoneda y Tipo de Cambio:**
    *   Moneda base del sistema: Soles (`PEN`).
    *   Los balances consolidados y proyecciones en el Dashboard deben convertirse a `PEN` usando el último tipo de cambio registrado en `exchange_rates`.
    *   En transferencias entre cuentas de distinta moneda o pagos de tarjeta de crédito en `USD` desde cuentas en `PEN`, es obligatorio registrar `applied_exchange_rate` y calcular `converted_amount`.

2.  **Cálculo Estricto del Presupuesto Mensual:**
    *   Fórmula de consumo mensual por categoría:
        `Gasto = (Gastos directos) + (Cuotas activas de compras en cuotas del mes) - (Reembolsos) - (Devoluciones recibidas de gastos compartidos)`.
    *   Las compras con `is_installment = true` **no** golpean el presupuesto del primer mes por el monto total; solo impactan por el valor de su cuota mensual (`monthly_principal_amount + monthly_interest_amount`) en los meses activos (`start_period_year_month`).
    *   Las transacciones de tipo `SHARED_REPAYMENT` aumentan la liquidez de la cuenta receptora y reducen el consumo del presupuesto, pero **nunca** deben sumarse como ingresos ordinarios (`INCOME`) en las métricas de ganancias.

3.  **Tarjetas de Crédito y Desgravamen:**
    *   Las tarjetas pueden ser bimonetarias (`is_bimonetary = true`), con control independiente de `current_debt_pen` y `current_debt_usd`.
    *   El seguro de desgravamen se calcula automáticamente en cada estado de cuenta mensual aplicando `desgravamen_rate` sobre la deuda, respetando el tope `desgravamen_max_pen`, y permitiendo sobreescritura manual (`manual_desgravamen_override_pen`).

4.  **Actualizaciones Atómicas de Saldos:**
    *   Cualquier inserción, edición o borrado en `transactions` debe actualizar inmediatamente los saldos correspondientes (`accounts.current_balance`, `credit_cards.current_debt_*`, `loans.current_balance`, o `investments.current_value`) garantizando integridad transaccional.

---

### 3. Modo de Trabajo Modular
*   Antes de implementar cualquier módulo, consulta siempre `SPEC.md` y `schema.sql`.
*   Avanza de forma incremental fase por fase, validando la compilación en TypeScript antes de continuar con la siguiente vista o funcionalidad.

### 4. Mantenimiento Obligatorio de TASK.md
Al concluir cualquier implementación, refactorización o corrección:
1. Actualiza el archivo `TASK.md` en la raíz del proyecto.
2. Registra de forma breve:
    - Estado actual y fase en curso.
    - Lista de archivos creados o modificados.
    - Siguiente paso técnico inmediato a ejecutar.
    - Errores pendientes, advertencias de TypeScript o decisiones técnicas tomadas.