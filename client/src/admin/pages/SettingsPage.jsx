import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Save, Undo2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { DAY_DISPLAY_ORDER, DAY_NAMES } from '../lib/constants.js';
import { applyServerErrors, MONEY_RE, moneyToInput, parseMoney, TIME_RE } from '../lib/forms.js';
import { formatDateTime } from '../lib/format.js';
import { useApiQuery } from '../lib/hooks.js';
import { cx } from '../lib/cx.js';
import { Card, PageHeader } from '../components/Card.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { ErrorState } from '../components/EmptyState.jsx';
import { FormAlert, Switch, TextArea, TextInput } from '../components/FormControls.jsx';
import { Skeleton, Spinner } from '../components/Skeleton.jsx';
import { useToast } from '../components/Toast.jsx';

const ANNOUNCEMENT_MAX = 280;

const daySchema = z
  .object({ open: z.string(), close: z.string(), closed: z.boolean() })
  .superRefine((d, ctx) => {
    if (d.closed) return;
    const openOk = TIME_RE.test(d.open);
    const closeOk = TIME_RE.test(d.close);
    if (!openOk) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['open'], message: 'Enter an opening time' });
    if (!closeOk) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['close'], message: 'Enter a closing time' });
    if (openOk && closeOk && d.close !== '00:00' && d.close <= d.open) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['close'], message: 'Must be after opening (use 00:00 for midnight)' });
    }
  });

const money = z
  .string()
  .trim()
  .refine((v) => v === '' || MONEY_RE.test(v), 'Enter an amount like 2.50, or leave blank');

const schema = z.object({
  hours: z.array(daySchema).length(7),
  hoursNote: z.string().trim().max(300, 'Keep it under 300 characters'),
  phone: z.string().trim().min(1, 'Enter the phone number').max(40, 'Too long'),
  phoneIntl: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, 'International format without spaces, e.g. +442072546093'),
  email: z.string().trim().min(1, 'Enter the email address').email('Enter a valid email address'),
  addressText: z
    .string()
    .trim()
    .min(1, 'Enter the address')
    .refine((v) => v.split('\n').filter((l) => l.trim()).length <= 6, 'Use at most 6 lines'),
  deliveryFee: money,
  minimumOrder: money,
  orderingMode: z.enum(['demo', 'live']),
  bookingMode: z.enum(['demo', 'live']),
  announcement: z.string().trim().max(ANNOUNCEMENT_MAX, `Keep it under ${ANNOUNCEMENT_MAX} characters`),
});

const SERVER_ALIASES = { 'contact.phone': 'phone', 'contact.phoneIntl': 'phoneIntl', 'contact.email': 'email', addressLines: 'addressText' };
const FIELDS = ['hoursNote', 'phone', 'phoneIntl', 'email', 'addressText', 'deliveryFee', 'minimumOrder', 'orderingMode', 'bookingMode', 'announcement'];

function normaliseHours(hours) {
  const list = Array.isArray(hours) ? hours : [];
  return Array.from({ length: 7 }, (_, day) => {
    const h = list.find((entry) => Number(entry?.day) === day);
    return { open: h?.open ?? '', close: h?.close ?? '', closed: Boolean(h?.closed) };
  });
}

function toFormValues(s) {
  return {
    hours: normaliseHours(s?.hours),
    hoursNote: s?.hoursNote ?? '',
    phone: s?.contact?.phone ?? '',
    phoneIntl: s?.contact?.phoneIntl ?? '',
    email: s?.contact?.email ?? '',
    addressText: (s?.contact?.addressLines ?? []).join('\n'),
    deliveryFee: moneyToInput(s?.deliveryFee),
    minimumOrder: moneyToInput(s?.minimumOrder),
    orderingMode: s?.orderingMode === 'live' ? 'live' : 'demo',
    bookingMode: s?.bookingMode === 'live' ? 'live' : 'demo',
    announcement: s?.announcement ?? '',
  };
}

function toPayload(values, original) {
  return {
    contact: {
      ...(original?.contact ?? {}),
      phone: values.phone.trim(),
      phoneIntl: values.phoneIntl.trim(),
      email: values.email.trim(),
      addressLines: values.addressText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    },
    hours: values.hours.map((h, day) => ({ day, open: h.open, close: h.close, closed: h.closed })),
    hoursNote: values.hoursNote.trim(),
    deliveryFee: parseMoney(values.deliveryFee),
    minimumOrder: parseMoney(values.minimumOrder),
    orderingMode: values.orderingMode,
    bookingMode: values.bookingMode,
    announcement: values.announcement.trim(),
  };
}

export default function SettingsPage() {
  const q = useApiQuery('/admin/settings');

  if (q.error && !q.data) {
    return (
      <Card>
        <ErrorState error={q.error} onRetry={q.refetch} title="Couldn’t load settings" />
      </Card>
    );
  }

  if (!q.data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only" role="status">
          Loading settings…
        </span>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card-light space-y-4 p-6" aria-hidden="true">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return <SettingsForm settings={q.data} onSaved={(s) => q.setData(s)} />;
}

function SettingsForm({ settings, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(settings) });

  const hours = useWatch({ control, name: 'hours' });
  const orderingMode = useWatch({ control, name: 'orderingMode' });
  const bookingMode = useWatch({ control, name: 'bookingMode' });
  const announcement = useWatch({ control, name: 'announcement' }) ?? '';

  // Warn before leaving the tab with unsaved changes.
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  async function onSubmit(values) {
    setFormError('');
    const goingLive = [
      values.orderingMode === 'live' && settings.orderingMode !== 'live' ? 'online ordering' : null,
      values.bookingMode === 'live' && settings.bookingMode !== 'live' ? 'table booking' : null,
    ].filter(Boolean);
    if (goingLive.length) {
      const ok = await confirm({
        title: `Switch ${goingLive.join(' and ')} to live?`,
        message:
          'Customers will be told their orders/bookings are real. Only continue if a real provider and staff process is in place to fulfil them.',
        confirmLabel: 'Yes, go live',
        cancelLabel: 'Keep test mode',
      });
      if (!ok) return;
    }

    const payload = toPayload(values, settings);
    try {
      const updated = await api.put('/admin/settings', payload);
      const next = updated && typeof updated === 'object' ? updated : { ...settings, ...payload };
      onSaved(next);
      reset(toFormValues(next));
      toast.success('Settings saved.');
    } catch (err) {
      const leftovers = applyServerErrors(err, setError, FIELDS, SERVER_ALIASES);
      toast.error(errorMessage(err));
      if (leftovers.length) setFormError(leftovers.join(' '));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 pb-24">
      <PageHeader
        description={
          <>
            Public information shown across the website.
            {settings.updatedAt && <> Last saved {formatDateTime(settings.updatedAt)}.</>}
          </>
        }
      />
      <FormAlert>{formError}</FormAlert>

      {/* Opening hours */}
      <Card title="Opening hours" description="Times are London local time. Reservations are only accepted inside these hours." titleId="hours-heading">
        <div className="divide-y divide-ink/[0.07]">
          {DAY_DISPLAY_ORDER.map((day) => {
            const closed = Boolean(hours?.[day]?.closed);
            const dayErrors = errors.hours?.[day];
            return (
              <fieldset key={day} className="grid grid-cols-1 items-start gap-3 px-5 py-4 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                <legend className="sr-only">{DAY_NAMES[day]}</legend>
                <p aria-hidden="true" className="font-semibold text-ink">
                  {DAY_NAMES[day]}
                </p>
                <TextInput
                  label="Opens"
                  type="time"
                  readOnly={closed}
                  aria-disabled={closed || undefined}
                  inputClassName={cx(closed && 'opacity-40')}
                  error={!closed ? dayErrors?.open?.message : undefined}
                  {...register(`hours.${day}.open`)}
                />
                <TextInput
                  label="Closes"
                  type="time"
                  readOnly={closed}
                  aria-disabled={closed || undefined}
                  inputClassName={cx(closed && 'opacity-40')}
                  error={!closed ? dayErrors?.close?.message : undefined}
                  {...register(`hours.${day}.close`)}
                />
                <Switch
                  label="Closed"
                  aria-label={`Closed all day on ${DAY_NAMES[day]}`}
                  className="sm:pt-6"
                  {...register(`hours.${day}.closed`)}
                />
              </fieldset>
            );
          })}
        </div>
        <div className="border-t border-ink/[0.07] p-5">
          <TextArea
            label="Hours note"
            optional
            rows={2}
            hint="Shown under the hours, e.g. “Published hours — please confirm with the restaurant.”"
            error={errors.hoursNote?.message}
            {...register('hoursNote')}
          />
        </div>
      </Card>

      {/* Contact */}
      <Card title="Contact details" titleId="contact-heading" bodyClassName="grid gap-4 p-5 sm:grid-cols-2">
        <TextInput label="Phone (display)" required autoComplete="off" error={errors.phone?.message} {...register('phone')} />
        <TextInput
          label="Phone (international)"
          required
          autoComplete="off"
          placeholder="+442072546093"
          hint="Used for tap-to-call links."
          error={errors.phoneIntl?.message}
          {...register('phoneIntl')}
        />
        <TextInput label="Email" type="email" required autoComplete="off" error={errors.email?.message} {...register('email')} />
        <TextArea
          label="Address"
          required
          rows={3}
          hint="One line per row."
          error={errors.addressText?.message}
          className="sm:row-span-2"
          {...register('addressText')}
        />
      </Card>

      {/* Ordering */}
      <Card title="Ordering & delivery" titleId="ordering-heading" bodyClassName="space-y-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Delivery fee"
            prefix="£"
            inputMode="decimal"
            placeholder="To be confirmed"
            hint="Leave blank if not yet confirmed — the site will say “to be confirmed”."
            error={errors.deliveryFee?.message}
            {...register('deliveryFee')}
          />
          <TextInput
            label="Minimum order"
            prefix="£"
            inputMode="decimal"
            placeholder="None"
            hint="Leave blank for no minimum."
            error={errors.minimumOrder?.message}
            {...register('minimumOrder')}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ModeField
            name="orderingMode"
            legend="Online ordering"
            value={orderingMode}
            register={register}
            liveWarning="Live mode must only be enabled once a real ordering/payment provider and kitchen process are in place. Until then keep test mode — orders are marked as tests."
          />
          <ModeField
            name="bookingMode"
            legend="Table booking"
            value={bookingMode}
            register={register}
            liveWarning="Live mode must only be enabled once a real booking process is in place (staff checking and confirming requests). Until then keep test mode."
          />
        </div>
      </Card>

      {/* Announcement */}
      <Card title="Announcement" description="Optional banner shown at the top of the website. Leave blank to hide it." titleId="announcement-heading" bodyClassName="p-5">
        <TextArea
          label="Announcement text"
          optional
          rows={2}
          maxLength={ANNOUNCEMENT_MAX}
          hint={`${announcement.length}/${ANNOUNCEMENT_MAX} characters`}
          error={errors.announcement?.message}
          {...register('announcement')}
        />
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="mr-auto text-sm text-muted-dark" role="status">
            {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </p>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => reset(toFormValues(settings))} disabled={!isDirty || isSubmitting}>
            <Undo2 aria-hidden="true" className="size-4" />
            Discard
          </button>
          <button type="submit" className="btn btn-sm btn-primary" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? <Spinner className="size-4" /> : <Save aria-hidden="true" className="size-4" />}
            Save settings
          </button>
        </div>
      </div>
    </form>
  );
}

function ModeField({ name, legend, value, register, liveWarning }) {
  const options = [
    { value: 'demo', label: 'Test', description: 'For setting up — orders and bookings are marked as tests and not acted on.' },
    { value: 'live', label: 'Live', description: 'Submissions are treated as real orders/bookings.' },
  ];
  return (
    <fieldset className="min-w-0">
      <legend className="field-label text-ink">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cx(
              'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fuji-red',
              value === opt.value
                ? opt.value === 'live'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-ink/40 bg-rice'
                : 'border-ink/15 bg-rice hover:border-ink/30',
            )}
          >
            <input type="radio" value={opt.value} className="mt-1 size-4 shrink-0 accent-fuji-red" {...register(name)} />
            <span className="text-sm">
              <span className="block font-semibold text-ink">{opt.label}</span>
              <span className="block text-xs text-muted-dark">{opt.description}</span>
            </span>
          </label>
        ))}
      </div>
      {value === 'live' && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-700" />
          {liveWarning}
        </p>
      )}
    </fieldset>
  );
}
