import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Phone, Mail, Clock, TrainFront, ExternalLink, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { Seo, SectionTitle, Field } from '../components/ui';
import { Reveal } from '../components/effects/Interactions';
import MapEmbed from '../components/MapEmbed';
import { useSiteData } from '../context/SiteDataContext';
import { track } from '../context/ConsentContext';
import { api } from '../lib/api';
import { SITE } from '../data/site';
import { openStatus, summariseHours } from '../lib/format';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10, 'Please write at least 10 characters').max(2000),
  website: z.string().optional(),
});

function ContactForm() {
  const { isOnline, settings } = useSiteData();
  const [done, setDone] = useState(null);
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { website: '' } });
  const onSubmit = async (v) => {
    setServerError('');
    try {
      if (!isOnline) {
        setServerError('The contact form is unavailable right now. Please email or call the restaurant.');
        return;
      }
      await api('/contact', { method: 'POST', body: v });
      track('contact_message');
      setDone('sent');
      reset();
    } catch (e) {
      setServerError(e.message || 'Something went wrong — please email or call instead.');
    }
  };
  const field = (name) => ({ id: `cf-${name}`, 'aria-invalid': errors[name] ? 'true' : 'false', 'aria-describedby': errors[name] ? `cf-${name}-error` : undefined });

  if (done) {
    return (
      <div className="card p-8" role="status" aria-live="polite">
        <CheckCircle2 className="text-emerald-400" size={34} aria-hidden="true" />
        <h3 className="mt-3 display text-2xl text-cream">Message sent — thank you!</h3>
        <p className="mt-2 text-cream/70">
          The restaurant will reply as soon as they can.
        </p>
        <button type="button" onClick={() => setDone(null)} className="btn btn-outline mt-6">Write another</button>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-4 p-6 sm:p-8">
      <h3 className="display text-2xl text-cream">Send a message</h3>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="cf-website">Website</label>
        <input id="cf-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" id="cf-name" error={errors.name?.message} required>
          <input className="field" autoComplete="name" {...field('name')} {...register('name')} />
        </Field>
        <Field label="Email" id="cf-email" error={errors.email?.message} required>
          <input className="field" type="email" autoComplete="email" {...field('email')} {...register('email')} />
        </Field>
        <Field label="Phone (optional)" id="cf-phone" error={errors.phone?.message}>
          <input className="field" type="tel" autoComplete="tel" {...field('phone')} {...register('phone')} />
        </Field>
        <Field label="Subject (optional)" id="cf-subject" error={errors.subject?.message}>
          <input className="field" {...field('subject')} {...register('subject')} />
        </Field>
      </div>
      <Field label="Message" id="cf-message" error={errors.message?.message} required>
        <textarea className="field min-h-32" rows={5} {...field('message')} {...register('message')} />
      </Field>
      {serverError && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200" role="alert">{serverError}</p>}
      <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Send message
      </button>
      <p className="text-xs text-cream/50">For allergy questions about a specific order, please call the restaurant directly.</p>
    </form>
  );
}

export default function Contact() {
  const { settings } = useSiteData();
  const c = settings.contact;
  const hours = summariseHours(settings.hours);
  const status = openStatus(settings.hours);

  return (
    <>
      <Seo title="Contact & find us" description="Contact Fuji Japanese Restaurant: 15 Stoke Newington Church Street, London N16 0NX · 020 7254 6093 · opening hours, map and directions." path="/contact" />
      <section className="relative overflow-hidden pb-12 pt-32 sm:pt-40">
        <div className="container-x">
          <Reveal>
            <SectionTitle eyebrow="連絡 · Contact" title="Contact & find us" kanji="連絡" as="h1" />
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MapPin, title: 'Address', body: c.addressLines.join(', '), href: SITE.links.maps, cta: 'Open in Maps', ext: true },
              { icon: Phone, title: 'Phone', body: c.phone, href: `tel:${c.phoneIntl}`, cta: 'Tap to call', track: 'call_click' },
              { icon: Mail, title: 'Email', body: c.email, href: `mailto:${c.email}`, cta: 'Write an email' },
              { icon: Clock, title: 'Today', body: status.label, href: '#hours', cta: 'All hours' },
            ].map((x, i) => (
              <Reveal key={x.title} delay={i * 0.06}>
                <a
                  href={x.href}
                  target={x.ext ? '_blank' : undefined}
                  rel={x.ext ? 'noreferrer' : undefined}
                  onClick={() => x.track && track(x.track)}
                  className="card group flex h-full flex-col gap-2 p-6 transition hover:border-gold/50"
                >
                  <x.icon className="text-fuji-red" size={26} aria-hidden="true" />
                  <h2 className="mt-2 font-sans text-xs font-bold uppercase tracking-[0.2em] text-gold">{x.title}</h2>
                  <p className="break-words display text-lg text-cream">{x.body}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm text-cream/60 group-hover:text-white">
                    {x.cta} {x.ext && <ExternalLink size={13} />}
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="container-x grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Reveal className="min-h-[420px] overflow-hidden rounded-[22px] border border-hair">
            <MapEmbed className="h-full min-h-[420px] w-full" />
          </Reveal>
          <Reveal delay={0.1} className="space-y-6">
            <div id="hours" className="card scroll-mt-28 p-6">
              <h2 className="display text-2xl text-cream">Opening hours</h2>
              <dl className="mt-4 space-y-2 text-sm">
                {hours.map((h) => (
                  <div key={h.days} className="flex justify-between border-b border-cream/10 pb-2">
                    <dt>{h.days}</dt>
                    <dd className="tabular-nums text-cream">{h.time}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-cream/55">{settings.hoursNote}</p>
            </div>
            <div className="card p-6">
              <h2 className="flex items-center gap-2 display text-2xl text-cream"><TrainFront size={22} className="text-gold" aria-hidden="true" /> Getting here</h2>
              <p className="mt-3 text-sm text-cream/75">
                We&apos;re on Stoke Newington Church Street, London N16 0NX. The nearest rail station is Stoke Newington (London
                Overground), and several bus routes serve Stoke Newington High Street. Check live routes before you travel:
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={SITE.links.tfl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">TfL Journey Planner <ExternalLink size={13} /></a>
                <a href={SITE.links.maps} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Google Maps <ExternalLink size={13} /></a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 pt-12">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <SectionTitle eyebrow="Get in touch" title="Questions, feedback, large groups" kanji="手紙">
              <p>For bookings use the <Link to="/reservations" className="underline decoration-gold">reservations page</Link>; for events, our <Link to="/catering#enquiry" className="underline decoration-gold">catering enquiry form</Link>.</p>
            </SectionTitle>
            <div className="mt-8 rounded-2xl border border-cream/10 p-5 text-sm text-cream/70">
              <p className="font-semibold text-cream">Order & book elsewhere</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ['Deliveroo', SITE.links.deliveroo],
                  ['Uber Eats', SITE.links.uberEats],
                  ['OpenTable', SITE.links.openTable],
                  ['Official site', SITE.links.officialContact],
                ].map(([l, h]) => (
                  <a key={h} href={h} target="_blank" rel="noreferrer" className="chip">{l} <ExternalLink size={12} /></a>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
