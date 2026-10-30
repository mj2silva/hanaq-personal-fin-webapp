'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, Layers, PiggyBank, TrendingUp, type LucideIcon } from 'lucide-react';
import { RegistrationDialog } from '@/components/accounts/registration-dialog';
import { fieldClass, primaryButtonClass, selectClass } from '@/components/activity/styles';
import { NewOperationDialog } from '@/components/activity/new-operation-dialog';
import type { OperationReferenceData } from '@/components/activity/types';
import { convertProjectedEvent, deleteProjectedEvent, saveProjectedEvent, updateCashSetting, type DashboardActionState } from '@/app/(app)/dashboard/actions';
import type { ProjectionMonth } from '@/lib/dashboard/calculations';
import type { Tables } from '@/types/database.types';

type Category = Tables<'categories'>;
type ProjectedEvent = Tables<'projected_events'> & { categoryName: string; categoryType: 'INCOME' | 'EXPENSE' | null };
type Budget = Tables<'budgets'> & { usage: number };

function ProjectedEventDialog({
  event,
  period,
  categories,
  operationData,
  mode,
}: {
  event?: ProjectedEvent;
  period: string;
  categories: Category[];
  operationData: OperationReferenceData;
  mode: 'edit' | 'convert';
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const eventAction = mode === 'edit' ? saveProjectedEvent : convertProjectedEvent;
  const [state, action, pending] = useActionState<DashboardActionState, FormData>(eventAction, {});
  const [source, setSource] = useState<'ACCOUNT' | 'CARD'>('ACCOUNT');
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [rate, setRate] = useState('');
  const selectedCard = operationData.cards.find((card) => card.id === cardId);
  const matchingAccounts = operationData.accounts.filter((account) => !event || account.currency === event.currency);
  const needsCardRate = Boolean(event && selectedCard && selectedCard.credit_limit_currency !== event.currency);

  useEffect(() => {
    if (state.token) dialogRef.current?.close();
  }, [state.token]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {mode === 'edit' ? 'Editar' : 'Convertir en operación'}
      </button>
      <dialog ref={dialogRef} className="fixed inset-0 m-auto max-h-[90vh] w-[min(92vw,38rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/45 backdrop:backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
        <form action={action} className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h3 className="text-lg font-semibold">{mode === 'edit' ? 'Editar evento proyectado' : 'Convertir en operación real'}</h3><p className="text-sm text-zinc-500">{mode === 'edit' ? 'Ajusta los valores para simular distintos escenarios.' : 'Completa los datos que solo existen al momento de ejecutar la operación.'}</p></div>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Cerrar" className="text-xl text-zinc-500">×</button>
          </div>
          {mode === 'edit' ? (
            <>
              <input type="hidden" name="id" value={event?.id ?? ''} />
              <label className="block text-sm">Nombre<input name="name" required maxLength={100} defaultValue={event?.name} className={fieldClass} /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Periodo<input name="expectedYearMonth" type="month" required defaultValue={event?.expected_year_month ?? period} className={fieldClass} /></label><label className="text-sm">Monto<input name="amount" type="number" min="0.01" step="0.01" required defaultValue={event?.amount} className={fieldClass} /></label></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Moneda<select name="currency" defaultValue={event?.currency ?? 'PEN'} className={selectClass}><option value="PEN">PEN</option><option value="USD">USD</option></select></label><label className="text-sm">Categoría<select name="categoryId" defaultValue={event?.category_id ?? ''} className={selectClass}><option value="">Ingreso / sin categoría</option>{categories.filter((category) => category.is_active).map((category) => <option key={category.id} value={category.id}>{category.name} ({category.type === 'INCOME' ? 'Ingreso' : 'Gasto'})</option>)}</select></label></div>
              <label className="flex items-center gap-2 text-sm"><input type="hidden" name="isRecurringMonthly" value="false" /><input type="checkbox" name="isRecurringMonthly" value="true" defaultChecked={event?.is_recurring_monthly} /> Repetir mensualmente</label>
            </>
          ) : event ? (
            <>
              <input type="hidden" name="eventId" value={event.id} />
              <label className="block text-sm">Fecha real<input name="date" type="date" required defaultValue={operationData.today} className={fieldClass} /></label>
              <div className="rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60"><strong>{event.name}</strong><span className="ml-2 text-zinc-500">{event.currency} {event.amount.toFixed(2)}{event.categoryName ? ` · ${event.categoryName}` : ''}</span></div>
              {event.categoryType === 'INCOME' || event.categoryType === null ? (
                <label className="block text-sm">Cuenta que recibe el ingreso<select name="accountId" required value={accountId} onChange={(item) => setAccountId(item.target.value)} className={selectClass}><option value="">Selecciona una cuenta en {event.currency}</option>{matchingAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setSource('ACCOUNT'); setCardId(''); }} className={source === 'ACCOUNT' ? primaryButtonClass : 'rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700'}>Cuenta o efectivo</button><button type="button" onClick={() => { setSource('CARD'); setAccountId(''); }} className={source === 'CARD' ? primaryButtonClass : 'rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700'}>Tarjeta</button></div>
                  {source === 'ACCOUNT' ? <label className="block text-sm">Cuenta que paga<select name="accountId" required value={accountId} onChange={(item) => setAccountId(item.target.value)} className={selectClass}><option value="">Selecciona una cuenta en {event.currency}</option>{matchingAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label> : <label className="block text-sm">Tarjeta que paga<select name="creditCardId" required value={cardId} onChange={(item) => setCardId(item.target.value)} className={selectClass}><option value="">Selecciona una tarjeta</option>{operationData.cards.filter((card) => event.currency === 'PEN' || card.is_bimonetary).map((card) => <option key={card.id} value={card.id}>{card.name} · línea {card.credit_limit_currency}</option>)}</select></label>}
                  {source === 'CARD' && needsCardRate && <label className="block text-sm">Tipo de cambio aplicado<input name="exchangeRate" required type="number" min="0.0001" step="0.0001" value={rate} onChange={(item) => setRate(item.target.value)} placeholder={operationData.exchangeRate?.toFixed(4) ?? 'Ej. 3.7500'} className={fieldClass} /></label>}
                </>
              )}
            </>
          ) : null}
          {state.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
          <div className="flex justify-end"><button type="submit" disabled={pending} className={primaryButtonClass}>{pending ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Registrar operación'}</button></div>
        </form>
      </dialog>
    </>
  );
}

function Message({ state }: { state: DashboardActionState }) {
  if (!state.error && !state.success) return null;
  return <p className={state.error ? 'text-sm text-red-600' : 'text-sm text-emerald-600'} role="status">{state.error ?? state.success}</p>;
}

function ActionForm({ action, submitLabel = 'Guardar', children }: {
  action: (state: DashboardActionState | null, formData: FormData) => Promise<DashboardActionState>;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-4">{children}<div className="flex items-center justify-between gap-3"><Message state={state} /><button className={primaryButtonClass} disabled={pending}>{pending ? 'Guardando...' : submitLabel}</button></div></form>;
}

function money(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

function ProjectionBreakdown({ details, value, tone }: {
  details: { label: string; amount: number }[];
  value: number;
  tone: 'income' | 'expense' | 'neutral';
}) {
  return (
    <span className="group relative inline-block cursor-help">
      <span className={tone === 'income' ? 'text-emerald-600' : tone === 'expense' ? 'text-rose-600' : ''}>
        {tone === 'income' ? '+' : tone === 'expense' ? '-' : ''}{money(value)}
      </span>
      <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl border border-zinc-200 bg-zinc-900 p-3 text-left text-xs text-zinc-100 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-zinc-700">
        <span className="mb-2 block font-semibold">
          {tone === 'income' ? 'Ingresos considerados' : tone === 'expense' ? 'Gastos considerados' : 'Elementos considerados'}
        </span>
        {details.length === 0 ? (
          <span className="block text-zinc-400">Sin movimientos considerados.</span>
        ) : (
          <span className="block space-y-1">
            {details.map((detail, index) => (
              <span key={`${detail.label}-${index}`} className="flex justify-between gap-3">
                <span className="truncate">{detail.label}</span>
                <span className="shrink-0">{money(detail.amount)}</span>
              </span>
            ))}
          </span>
        )}
      </span>
    </span>
  );
}

function CashToggle({ includeCash }: { includeCash: boolean }) {
  return <ActionForm action={updateCashSetting} submitLabel={includeCash ? 'Excluir caja' : 'Incluir caja'}><input type="hidden" name="includeCash" value={String(!includeCash)} /></ActionForm>;
}

export function DashboardPanel({
  period,
  totals,
  netWorth,
  liquidity,
  includeCash,
  budgets,
  categories,
  events,
  projections,
  operationData,
}: {
  period: string;
  totals: { income: number; expenses: number; net: number };
  netWorth: number;
  liquidity: number;
  includeCash: boolean;
  budgets: Budget[];
  categories: Category[];
  events: ProjectedEvent[];
  projections: ProjectionMonth[];
  operationData: OperationReferenceData;
}) {
  const [view, setView] = useState<'overview' | 'projections'>('overview');
  const realKpis: { label: string; value: string; detail: string; icon: LucideIcon; color: string }[] = [
    { label: 'Patrimonio total', value: money(netWorth), detail: 'Consolidado en PEN', icon: PiggyBank, color: 'text-zinc-700 dark:text-zinc-300' },
    { label: 'Ingresos del mes', value: money(totals.income), detail: 'Ingresos registrados', icon: ArrowUpRight, color: 'text-emerald-600' },
    { label: 'Gastos del mes', value: money(totals.expenses), detail: 'Directos y cuotas activas', icon: ArrowDownRight, color: 'text-rose-600' },
    { label: 'Balance neto', value: money(totals.net), detail: 'Ahorro / déficit mensual', icon: TrendingUp, color: totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600' },
  ];
  const [projectionFrom, setProjectionFrom] = useState(projections[0]?.period ?? period);
  const [projectionTo, setProjectionTo] = useState(projections.at(-1)?.period ?? period);
  const firstProjectionPeriod = projectionFrom <= projectionTo ? projectionFrom : projectionTo;
  const lastProjectionPeriod = projectionFrom <= projectionTo ? projectionTo : projectionFrom;
  const selectedProjections = projections.filter((projection) => projection.period >= firstProjectionPeriod && projection.period <= lastProjectionPeriod);
  const projectedTotals = selectedProjections.reduce(
    (summary, projection) => ({
      income: summary.income + projection.income,
      expenses: summary.expenses + projection.expenses,
      net: summary.net + projection.net,
    }),
    { income: 0, expenses: 0, net: 0 }
  );
  const projectedNetWorth = netWorth + projectedTotals.net;
  const projectedLiquidity = liquidity + projectedTotals.net;
  const projectedIncomeDetails = selectedProjections.flatMap((projection) =>
    projection.incomeDetails.map((detail) => ({ label: `${projection.period}: ${detail.label}`, amount: detail.amount }))
  );
  const projectedExpenseDetails = selectedProjections.flatMap((projection) =>
    projection.expenseDetails.map((detail) => ({ label: `${projection.period}: ${detail.label}`, amount: detail.amount }))
  );
  const projectedBalanceDetails = [
    { label: 'Ingresos proyectados', amount: projectedTotals.income },
    { label: 'Gastos proyectados', amount: -projectedTotals.expenses },
  ];
  const projectedLiquidityDetails = [
    { label: 'Liquidez actual incluida', amount: liquidity },
    { label: 'Balance proyectado acumulado', amount: projectedTotals.net },
  ];
  const projectedKpis: { label: string; value: string; detail: string; icon: LucideIcon; color: string }[] = [
    { label: 'Patrimonio proyectado', value: money(projectedNetWorth), detail: `Al cierre de ${lastProjectionPeriod}`, icon: PiggyBank, color: 'text-zinc-700 dark:text-zinc-300' },
    { label: 'Ingresos proyectados', value: money(projectedTotals.income), detail: `Acumulados de ${firstProjectionPeriod} a ${lastProjectionPeriod}`, icon: ArrowUpRight, color: 'text-emerald-600' },
    { label: 'Gastos proyectados', value: money(projectedTotals.expenses), detail: `Acumulados de ${firstProjectionPeriod} a ${lastProjectionPeriod}`, icon: ArrowDownRight, color: 'text-rose-600' },
    { label: 'Balance proyectado', value: money(projectedTotals.net), detail: `Acumulado de ${firstProjectionPeriod} a ${lastProjectionPeriod}`, icon: TrendingUp, color: projectedTotals.net >= 0 ? 'text-emerald-600' : 'text-rose-600' },
  ];
  const budgetTotals = budgets.reduce(
    (totals, budget) => ({
      budget: totals.budget + budget.limit_amount_pen,
      usage: totals.usage + budget.usage,
    }),
    { budget: 0, usage: 0 }
  );
  const budgetDifference = budgetTotals.budget - budgetTotals.usage;
  const budgetPercentage = budgetTotals.budget > 0
    ? Math.round((budgetTotals.usage / budgetTotals.budget) * 100)
    : 0;
  const downloadProjectionPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const generatedAt = new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Lima',
    }).format(new Date());
    const pageHeader = () => {
      pdf.setFontSize(8);
      pdf.setTextColor(110);
      pdf.text('Proyección financiera · Finanzas Personales', 14, 10);
      pdf.text(`Página ${pdf.getNumberOfPages()}`, pageWidth - 14, 10, { align: 'right' });
      pdf.setTextColor(0);
    };
    const tableOptions = {
      theme: 'grid' as const,
      styles: { fontSize: 9, cellPadding: 3, textColor: [35, 35, 35] as [number, number, number] },
      headStyles: { fillColor: [39, 39, 42] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const },
      alternateRowStyles: { fillColor: [245, 245, 245] as [number, number, number] },
      margin: { top: 16, right: 14, bottom: 14, left: 14 },
      didDrawPage: pageHeader,
    };

    pdf.setFontSize(18);
    pdf.text('Proyección financiera', 14, 22);
    pdf.setFontSize(10);
    pdf.setTextColor(90);
    pdf.text(`Rango simulado: ${firstProjectionPeriod} a ${lastProjectionPeriod}`, 14, 29);
    pdf.text(`Generado: ${generatedAt}`, 14, 35);
    pdf.setTextColor(0);

    autoTable(pdf, {
      ...tableOptions,
      startY: 42,
      head: [['Resumen proyectado', 'Importe (PEN)', 'Referencia']],
      body: [
        ['Patrimonio proyectado', money(projectedNetWorth), `Cierre de ${lastProjectionPeriod}`],
        ['Liquidez proyectada', money(projectedLiquidity), 'Liquidez actual + balance acumulado'],
        ['Ingresos proyectados', money(projectedTotals.income), 'Acumulado del rango'],
        ['Gastos proyectados', money(projectedTotals.expenses), 'Acumulado del rango'],
        ['Balance proyectado', money(projectedTotals.net), 'Ingresos menos gastos'],
      ],
      columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 40, halign: 'right' }, 2: { cellWidth: 'auto' } },
    });

    let y = (pdf as typeof pdf & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 42;
    y += 10;
    pdf.setFontSize(13);
    pdf.text('Flujo mensual', 14, y);
    autoTable(pdf, {
      ...tableOptions,
      startY: y + 4,
      head: [['Periodo', 'Ingresos (PEN)', 'Gastos (PEN)', 'Balance (PEN)']],
      body: selectedProjections.map((projection) => [
        projection.period,
        money(projection.income),
        money(projection.expenses),
        money(projection.net),
      ]),
      columnStyles: { 0: { cellWidth: 38 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });

    y = (pdf as typeof pdf & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 10;
    y += 10;
    pdf.setFontSize(13);
    pdf.text('Detalle de conceptos considerados', 14, y);
    const detailRows = selectedProjections.flatMap((projection) => [
      ...projection.incomeDetails.map((detail) => [projection.period, 'Ingreso', detail.label, money(detail.amount)]),
      ...projection.expenseDetails.map((detail) => [projection.period, 'Gasto', detail.label, money(detail.amount)]),
    ]);
    autoTable(pdf, {
      ...tableOptions,
      startY: y + 4,
      head: [['Periodo', 'Tipo', 'Concepto', 'Importe (PEN)']],
      body: detailRows.length > 0 ? detailRows : [['—', '—', 'Sin conceptos registrados', money(0)]],
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 28 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 38, halign: 'right' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          data.cell.styles.textColor = data.cell.raw === 'Ingreso' ? [5, 150, 105] : [225, 29, 72];
        }
      },
    });

    pdf.save(`proyeccion-${firstProjectionPeriod}-${lastProjectionPeriod}.pdf`);
  };

  return <div className="space-y-8">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">Inicio</h1><p className="text-sm text-zinc-500 dark:text-zinc-400">{view === 'overview' ? 'Resumen real del periodo y registro rápido de gastos.' : 'Simulación de flujo futuro.'}</p></div>
      {view === 'overview' ? <NewOperationDialog data={operationData} /> : <RegistrationDialog title="Añadir evento proyectado" description="Registra ingresos o egresos futuros para el simulador." trigger="Añadir evento">
        <ActionForm action={saveProjectedEvent}>
          <label className="block text-sm">Nombre<input name="name" required maxLength={100} placeholder="Sueldo, gratificación..." className={fieldClass} /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Periodo<input name="expectedYearMonth" type="month" required defaultValue={period} className={fieldClass} /></label><label className="text-sm">Monto<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" className={fieldClass} /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Moneda<select name="currency" className={selectClass}><option value="PEN">PEN</option><option value="USD">USD</option></select></label><label className="text-sm">Categoría<select name="categoryId" className={selectClass}><option value="">Ingreso / sin categoría</option>{categories.filter((category) => category.is_active).map((category) => <option key={category.id} value={category.id}>{category.name} ({category.type === 'INCOME' ? 'Ingreso' : 'Gasto'})</option>)}</select></label></div>
          <label className="flex items-center gap-2 text-sm"><input type="hidden" name="isRecurringMonthly" value="false" /><input type="checkbox" name="isRecurringMonthly" value="true" /> Repetir mensualmente</label>
        </ActionForm>
      </RegistrationDialog>}
    </div>
    <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
      <button type="button" onClick={() => setView('overview')} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${view === 'overview' ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100' : 'border-transparent text-zinc-500'}`}>Resumen real</button>
      <button type="button" onClick={() => setView('projections')} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${view === 'projections' ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100' : 'border-transparent text-zinc-500'}`}>Proyecciones</button>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {(view === 'overview' ? realKpis : projectedKpis).map(({ label, value, detail, icon: Icon, color }) => {
        const breakdown = label === 'Ingresos proyectados'
          ? { details: projectedIncomeDetails, tone: 'income' as const }
          : label === 'Gastos proyectados'
            ? { details: projectedExpenseDetails, tone: 'expense' as const }
            : label === 'Balance proyectado'
              ? { details: projectedBalanceDetails, tone: 'neutral' as const }
              : label === 'Patrimonio proyectado'
                ? { details: [{ label: 'Patrimonio actual', amount: netWorth }, { label: 'Balance proyectado acumulado', amount: projectedTotals.net }], tone: 'neutral' as const }
                : null;
        return <div key={label} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center justify-between"><span className="text-xs font-medium text-zinc-500">{label}</span><Icon className={`h-4 w-4 ${color}`} /></div><p className="mt-3 text-2xl font-bold tracking-tight">{view === 'projections' && breakdown ? <ProjectionBreakdown details={breakdown.details} value={Number(value.replace(/[^\d.-]/g, ''))} tone={breakdown.tone} /> : value}</p><p className="mt-1 text-xs text-zinc-500">{detail}</p></div>;
      })}
    </div>

    {view === 'overview' && <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><PiggyBank className="h-5 w-5" /> Liquidez disponible</h2><p className="text-sm text-zinc-500">Saldo disponible de cuentas convertido a PEN.</p></div><CashToggle includeCash={includeCash} /></div><p className="mt-4 text-2xl font-bold">{money(liquidity)}</p>
    </section>}

    {view === 'overview' && <div className="grid grid-cols-1 gap-6">
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Layers className="h-5 w-5" /> Consumo de presupuestos</h2><span className={`text-sm font-semibold ${budgetPercentage > 100 ? 'text-red-600' : budgetPercentage >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{budgetPercentage}% utilizado</span></div>
        {budgets.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Configura presupuestos desde Mi Mes.</p> : <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60"><p className="text-xs text-zinc-500">Total presupuestado</p><p className="mt-1 text-lg font-semibold">{money(budgetTotals.budget)}</p></div>
            <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60"><p className="text-xs text-zinc-500">Total gastado</p><p className="mt-1 text-lg font-semibold">{money(budgetTotals.usage)}</p></div>
            <div className={`rounded-xl p-3 ${budgetDifference >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}><p className="text-xs text-zinc-500">{budgetDifference >= 0 ? 'Disponible' : 'Excedido'}</p><p className={`mt-1 text-lg font-semibold ${budgetDifference >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{money(Math.abs(budgetDifference))}</p></div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className={`h-full rounded-full ${budgetPercentage > 100 ? 'bg-red-500' : budgetPercentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, budgetPercentage)}%` }} /></div>
          <ul className="mt-5 space-y-4">{budgets.map((budget) => { const percentage = budget.limit_amount_pen > 0 ? Math.round((budget.usage / budget.limit_amount_pen) * 100) : 0; const category = categories.find((item) => item.id === budget.category_id); return <li key={budget.id}><div className="flex justify-between gap-3 text-sm"><span>{category?.name ?? 'Categoría'}</span><span className={percentage > 100 ? 'font-semibold text-red-600' : 'text-zinc-500'}>{money(budget.usage)} / {money(budget.limit_amount_pen)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className={`h-full rounded-full ${percentage > 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, percentage)}%` }} /></div></li>; })}</ul>
        </>}
      </section>

    </div>}
    {view === 'projections' && <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp className="h-5 w-5" /> Proyección de flujo</h2><p className="text-sm text-zinc-500">Selecciona el rango mensual que deseas simular y descargar.</p></div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">Desde<select value={projectionFrom} onChange={(event) => setProjectionFrom(event.target.value)} className={selectClass}>{projections.map((projection) => <option key={projection.period} value={projection.period}>{projection.period}</option>)}</select></label>
            <label className="text-sm">Hasta<select value={projectionTo} onChange={(event) => setProjectionTo(event.target.value)} className={selectClass}>{projections.map((projection) => <option key={projection.period} value={projection.period}>{projection.period}</option>)}</select></label>
            <button type="button" onClick={() => void downloadProjectionPdf()} className={primaryButtonClass}><Download className="h-4 w-4" aria-hidden="true" /> Descargar PDF</button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60"><p className="text-xs text-zinc-500">Liquidez proyectada</p><p className="mt-1 text-lg font-semibold"><ProjectionBreakdown details={projectedLiquidityDetails} value={projectedLiquidity} tone="neutral" /></p><p className="text-xs text-zinc-500">Saldo actual + balance acumulado</p></div>
          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60"><p className="text-xs text-zinc-500">Balance acumulado</p><p className={`mt-1 text-lg font-semibold ${projectedTotals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}><ProjectionBreakdown details={projectedBalanceDetails} value={projectedTotals.net} tone="neutral" /></p><p className="text-xs text-zinc-500">Ingresos menos gastos proyectados</p></div>
        </div>
        <div className="mt-5 space-y-3">{projections.map((projection) => { const inRange = projection.period >= firstProjectionPeriod && projection.period <= lastProjectionPeriod; return <div key={projection.period} className={`grid grid-cols-4 items-center gap-2 rounded-lg px-2 py-2 text-sm ${inRange ? 'bg-zinc-50 dark:bg-zinc-800/60' : 'opacity-50'}`}><span className="font-medium">{projection.period}</span><ProjectionBreakdown details={projection.incomeDetails} value={projection.income} tone="income" /><ProjectionBreakdown details={projection.expenseDetails} value={projection.expenses} tone="expense" /><span className={projection.net >= 0 ? 'text-right text-emerald-600' : 'text-right text-rose-600'}>{money(projection.net)}</span></div>; })}</div>
      </section>
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"><h2 className="text-lg font-semibold">Eventos futuros</h2>{events.length === 0 ? <p className="mt-4 text-sm text-zinc-500">No hay eventos configurados.</p> : <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">{events.map((event) => <li key={event.id} className="flex flex-col gap-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span><span className="font-medium">{event.name}</span><span className="ml-2 text-zinc-500">{event.expected_year_month} · {event.currency} {event.amount.toFixed(2)}{event.categoryName ? ` · ${event.categoryName}` : ' · ingreso'}{event.is_recurring_monthly ? ' · mensual' : ''}</span></span><div className="flex flex-wrap items-center gap-2"><ProjectedEventDialog event={event} period={period} categories={categories} operationData={operationData} mode="edit" /><ProjectedEventDialog event={event} period={period} categories={categories} operationData={operationData} mode="convert" /><ActionForm action={deleteProjectedEvent} submitLabel="Eliminar"><input type="hidden" name="id" value={event.id} /></ActionForm></div></li>)}</ul>}</section>
    </div>}
  </div>;
}
