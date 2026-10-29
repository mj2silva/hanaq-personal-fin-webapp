import { Metadata } from 'next';
import { FolderTree, RefreshCw, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Configuración | Finanzas Personales',
  description: 'Gestión de categorías, tipo de cambio referencial y preferencias del sistema.',
};

export default function ConfiguracionPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Configuración
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Catálogos del sistema, tipo de cambio referencial USD/PEN y preferencias contables.
          </p>
        </div>
      </div>

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Tipo de Cambio Referencial */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <RefreshCw className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Tipo de Cambio
              </h2>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Fase 2
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Registro diario del tipo de cambio USD a PEN utilizado para consolidar el patrimonio total y las proyecciones financieras.
          </p>
        </div>

        {/* Catálogo de Categorías */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <FolderTree className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Categorías de Gastos/Ingresos
              </h2>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Fase 2
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Administración de orígenes de ingreso y rubros de gasto para organizar presupuestos y reportes contables.
          </p>
        </div>

        {/* Asistente de Onboarding */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Asistente Inicial (Día 0)
              </h2>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Fase 2
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Configuración inicial de cuentas bancarias con saldos iniciales, caja chica y tarjetas con deudas del Día 0.
          </p>
        </div>
      </div>
    </div>
  );
}
