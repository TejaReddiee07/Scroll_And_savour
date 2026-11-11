import { useEffect, useId, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, BadgePercent, CalendarRange, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api.js';
import { asArray, mergeRecord, patchInList } from '../lib/data.js';
import { applyServerErrors } from '../lib/forms.js';
import { formatCalendarDate, londonDayToISO, relativeTime, toLondonDay } from '../lib/format.js';
import { useApiQuery, usePendingIds } from '../lib/hooks.js';
import { Card, PageHeader } from '../components/Card.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { Modal } from '../components/Dialog.jsx';
import { EmptyState, ErrorState } from '../components/EmptyState.jsx';
import { Checkbox, FormAlert, Switch, TextArea, TextInput } from '../components/FormControls.jsx';
import { Skeleton, Spinner } from '../components/Skeleton.jsx';
import { Badge } from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import { ICON_BTN, ICON_BTN_DANGER } from '../components/ui.js';

const UNVERIFIED_TEXT = 'Unverified — confirm terms with the owner before publishing';

const schema = z
  .object({
    title: z.string().trim().min(1, 'Enter a title').max(120, 'Keep it under 120 characters'),
    badge: z.string().trim().max(24, 'Keep the badge short (24 characters max)'),
    description: z.string().trim().max(600, 'Keep it under 600 characters'),
    terms: z.string().trim().max(1500, 'Keep it under 1500 characters'),
    source: z.string().trim().max(200, 'Keep it under 200 characters'),
    verified: z.boolean(),
    active: z.boolean(),
    startsAt: z.string(),
    endsAt: z.string(),
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.endsAt >= v.startsAt, {
    path: ['endsAt'],
    message: 'The end date must be on or after the start date',
  });

const FIELDS = ['title', 'badge', 'description', 'terms', 'source', 'verified', 'active', 'startsAt', 'endsAt'];

function toFormValues(offer) {
  return {
    title: offer?.title ?? '',
    badge: offer?.badge ?? '',
    description: offer?.description ?? '',
    terms: offer?.terms ?? '',
    source: offer?.source ?? '',
    verified: Boolean(offer?.verified),
    active: offer ? offer.active !== false : false,
    startsAt: offer?.startsAt ? toLondonDay(offer.startsAt) : '',
    endsAt: offer?.endsAt ? toLondonDay(offer.endsAt) : '',
  };
}

function toPayload(v) {
  return {
    title: v.title.trim(),
    badge: v.badge.trim(),
    description: v.description.trim(),
    terms: v.terms.trim(),
    source: v.source.trim(),
    verified: v.verified,
    active: v.active,
    startsAt: v.startsAt ? londonDayToISO(v.startsAt) : null,
    endsAt: v.endsAt ? londonDayToISO(v.endsAt, { endOfDay: true }) : null,
  };
}

function offerState(offer) {
  const now = Date.now();
  if (!offer.active) return { label: 'Inactive', tone: 'neutral' };
  if (offer.endsAt && new Date(offer.endsAt).getTime() < now) return { label: 'Expired', tone: 'danger' };
  if (offer.startsAt && new Date(offer.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'info' };
  return { label: 'Live on site', tone: 'success' };
}

function UnverifiedChip() {
  return (
    <span className="inline-flex items-start gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold leading-snug text-amber-900 ring-1 ring-inset ring-amber-300">
      <AlertTriangle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      {UNVERIFIED_TEXT}
    </span>
  );
}

function confirmUnverified(confirm, title) {
  return confirm({
    title: 'Publish an unverified offer?',
    message: `“${title}” is not marked as verified. Customers will see it on the website — please confirm the terms with the owner before publishing.`,
    confirmLabel: 'Publish anyway',
    cancelLabel: 'Go back',
  });
}

export default function OffersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const q = useApiQuery('/admin/offers');
  const [editor, setEditor] = useState({ open: false, offer: null });
  const pending = usePendingIds();

  const offers = useMemo(
    () =>
      asArray(q.data)
        .slice()
        .sort((a, b) => Number(b.active) - Number(a.active) || String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))),
    [q.data],
  );

  async function toggleActive(offer) {
    const next = !offer.active;
    if (next && !offer.verified && !(await confirmUnverified(confirm, offer.title))) return;
    pending.add(offer._id);
    q.setData((d) => patchInList(d, offer._id, { active: next }));
    try {
      const updated = await api.patch(`/admin/offers/${offer._id}`, { active: next });
      q.setData((d) => patchInList(d, offer._id, (row) => mergeRecord(row, updated)));
      toast.success(next ? `“${offer.title}” is active.` : `“${offer.title}” is hidden from the site.`);
    } catch (err) {
      q.setData((d) => patchInList(d, offer._id, { active: offer.active }));
      toast.apiError(err);
    } finally {
      pending.remove(offer._id);
    }
  }

  async function deleteOffer(offer) {
    const ok = await confirm({
      title: `Delete “${offer.title}”?`,
      message: 'The offer will be removed from the website and the dashboard. To hide it temporarily, switch it off instead.',
      confirmLabel: 'Delete offer',
    });
    if (!ok) return;
    try {
      await api.del(`/admin/offers/${offer._id}`);
      toast.success('Offer deleted.');
      q.reload();
    } catch (err) {
      toast.apiError(err);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Promotions shown on the website. Only active offers within their dates are published. Never publish an offer until the owner has confirmed its terms."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditor({ open: true, offer: null })}>
            <Plus aria-hidden="true" className="size-4" />
            Add offer
          </button>
        }
      />

      {q.error && !q.data ? (
        <Card>
          <ErrorState error={q.error} onRetry={q.refetch} />
        </Card>
      ) : q.loading && !q.data ? (
        <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="card-light space-y-3 p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <Card>
          <EmptyState
            icon={BadgePercent}
            title="No offers yet"
            description="Add an offer once its terms have been confirmed with the owner."
            action={
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditor({ open: true, offer: null })}>
                <Plus aria-hidden="true" className="size-4" /> Add offer
              </button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {offers.map((offer) => {
            const state = offerState(offer);
            return (
              <li key={offer._id} className="card-light flex min-w-0 flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {offer.badge && (
                    <span className="rounded-md bg-fuji-red px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                      {offer.badge}
                    </span>
                  )}
                  <Badge tone={state.tone} dot>
                    {state.label}
                  </Badge>
                  {offer.verified && (
                    <Badge tone="success">
                      <ShieldCheck aria-hidden="true" className="size-3.5" /> Verified
                    </Badge>
                  )}
                </div>
                <h2 className="mt-3 font-display text-lg font-bold text-ink">{offer.title}</h2>
                {offer.description && <p className="mt-1 text-sm text-ink/80">{offer.description}</p>}
                {!offer.verified && (
                  <div className="mt-3">
                    <UnverifiedChip />
                  </div>
                )}
                <dl className="mb-4 mt-4 space-y-1.5 text-xs text-muted-dark">
                  <div className="flex items-start gap-2">
                    <dt className="sr-only">Dates</dt>
                    <dd className="flex items-start gap-2">
                      <CalendarRange aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                      {offer.startsAt || offer.endsAt
                        ? `${offer.startsAt ? formatCalendarDate(toLondonDay(offer.startsAt)) : 'Now'} → ${offer.endsAt ? formatCalendarDate(toLondonDay(offer.endsAt)) : 'no end date'}`
                        : 'No date limits'}
                    </dd>
                  </div>
                  {offer.source && (
                    <div className="flex gap-2">
                      <dt className="font-semibold">Source:</dt>
                      <dd className="min-w-0 break-words">{offer.source}</dd>
                    </div>
                  )}
                  {offer.updatedAt && (
                    <div className="flex gap-2">
                      <dt className="font-semibold">Updated:</dt>
                      <dd>{relativeTime(offer.updatedAt)}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink/[0.07] pt-4">
                  <Switch
                    label="Active"
                    checked={Boolean(offer.active)}
                    disabled={pending.has(offer._id)}
                    onChange={() => toggleActive(offer)}
                    aria-label={`Active: ${offer.title}`}
                  />
                  <div className="flex gap-1">
                    <button type="button" className={ICON_BTN} onClick={() => setEditor({ open: true, offer })} aria-label={`Edit ${offer.title}`}>
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <button type="button" className={ICON_BTN_DANGER} onClick={() => deleteOffer(offer)} aria-label={`Delete ${offer.title}`}>
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <OfferEditor
        open={editor.open}
        offer={editor.offer}
        onClose={() => setEditor((e) => ({ ...e, open: false }))}
        onSaved={() => {
          setEditor((e) => ({ ...e, open: false }));
          q.reload();
        }}
      />
    </div>
  );
}

function OfferEditor({ open, offer, onClose, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const formId = useId();
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(null) });
  const verified = useWatch({ control, name: 'verified' });
  const active = useWatch({ control, name: 'active' });

  const offerId = offer?._id;
  useEffect(() => {
    if (!open) return;
    reset(toFormValues(offer));
    setFormError('');
  }, [open, offerId, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values) {
    setFormError('');
    if (values.active && !values.verified && !(offer?.active && !offer?.verified)) {
      if (!(await confirmUnverified(confirm, values.title.trim()))) return;
    }
    const payload = toPayload(values);
    try {
      if (offer) await api.patch(`/admin/offers/${offer._id}`, payload);
      else await api.post('/admin/offers', payload);
      toast.success(offer ? 'Offer saved.' : 'Offer added.');
      onSaved();
    } catch (err) {
      const leftovers = applyServerErrors(err, setError, FIELDS);
      toast.error(errorMessage(err));
      if (leftovers.length) setFormError(leftovers.join(' '));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      dismissible={!isSubmitting}
      title={offer ? 'Edit offer' : 'Add offer'}
      footer={
        <>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form={formId} className="btn btn-sm btn-primary" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="size-4" />}
            {offer ? 'Save offer' : 'Add offer'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormAlert>{formError}</FormAlert>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <TextInput label="Title" required data-autofocus error={errors.title?.message} autoComplete="off" {...register('title')} />
          <TextInput label="Badge" optional placeholder="e.g. 20% OFF" error={errors.badge?.message} autoComplete="off" {...register('badge')} />
        </div>
        <TextArea label="Description" optional rows={2} error={errors.description?.message} {...register('description')} />
        <TextArea label="Terms" optional rows={3} hint="Exclusions, minimum spend, how to redeem." error={errors.terms?.message} {...register('terms')} />
        <TextInput
          label="Source"
          optional
          placeholder="Where the offer was published, e.g. official homepage"
          error={errors.source?.message}
          {...register('source')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Starts" optional type="date" hint="Blank = immediately." error={errors.startsAt?.message} {...register('startsAt')} />
          <TextInput label="Ends" optional type="date" hint="Blank = no end date. Ends at midnight (London)." error={errors.endsAt?.message} {...register('endsAt')} />
        </div>

        <div className="space-y-4 rounded-xl bg-cream/50 p-4 ring-1 ring-ink/5">
          <Checkbox
            label="Verified with the owner"
            description="Tick only once the owner has confirmed the offer and its terms."
            {...register('verified')}
          />
          {!verified && (
            <div role="status">
              <UnverifiedChip />
            </div>
          )}
          <Switch label="Active" description="Show this offer on the website (within its dates)." {...register('active')} />
          {active && !verified && (
            <p className="text-xs font-medium text-amber-900">You’ll be asked to confirm before saving an active, unverified offer.</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
