import type { HistoryCategory, HistoryMonth, HistoryYear } from '@/lib/history/calculations';
import type { Tables } from '@/types/database.types';

function money(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

function Summary({ title, data, categories }: { title: string; data: HistoryMonth | HistoryYear; categories: Tables<'categories'>[] }) {
  const categoryName = (item: HistoryCategory) => {
    if (!item.categoryId) return 'Sin categoría';
    const category = categories.find((entry) => entry.id === item.categoryId);
    return category ? `${category.name}${category.is_active ? '' : ' (inactiva)'}` : 'Categoría no disponible';
  };
  return <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
    <h2 className="text-lg font-semibold">{title}</h2>
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[['Ingresos', data.income], ['Gastos', data.expenses], ['Balance', data.net]].map(([label, amount]) => <div key={label} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800"><dt className="text-sm text-zinc-500">{label}</dt><dd className="font-semibold">{money(Number(amount))}</dd></div>)}
    </dl>
    <h3 className="font-medium">Presupuesto y consumo por categoría</h3>
    {data.categories.length === 0 ? <p className="text-sm text-zinc-500">No hay presupuestos ni gastos por categoría en este periodo.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-zinc-200 dark:border-zinc-700"><th className="py-2 pr-4">Categoría</th><th className="px-2">Presupuesto</th><th className="px-2">Consumo</th></tr></thead><tbody>{data.categories.map((category) => <tr key={category.categoryId ?? 'uncategorized'} className="border-b border-zinc-100 dark:border-zinc-800"><th scope="row" className="py-2 pr-4 font-normal">{categoryName(category)}</th><td className="px-2 whitespace-nowrap">{money(category.budget)}</td><td className="px-2 whitespace-nowrap">{money(category.usage)}</td></tr>)}</tbody></table></div>}
    {data.income === 0 && data.expenses === 0 && data.categories.length === 0 && <p className="text-sm text-zinc-500">No hay movimientos ni presupuestos para este periodo.</p>}
  </section>;
}

export function HistoryPanel({ period, current, through, month, year, categories, error }: { period: string; current: string; through: string; month: HistoryMonth | null; year: HistoryYear | null; categories: Tables<'categories'>[]; error: string | null }) {
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Historial</h1><p className="mt-1 text-sm text-zinc-500">Consulta tus resultados mensuales y anuales en soles.</p></div>
    <form action="/historial" className="flex flex-wrap items-end gap-3"><label className="text-sm font-medium">Mes a consultar<input type="month" name="mes" min="0001-01" max={current} defaultValue={period} required className="mt-1 block rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900" /></label><button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">Consultar</button></form>
    <p className="text-sm text-zinc-500">Son cálculos actuales sobre los registros existentes, no cierres inmutables. Se usa la última tasa disponible; cambios en la tasa, las plantillas o las transacciones pueden modificar el historial. Los pagos fijos se atribuyen al periodo de su checklist.</p>
    {error && <p role="alert" className="rounded-xl border border-red-300 p-4 text-sm text-red-700 dark:text-red-400">{error}</p>}
    {month && <Summary title={`Mes ${period}`} data={month} categories={categories} />}
    {year && <Summary title={`Acumulado ${through.slice(0, 4)} · enero a ${through}`} data={year} categories={categories} />}
  </div>;
}