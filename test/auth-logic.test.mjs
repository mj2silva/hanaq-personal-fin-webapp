import test from 'node:test';
import assert from 'node:assert/strict';
import { getSafeRedirectPath } from '../lib/auth/redirect.ts';
import { validateLoginInput } from '../lib/auth/validation.ts';

test('getSafeRedirectPath sanitization', async (t) => {
  await t.test('returns valid relative internal paths unchanged', () => {
    assert.strictEqual(getSafeRedirectPath('/dashboard'), '/dashboard');
    assert.strictEqual(getSafeRedirectPath('/actividad?view=month'), '/actividad?view=month');
    assert.strictEqual(getSafeRedirectPath('/cuentas/123'), '/cuentas/123');
  });

  await t.test('falls back to /dashboard for empty or non-string inputs', () => {
    assert.strictEqual(getSafeRedirectPath(null), '/dashboard');
    assert.strictEqual(getSafeRedirectPath(undefined), '/dashboard');
    assert.strictEqual(getSafeRedirectPath(''), '/dashboard');
    assert.strictEqual(getSafeRedirectPath('   '), '/dashboard');
  });

  await t.test('prevents open redirect evasions and dangerous protocols', () => {
    assert.strictEqual(getSafeRedirectPath('https://evil.com'), '/dashboard');
    assert.strictEqual(getSafeRedirectPath('http://evil.com'), '/dashboard');
    assert.strictEqual(getSafeRedirectPath('//evil.com'), '/dashboard');
    assert.strictEqual(getSafeRedirectPath('///evil.com'), '/dashboard');
    assert.strictEqual(getSafeRedirectPath('/\\evil.com'), '/dashboard');
    assert.strictEqual(getSafeRedirectPath('/%2F%2Fevil.com'), '/dashboard');
    assert.strictEqual(getSafeRedirectPath('/%5Cevil.com'), '/dashboard');
    assert.strictEqual(getSafeRedirectPath('javascript:alert(1)'), '/dashboard');
  });

  await t.test('supports custom fallback path', () => {
    assert.strictEqual(getSafeRedirectPath('https://evil.com', '/login'), '/login');
    assert.strictEqual(getSafeRedirectPath(null, '/login'), '/login');
  });
});

test('validateLoginInput validation', async (t) => {
  await t.test('validates correct email and password form data', () => {
    const formData = new FormData();
    formData.append('email', '  user@example.com  ');
    formData.append('password', 'secret123');

    const result = validateLoginInput(formData);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.email, 'user@example.com');
    assert.strictEqual(result.password, 'secret123');
    assert.strictEqual(result.error, undefined);
  });

  await t.test('rejects missing or empty email', () => {
    const formData = new FormData();
    formData.append('email', '');
    formData.append('password', 'secret123');

    const result = validateLoginInput(formData);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.error, 'Por favor, ingresa tu correo electrónico.');
  });

  await t.test('rejects invalid email formats', () => {
    const formData = new FormData();
    formData.append('email', 'not-an-email');
    formData.append('password', 'secret123');

    const result = validateLoginInput(formData);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.email, 'not-an-email');
    assert.strictEqual(result.error, 'Por favor, ingresa un correo electrónico válido.');
  });

  await t.test('rejects empty password and preserves email', () => {
    const formData = new FormData();
    formData.append('email', 'user@example.com');
    formData.append('password', '');

    const result = validateLoginInput(formData);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.email, 'user@example.com');
    assert.strictEqual(result.error, 'Por favor, ingresa tu contraseña.');
  });
});
