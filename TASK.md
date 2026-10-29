# Estado del Proyecto - ERP de Finanzas Personales

## Estado Actual y Fase en Curso
- **Fase en Curso:** Fase 4 implementada (*Motor de Actividad*). Pendiente aplicar la migración SQL en Supabase y validar manualmente el flujo; luego iniciar la Fase 5 (*Mi Mes*).
- **Paso Actual:** Nueva Operación (6 tipos), historial filtrable, pestaña Por Cobrar y funciones SQL atómicas de saldos implementados.

## Archivos Creados o Modificados
- `components/navigation/nav-items.ts`: Constantes compartidas y tipadas para las 4 secciones principales (*Inicio*, *Actividad*, *Mis Cuentas*, *Mi Mes*) y sección secundaria (*Configuración*).
- `components/navigation/main-nav.tsx`: Barra de navegación horizontal de escritorio con estados activos accesibles (`aria-current`) basados en `usePathname()`.
- `components/navigation/mobile-nav.tsx`: Barra inferior de navegación sticky para dispositivos móviles con diseño táctil y responsive shell.
- `components/navigation/user-menu.tsx`: Menú de usuario con badge, link directo a Configuración y botón de Cerrar Sesión vinculado a Server Action `logout()`.
- `app/(app)/layout.tsx`: Layout autenticado que integra la cabecera sticky, navegación de escritorio, contenedor principal, barra inferior móvil y streaming suspendido de sesión para prerenderizado instantáneo de App Shell en Next.js 16.
- `app/(app)/dashboard/page.tsx`: Vista placeholder estructurada de *Inicio* con KPIs en Soles (PEN), indicadores de liquidez, presupuestos y simulador de proyecciones.
- `app/(app)/cuentas/page.tsx`: Vista operativa de *Mis Cuentas* con estados vacíos, listados y acciones de alta/edición mediante popups para Bancos y Efectivo, Tarjetas de Crédito bimonetarias, Préstamos e Inversiones.
- `app/(app)/mi-mes/page.tsx`: Vista placeholder de *Mi Mes* con secciones para Checklist de Gastos Fijos y Presupuestos por Categoría.
- `app/(app)/configuracion/page.tsx`: Vista de *Configuración* con módulos de Tipo de Cambio Referencial USD/PEN, Catálogo de Categorías y Asistente de Onboarding; sus registros se realizan mediante popups.
- `app/page.tsx`: Redirección automática desde la raíz (`/`) hacia `/dashboard`.
- `app/layout.tsx`: Actualización de metadata en español (`"ERP Finanzas Personales"`) y lenguaje del documento (`lang="es"`).
- `test/navigation.test.mjs`: Pruebas unitarias para validar la integridad de rutas y configuración de elementos de navegación.
- `app/(app)/configuracion/actions.ts`: Server Actions validadas con `zod` para categorías, tipo de cambio y onboarding.
- `components/configuration/configuration-panel.tsx`: Formularios responsivos para categorías, tipo de cambio, cuentas iniciales y tarjeta opcional.
- `app/(app)/configuracion/page.tsx`: Lectura autenticada de categorías, tipo de cambio y estado de onboarding.
- `package.json`, `package-lock.json`: Incorporación de `zod` para validación de entradas.
- `app/(app)/cuentas/actions.ts`: Server Actions validadas para cuentas, tarjetas, préstamos, inversiones y rendimientos mensuales.
- `components/accounts/accounts-panel.tsx`: Panel operativo de tesorería con saldos, utilización de línea, desgravamen y exoneración.
- `components/accounts/edit-account-dialog.tsx`: Popup centrado para editar cuentas completas, incluyendo nombre, banco, tipo, moneda, saldo inicial y TREA.
- `components/accounts/edit-card-dialog.tsx`: Popup centrado para editar tarjetas, líneas y deudas iniciales en PEN/USD, fechas y parámetros financieros.
- `components/accounts/registration-dialog.tsx`: Popup reutilizable para formularios de alta con scroll interno y fondo difuminado.
- `app/(app)/cuentas/page.tsx`: Consultas autenticadas y consolidación de datos de cuentas, tarjetas, préstamos e inversiones.
- `SPEC.md`: Documentación del patrón de altas/ediciones mediante popups, estados vacíos, campos sin valores `0` por defecto y contraste de selectores.
- `.junie/plans/phase-1-setup-auth-layout.md`: Actualización del estado del plan de entrega (Paso 4 marcado como completado).
- `supabase/migrations/20261029120000_activity_engine.sql`: Funciones SQL atómicas `create_transaction`, `register_shared_repayment` y `delete_transaction` (más helpers `adjust_*`, `apply_transaction_effects`, `convert_amount`) que actualizan `accounts`, `credit_cards`, `loans`, `investments`, `credit_card_statements`, `installment_plans` y `shared_expense_splits` en una sola transacción, con RLS vigente (SECURITY INVOKER).
- `types/database.types.ts`: Sección `Functions` con los argumentos y retornos tipados de las tres funciones RPC.
- `lib/activity/calculations.ts`: Conversión PEN/USD con TC aplicado, plan de cuotas (amortización francesa con TEA 0%, de la tarjeta o personalizada), periodo de inicio según `closing_day`, timestamp en hora de Lima y estado de deuda compartida.
- `lib/format.ts`: Formato de moneda y fechas (zona America/Lima).
- `test/activity-calculations.test.mjs`: 18 pruebas unitarias de los cálculos de Actividad.
- `app/(app)/actividad/actions.ts`: Server Actions `createOperation`, `registerSharedRepayment` y `deleteTransaction` validadas con `zod` que invocan los RPC; solo se muestran al usuario los errores lanzados por las funciones SQL (código `P0001`).
- `app/(app)/actividad/page.tsx`: Lectura autenticada de cuentas, tarjetas, préstamos, inversiones, categorías, movimientos, deudas y planes de cuotas.
- `components/activity/new-operation-dialog.tsx`: Popup de Nueva Operación (Gasto, Ingreso, Transferencia, Pago de tarjeta, Pago de préstamo, Reembolso) con TC aplicado y vista previa, cuotas y gasto compartido.
- `components/activity/activity-panel.tsx`: Historial filtrable (texto, tipo, mes) y pestaña Por Cobrar con progreso de cobro.
- `components/activity/shared-repayment-dialog.tsx`, `delete-transaction-button.tsx`, `types.ts`, `styles.ts`: Popup de cobros, eliminación con reversión de saldos y utilidades compartidas.

## Siguiente Paso Técnico Inmediato
- **Aplicar la migración** `supabase/migrations/20261029120000_activity_engine.sql` en el proyecto Supabase (por ejemplo con `npx supabase db push` o pegándola en el SQL Editor) y probar un gasto, una compra en cuotas, un gasto compartido con cobro parcial y un pago de tarjeta USD desde cuenta PEN.
- **Fase 5 (Mi Mes):**
  - Asignación de presupuestos mensuales por categoría aplicando la fórmula estricta (gastos directos + cuotas activas − reembolsos − cobros compartidos).
  - Checklist de gastos fijos que genere transacciones reales usando `create_transaction`.

## Errores Pendientes, Advertencias y Decisiones Técnicas
- **TypeScript & Linting:** 0 errores en `npx tsc --noEmit`, 0 advertencias en `npm run lint`.
- **Pruebas:** 32/32 pruebas unitarias pasando en `npm test`.
- **Build:** Producción verificada correctamente con Next.js 16.4.3 y Turbopack (`/actividad` como Partial Prerender).
- **Fase 4 (decisiones):**
  - La migración SQL no se ha ejecutado contra la base remota; sin ella las operaciones de Actividad fallan. Las funciones no se probaron contra una instancia real de Postgres.
  - Convención de montos: `amount` está en la moneda del lado que se debita (origen en transferencias; moneda de la deuda en pagos de tarjeta y préstamo); `converted_amount` es el monto en la moneda de la cuenta contraparte y se guarda solo si hay cambio de divisa (exige `applied_exchange_rate`).
  - Las cuentas no pueden quedar con saldo negativo; las compras con tarjeta validan la línea de crédito de su moneda cuando es mayor a 0 y las tarjetas no bimonetarias rechazan USD.
  - Cuotas: la compra suma la deuda por el monto total; el plan guarda `monthly_principal_amount = monto/n` y `monthly_interest_amount` = diferencia con la cuota francesa constante; el periodo inicial es el mes actual si la compra es hasta el día de cierre, o el siguiente.
  - Gastos compartidos: el gasto afecta el saldo por el total; los cobros (`SHARED_REPAYMENT`) aumentan la cuenta receptora (misma moneda de la deuda), conservan la categoría del gasto original y nunca se tratan como `INCOME`.
  - Reembolsos acreditan la cuenta o reducen la deuda de la tarjeta del gasto original y no pueden superar el monto pendiente de reembolsar.
  - Eliminar un movimiento revierte sus efectos; se bloquea si un gasto tiene reembolsos o cobros asociados. La reversión de un pago de préstamo es aproximada si el saldo se había recortado a 0.
  - Edición de movimientos: no hay formulario; se elimina y se registra de nuevo.
  - El historial carga los últimos 300 movimientos y los filtros se aplican en cliente.
- **Corrección runtime:** `/configuracion` declara explícitamente acceso request-time con `connection()` y se regeneraron los artefactos `.next` para evitar chunks SSR obsoletos.
- **Corrección runtime adicional:** `UserMenuSection` en el layout autenticado declara acceso request-time con `connection()` antes de leer la sesión Supabase, evitando advertencias de `Date.now()` en `/dashboard`.
- **Fase 3:** Los rendimientos reemplazados para el mismo periodo ajustan el valor por la diferencia, evitando duplicar ganancias al editar un registro.
- **Tarjetas:** Se agregó línea de crédito USD independiente de PEN; los saldos iniciales editables ajustan el saldo vigente por la diferencia para conservar movimientos posteriores.
- **Formularios:** Los campos numéricos de alta ya no fuerzan `0`, permitiendo visualizar sus placeholders; los select usan contraste explícito para temas claro y oscuro.
- **Edición:** Las cuentas y tarjetas se editan mediante popups minimalistas; cada popup permite actualizar todos los atributos configurables y conserva el ajuste diferencial del saldo/deuda vigente.
- **UX de popups:** Los diálogos de edición están centrados en el viewport, limitan su altura con scroll interno y difuminan/oscurecen el fondo mediante `backdrop`.
- **Registros:** Las altas de cuentas, tarjetas, préstamos, inversiones, rendimientos, categorías, tipos de cambio y onboarding se abren desde popups; las pantallas mantienen listados/estados vacíos sin formularios permanentes.
- **Especificación funcional:** `SPEC.md` documenta el patrón obligatorio de popups, incluyendo centrado, backdrop blur, scroll interno, accesibilidad, estados vacíos, placeholders visibles y contraste de `select`.
- **Compilación:** Build de producción exitoso con Next.js 16.4.3 Turbopack (`npm run build`) con generación de rutas parciales (Partial Prerendering / Cache Components) para todas las vistas principales.
- **Decisiones Técnicas:**
  - Se aisló la lectura de sesión de usuario en un subcomponente suspendido dentro de `app/(app)/layout.tsx` para permitir que Next.js 16 genere y cachee instantáneamente el App Shell estático sin bloquearse por acceso directo a `cookies()`.
  - La protección de rutas continúa rigurosamente delegada a `proxy.ts` / Next.js Middleware para interceptar solicitudes no autenticadas en el edge antes de llegar a las vistas.
  - Las categorías se desactivan en lugar de eliminarse para preservar referencias históricas y evitar romper presupuestos o transacciones.
  - El onboarding es idempotente respecto a `user_settings.onboarding_completed` y crea una cuenta inicial, una tarjeta opcional y el tipo de cambio del día.
