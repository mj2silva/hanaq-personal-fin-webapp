import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as calculations from '../lib/activity/calculations.ts';
import * as format from '../lib/format.ts';

const require = createRequire(import.meta.url);
const data = {
  today: '2026-03-16', exchangeRate: 4,
  accounts: [
    { id: 'pen-account', name: 'Soles', currency: 'PEN', current_balance: 100 },
    { id: 'usd-account', name: 'Dólares', currency: 'USD', current_balance: 100 },
  ],
  cards: [{ id: 'card', name: 'Tarjeta', is_bimonetary: true, credit_limit_currency: 'PEN', closing_day: 15, default_tea: 24, current_debt_pen: 0, current_debt_usd: 10 }],
  loans: [{ id: 'loan', currency: 'USD', lender_name: 'Banco', remaining_installments: 3, monthly_installment_amount: 10 }],
  investments: [], categories: [], refundable: [],
};

function renderComponent(path, name, state, props) {
  let index = 0;
  const react = {
    useState(initial) {
      const value = Object.hasOwn(state, index) ? state[index] : initial;
      index += 1;
      return [value, () => {}];
    },
    useActionState() { return [{}, () => {}, false]; },
    useEffect() {},
    useRef() { return { current: null }; },
  };
  const imports = (id) => {
    if (id === 'react') return react;
    if (id === '@/lib/activity/calculations') return calculations;
    if (id === '@/lib/format') return format;
    if (id.startsWith('@/') || id === './styles') return {};
    return require(id);
  };
  const source = `${readFileSync(new URL(path, import.meta.url), 'utf8')}\nexport { ${name} };`;
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(imports, exports);
  return exports[name](props);
}

function fields(node, name) {
  if (Array.isArray(node)) return node.flatMap((child) => fields(child, name));
  if (!node || typeof node !== 'object' || !node.props) return [];
  return [...(node.props.name === name ? [node] : []), ...fields(node.props.children, name)];
}

function activity(state) {
  return renderComponent('../components/activity/new-operation-dialog.tsx', 'OperationForm', state, {
    data, action() {}, pending: false, error: null, onCancel() {},
  });
}

test('Activity card purchases have installments and splits but no exchange-rate field', () => {
  const tree = activity({ 0: 'EXPENSE', 1: 'CARD', 5: 'card', 9: 'USD', 11: '120', 13: '3', 16: true });
  assert.equal(fields(tree, 'exchangeRate').length, 0);
  assert.equal(fields(tree, 'currency')[0].props.value, 'USD');
  assert.equal(fields(tree, 'installments').length, 1);
  assert.equal(fields(tree, 'splitDebtor').length, 1);
  assert.equal(fields(tree, 'splitAmount').length, 1);
});

test('Activity requires a real rate only for cross-currency transfers and payments', () => {
  for (const state of [
    { 0: 'TRANSFER', 3: 'pen-account', 4: 'usd-account' },
    { 0: 'CC_PAYMENT', 3: 'pen-account', 5: 'card', 9: 'USD' },
    { 0: 'LOAN_PAYMENT', 3: 'pen-account', 6: 'loan' },
  ]) {
    assert.equal(fields(activity(state), 'exchangeRate')[0].props.required, true);
  }
  assert.equal(fields(activity({ 0: 'CC_PAYMENT', 3: 'usd-account', 5: 'card', 9: 'USD' }), 'exchangeRate').length, 0);
});

test('projected card expense has no exchange-rate field', () => {
  const tree = renderComponent('../components/dashboard/dashboard-panel.tsx', 'ProjectedEventDialog', { 0: 'CARD', 2: 'card' }, {
    event: { id: 'event', name: 'Evento', currency: 'USD', amount: 120, categoryName: 'Gastos', categoryType: 'EXPENSE' },
    period: '2026-03', categories: [], operationData: data, mode: 'convert',
  });
  assert.equal(fields(tree, 'creditCardId')[0].props.value, 'card');
  assert.equal(fields(tree, 'exchangeRate').length, 0);
});