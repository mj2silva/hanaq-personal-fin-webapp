import { Metadata } from 'next';
import { CreditCard, Landmark, LineChart, Plus, Wallet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Mis Cuentas | Finanzas Personales',
  description: 'Control de cuentas bancarias, caja de efectivo, tarjetas de crédito, préstamos e inversiones.',
};

export default function CuentasPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Mis Cuentas
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Tesorería general, tarjetas de crédito bimonetarias, préstamos y portafolio de inversiones.
          </p>
        </div>

        <div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-50 opacity-90 shadow-xs dark:bg-zinc-100 dark:text-zinc-900 cursor-not-allowed"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nueva Cuenta / Tarjeta</span>
            <span className="ml-1 rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 dark:bg-zinc-200 dark:text-zinc-700">
              Fase 3
            </span>
          </button>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Bancos y Caja de Efectivo */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <Landmark className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Bancos y Efectivo
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Cuentas remuneradas con TREA y caja chica
                </p>
              </div>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Fase 3
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Administra tus cuentas de ahorro en Soles (PEN) y Dólares (USD), visualiza los saldos disponibles y monitorea el rendimiento por TREA.
          </p>
        </div>

        {/* Tarjetas de Crédito */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <CreditCard className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Tarjetas de Crédito
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Líneas, fechas de corte y desgravamen
                </p>
              </div>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Fase 3
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Control de deuda bimonetaria (PEN/USD), cálculo automático de desgravamen con tope máximo y seguimiento de metas de exoneración de membresía anual.
          </p>
        </div>

        {/* Préstamos Activos */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Préstamos y Créditos
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Cuotas pendientes y cronograma
                </p>
              </div>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Fase 3
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Monitoreo de saldo deudor, cuotas restantes, días de pago y tasa de interés anual (TEA).
          </p>
        </div>

        {/* Portafolio de Inversiones */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <LineChart className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Portafolio de Inversiones
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Capital, valor actual y rendimiento
                </p>
              </div>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Fase 3
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Registro de ganancias y pérdidas periódicas (`investment_monthly_logs`) para calcular el patrimonio neto real.
          </p>
        </div>
      </div>
    </div>
  );
}
