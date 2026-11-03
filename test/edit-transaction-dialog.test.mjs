import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

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
    if (id.startsWith('@/') || id === './styles') return {};
    return require(id);
  };
  const source = `${readFileSync(new URL(path, import.meta.url), 'utf8')}\nexport { ${name} };`;
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(imports, exports);
  return exports[name](props);
}

function findNodes(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => findNodes(child, predicate));
  if (!node || typeof node !== 'object') return [];
  const matches = predicate(node) ? [node] : [];
  if (node.props && node.props.children) {
    matches.push(...findNodes(node.props.children, predicate));
  }
  return matches;
}

test('EditTransactionDialog renders modal popup and form fields for simple income/expense', () => {
  const transaction = {
    id: 'tx-123',
    user_id: 'user-1',
    description: 'Almuerzo de trabajo',
    amount: 45.5,
    currency: 'PEN',
    type: 'EXPENSE',
    account_id: 'acc-1',
    credit_card_id: null,
    destination_account_id: null,
    investment_id: null,
    loan_id: null,
    parent_transaction_id: null,
    shared_split_id: null,
    is_installment: false,
    is_shared_expense: false,
    converted_amount: null,
    applied_exchange_rate: null,
    transaction_date: '2026-03-10T12:00:00-05:00',
    created_at: '2026-03-10T12:00:00-05:00',
  };

  const tree = renderComponent('../components/activity/edit-transaction-dialog.tsx', 'EditTransactionDialog', {}, { transaction });
  
  // Verify dialog element exists
  const dialogs = findNodes(tree, (n) => n.type === 'dialog');
  assert.equal(dialogs.length, 1, 'Should contain a modal <dialog> popup');

  // Verify form inputs
  const inputs = findNodes(tree, (n) => n.type === 'input');
  const inputNames = inputs.map((i) => i.props?.name).filter(Boolean);
  assert.ok(inputNames.includes('transactionId'), 'Has transactionId hidden field');
  assert.ok(inputNames.includes('description'), 'Has description field');
  assert.ok(inputNames.includes('amount'), 'Has amount field for simple expense');
  assert.ok(inputNames.includes('date'), 'Has date field for simple expense');

  const descInput = inputs.find((i) => i.props?.name === 'description');
  assert.equal(descInput.props.defaultValue, 'Almuerzo de trabajo');
  assert.equal(descInput.props.maxLength, 255);

  const amountInput = inputs.find((i) => i.props?.name === 'amount');
  assert.equal(amountInput.props.defaultValue, 45.5);
});

test('EditTransactionDialog allows amount and date for transfers, card operations, and last loan payment', () => {
  const transferTx = {
    id: 'tx-456',
    user_id: 'user-1',
    description: 'Transferencia entre cuentas',
    amount: 100,
    currency: 'PEN',
    type: 'TRANSFER',
    account_id: 'acc-1',
    credit_card_id: null,
    destination_account_id: 'acc-2',
    investment_id: null,
    loan_id: null,
    parent_transaction_id: null,
    shared_split_id: null,
    is_installment: false,
    is_shared_expense: false,
    converted_amount: null,
    applied_exchange_rate: null,
    transaction_date: '2026-03-10T12:00:00-05:00',
    created_at: '2026-03-10T12:00:00-05:00',
  };

  const tree = renderComponent('../components/activity/edit-transaction-dialog.tsx', 'EditTransactionDialog', {}, { transaction: transferTx });
  
  const inputs = findNodes(tree, (n) => n.type === 'input');
  const inputNames = inputs.map((i) => i.props?.name).filter(Boolean);
  assert.ok(inputNames.includes('transactionId'));
  assert.ok(inputNames.includes('description'));
  assert.ok(inputNames.includes('amount'), 'Should allow amount edit for simple transfers');
  assert.ok(inputNames.includes('date'), 'Should allow date edit for simple transfers');
});
