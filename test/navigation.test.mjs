import test from 'node:test';
import assert from 'node:assert/strict';
import { MAIN_NAV_ITEMS, SETTINGS_NAV_ITEM } from '../components/navigation/nav-items.ts';

test('Navigation items configuration', async (t) => {
  await t.test('has exactly 5 primary navigation items', () => {
    assert.strictEqual(MAIN_NAV_ITEMS.length, 5);
    assert.deepStrictEqual(
      MAIN_NAV_ITEMS.map((item) => item.label),
      ['Inicio', 'Actividad', 'Mis Cuentas', 'Mi Mes', 'Historial']
    );
  });

  await t.test('has valid relative hrefs for all primary sections', () => {
    assert.strictEqual(MAIN_NAV_ITEMS[0].href, '/dashboard');
    assert.strictEqual(MAIN_NAV_ITEMS[1].href, '/actividad');
    assert.strictEqual(MAIN_NAV_ITEMS[2].href, '/cuentas');
    assert.strictEqual(MAIN_NAV_ITEMS[3].href, '/mi-mes');
    assert.strictEqual(MAIN_NAV_ITEMS[4].href, '/historial');
  });

  await t.test('has valid secondary settings navigation item', () => {
    assert.strictEqual(SETTINGS_NAV_ITEM.label, 'Configuración');
    assert.strictEqual(SETTINGS_NAV_ITEM.href, '/configuracion');
  });
});
