import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as calculations from '../lib/activity/calculations.ts';

const require = createRequire(import.meta.url);
const user = 'user-a';
const source = readFileSync(new URL('../app/(app)/mi-mes/actions.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function harness({ rows = [], now = '2027-01-01T05:30:00Z', authenticated = true, readError = false, writeError = false } = {}) {
  const paths = [];
  const calls = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: authenticated ? { id: user } : null }, error: null }) },
    from(table) {
      assert.equal(table, 'budgets');
      const filters = {};
      return {
        select() { return this; },
        eq(key, value) { filters[key] = value; return this; },
        then(resolve) {
          calls.push({ filters });
          return Promise.resolve({ data: rows.filter((row) => Object.entries(filters).every(([key, value]) => row[key] === value)).map(({ category_id, limit_amount_pen }) => ({ category_id, limit_amount_pen })), error: readError ? {} : null }).then(resolve);
        },
        upsert(payload, options) {
          calls.push({ payload, options });
          return { select: async () => {
            if (writeError) return { data: null, error: {} };
            const inserted = [];
            for (const row of payload) {
              if (!rows.some((existing) => existing.user_id === row.user_id && existing.category_id === row.category_id && existing.period_year_month === row.period_year_month)) {
                rows.push(row);
                inserted.push({ category_id: row.category_id });
              }
            }
            return { data: inserted, error: null };
          } };
        },
      };
    },
  };
  const imports = (name) => {
    if (name === 'next/cache') return { revalidatePath: (path) => paths.push(path) };
    if (name === '@/lib/supabase/server') return { createClient: async () => supabase };
    if (name === '@/lib/activity/calculations') return calculations;
    return require(name);
  };
  class Clock extends Date { constructor() { super(now); } }
  const actions = {};
  new Function('require', 'exports', 'Date', compiled)(imports, actions, Clock);
  return { copy: () => actions.copyPreviousBudgets(null, new FormData()), rows, calls, paths };
}

const row = (user_id, category_id, period_year_month, limit_amount_pen) => ({ user_id, category_id, period_year_month, limit_amount_pen });

test('copia parcial, repetida y simultánea sin sobrescribir ni cruzar usuarios', async () => {
  const h = harness({ rows: [row(user, 'a', '2026-12', 100), row(user, 'b', '2026-12', 200), row(user, 'a', '2027-01', 999), row('other', 'c', '2026-12', 300)] });
  const results = await Promise.all([h.copy(), h.copy()]);
  assert.ok(results.some((result) => result.success.includes('1 presupuesto')));
  assert.ok(results.some((result) => result.success.includes('ya existen')));
  assert.equal((await h.copy()).success.includes('ya existen'), true);
  assert.deepEqual(h.rows.filter((item) => item.user_id === user && item.period_year_month === '2027-01'), [row(user, 'a', '2027-01', 999), row(user, 'b', '2027-01', 200)]);
  assert.deepEqual(h.calls[0].filters, { user_id: user, period_year_month: '2026-12' });
  assert.deepEqual(h.calls.find((call) => call.options).options, { onConflict: 'user_id,category_id,period_year_month', ignoreDuplicates: true });
  assert.ok(h.paths.includes('/mi-mes'));
});

test('usa el calendario de Lima, incluso antes de medianoche en año nuevo', async () => {
  const h = harness({ now: '2027-01-01T02:00:00Z', rows: [row(user, 'a', '2026-11', 50)] });
  assert.ok((await h.copy()).success.includes('1 presupuesto'));
  assert.ok(h.rows.some((item) => item.period_year_month === '2026-12' && item.limit_amount_pen === 50));
});

test('informa ausencia, sesión expirada y errores de lectura o escritura', async () => {
  assert.match((await harness().copy()).success, /No hay presupuestos/);
  const unauthenticated = harness({ authenticated: false });
  assert.match((await unauthenticated.copy()).error, /sesión/);
  assert.equal(unauthenticated.calls.length, 0);
  assert.match((await harness({ readError: true }).copy()).error, /consultar/);
  const failed = harness({ rows: [row(user, 'a', '2026-12', 10)], writeError: true });
  assert.match((await failed.copy()).error, /copiar/);
  assert.equal(failed.paths.length, 0);
});