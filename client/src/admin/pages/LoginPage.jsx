import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LockKeyhole, RefreshCw, ServerCrash } from 'lucide-react';
import waiter from '../../assets/characters/waiter.webp';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { AdminHead } from '../components/AdminHead.jsx';
import { FormAlert, TextInput } from '../components/FormControls.jsx';
import { Spinner } from '../components/Skeleton.jsx';
import { ICON_SAFE } from '../components/ui.js';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

const BACKEND_HELP = 'The admin dashboard needs the backend server and MongoDB — see README › Running locally';

function safeTarget(from) {
  const path = from?.pathname;
  if (!path || !path.startsWith('/admin') || path.startsWith('/admin/login')) return '/admin';
  return `${path}${from.search || ''}${from.hash || ''}`;
}

export default function LoginPage() {
  const { status, login } = useAuth();
  const location = useLocation();
  const target = safeTarget(location.state?.from);
  const [health, setHealth] = useState({ state: 'checking' });
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const checkHealth = useCallback(async () => {
    setHealth({ state: 'checking' });
    try {
      const res = await api.get('/health');
      setHealth(res?.db === 'connected' ? { state: 'ok' } : { state: 'db' });
    } catch (err) {
      setHealth({ state: 'down', message: err?.message });
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  if (status === 'authenticated') return <Navigate to={target} replace />;

  async function onSubmit(values) {
    setFormError('');
    try {
      await login(values);
      // <Navigate> above takes over once the auth state flips.
    } catch (err) {
      if (err?.status === 401) {
        setFormError('That email and password combination isn’t right. Please check and try again.');
      } else if (err?.status === 429) {
        setFormError('Too many sign-in attempts. For your security, please wait about 15 minutes and try again.');
      } else if (err?.status === 0) {
        setFormError(err.message);
        checkHealth();
      } else {
        setFormError(err?.message || 'Sign-in failed. Please try again.');
      }
      setFocus('password');
    }
  }

  const ready = health.state === 'ok';
  const notice = location.state?.expired
    ? 'Your session has expired. Please sign in again.'
    : location.state?.loggedOut
      ? 'You have been signed out.'
      : '';

  return (
    <div className={`grid min-h-dvh bg-ink font-sans text-cream lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] ${ICON_SAFE}`}>
      <AdminHead />

      {/* Brand / mascot panel */}
      <div className="seigaiha relative flex flex-col items-center justify-center gap-6 overflow-hidden px-6 pb-8 pt-10 text-center lg:py-16">
        <p className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex size-11 items-center justify-center rounded-xl bg-fuji-red font-display text-xl font-bold text-white"
          >
            富
          </span>
          <span className="text-left leading-tight">
            <span className="block font-display text-2xl font-bold">
              <span lang="ja">富士</span> FUJI
            </span>
            <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-gold">Admin</span>
          </span>
        </p>
        <figure className="relative w-36 sm:w-44 lg:w-72">
          <img
            src={waiter}
            alt="Illustrated mascot: a cheerful cartoon waiter"
            className="h-auto w-full animate-float drop-shadow-[0_24px_40px_rgb(0_0_0/0.45)]"
            decoding="async"
          />
          <figcaption className="label-illustrative">Illustrated mascot</figcaption>
        </figure>
        <p className="hidden max-w-sm text-sm text-cream/70 lg:block">
          Orders, bookings, the menu and site settings for Fuji Japanese Restaurant, Stoke Newington.
        </p>
      </div>

      {/* Sign-in form */}
      <main className="light-surface flex items-start justify-center bg-cream px-4 py-10 text-ink sm:items-center sm:px-8 lg:py-16">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-dark">Staff access only. This area is not indexed by search engines.</p>

          <div className="mt-6 space-y-4">
            {notice && <FormAlert tone="info">{notice}</FormAlert>}

            {health.state === 'checking' && (
              <div role="status" className="flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3 text-sm text-muted-dark ring-1 ring-ink/10">
                <Spinner className="size-4" /> Checking the server connection…
              </div>
            )}

            {(health.state === 'down' || health.state === 'db') && (
              <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
                <div className="flex gap-3">
                  <ServerCrash aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-amber-700" />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {health.state === 'db' ? 'Database not connected' : 'Backend server not reachable'}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{BACKEND_HELP}</p>
                    <p className="mt-2 text-xs text-amber-900/80">
                      {health.state === 'db'
                        ? 'The API server responded, but MongoDB is disconnected.'
                        : health.message || 'The API health check failed.'}
                    </p>
                    <button type="button" onClick={checkHealth} className="btn btn-sm btn-outline-dark mt-4">
                      <RefreshCw aria-hidden="true" className="size-4" />
                      Check again
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="card-light space-y-5 p-6 sm:p-8">
              <fieldset disabled={!ready} className="min-w-0 space-y-5 disabled:opacity-70">
                <legend className="sr-only">Admin credentials</legend>
                {formError && <FormAlert>{formError}</FormAlert>}
                <TextInput
                  label="Email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  required
                  error={errors.email?.message}
                  {...register('email')}
                />
                <TextInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  error={errors.password?.message}
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="inline-flex size-9 items-center justify-center rounded-full text-muted-dark transition hover:bg-ink/[0.06] hover:text-ink"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                    </button>
                  }
                  {...register('password')}
                />
                <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Spinner className="size-4" /> : <LockKeyhole aria-hidden="true" className="size-4" />}
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </button>
              </fieldset>
            </form>

            <p className="text-center text-sm">
              <a href="/" className="font-medium text-muted-dark underline-offset-2 hover:text-fuji-red hover:underline">
                ← Back to the website
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
