# Estado del Proyecto - ERP de Finanzas Personales

## Estado Actual y Fase en Curso
- **Fase en Curso:** Fase 3 completada (*Módulo Mis Cuentas*). Lista para iniciar la Fase 4 (*Motor de Actividad*).
- **Paso Actual:** Resumen de cuentas, tarjetas, préstamos e inversiones implementado con altas, rendimientos y cálculos bimoneda.

## Archivos Creados o Modificados
- `components/navigation/nav-items.ts`: Constantes compartidas y tipadas para las 4 secciones principales (*Inicio*, *Actividad*, *Mis Cuentas*, *Mi Mes*) y sección secundaria (*Configuración*).
- `components/navigation/main-nav.tsx`: Barra de navegación horizontal de escritorio con estados activos accesibles (`aria-current`) basados en `usePathname()`.
- `components/navigation/mobile-nav.tsx`: Barra inferior de navegación sticky para dispositivos móviles con diseño táctil y responsive shell.
- `components/navigation/user-menu.tsx`: Menú de usuario con badge, link directo a Configuración y botón de Cerrar Sesión vinculado a Server Action `logout()`.
- `app/(app)/layout.tsx`: Layout autenticado que integra la cabecera sticky, navegación de escritorio, contenedor principal, barra inferior móvil y streaming suspendido de sesión para prerenderizado instantáneo de App Shell en Next.js 16.
- `app/(app)/dashboard/page.tsx`: Vista placeholder estructurada de *Inicio* con KPIs en Soles (PEN), indicadores de liquidez, presupuestos y simulador de proyecciones.
- `app/(app)/actividad/page.tsx`: Vista placeholder de *Actividad* con pestañas de *Historial de Movimientos* y *Por Cobrar (Gastos Compartidos)*, más botón CTA de *Nueva Operación*.
- `app/(app)/cuentas/page.tsx`: Vista placeholder de *Mis Cuentas* con secciones para Bancos y Efectivo, Tarjetas de Crédito bimonetarias, Préstamos y Portafolio de Inversiones.
- `app/(app)/mi-mes/page.tsx`: Vista placeholder de *Mi Mes* con secciones para Checklist de Gastos Fijos y Presupuestos por Categoría.
- `app/(app)/configuracion/page.tsx`: Vista placeholder de *Configuración* con módulos para Tipo de Cambio Referencial USD/PEN, Catálogo de Categorías y Asistente de Onboarding.
- `app/page.tsx`: Redirección automática desde la raíz (`/`) hacia `/dashboard`.
- `app/layout.tsx`: Actualización de metadata en español (`"ERP Finanzas Personales"`) y lenguaje del documento (`lang="es"`).
- `test/navigation.test.mjs`: Pruebas unitarias para validar la integridad de rutas y configuración de elementos de navegación.
- `app/(app)/configuracion/actions.ts`: Server Actions validadas con `zod` para categorías, tipo de cambio y onboarding.
- `components/configuration/configuration-panel.tsx`: Formularios responsivos para categorías, tipo de cambio, cuentas iniciales y tarjeta opcional.
- `app/(app)/configuracion/page.tsx`: Lectura autenticada de categorías, tipo de cambio y estado de onboarding.
- `package.json`, `package-lock.json`: Incorporación de `zod` para validación de entradas.
- `app/(app)/cuentas/actions.ts`: Server Actions validadas para cuentas, tarjetas, préstamos, inversiones y rendimientos mensuales.
- `components/accounts/accounts-panel.tsx`: Panel operativo de tesorería con saldos, utilización de línea, desgravamen y exoneración.
- `app/(app)/cuentas/page.tsx`: Consultas autenticadas y consolidación de datos de cuentas, tarjetas, préstamos e inversiones.
- `.junie/plans/phase-1-setup-auth-layout.md`: Actualización del estado del plan de entrega (Paso 4 marcado como completado).

## Siguiente Paso Técnico Inmediato
- **Fase 4 (Motor de Actividad):**
  - Implementar el formulario de Nueva Operación con validación y reglas multimoneda.
  - Añadir actualización atómica de saldos para cuentas, tarjetas, préstamos e inversiones.
  - Construir historial y cuentas por cobrar de gastos compartidos.

## Errores Pendientes, Advertencias y Decisiones Técnicas
- **TypeScript & Linting:** 0 errores en `npx tsc --noEmit`, 0 advertencias en `npm run lint`.
- **Pruebas:** 14/14 pruebas unitarias pasando en `npm test`.
- **Build:** Producción verificada correctamente con Next.js 16.4.3 y Turbopack.
- **Corrección runtime:** `/configuracion` declara explícitamente acceso request-time con `connection()` y se regeneraron los artefactos `.next` para evitar chunks SSR obsoletos.
- **Corrección runtime adicional:** `UserMenuSection` en el layout autenticado declara acceso request-time con `connection()` antes de leer la sesión Supabase, evitando advertencias de `Date.now()` en `/dashboard`.
- **Fase 3:** Los rendimientos reemplazados para el mismo periodo ajustan el valor por la diferencia, evitando duplicar ganancias al editar un registro.
- **Tarjetas:** Se agregó línea de crédito USD independiente de PEN; los saldos iniciales editables ajustan el saldo vigente por la diferencia para conservar movimientos posteriores.
- **Formularios:** Los campos numéricos de alta ya no fuerzan `0`, permitiendo visualizar sus placeholders; los select usan contraste explícito para temas claro y oscuro.
- **Edición:** Las cuentas y tarjetas se editan mediante popups minimalistas; cada popup permite actualizar todos los atributos configurables y conserva el ajuste diferencial del saldo/deuda vigente.
- **UX de popups:** Los diálogos de edición están centrados en el viewport, limitan su altura con scroll interno y difuminan/oscurecen el fondo mediante `backdrop`.
- **Registros:** Las altas de cuentas, tarjetas, préstamos, inversiones, rendimientos, categorías, tipos de cambio y onboarding se abren desde popups; las pantallas mantienen listados/estados vacíos sin formularios permanentes.
- **Compilación:** Build de producción exitoso con Next.js 16.4.3 Turbopack (`npm run build`) con generación de rutas parciales (Partial Prerendering / Cache Components) para todas las vistas principales.
- **Decisiones Técnicas:**
  - Se aisló la lectura de sesión de usuario en un subcomponente suspendido dentro de `app/(app)/layout.tsx` para permitir que Next.js 16 genere y cachee instantáneamente el App Shell estático sin bloquearse por acceso directo a `cookies()`.
  - La protección de rutas continúa rigurosamente delegada a `proxy.ts` / Next.js Middleware para interceptar solicitudes no autenticadas en el edge antes de llegar a las vistas.
  - Las categorías se desactivan en lugar de eliminarse para preservar referencias históricas y evitar romper presupuestos o transacciones.
  - El onboarding es idempotente respecto a `user_settings.onboarding_completed` y crea una cuenta inicial, una tarjeta opcional y el tipo de cambio del día.
