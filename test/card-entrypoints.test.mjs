import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as calculations from '../lib/activity/calculations.ts';

const require = createRequire(import.meta.url);
const userId = '10000000-0000-4000-8000-000000000001';
const cardId = '20000000-0000-4000-8000-000000000001';
const accountId = '30000000-0000-4000-8000-000000000001';
const destinationId = '30000000-0000-4000-8000-000000000002';
const eventId = '40000000-0000-4000-8000-000000000001';
const categoryId = '50000000-0000-4000-8000-000000000001';
const transactionId = '60000000-0000-4000-8000-000000000001';

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

function harness(path, rpcError = null) {
  const calls = [];
  const writes = [];
  const revalidated = [];
  const rows = {
    credit_cards: { closing_day: 15, default_tea: 24 },
    projected_events: { id: eventId, name: 'Evento', amount: 120, currency: 'USD', category_id: categoryId, is_active: true },
    categories: { type: 'EXPENSE' },
    fixed_expenses_template: { name: 'Gasto fijo', category_id: categoryId, currency: 'USD' },
    monthly_fixed_checklist: null,
  };
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: rpcError ? null : transactionId, error: rpcError };
    },
    from(table) {
      const query = {
        select() { return this; },
        eq() { return this; },
        update(payload) { writes.push({ table, payload }); return this; },
        insert(payload) { writes.push({ table, payload }); return this; },
        maybeSingle: async () => ({ data: rows[table], error: null }),
        then(resolve) { return Promise.resolve({ error: null }).then(resolve); },
      };
      return query;
    },
  };
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const actions = {};
  const imports = (name) => {
    if (name === 'next/cache') return { revalidatePath: (value) => revalidated.push(value) };
    if (name === '@/lib/supabase/server') return { createClient: async () => supabase };
    if (name === '@/lib/activity/calculations') return calculations;
    return require(name);
  };
  new Function('require', 'exports', compiled)(imports, actions);
  return { actions, calls, writes, revalidated };
}

test('Activity card expense keeps installments and splits without sending a real rate', async () => {
  const { actions, calls } = harness('../app/(app)/actividad/actions.ts');
  const result = await actions.createOperation(null, form({
    type: 'EXPENSE', date: '2026-03-16', amount: '120', currency: 'USD', creditCardId: cardId,
    exchangeRate: 'not a rate', installments: '3', installmentMode: 'DEFAULT',
    splitDebtor: ['Ana', 'Luis'], splitAmount: ['20', '30'],
  }));
  assert.ok(result.success, result.error);
  assert.equal(calls[0].name, 'create_transaction');
  const args = calls[0].args;
  assert.equal(args.p_currency, 'USD');
  assert.equal(args.p_amount, 120);
  assert.equal(args.p_applied_exchange_rate, undefined);
  assert.equal(args.p_installments, 3);
  assert.equal(args.p_installment_tea, 24);
  assert.equal(args.p_installment_start_period, '2026-04');
  assert.equal(args.p_installment_principal, 40);
  assert.ok(args.p_installment_interest > 0);
  assert.deepEqual(args.p_splits, [{ debtor_name: 'Ana', amount_owed: 20 }, { debtor_name: 'Luis', amount_owed: 30 }]);
});

test('Activity retains submitted actual rates for transfers and payments', async () => {
  const { actions, calls } = harness('../app/(app)/actividad/actions.ts');
  for (const fields of [
    { type: 'TRANSFER', accountId, destinationAccountId: destinationId },
    { type: 'CC_PAYMENT', accountId, creditCardId: cardId, currency: 'USD' },
    { type: 'LOAN_PAYMENT', accountId, loanId: eventId },
  ]) {
    const result = await actions.createOperation(null, form({ ...fields, date: '2026-03-16', amount: '10', exchangeRate: '3.2' }));
    assert.ok(result.success, result.error);
    assert.equal(calls.at(-1).args.p_applied_exchange_rate, 3.2);
  }
});

test('Dashboard converts projected card expenses without forwarding a submitted rate', async () => {
  const { actions, calls, writes } = harness('../app/(app)/dashboard/actions.ts');
  const result = await actions.convertProjectedEvent(null, form({ eventId, date: '2026-03-16', creditCardId: cardId, exchangeRate: 'not a rate' }));
  assert.ok(result.success, result.error);
  assert.equal(calls[0].name, 'create_transaction');
  assert.equal(calls[0].args.p_currency, 'USD');
  assert.equal(calls[0].args.p_amount, 120);
  assert.equal(calls[0].args.p_credit_card_id, cardId);
  assert.equal(calls[0].args.p_applied_exchange_rate, undefined);
  assert.equal(writes[0].payload.is_active, false);
});

test('Mi Mes sends fixed card expenses in their original currency without a rate', async () => {
  const { actions, calls, writes } = harness('../app/(app)/mi-mes/actions.ts');
  const result = await actions.payFixedExpense(null, form({ fixedExpenseId: eventId, period: '2026-03', actualAmount: '120', creditCardId: cardId }));
  assert.ok(result.success, result.error);
  assert.equal(calls[0].name, 'create_transaction');
  assert.equal(calls[0].args.p_currency, 'USD');
  assert.equal(calls[0].args.p_amount, 120);
  assert.equal(calls[0].args.p_credit_card_id, cardId);
  assert.equal(calls[0].args.p_applied_exchange_rate, undefined);
  assert.equal(writes[0].payload.transaction_id, transactionId);
});

test('all card entrypoints surface limit errors without completing follow-up writes', async () => {
  const rpcError = { code: 'P0001', message: 'Debes configurar el tipo de cambio.' };
  const activity = harness('../app/(app)/actividad/actions.ts', rpcError);
  const dashboard = harness('../app/(app)/dashboard/actions.ts', rpcError);
  const month = harness('../app/(app)/mi-mes/actions.ts', rpcError);
  const results = await Promise.all([
    activity.actions.createOperation(null, form({ type: 'EXPENSE', date: '2026-03-16', amount: '10', currency: 'USD', creditCardId: cardId })),
    dashboard.actions.convertProjectedEvent(null, form({ eventId, date: '2026-03-16', creditCardId: cardId })),
    month.actions.payFixedExpense(null, form({ fixedExpenseId: eventId, period: '2026-03', actualAmount: '10', creditCardId: cardId })),
  ]);
  for (const result of results) assert.equal(result.error, rpcError.message);
  assert.equal(dashboard.writes.length, 0);
  assert.equal(month.writes.length, 0);
});