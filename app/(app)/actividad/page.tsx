import { Metadata } from 'next';
import { ArrowLeftRight, Plus, Receipt, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Actividad | Finanzas Personales',
  description: 'Historial de movimientos, transacciones y seguimiento de gastos compartidos por cobrar.',
};

export default function ActividadPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Actividad
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Historial de operaciones contables y control de cuentas por cobrar de gastos compartidos.
          </p>
        </div>

        {/* CTA Button */}
        <div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-50 opacity-90 shadow-xs dark:bg-zinc-100 dark:text-zinc-900 cursor-not-allowed"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nueva Operación</span>
            <span className="ml-1 rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 dark:bg-zinc-200 dark:text-zinc-700">
              Fase 4
            </span>
          </button>
        </div>
      </div>

      {/* Tabs Placeholder */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-4">
          <button
            type="button"
            className="flex items-center gap-2 border-b-2 border-zinc-900 pb-3 text-sm font-semibold text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
          >
            <Receipt className="h-4 w-4" aria-hidden="true" />
            <span>Historial de Movimientos</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 border-b-2 border-transparent pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>Por Cobrar (Gastos Compartidos)</span>
          </button>
        </div>
      </div>

      {/* Empty State / Placeholder Card */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/50 p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <ArrowLeftRight className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Sin transacciones registradas
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          En la Fase 4 podrás registrar ingresos, gastos, transferencias bimonetarias, pagos de tarjeta y cobros compartidos (Yape/Plin).
        </p>
      </div>
    </div>
  );
}
