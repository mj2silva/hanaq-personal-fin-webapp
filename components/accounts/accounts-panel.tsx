'use client';

import { useActionState } from 'react';
import { createAccount, createCreditCard, createInvestment, createLoan, recordInvestmentLog, reconstructLoanHistory, type AccountsActionState } from '@/app/(app)/cuentas/actions';
import type { Tables } from '@/types/database.types';
import { EditAccountDialog } from '@/components/accounts/edit-account-dialog';
import { EditCardDialog } from '@/components/accounts/edit-card-dialog';
import { EditLoanRatesDialog } from '@/components/accounts/edit-loan-rates-dialog';
import { RegistrationDialog } from '@/components/accounts/registration-dialog';
import { calculateCardLineUsage, calculateCreditCardTotals } from '@/lib/accounts/credit-card-calculations';

type Account = Tables<'accounts'>;
type Card = Tables<'credit_cards'> & {
  monthlySpend: number | null;
  annualSpend: number | null;
  monthlySpendUsd: number;
  annualSpendUsd: number;
  monthlySpendRequiresRate: boolean;
  annualSpendRequiresRate: boolean;
};
type Loan = Tables<'loans'>;
type Investment = Tables<'investments'>;

const initialState: AccountsActionState = {};
const input = 'mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100';
const select = `${input} bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100`;

function Message({ state }: { state: AccountsActionState }) {
  if (!state.error && !state.success) return null;
  return <p className={state.error ? 'text-sm text-red-600' : 'text-sm text-emerald-600'} role="status">{state.error ?? state.success}</p>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"><h2 className="text-lg font-semibold">{title}</h2>{children}</section>;
}

function LoanHistoryReview({ loan }: { loan: Loan }) {
  const [state, action, pending] = useActionState(reconstructLoanHistory, {});
  const money = (value: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: loan.currency }).format(value);
  return <form action={action} className="mt-3 space-y-2 text-xs">
    <input type="hidden" name="loanId" value={loan.id} />
    <p>La estimación usa la TEA actual y un mes por pago. Es una aproximación; contrástala con el banco.</p>
    {state.estimatedBalance !== undefined && state.previousBalance !== undefined && <p>Saldo actual: {money(state.previousBalance)} · Saldo estimado: {money(state.estimatedBalance)}</p>}
    <Message state={state} />
    {state.estimatedBalance !== undefined
      ? <button name="apply" value="true" disabled={pending} className="underline">{pending ? 'Aplicando...' : 'Confirmar saldo estimado'}</button>
      : <button disabled={pending} className="underline">{pending ? 'Calculando...' : 'Revisar pagos anteriores'}</button>}
  </form>;
}

export function AccountsPanel({ accounts, cards, loans, investments, exchangeRate }: {
  accounts: Account[];
  cards: Card[];
  loans: Loan[];
  investments: Investment[];
  exchangeRate: number | null;
}) {
  const [accountState, accountAction, accountPending] = useActionState(createAccount, initialState);
  const [cardState, cardAction, cardPending] = useActionState(createCreditCard, initialState);
  const [loanState, loanAction, loanPending] = useActionState(createLoan, initialState);
  const [investmentState, investmentAction, investmentPending] = useActionState(createInvestment, initialState);
  const [logState, logAction, logPending] = useActionState(recordInvestmentLog, initialState);
  const money = (value: number | null, currency: string) => value === null
    ? 'No disponible'
    : new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(value);
  const creditTotals = calculateCreditCardTotals(cards, exchangeRate);
  const creditUsage = creditTotals.usagePercentage;
  const requiresReferenceRate = creditTotals.requiresReferenceRate
    || cards.some((card) => card.monthlySpendRequiresRate || card.annualSpendRequiresRate);

  return <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Bancos y efectivo">
        <div className="mt-4 space-y-3">
          {accounts.length === 0 && <p className="text-sm text-zinc-500">No hay cuentas registradas.</p>}
          {accounts.map((account) => <div key={account.id} className="flex items-center justify-between rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60"><div><p className="font-medium">{account.name}</p><p className="text-xs text-zinc-500">{account.type === 'CASH_BOX' ? 'Caja de efectivo' : account.bank_name ?? 'Cuenta bancaria'}{account.trea_percentage ? ` · TREA ${account.trea_percentage}%` : ''}</p></div><div className="flex items-center gap-4"><p className="font-semibold">{money(account.current_balance, account.currency)}</p><EditAccountDialog account={account} /></div></div>)}
        </div>
        <div className="mt-5 flex justify-end">
          <RegistrationDialog title="Registrar cuenta" description="Añade una cuenta bancaria o caja de efectivo." trigger="Añadir cuenta">
            <form action={accountAction} className="grid gap-3 sm:grid-cols-2">
              <input name="name" required placeholder="Nombre de cuenta" className={input} />
              <select name="type" className={select}><option value="BANK_ACCOUNT">Cuenta bancaria</option><option value="CASH_BOX">Caja de efectivo</option></select>
              <input name="bankName" placeholder="Banco (opcional)" className={input} />
              <select name="currency" className={select}><option value="PEN">PEN</option><option value="USD">USD</option></select>
              <input name="balance" required type="number" min="0" step="0.01" placeholder="Saldo inicial" className={input} />
              <input name="trea" required type="number" min="0" max="100" step="0.01" placeholder="TREA %" className={input} />
              <div className="sm:col-span-2 flex items-center justify-between gap-3"><Message state={accountState} /><button disabled={accountPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{accountPending ? 'Guardando...' : 'Añadir cuenta'}</button></div>
            </form>
          </RegistrationDialog>
        </div>
      </Section>

      <Section title="Tarjetas de crédito">
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="flex min-h-[116px] flex-col rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
            <p className="min-h-8 text-xs leading-4 text-zinc-500">Línea total equivalente</p>
            <p className="mt-auto text-xl font-semibold tabular-nums">{money(creditTotals.limitPen, 'PEN')}</p>
          </div>
          <div className="flex min-h-[116px] flex-col rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
            <p className="min-h-8 text-xs leading-4 text-zinc-500">Deuda total equivalente</p>
            <p className="mt-auto text-xl font-semibold tabular-nums">{money(creditTotals.debtPen, 'PEN')}</p>
          </div>
          <div className={`flex min-h-[116px] flex-col rounded-xl p-4 ${creditTotals.availablePen === null ? 'bg-zinc-50 dark:bg-zinc-800/60' : creditTotals.availablePen >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            <p className="min-h-8 text-xs leading-4 text-zinc-500">{creditUsage === null ? 'Disponible equivalente' : `Disponible · ${creditUsage.toFixed(1)}% usado`}</p>
            <p className={`mt-auto text-xl font-semibold tabular-nums ${creditTotals.availablePen === null ? 'text-zinc-500' : creditTotals.availablePen >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{money(creditTotals.availablePen, 'PEN')}</p>
          </div>
        </div>
        {creditUsage !== null && cards.length > 0 && <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"><div className={`h-full rounded-full ${creditUsage >= 100 ? 'bg-red-500' : creditUsage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, creditUsage)}%` }} /></div>}
        {requiresReferenceRate && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" role="status">Configura el tipo de cambio referencial USD/PEN en Configuración para calcular los equivalentes y la utilización que requieren conversión. Las deudas originales se mantienen visibles por moneda.</p>}
        <div className="mt-4 space-y-3">
          {cards.length === 0 && <p className="text-sm text-zinc-500">No hay tarjetas registradas.</p>}
          {cards.map((card) => {
            const lineUsage = calculateCardLineUsage(card, exchangeRate);
            const alertThreshold = card.credit_limit_alert_percentage;
            const isAlert = lineUsage.usagePercentage !== null && lineUsage.usagePercentage >= alertThreshold;
            const exemptionTarget = card.exemption_min_amount ?? 0;
            const exemptionSpend = card.exemption_rule === 'MIN_MONTHLY_SPEND'
              ? card.monthlySpend
              : card.exemption_rule === 'MIN_ANNUAL_SPEND'
                ? card.annualSpend
                : null;
            const exemptionRequiresRate = card.exemption_rule === 'MIN_MONTHLY_SPEND'
              ? card.monthlySpendRequiresRate
              : card.exemption_rule === 'MIN_ANNUAL_SPEND'
                ? card.annualSpendRequiresRate
                : false;
            const exemptionProgress = exemptionTarget > 0 && exemptionSpend !== null
              ? Math.min(100, (exemptionSpend / exemptionTarget) * 100)
              : null;
            return <div key={card.id} className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{card.name}</p>
                  <p className="text-xs text-zinc-500">{card.bank_name ?? 'Tarjeta de crédito'}</p>
                </div>
                <EditCardDialog card={card} />
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <p>Deuda PEN: <span className="font-medium">{money(card.current_debt_pen, 'PEN')}</span></p>
                <p>Deuda USD: <span className="font-medium">{money(card.current_debt_usd, 'USD')}</span></p>
                <p>Línea: <span className="font-medium">{money(card.credit_limit_amount, card.credit_limit_currency)} {card.credit_limit_currency}</span></p>
                <p>Disponible: <span className="font-medium">{lineUsage.available === null ? 'Requiere tipo referencial' : money(lineUsage.available, card.credit_limit_currency)}</span></p>
                <p>Consumo del mes equivalente PEN: <span className="font-medium">{card.monthlySpendRequiresRate ? 'Requiere tipo referencial' : money(card.monthlySpend, 'PEN')}</span></p>
                <p>Consumo USD del mes: <span className="font-medium">{money(card.monthlySpendUsd, 'USD')}</span></p>
                <p>Consumo del año equivalente PEN: <span className="font-medium">{card.annualSpendRequiresRate ? 'Requiere tipo referencial' : money(card.annualSpend, 'PEN')}</span></p>
                <p>Consumo USD del año: <span className="font-medium">{money(card.annualSpendUsd, 'USD')}</span></p>
                <p>Corte: <span className="font-medium">día {card.closing_day}</span> · Pago: <span className="font-medium">día {card.payment_due_day}</span></p>
                <p>Desgravamen: <span className="font-medium">{card.desgravamen_rate}% · máximo {money(card.desgravamen_max_pen, 'PEN')}</span></p>
                <p className="sm:col-span-2">{card.has_annual_fee
                  ? `Membresía anual: ${money(card.annual_fee_amount, card.annual_fee_currency ?? 'PEN')} · ${card.annual_fee_month ? `mes ${card.annual_fee_month}` : 'mes no definido'}`
                  : 'Sin membresía anual'}</p>
              </div>
              {lineUsage.usagePercentage !== null && <div className="mt-3">
                <div className="flex justify-between text-xs text-zinc-500"><span>{lineUsage.usagePercentage.toFixed(1)}% utilizado</span><span>Alerta {alertThreshold}%</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"><div className={`h-full rounded-full ${isAlert ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, lineUsage.usagePercentage)}%` }} /></div>
              </div>}
              {isAlert && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">La utilización alcanzó el umbral de alerta de esta tarjeta.</p>}
              {card.exemption_rule !== 'NONE' && <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                <p>Exoneración de membresía: {exemptionRequiresRate
                  ? 'requiere el tipo referencial para calcular el consumo equivalente.'
                  : exemptionSpend === null
                    ? 'consumo no disponible.'
                    : `${money(exemptionSpend, 'PEN')} de ${money(exemptionTarget, 'PEN')} (${exemptionProgress?.toFixed(1) ?? '0.0'}%).`}</p>
                {exemptionProgress !== null && <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${exemptionProgress}%` }} /></div>}
              </div>}
            </div>;
          })}
        </div>
        <div className="mt-5 flex justify-end">
          <RegistrationDialog title="Registrar tarjeta" description="Añade una tarjeta con línea y deuda en PEN/USD." trigger="Añadir tarjeta">
            <form action={cardAction} className="grid gap-3 sm:grid-cols-2">
              <input name="name" required placeholder="Nombre de tarjeta" className={input} />
              <input name="bankName" placeholder="Banco" className={input} />
              <select name="limitCurrency" className={select}><option value="PEN">Línea en PEN</option><option value="USD">Línea en USD</option></select>
              <input name="limitAmount" required type="number" min="0" step="0.01" placeholder="Línea de crédito" className={input} />
              <input name="alertPercentage" required type="number" min="0" max="100" step="1" defaultValue="70" placeholder="Alerta de utilización %" className={input} />
              <input name="debtPen" required type="number" min="0" step="0.01" placeholder="Deuda PEN" className={input} />
              <input name="debtUsd" required type="number" min="0" step="0.01" placeholder="Deuda USD" className={input} />
              <input name="closingDay" required type="number" min="1" max="31" placeholder="Día de cierre" className={input} />
              <input name="paymentDueDay" required type="number" min="1" max="31" placeholder="Día de pago" className={input} />
              <input name="desgravamenRate" required type="number" min="0" step="0.0001" placeholder="Desgravamen %" className={input} />
              <input name="desgravamenMaxPen" required type="number" min="0" step="0.01" placeholder="Tope desgravamen PEN" className={input} />
              <input name="exemptionMinAmount" required type="number" min="0" step="0.01" placeholder="Meta exoneración" className={input} />
              <select name="exemptionRule" className={select}><option value="NONE">Sin exoneración</option><option value="MIN_MONTHLY_SPEND">Consumo mensual mínimo</option><option value="MIN_ANNUAL_SPEND">Consumo anual mínimo</option></select>
              <div className="sm:col-span-2 flex items-center justify-between gap-3"><Message state={cardState} /><button disabled={cardPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{cardPending ? 'Guardando...' : 'Añadir tarjeta'}</button></div>
            </form>
          </RegistrationDialog>
        </div>
      </Section>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Préstamos activos">
        <div className="mt-4 space-y-3">
          {loans.length === 0 && <p className="text-sm text-zinc-500">No hay préstamos registrados.</p>}
          {loans.map((loan) => (
            <div key={loan.id} className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{loan.lender_name}</p>
                  <p className="text-xs text-zinc-500">
                    {loan.remaining_installments}/{loan.total_installments} cuotas · TEA {loan.tea_percentage}%{loan.tcea_percentage !== null ? ` · TCEA ${loan.tcea_percentage}%` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">{money(loan.current_balance, loan.currency)}</p>
                    <p className="text-xs text-zinc-500">{money(loan.monthly_installment_amount, loan.currency)} / mes</p>
                  </div>
                  <EditLoanRatesDialog loan={loan} />
                </div>
              </div>
              <LoanHistoryReview loan={loan} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <RegistrationDialog title="Registrar préstamo" description="Añade el saldo, tasa y cronograma del préstamo." trigger="Añadir préstamo">
            <form action={loanAction} className="grid gap-3 sm:grid-cols-2">
              <input name="lenderName" required placeholder="Acreedor" className={input} />
              <select name="currency" className={select}><option value="PEN">PEN</option><option value="USD">USD</option></select>
              <input name="initialAmount" required type="number" min="0" step="0.01" placeholder="Monto inicial" className={input} />
              <input name="currentBalance" required type="number" min="0" step="0.01" placeholder="Saldo actual" className={input} />
              <input name="tea" required type="number" min="0" step="0.01" placeholder="TEA %" className={input} />
              <label className="text-sm">TCEA % (opcional)<input name="tcea" type="number" min="0" max="100" step="0.01" placeholder="Costo total informativo" className={input} /></label>
              <input name="monthlyInstallment" required type="number" min="0" step="0.01" placeholder="Cuota mensual" className={input} />
              <input name="totalInstallments" required type="number" min="1" placeholder="Total cuotas" className={input} />
              <input name="remainingInstallments" required type="number" min="0" placeholder="Cuotas restantes" className={input} />
              <input name="paymentDueDay" required type="number" min="1" max="31" placeholder="Día de pago" className={input} />
              <div className="flex items-center justify-between gap-3"><Message state={loanState} /><button disabled={loanPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{loanPending ? '...' : 'Guardar préstamo'}</button></div>
            </form>
          </RegistrationDialog>
        </div>
      </Section>

      <Section title="Portafolio de inversiones">
        <div className="mt-4 space-y-3">
          {investments.length === 0 && <p className="text-sm text-zinc-500">No hay inversiones registradas.</p>}
          {investments.map((investment) => <div key={investment.id} className="flex items-center justify-between rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60"><div><p className="font-medium">{investment.name}</p><p className="text-xs text-zinc-500">Capital {money(investment.initial_capital, investment.currency)} · TC {exchangeRate?.toFixed(4) ?? 'No configurado'}</p></div><p className="font-semibold">{money(investment.current_value, investment.currency)}</p></div>)}
        </div>
        <div className="mt-5 flex justify-end">
          <RegistrationDialog title="Registrar inversión" description="Añade un instrumento y su capital inicial." trigger="Añadir inversión">
            <form action={investmentAction} className="grid gap-3 sm:grid-cols-2">
              <input name="name" required placeholder="Nombre de inversión" className={input} />
              <select name="currency" className={select}><option value="PEN">PEN</option><option value="USD">USD</option></select>
              <input name="capital" required type="number" min="0" step="0.01" placeholder="Capital inicial" className={input} />
              <div className="flex items-center justify-between gap-3"><Message state={investmentState} /><button disabled={investmentPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{investmentPending ? '...' : 'Guardar inversión'}</button></div>
            </form>
          </RegistrationDialog>
        </div>
        {investments.length > 0 && <div className="mt-4 flex justify-end">
          <RegistrationDialog title="Registrar rendimiento" description="Registra la ganancia o pérdida de un periodo." trigger="Añadir rendimiento">
            <form action={logAction} className="grid gap-3 sm:grid-cols-2">
              <select name="investmentId" className={select}>{investments.map((investment) => <option key={investment.id} value={investment.id}>{investment.name}</option>)}</select>
              <input name="period" required type="month" className={input} />
              <input name="profitOrLoss" required type="number" step="0.01" placeholder="Ganancia / pérdida" className={input} />
              <div className="sm:col-span-2 flex items-center justify-between gap-3"><Message state={logState} /><button disabled={logPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{logPending ? '...' : 'Guardar rendimiento'}</button></div>
            </form>
          </RegistrationDialog>
        </div>}
      </Section>
    </div>
  </div>;
}
