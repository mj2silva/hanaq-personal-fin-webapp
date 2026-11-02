import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const activityCalculations = await import('../lib/activity/calculations.ts');
const calculationSource = require('node:fs').readFileSync(
  new URL('../lib/accounts/credit-card-calculations.ts', import.meta.url),
  'utf8'
).replace("from '../activity/calculations';", "from '../activity/calculations.ts';");
const calculationModule = {};
const calculationImports = (name) => name === '../activity/calculations.ts' ? activityCalculations : require(name);
new Function('require', 'exports', ts.transpileModule(calculationSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(calculationImports, calculationModule);
const { calculateCardLineUsage, calculateCardSpending, calculateCreditCardTotals } = calculationModule;

function card(overrides = {}) {
  return {
    credit_limit_amount: 1000,
    credit_limit_currency: 'PEN',
    current_debt_pen: 200,
    current_debt_usd: 0,
    ...overrides,
  };
}

function actionHarness() {
  const revalidated = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-id' } }, error: null }) },
    from() {
      return {
        upsert() { return this; },
        then(resolve) { return Promise.resolve({ error: null }).then(resolve); },
      };
    },
  };
  const source = require('node:fs').readFileSync(
    new URL('../app/(app)/configuracion/actions.ts', import.meta.url),
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const actions = {};
  const imports = (name) => {
    if (name === 'next/cache') return { revalidatePath: (path) => revalidated.push(path) };
    if (name === '@/lib/supabase/server') return { createClient: async () => supabase };
    return require(name);
  };
  new Function('require', 'exports', compiled)(imports, actions);
  return { actions, revalidated };
}

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function renderAccountsPanel(cardProps, exchangeRate) {
  const source = require('node:fs').readFileSync(
    new URL('../components/accounts/accounts-panel.tsx', import.meta.url),
    'utf8'
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  const EmptyDialog = ({ children }) => children ?? null;
  const imports = (name) => {
    if (name === 'react') return { useActionState: () => [{}, () => {}, false] };
    if (name === 'react/jsx-runtime') {
      const createElement = (type, props) => ({ type, props });
      return { Fragment: Symbol.for('react.fragment'), jsx: createElement, jsxs: createElement };
    }
    if (name === '@/app/(app)/cuentas/actions') {
      return Object.fromEntries(['createAccount', 'createCreditCard', 'createInvestment', 'createLoan', 'recordInvestmentLog'].map((action) => [action, () => {}]));
    }
    if (name === '@/components/accounts/edit-account-dialog' || name === '@/components/accounts/edit-card-dialog' || name === '@/components/accounts/registration-dialog') {
      return { EditAccountDialog: EmptyDialog, EditCardDialog: EmptyDialog, RegistrationDialog: EmptyDialog };
    }
    if (name === '@/lib/accounts/credit-card-calculations') return {
      calculateCardLineUsage,
      calculateCreditCardTotals,
    };
    return require(name);
  };
  new Function('require', 'exports', compiled)(imports, exports);

  function resolve(node) {
    if (Array.isArray(node)) return node.map(resolve);
    if (!node || typeof node !== 'object' || !node.type) return node;
    if (typeof node.type === 'function') return resolve(node.type(node.props));
    return { ...node, props: { ...node.props, children: resolve(node.props.children) } };
  }

  return resolve(exports.AccountsPanel({
    accounts: [],
    cards: [cardProps],
    loans: [],
    investments: [],
    exchangeRate,
  }));
}

function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join(' ');
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return textContent(node.props?.children);
}

test('credit card totals keep unavailable conversions nullable', () => {
  const totals = calculateCreditCardTotals([
    card({ current_debt_usd: 100 }),
    card({ credit_limit_amount: 100, credit_limit_currency: 'USD', current_debt_pen: 0, current_debt_usd: 50 }),
  ], null);

  assert.equal(totals.limitPen, null);
  assert.equal(totals.debtPen, null);
  assert.equal(totals.availablePen, null);
  assert.equal(totals.usagePercentage, null);
  assert.equal(totals.requiresReferenceRate, true);
});

test('credit card line usage is calculable without a rate when opposite-currency debt is zero', () => {
  assert.deepEqual(calculateCardLineUsage(card(), null), {
    debtInLimitCurrency: 200,
    available: 800,
    usagePercentage: 20,
    requiresReferenceRate: false,
  });
});

test('credit card line usage requires a reference rate only for nonzero opposite-currency debt', () => {
  const unavailable = calculateCardLineUsage(card({ current_debt_usd: 25 }), null);
  assert.equal(unavailable.debtInLimitCurrency, null);
  assert.equal(unavailable.available, null);
  assert.equal(unavailable.usagePercentage, null);
  assert.equal(unavailable.requiresReferenceRate, true);

  const converted = calculateCardLineUsage(card({ current_debt_usd: 25 }), 4);
  assert.equal(converted.debtInLimitCurrency, 300);
  assert.equal(converted.available, 700);
  assert.equal(converted.usagePercentage, 30);
});

test('credit card totals calculate equivalent PEN values when possible and round conversions', () => {
  const totals = calculateCreditCardTotals([
    card({ current_debt_usd: 10 }),
    card({ credit_limit_amount: 100, credit_limit_currency: 'USD', current_debt_pen: 50, current_debt_usd: 25 }),
  ], 4);

  assert.equal(totals.limitPen, 1400);
  assert.equal(totals.debtPen, 390);
  assert.equal(totals.availablePen, 1010);
  assert.equal(totals.usagePercentage, (390 / 1400) * 100);
  assert.equal(totals.requiresReferenceRate, false);
});

test('card spend remains available in original currencies when no rate is configured', () => {
  const transactions = [
    { transaction_date: '2026-03-01', amount: 30, currency: 'PEN' },
    { transaction_date: '2026-03-02', amount: 10, currency: 'USD' },
    { transaction_date: '2026-02-28', amount: 50, currency: 'USD' },
  ];

  assert.deepEqual(calculateCardSpending(transactions, '2026-03', null), {
    pen: null,
    usd: 10,
    requiresReferenceRate: true,
  });
  assert.deepEqual(calculateCardSpending(transactions, '2026-03', 4), {
    pen: 70,
    usd: 10,
    requiresReferenceRate: false,
  });
});

test('accounts panel shows original debt and a reference-rate notice when conversion is unavailable', () => {
  const content = textContent(renderAccountsPanel({
    id: 'card-id',
    name: 'Visa',
    bank_name: 'Banco',
    credit_limit_amount: 1000,
    credit_limit_currency: 'PEN',
    credit_limit_alert_percentage: 70,
    current_debt_pen: 200,
    current_debt_usd: 10,
    monthlySpend: null,
    annualSpend: null,
    monthlySpendUsd: 10,
    annualSpendUsd: 10,
    monthlySpendRequiresRate: true,
    annualSpendRequiresRate: true,
  }, null));

  assert.match(content, /Deuda PEN/);
  assert.match(content, /Deuda USD/);
  assert.match(content, /Configura el tipo de cambio referencial/);
  assert.match(content, /Requiere tipo referencial/);
  assert.doesNotMatch(content, /24\.0% utilizado/);
});

test('accounts panel computes line usage when a reference rate is available', () => {
  const content = textContent(renderAccountsPanel({
    id: 'card-id',
    name: 'Visa',
    bank_name: 'Banco',
    credit_limit_amount: 1000,
    credit_limit_currency: 'PEN',
    credit_limit_alert_percentage: 70,
    current_debt_pen: 200,
    current_debt_usd: 10,
    monthlySpend: 70,
    annualSpend: 70,
    monthlySpendUsd: 10,
    annualSpendUsd: 10,
    monthlySpendRequiresRate: false,
    annualSpendRequiresRate: false,
  }, 4));

  assert.match(content, /24\.0\s*% utilizado/);
  assert.match(content, /760\.00/);
  assert.doesNotMatch(content, /Configura el tipo de cambio referencial/);
});

test('saving and syncing a reference rate revalidate all rate-dependent views', async () => {
  const { actions, revalidated } = actionHarness();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => '02/11/2026|3.8|3.9' });

  try {
    const saved = await actions.saveExchangeRate(null, form({ rateDate: '2026-11-02', usdToPenRate: '3.8' }));
    assert.ok(saved.success, saved.error);
    assert.deepEqual(revalidated, ['/configuracion', '/cuentas', '/actividad', '/dashboard']);

    revalidated.length = 0;
    const synced = await actions.syncSunatExchangeRate(null, new FormData());
    assert.ok(synced.success, synced.error);
    assert.deepEqual(revalidated, ['/configuracion', '/cuentas', '/actividad', '/dashboard']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});