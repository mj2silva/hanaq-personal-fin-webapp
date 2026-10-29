export interface LoginInputValidationResult {
  isValid: boolean;
  email: string;
  password?: string;
  error?: string;
}

/**
 * Validates login form fields and extracts trimmed email.
 */
export function validateLoginInput(formData: FormData): LoginInputValidationResult {
  const rawEmail = formData.get('email');
  const rawPassword = formData.get('password');

  const emailStr = typeof rawEmail === 'string' ? rawEmail : '';
  const passwordStr = typeof rawPassword === 'string' ? rawPassword : '';
  const trimmedEmail = emailStr.trim();

  if (!trimmedEmail) {
    return {
      isValid: false,
      email: '',
      error: 'Por favor, ingresa tu correo electrónico.',
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return {
      isValid: false,
      email: trimmedEmail,
      error: 'Por favor, ingresa un correo electrónico válido.',
    };
  }

  if (!passwordStr) {
    return {
      isValid: false,
      email: trimmedEmail,
      error: 'Por favor, ingresa tu contraseña.',
    };
  }

  return {
    isValid: true,
    email: trimmedEmail,
    password: passwordStr,
  };
}
