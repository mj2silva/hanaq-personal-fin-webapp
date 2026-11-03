'use client';

import { useMemo, useState } from 'react';
import { selectClass } from '@/components/activity/styles';
import type { FinancialTrajectoryPoint } from '@/lib/dashboard/calculations';

export type FinancialMetric = 'net' | 'income' | 'expenses' | 'netWorth' | 'liquidity';
export type VisibleSeries = 'both' | 'actual' | 'projected';
type Source = 'actual' | 'projected';

export interface FinancialChartProps {
  data: FinancialTrajectoryPoint[];
  currentPeriod: string;
}

const chartWidth = 720;
const chartHeight = 250;
const chartLeft = 64;
const chartRight = 16;
const chartTop = 16;
const chartBottom = 38;
const plotWidth = chartWidth - chartLeft - chartRight;
const plotHeight = chartHeight - chartTop - chartBottom;

const metricLabels: Record<FinancialMetric, string> = {
  net: 'Balance neto',
  income: 'Ingresos',
  expenses: 'Gastos',
  netWorth: 'Patrimonio',
  liquidity: 'Liquidez',
};

function valueFor(point: FinancialTrajectoryPoint, metric: FinancialMetric, source: Source): number | null {
  if (source === 'actual') {
    switch (metric) {
      case 'net': return point.actualNet;
      case 'income': return point.actualIncome;
      case 'expenses': return point.actualExpenses;
      case 'netWorth': return point.actualNetWorth;
      case 'liquidity': return point.actualLiquidity;
    }
  } else {
    switch (metric) {
      case 'net': return point.projectedNet;
      case 'income': return point.projectedIncome;
      case 'expenses': return point.projectedExpenses;
      case 'netWorth': return point.projectedNetWorth;
      case 'liquidity': return point.projectedLiquidity;
    }
  }
}

function formatPeriod(period: string) {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatMoney(value: number) {
  return `S/ ${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(value)}`;
}

function formatAxisValue(value: number) {
  return new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function buildPath(
  data: FinancialTrajectoryPoint[],
  metric: FinancialMetric,
  source: Source,
  x: (index: number) => number,
  y: (value: number) => number
) {
  let started = false;
  return data
    .map((point, index) => {
      const value = valueFor(point, metric, source);
      if (value === null) {
        started = false;
        return '';
      }
      const command = started ? 'L' : 'M';
      started = true;
      return `${command}${x(index)},${y(value)}`;
    })
    .filter(Boolean)
    .join(' ');
}

export function FinancialChart({ data, currentPeriod }: FinancialChartProps) {
  const [range, setRange] = useState<'6' | '12' | 'all'>('12');
  const [metric, setMetric] = useState<FinancialMetric>('net');
  const [visibleSeries, setVisibleSeries] = useState<VisibleSeries>('both');

  const currentIndex = data.findIndex((point) => point.period === currentPeriod);
  const visibleData = useMemo(() => {
    if (data.length === 0) return [];
    const count = range === 'all' ? data.length : Math.min(Number(range), data.length);
    const anchorIndex = currentIndex < 0 ? 0 : currentIndex;
    const start = Math.max(0, Math.min(anchorIndex - Math.floor((count - 1) / 2), data.length - count));
    return data.slice(start, start + count);
  }, [currentIndex, data, range]);

  const currentVisibleIndex = visibleData.findIndex((point) => point.period === currentPeriod);
  const showActual = visibleSeries !== 'projected';
  const showProjected = visibleSeries !== 'actual';

  const values = visibleData.flatMap((point) => [
    ...(showActual ? [valueFor(point, metric, 'actual')] : []),
    ...(showProjected ? [valueFor(point, metric, 'projected')] : []),
  ]).filter((value): value is number => value !== null && Number.isFinite(value));

  const minimum = values.length ? Math.min(0, ...values) : 0;
  const maximum = values.length ? Math.max(0, ...values) : 1;
  const padding = maximum === minimum ? 1 : (maximum - minimum) * 0.08;
  const domainMinimum = minimum - padding;
  const domainMaximum = maximum + padding;

  const x = (index: number) =>
    chartLeft + (visibleData.length <= 1 ? plotWidth / 2 : (index / (visibleData.length - 1)) * plotWidth);
  const y = (value: number) =>
    chartTop + ((domainMaximum - value) / (domainMaximum - domainMinimum)) * plotHeight;
  const ticks = Array.from({ length: 5 }, (_, index) => domainMaximum - ((domainMaximum - domainMinimum) * index) / 4);
  const labelStep = Math.max(1, Math.ceil(visibleData.length / 6));

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Evolución financiera: real vs. proyectado</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Compara la trayectoria de tus flujos y saldos mensuales en un solo gráfico interactivo.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            Periodo
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as '6' | '12' | 'all')}
              className={selectClass}
            >
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
              <option value="all">Todo el periodo</option>
            </select>
          </label>
          <label className="text-sm">
            Indicador
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as FinancialMetric)}
              className={selectClass}
            >
              <option value="net">Balance neto</option>
              <option value="income">Ingresos</option>
              <option value="expenses">Gastos</option>
              <option value="netWorth">Patrimonio</option>
              <option value="liquidity">Liquidez</option>
            </select>
          </label>
          <label className="text-sm">
            Series
            <select
              value={visibleSeries}
              onChange={(event) => setVisibleSeries(event.target.value as VisibleSeries)}
              className={selectClass}
            >
              <option value="both">Real y proyectado</option>
              <option value="actual">Solo real</option>
              <option value="projected">Solo proyectado</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Leyenda de series">
        {showActual && (
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-5 bg-emerald-500" />
            Real
          </span>
        )}
        {showProjected && (
          <span className="inline-flex items-center gap-2">
            <span className="w-5 border-t-2 border-dashed border-violet-500" />
            Proyectado
          </span>
        )}
        <span className="text-xs text-zinc-500">Valores en PEN</span>
      </div>

      <div className="mt-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`Evolución de ${metricLabels[metric]} real y proyectada por mes`}
          className="h-auto min-w-[560px] w-full"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={chartLeft}
                x2={chartWidth - chartRight}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-zinc-200 dark:stroke-zinc-700"
                strokeDasharray="3 5"
              />
              <text x={chartLeft - 8} y={y(tick) + 4} textAnchor="end" className="fill-zinc-500" fontSize="10">
                {formatAxisValue(tick)}
              </text>
            </g>
          ))}
          {domainMinimum <= 0 && domainMaximum >= 0 && (
            <line
              x1={chartLeft}
              x2={chartWidth - chartRight}
              y1={y(0)}
              y2={y(0)}
              className="stroke-zinc-400 dark:stroke-zinc-500"
            />
          )}
          {currentVisibleIndex >= 0 && (
            <line
              x1={x(currentVisibleIndex)}
              x2={x(currentVisibleIndex)}
              y1={chartTop}
              y2={chartHeight - chartBottom}
              className="stroke-zinc-400 dark:stroke-zinc-500"
              strokeDasharray="3 5"
            />
          )}
          {showActual && (
            <path
              d={buildPath(visibleData, metric, 'actual', x, y)}
              className="fill-none stroke-emerald-500"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {showProjected && (
            <path
              d={buildPath(visibleData, metric, 'projected', x, y)}
              className="fill-none stroke-violet-500"
              strokeWidth="2.5"
              strokeDasharray="6 5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {visibleData.map((point, index) => (
            <g key={point.period}>
              <text x={x(index)} y={chartHeight - 12} textAnchor="middle" className="fill-zinc-500" fontSize="10">
                {index % labelStep === 0 || index === visibleData.length - 1 ? formatPeriod(point.period) : ''}
              </text>
              {showActual && valueFor(point, metric, 'actual') !== null && (
                <circle
                  cx={x(index)}
                  cy={y(valueFor(point, metric, 'actual')!)}
                  r="3.5"
                  className="fill-emerald-500"
                >
                  <title>
                    {formatPeriod(point.period)} · Real: {formatMoney(valueFor(point, metric, 'actual')!)}
                  </title>
                </circle>
              )}
              {showProjected && valueFor(point, metric, 'projected') !== null && (
                <circle
                  cx={x(index)}
                  cy={y(valueFor(point, metric, 'projected')!)}
                  r="3.5"
                  className="fill-violet-500"
                >
                  <title>
                    {formatPeriod(point.period)} · Proyectado: {formatMoney(valueFor(point, metric, 'projected')!)}
                  </title>
                </circle>
              )}
            </g>
          ))}
        </svg>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        El mes actual muestra el acumulado real parcial o saldo a la fecha frente a la proyección de cierre. Las proyecciones reflejan la simulación vigente sin versiones históricas; los saldos acumulados de patrimonio y liquidez no registran histórico previo al mes actual y los importes en moneda extranjera se convierten al tipo de cambio actual.
      </p>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium">Ver detalle por mes ({metricLabels[metric]})</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Mes</th>
                {showActual && <th className="py-2 px-3 font-medium">Real</th>}
                {showProjected && <th className="py-2 px-3 font-medium">Proyectado</th>}
              </tr>
            </thead>
            <tbody>
              {visibleData.map((point) => (
                <tr key={point.period} className="border-t border-zinc-100 dark:border-zinc-800">
                  <th className="py-2 pr-3 font-medium">{formatPeriod(point.period)}</th>
                  {showActual && (
                    <td className="py-2 px-3">
                      {valueFor(point, metric, 'actual') === null
                        ? '—'
                        : formatMoney(valueFor(point, metric, 'actual')!)}
                    </td>
                  )}
                  {showProjected && (
                    <td className="py-2 px-3">
                      {valueFor(point, metric, 'projected') === null
                        ? '—'
                        : formatMoney(valueFor(point, metric, 'projected')!)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
