import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHistoryPeriod, historyYearEnd } from '../lib/history/period.ts';

test('history limits selection to valid months through the current Lima month', () => {
  assert.equal(resolveHistoryPeriod('2024-12', '2026-03'), '2024-12');
  for (const value of ['2026-04', '2026-13', '0000-01', '', ['2025-01']]) {
    assert.equal(resolveHistoryPeriod(value, '2026-03'), '2026-03');
  }
});

test('annual summaries end at the current month or December for past years', () => {
  assert.equal(historyYearEnd('2026-01', '2026-03'), '2026-03');
  assert.equal(historyYearEnd('2025-01', '2026-03'), '2025-12');
});