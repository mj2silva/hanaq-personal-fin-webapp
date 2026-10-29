import { LoginForm } from './login-form';

export const metadata = {
  title: 'Iniciar Sesión | Finanzas Personales',
  description: 'Ingresa a tu panel de control de finanzas personales.',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
