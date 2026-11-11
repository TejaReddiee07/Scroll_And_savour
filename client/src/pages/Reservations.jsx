import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, Loader2, Phone, ExternalLink, CheckCircle2, RotateCcw } from 'lucide-react';
import TableSetting from '../components/scenes/TableSetting';
import { Seo, Field } from '../components/ui';
import { Reveal } from '../components/effects/Interactions';
import { PageHero } from '../components/fx';
import { useSiteData } from '../context/SiteDataContext';
import { track } from '../context/ConsentContext';
import { api } from '../lib/api';
import { londonNow, toMinutes, formatDate } from '../lib/format';
import { SITE } from '../data/site';
import waiterImg from '../assets/characters/waiter.webp';

const PHONE = /^[+()\d\s-]{10,20}$/;

function slotsFor(hours, isoDate) {
  if (!isoDate) return [];
  const day = new Date(`${isoDate}T12:00:00`).getDay();
  const h = hours.find((x) => x.day === day);
  if (!h || h.closed) return [];
  const out = [];
  const now = londonNow();
  for (let m = toMinutes(h.open); m <= toMinutes(h.close) - 30; m += 15) {
    if (isoDate === now.isoDate && m <= now.minutes + 30) continue;
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

export default function Reservations() {
  const { settings, isOnline, liveBooking } = useSiteData();
  const today = londonNow().isoDate;
  const [result, setResult] = useState(null);
  const [serverError, setServerError] = useState('');

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().trim().min(2, 'Please enter your name').max(80),
          phone: z.string().trim().regex(PHONE, 'Please enter a valid phone number'),
          email: z.string().trim().email('Please enter a valid email address'),
          guests: z.coerce.number().int().min(1).max(20),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a date'),
          time: z.string().regex(/^\d{2}:\d{2}$/, 'Please choose a time'),
          requests: z.string().trim().max(500).optional(),
          website: z.string().optional(),
        })
        .superRefine((v, ctx) => {
          if (v.date < today) ctx.addIssue({ path: ['date'], code: 'custom', message: 'Please choose today or a future date' });
          else if (!slotsFor(settings.hours, v.date).includes(v.time)) ctx.addIssue({ path: ['time'], code: 'custom', message: 'Please choose an available time' });
        }),
    [settings.hours, today],
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { guests: 2, date: '', time: '', website: '' } });

  const date = watch('date');
  const guests = Number(watch('guests')) || 2;
  const slots = slotsFor(settings.hours, date);

  const onSubmit = async (v) => {
    setServerError('');
    try {
      let res;
      if (!isOnline) {
        setServerError('Online booking is unavailable right now. Please call the restaurant on 020 7254 6093 to book.');
        return;
      }
      res = await api('/reservations', { method: 'POST', body: v });
      track('reservation_submitted', { guests: v.guests });
      setResult({ ...v, ...res });
    } catch (e) {
      setServerError(e.message || 'Something went wrong — please call the restaurant.');
    }
  };

  const field = (name) => ({ id: `rs-${name}`, 'aria-invalid': errors[name] ? 'true' : 'false', 'aria-describedby': errors[name] ? `rs-${name}-error` : undefined });

  return (
    <>
      <Seo title="Book a table" description="Reserve a table at Fuji Japanese Restaurant, 15 Stoke Newington Church Street, London N16 0NX." path="/reservations" />
      <PageHero num="—" label="Reservations" jp="予約" title="Book" em="a table.">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-cream/60">Prefer to book directly? Call, or use the restaurant&apos;s booking page.</p>
        </div>
      </PageHero>
      <div className="pb-24">
        <div className="container-x">
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
            <Reveal className="lg:sticky lg:top-28">
              <div className="overflow-hidden rounded-[24px] border border-hair bg-[#efe6d6]">
                <TableSetting
                  confirmed={!!result}
                  guests={result ? Number(result.guests) : guests}
                  name={result?.name || ''}
                  time={result?.time || ''}
                  dateLabel={result ? new Date(`${result.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                />
              </div>
              <p className="mt-3 text-center text-xs text-cream/55">Illustration — the waiter is an animated character, not a real member of staff.</p>
            </Reveal>

            <Reveal delay={0.1}>
              {result ? (
                <div className="card p-6 sm:p-8" role="status" aria-live="polite">
                  <CheckCircle2 className="text-emerald-400" size={36} aria-hidden="true" />
                  <h2 className="mt-3 display text-3xl">Request received</h2>
                  <p className="mt-3 text-cream/75">
                    Thank you — the restaurant will confirm your table by phone or email. For changes, call{' '}
                    <a className="font-semibold underline" href={`tel:${settings.contact.phoneIntl}`}>{settings.contact.phone}</a>.
                  </p>
                  <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                    <div><dt className="text-cream/55">Reference</dt><dd className="font-semibold">{result.reference}</dd></div>
                    <div><dt className="text-cream/55">Name</dt><dd className="font-semibold">{result.name}</dd></div>
                    <div><dt className="text-cream/55">Date</dt><dd className="font-semibold">{formatDate(result.date)}</dd></div>
                    <div><dt className="text-cream/55">Time · guests</dt><dd className="font-semibold">{result.time} · {result.guests}</dd></div>
                  </dl>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a href={SITE.links.officialReservations} target="_blank" rel="noreferrer" className="btn btn-primary">Official booking page <ExternalLink size={15} /></a>
                    <button type="button" className="btn btn-outline" onClick={() => { setResult(null); reset(); }}>
                      <RotateCcw size={15} /> Make another
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-6 sm:p-8">
                  <div className="flex items-center gap-4">
                    <img src={waiterImg} alt="" width="437" height="360" className="h-20 w-24 rounded-2xl border border-hair bg-cream object-cover object-top" />
                    <p className="display text-2xl italic leading-snug">“Tell me when you&apos;re coming — I&apos;ll lay your table.”</p>
                  </div>
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="rs-website">Website</label>
                    <input id="rs-website" tabIndex={-1} autoComplete="off" {...register('website')} />
                  </div>
                  <Field label="Full name" id="rs-name" error={errors.name?.message} required>
                    <input className="field" autoComplete="name" {...field('name')} {...register('name')} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone" id="rs-phone" error={errors.phone?.message} required>
                      <input className="field" type="tel" autoComplete="tel" {...field('phone')} {...register('phone')} />
                    </Field>
                    <Field label="Email" id="rs-email" error={errors.email?.message} required>
                      <input className="field" type="email" autoComplete="email" {...field('email')} {...register('email')} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Guests" id="rs-guests" error={errors.guests?.message} required>
                      <select className="field" {...field('guests')} {...register('guests')}>
                        {[...Array(20)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i ? 'guests' : 'guest'}</option>)}
                      </select>
                    </Field>
                    <Field label="Date" id="rs-date" error={errors.date?.message} required>
                      <input className="field" type="date" min={today} {...field('date')} {...register('date')} />
                    </Field>
                    <Field label="Time" id="rs-time" error={errors.time?.message} required>
                      <select className="field" disabled={!date || !slots.length} {...field('time')} {...register('time')}>
                        <option value="">{!date ? 'Pick a date' : slots.length ? 'Choose…' : 'No times'}</option>
                        {slots.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Special requests (optional)" id="rs-requests" error={errors.requests?.message} hint="Allergies, high chair, celebrations…">
                    <textarea className="field min-h-24" rows={3} {...field('requests')} {...register('requests')} />
                  </Field>
                  {serverError && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200" role="alert">{serverError}</p>}
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CalendarDays size={18} />}
                    Request booking
                  </button>
                  <p className="text-xs text-cream/60">
                    Times follow the published opening hours, which are still to be confirmed by the restaurant. Large groups and private events:
                    see <Link to="/catering" className="underline">catering</Link> or call us. By submitting you agree to our{' '}
                    <Link to="/privacy" className="underline">privacy policy</Link>.
                  </p>
                </form>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <a href={`tel:${settings.contact.phoneIntl}`} className="btn btn-outline" onClick={() => track('call_click')}>
                  <Phone size={16} /> Call
                </a>
                <a href={SITE.links.officialReservations} target="_blank" rel="noreferrer" className="btn btn-outline" onClick={() => track('reservation_click', { channel: 'official' })}>
                  Official page <ExternalLink size={14} />
                </a>
                <a href={SITE.links.openTable} target="_blank" rel="noreferrer" className="btn btn-outline" onClick={() => track('reservation_click', { channel: 'opentable' })}>
                  OpenTable <ExternalLink size={14} />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </>
  );
}
