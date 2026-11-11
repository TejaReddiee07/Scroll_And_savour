import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { applyServerErrors } from '../lib/forms.js';
import { humanise } from '../lib/format.js';
import { Card } from '../components/Card.jsx';
import { FormAlert, TextInput } from '../components/FormControls.jsx';
import { Spinner } from '../components/Skeleton.jsx';
import { useToast } from '../components/Toast.jsx';

const MIN_LENGTH = 10;

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(MIN_LENGTH, `Use at least ${MIN_LENGTH} characters`)
      .max(200, 'That password is too long'),
    confirmPassword: z.string().min(1, 'Re-enter the new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords don’t match',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password that’s different from your current one',
  });

const FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'];

export default function AccountPage() {
  const { admin } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values) {
    setFormError('');
    setDone(false);
    try {
      await api.put('/admin/auth/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      setDone(true);
      toast.success('Password changed.');
    } catch (err) {
      if (err?.status === 401 || err?.code === 'INVALID_CREDENTIALS' || err?.code === 'INVALID_PASSWORD') {
        setError('currentPassword', { type: 'server', message: 'Your current password is incorrect' }, { shouldFocus: true });
        toast.error('Your current password is incorrect.');
        return;
      }
      const leftovers = applyServerErrors(err, setError, FIELDS);
      toast.error(errorMessage(err));
      if (leftovers.length) setFormError(leftovers.join(' '));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card title="Signed in as" titleId="account-heading" bodyClassName="p-5">
        {admin ? (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-dark">Name</dt>
              <dd className="mt-0.5 text-ink">{admin.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-dark">Email</dt>
              <dd className="mt-0.5 break-all text-ink">{admin.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-dark">Role</dt>
              <dd className="mt-0.5 text-ink">{humanise(admin.role) || '—'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-dark">Account details unavailable.</p>
        )}
        <p className="mt-5 flex items-start gap-2 rounded-xl bg-cream/60 p-3 text-xs text-muted-dark">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-700" />
          Sessions last 8 hours. Log out when using a shared device.
        </p>
      </Card>

      <Card title="Change password" description={`Use at least ${MIN_LENGTH} characters — a short phrase is easiest to remember.`} titleId="password-heading" bodyClassName="p-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-md space-y-5">
          <FormAlert>{formError}</FormAlert>
          {done && (
            <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Your password has been changed.
            </p>
          )}
          <TextInput
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <TextInput
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            hint={`At least ${MIN_LENGTH} characters.`}
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <TextInput
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="size-4" /> : <KeyRound aria-hidden="true" className="size-4" />}
            Change password
          </button>
        </form>
      </Card>
    </div>
  );
}
