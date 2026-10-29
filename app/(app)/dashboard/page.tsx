import { Metadata } from 'next';
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Layers,
  PiggyBank,
  TrendingUp,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Inicio | Finanzas Personales',
  description: 'Resumen financiero, balance neto y proyecciones de tesorería.',
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Inicio
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Resumen consolidado del periodo, liquidez disponible y proyecciones financieras.
          </p>
        </div>
      </div>

      {/* KPI Cards Placeholder Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Patrimonio */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Patrimonio Total (PEN)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <PiggyBank className="h-4 w-4 text-zinc-700 dark:text-zinc-300" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              S/ 0.00
            </span>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Consolidado con TC referencial
            </p>
          </div>
        </div>

        {/* Ingresos del Mes */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Ingresos del Mes
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              S/ 0.00
            </span>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Total percibido en el mes
            </p>
          </div>
        </div>

        {/* Gastos del Mes */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Gastos del Mes
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              S/ 0.00
            </span>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Gastos directos y cuotas activas
            </p>
          </div>
        </div>

        {/* Balance Neto */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Balance Neto
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <DollarSign className="h-4 w-4 text-zinc-700 dark:text-zinc-300" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              S/ 0.00
            </span>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Ahorro / Superávit mensual
            </p>
          </div>
        </div>
      </div>

      {/* Sections Placeholder Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Presupuestos del Mes */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-zinc-500" aria-hidden="true" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Consumo de Presupuestos
              </h2>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Fase 5 / 6
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aquí podrás visualizar el progreso de consumo de cada categoría frente a los topes definidos, aplicando la deducción de cuotas activas y reembolsos.
          </p>
        </div>

        {/* Proyecciones y Flujo Futuro */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-zinc-500" aria-hidden="true" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Simulador de Proyecciones
              </h2>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Fase 6
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Proyección de flujo de caja futuro mes a mes incorporando ingresos recurrentes, gratificaciones, CTS y amortización de deudas vigentes.
          </p>
        </div>
      </div>
    </div>
  );
}
