'use client';

import { useActionState } from 'react';
import { createAccount, createCreditCard, createInvestment, createLoan, recordInvestmentLog, type AccountsActionState } from '@/app/(app)/cuentas/actions';
import type { Tables } from '@/types/database.types';
import { EditAccountDialog } from '@/components/accounts/edit-account-dialog';
import { EditCardDialog } from '@/components/accounts/edit-card-dialog';
import { RegistrationDialog } from '@/components/accounts/registration-dialog';

type Account = Tables<'accounts'>;
type Card = Tables<'credit_cards'> & { monthlySpend: number; annualSpend: number; monthlySpendUsd: number; annualSpendUsd: number };
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

export function AccountsPanel({ accounts, cards, loans, investments, exchangeRate }: { accounts: Account[]; cards: Card[]; loans: Loan[]; investments: Investment[]; exchangeRate: number }) {
  const [accountState, accountAction, accountPending] = useActionState(createAccount, initialState);
  const [cardState, cardAction, cardPending] = useActionState(createCreditCard, initialState);
  const [loanState, loanAction, loanPending] = useActionState(createLoan, initialState);
  const [investmentState, investmentAction, investmentPending] = useActionState(createInvestment, initialState);
  const [logState, logAction, logPending] = useActionState(recordInvestmentLog, initialState);
  const money = (value: number, currency: string) => new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(value);

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
        <div className="mt-4 space-y-3">
          {cards.length === 0 && <p className="text-sm text-zinc-500">No hay tarjetas registradas.</p>}
          {cards.map((card) => { const usedPen = card.credit_limit_pen ? (card.current_debt_pen / card.credit_limit_pen) * 100 : 0; const usedUsd = card.credit_limit_usd ? (card.current_debt_usd / card.credit_limit_usd) * 100 : 0; const desgravamen = Math.min(card.current_debt_pen * card.desgravamen_rate, card.desgravamen_max_pen); const spend = card.exemption_rule === 'MIN_ANNUAL_SPEND' ? card.annualSpend : card.monthlySpend; const progress = card.exemption_rule === 'NONE' || !card.exemption_min_amount ? 0 : Math.min(100, (spend / card.exemption_min_amount) * 100); return <div key={card.id} className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60"><div className="flex justify-between"><div><p className="font-medium">{card.name}</p><p className="text-xs text-zinc-500">{card.bank_name ?? 'Tarjeta'} · Corte día {card.closing_day} · Pago día {card.payment_due_day}</p></div><div className="flex items-center gap-4"><p className="font-semibold">{money(card.current_debt_pen, 'PEN')}</p><EditCardDialog card={card} /></div></div><div className="mt-2 text-xs text-zinc-500">Líneas: PEN {card.credit_limit_pen.toFixed(2)} ({usedPen.toFixed(0)}% usado) · USD {card.credit_limit_usd.toFixed(2)} ({usedUsd.toFixed(0)}% usado)</div><div className="mt-2 flex justify-between text-xs text-zinc-500"><span>Deuda USD {card.current_debt_usd.toFixed(2)}</span><span>Desgravamen {money(desgravamen, 'PEN')}</span></div>{card.exemption_rule !== 'NONE' && <><div className="mt-3 flex justify-between text-xs text-zinc-500"><span>Exoneración {card.exemption_rule === 'MIN_ANNUAL_SPEND' ? 'anual' : 'mensual'}</span><span>{spend.toFixed(2)} / {card.exemption_min_amount?.toFixed(2)}</span></div><div className="mt-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></div></>}</div> })}
        </div>
        <div className="mt-5 flex justify-end">
          <RegistrationDialog title="Registrar tarjeta" description="Añade una tarjeta con línea y deuda en PEN/USD." trigger="Añadir tarjeta">
          <form action={cardAction} className="grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Nombre de tarjeta" className={input} /><input name="bankName" placeholder="Banco" className={input} />
          <input name="limitPen" required type="number" min="0" step="0.01" placeholder="Línea PEN" className={input} /><input name="limitUsd" required type="number" min="0" step="0.01" placeholder="Línea USD" className={input} /><input name="debtPen" required type="number" min="0" step="0.01" placeholder="Deuda PEN" className={input} />
          <input name="debtUsd" required type="number" min="0" step="0.01" placeholder="Deuda USD" className={input} /><input name="closingDay" required type="number" min="1" max="31" placeholder="Día de cierre" className={input} />
          <input name="paymentDueDay" required type="number" min="1" max="31" placeholder="Día de pago" className={input} /><input name="desgravamenRate" required type="number" min="0" step="0.0001" placeholder="Desgravamen %" className={input} />
          <input name="desgravamenMaxPen" required type="number" min="0" step="0.01" placeholder="Tope desgravamen PEN" className={input} /><input name="exemptionMinAmount" required type="number" min="0" step="0.01" placeholder="Meta exoneración" className={input} />
          <select name="exemptionRule" className={select}><option value="NONE">Sin exoneración</option><option value="MIN_MONTHLY_SPEND">Consumo mensual mínimo</option><option value="MIN_ANNUAL_SPEND">Consumo anual mínimo</option></select>
          <div className="sm:col-span-2 flex items-center justify-between gap-3"><Message state={cardState} /><button disabled={cardPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{cardPending ? 'Guardando...' : 'Añadir tarjeta'}</button></div>
          </form>
          </RegistrationDialog>
        </div>
      </Section>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Préstamos activos">
        <div className="mt-4 space-y-3">{loans.length === 0 && <p className="text-sm text-zinc-500">No hay préstamos registrados.</p>}{loans.map((loan) => <div key={loan.id} className="flex items-center justify-between rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60"><div><p className="font-medium">{loan.lender_name}</p><p className="text-xs text-zinc-500">{loan.remaining_installments}/{loan.total_installments} cuotas · TEA {loan.tea_percentage}%</p></div><div className="text-right"><p className="font-semibold">{money(loan.current_balance, loan.currency)}</p><p className="text-xs text-zinc-500">{money(loan.monthly_installment_amount, loan.currency)} / mes</p></div></div>)}</div>
        <div className="mt-5 flex justify-end"><RegistrationDialog title="Registrar préstamo" description="Añade el saldo, tasa y cronograma del préstamo." trigger="Añadir préstamo"><form action={loanAction} className="grid gap-3 sm:grid-cols-2"><input name="lenderName" required placeholder="Acreedor" className={input} /><select name="currency" className={select}><option value="PEN">PEN</option><option value="USD">USD</option></select><input name="initialAmount" required type="number" min="0" step="0.01" placeholder="Monto inicial" className={input} /><input name="currentBalance" required type="number" min="0" step="0.01" placeholder="Saldo actual" className={input} /><input name="tea" required type="number" min="0" step="0.01" placeholder="TEA %" className={input} /><input name="monthlyInstallment" required type="number" min="0" step="0.01" placeholder="Cuota mensual" className={input} /><input name="totalInstallments" required type="number" min="1" placeholder="Total cuotas" className={input} /><input name="remainingInstallments" required type="number" min="0" placeholder="Cuotas restantes" className={input} /><input name="paymentDueDay" required type="number" min="1" max="31" placeholder="Día de pago" className={input} /><div className="flex items-center justify-between gap-3"><Message state={loanState} /><button disabled={loanPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{loanPending ? '...' : 'Guardar préstamo'}</button></div></form></RegistrationDialog></div>
      </Section>
      <Section title="Portafolio de inversiones">
        <div className="mt-4 space-y-3">{investments.length === 0 && <p className="text-sm text-zinc-500">No hay inversiones registradas.</p>}{investments.map((investment) => <div key={investment.id} className="flex items-center justify-between rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60"><div><p className="font-medium">{investment.name}</p><p className="text-xs text-zinc-500">Capital {money(investment.initial_capital, investment.currency)} · TC {exchangeRate.toFixed(4)}</p></div><p className="font-semibold">{money(investment.current_value, investment.currency)}</p></div>)}</div>
        <div className="mt-5 flex justify-end"><RegistrationDialog title="Registrar inversión" description="Añade un instrumento y su capital inicial." trigger="Añadir inversión"><form action={investmentAction} className="grid gap-3 sm:grid-cols-2"><input name="name" required placeholder="Nombre de inversión" className={input} /><select name="currency" className={select}><option value="PEN">PEN</option><option value="USD">USD</option></select><input name="capital" required type="number" min="0" step="0.01" placeholder="Capital inicial" className={input} /><div className="flex items-center justify-between gap-3"><Message state={investmentState} /><button disabled={investmentPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{investmentPending ? '...' : 'Guardar inversión'}</button></div></form></RegistrationDialog></div>
        {investments.length > 0 && <div className="mt-4 flex justify-end"><RegistrationDialog title="Registrar rendimiento" description="Registra la ganancia o pérdida de un periodo." trigger="Añadir rendimiento"><form action={logAction} className="grid gap-3 sm:grid-cols-2"><select name="investmentId" className={select}>{investments.map((investment) => <option key={investment.id} value={investment.id}>{investment.name}</option>)}</select><input name="period" required type="month" className={input} /><input name="profitOrLoss" required type="number" step="0.01" placeholder="Ganancia / pérdida" className={input} /><div className="sm:col-span-2 flex items-center justify-between gap-3"><Message state={logState} /><button disabled={logPending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{logPending ? '...' : 'Guardar rendimiento'}</button></div></form></RegistrationDialog></div>}
      </Section>
    </div>
  </div>;
}
