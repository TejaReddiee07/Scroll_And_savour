import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase, Cake, Heart, PartyPopper, Loader2, Send, CheckCircle2, Info, Phone, Mail } from 'lucide-react';
import CateringParade from '../components/scenes/CateringParade';
import { Seo, SectionTitle, DishImage, Field } from '../components/ui';
import { Reveal, RevealGroup, RevealItem, TiltCard, Magnetic } from '../components/effects/Interactions';
import { SplitReveal } from '../components/fx';
import Photo from '../components/media/Photo';
import { PHOTOS, photoFor } from '../data/photos';
import { useSiteData } from '../context/SiteDataContext';
import { track } from '../context/ConsentContext';
import { api } from '../lib/api';
import { formatGBP, londonNow } from '../lib/format';
import chefImg from '../assets/characters/chef.webp';

const SERVICES = [
  { icon: Briefcase, title: 'Corporate', text: 'Sushi platters and hot-food trays for corporate lunches, meetings and office events.' },
  { icon: Cake, title: 'Birthdays & celebrations', text: 'Sharing platters for birthdays, parties and family celebrations.' },
  { icon: Heart, title: 'Weddings', text: 'Sushi and sashimi selections for wedding receptions and events — tell us your numbers.' },
  { icon: PartyPopper, title: 'Private events', text: 'Planning a private gathering? Ask about platters and availability.' },
];

const PLATTER_TYPES = [
  { key: 'sushi', title: 'Sushi platters', photo: 'fuji-delux-platter', art: 'set:delux', ids: ['fuji-mix-platter', 'maki-ura-platter', 'fuji-delux-platter'] },
  { key: 'sashimi', title: 'Sashimi selections', photo: 'delux-sashimi', art: 'sashimi:delux', ids: ['mix-sashimi', 'delux-sashimi'] },
  { key: 'bento', title: 'Bento boxes', photo: 'sushi-bento', art: 'bento:sushi', ids: ['sushi-bento', 'chicken-katsu-bento', 'vegetable-bento'] },
  { key: 'hot-food', title: 'Hot-food trays', photo: 'chicken-karage', art: 'stirfry:soba-chicken', ids: [] },
];

const EVENT_TYPES = [
  ['corporate', 'Corporate'],
  ['birthday', 'Birthday / celebration'],
  ['wedding', 'Wedding'],
  ['private-event', 'Private event'],
  ['other', 'Other'],
];

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().regex(/^[+()\d\s-]{10,20}$/, 'Please enter a valid phone number'),
  eventType: z.enum(['corporate', 'birthday', 'wedding', 'private-event', 'other'], { message: 'Please choose an event type' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose the event date'),
  guests: z.coerce.number({ message: 'Please enter a number' }).int().min(1, 'At least 1 guest').max(2000),
  budget: z.string().trim().max(60).optional(),
  platters: z.array(z.string()).optional(),
  message: z.string().trim().min(10, 'Tell us a little about your event (10+ characters)').max(2000),
  website: z.string().optional(),
});

function EnquiryForm() {
  const { isOnline, settings } = useSiteData();
  const [done, setDone] = useState(null);
  const [serverError, setServerError] = useState('');
  const today = londonNow().isoDate;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { platters: [], website: '', eventType: undefined } });

  const onSubmit = async (v) => {
    setServerError('');
    if (v.date < today) return setServerError('Please choose a future event date.');
    try {
      if (!isOnline) {
        setServerError('The enquiry form is unavailable right now. Please email or call the restaurant.');
        return undefined;
      }
      const res = await api('/catering', { method: 'POST', body: { ...v, platters: v.platters || [] } });
      setDone({ sent: true, reference: res.reference });
      track('catering_enquiry');
      reset();
    } catch (e) {
      setServerError(e.message || 'Something went wrong — please email or call the restaurant.');
    }
    return undefined;
  };
  const field = (name) => ({ id: `ct-${name}`, 'aria-invalid': errors[name] ? 'true' : 'false', 'aria-describedby': errors[name] ? `ct-${name}-error` : undefined });

  if (done) {
    return (
      <div className="card p-8" role="status" aria-live="polite">
        <CheckCircle2 className="text-emerald-400" size={36} aria-hidden="true" />
        <h3 className="mt-3 display text-3xl">Enquiry sent</h3>
        <p className="mt-2 text-cream/75">
          {`Thank you — the restaurant will be in touch. Reference ${done.reference}.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`mailto:${settings.contact.email}?subject=Catering%20enquiry`} className="btn btn-primary"><Mail size={16} /> Email</a>
          <a href={`tel:${settings.contact.phoneIntl}`} className="btn btn-outline"><Phone size={16} /> {settings.contact.phone}</a>
          <button type="button" className="btn btn-outline" onClick={() => setDone(null)}>New enquiry</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-5 p-6 sm:p-8">
      <div className="hidden" aria-hidden="true">
        <label htmlFor="ct-website">Website</label>
        <input id="ct-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" id="ct-name" error={errors.name?.message} required>
          <input className="field" autoComplete="name" {...field('name')} {...register('name')} />
        </Field>
        <Field label="Email" id="ct-email" error={errors.email?.message} required>
          <input className="field" type="email" autoComplete="email" {...field('email')} {...register('email')} />
        </Field>
        <Field label="Phone" id="ct-phone" error={errors.phone?.message} required>
          <input className="field" type="tel" autoComplete="tel" {...field('phone')} {...register('phone')} />
        </Field>
        <Field label="Event type" id="ct-eventType" error={errors.eventType?.message} required>
          <select className="field" defaultValue="" {...field('eventType')} {...register('eventType')}>
            <option value="" disabled>Choose…</option>
            {EVENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Event date" id="ct-date" error={errors.date?.message} required>
          <input className="field" type="date" min={today} {...field('date')} {...register('date')} />
        </Field>
        <Field label="Number of guests" id="ct-guests" error={errors.guests?.message} required>
          <input className="field" type="number" min="1" inputMode="numeric" {...field('guests')} {...register('guests')} />
        </Field>
      </div>
      <Field label="Budget (optional)" id="ct-budget" error={errors.budget?.message} hint="e.g. £300–£500">
        <input className="field" {...field('budget')} {...register('budget')} />
      </Field>
      <fieldset>
        <legend className="field-label">Interested in</legend>
        <div className="flex flex-wrap gap-2">
          {PLATTER_TYPES.map((p) => (
            <label key={p.key} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-hair bg-white px-3 py-2 text-sm has-[:checked]:border-fuji-red has-[:checked]:bg-fuji-red/5">
              <input type="checkbox" value={p.key} className="accent-fuji-red" {...register('platters')} />
              {p.title}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Tell us about your event" id="ct-message" error={errors.message?.message} required hint="Venue/area, timings, dietary needs and any allergies.">
        <textarea className="field min-h-32" rows={5} {...field('message')} {...register('message')} />
      </Field>
      {serverError && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200" role="alert">{serverError}</p>}
      <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Send enquiry
      </button>
    </form>
  );
}

export default function Catering() {
  const { getItem } = useSiteData();
  return (
    <>
      <Seo
        title="Catering"
        description="Sushi platters, sashimi selections and hot-food trays from Fuji for corporate lunches, birthdays, celebrations, weddings and private events in London."
        path="/catering"
      />
      <section className="relative overflow-hidden pb-16 pt-32 sm:pt-40">
        <span aria-hidden="true" className="jp pointer-events-none absolute -left-4 top-14 text-[clamp(7rem,18vw,15rem)] leading-none text-cream/[0.04]">宴</span>
        <div className="container-x relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <p className="eyebrow"><b>—</b> Events & catering</p>
            <SplitReveal as="h1" immediate className="mt-5 text-[clamp(3rem,8vw,7rem)]">Platters for <em>every party.</em></SplitReveal>
            <p className="mt-5 max-w-xl text-lg text-cream/75">
              Sushi platters, sashimi selections and hot-food trays for corporate lunches, events, birthdays, celebrations and
              weddings — with custom platters and dietary options on request.
            </p>
            <Magnetic className="mt-8">
              <a href="#enquiry" className="btn btn-primary">Send an enquiry</a>
            </Magnetic>
          </Reveal>
          <Reveal delay={0.15} className="relative mx-auto h-80 w-full max-w-md">
            <div className="absolute inset-x-6 bottom-0 top-10 rounded-t-[999px] rounded-b-[28px] border border-hair bg-[radial-gradient(ellipse_at_50%_35%,#3a2416,#120d0a_75%)]" />
            <div className="absolute -left-2 top-4 h-40 w-40 rotate-[-8deg] overflow-hidden rounded-full border border-hair shadow-2xl"><Photo photo={PHOTOS.catering} alt="Fuji catering sushi platter" sizes="160px" className="h-full w-full" /></div>
            <div className="absolute -right-2 top-24 h-36 w-36 rotate-[6deg] overflow-hidden rounded-full border border-hair shadow-2xl"><Photo photo={photoFor('delux-sashimi')} alt="Fuji Delux Sashimi" sizes="144px" className="h-full w-full" /></div>
            <img src={chefImg} alt="Illustrated chef mascot (illustration, not a member of staff)" width="195" height="342" className="absolute bottom-0 left-1/2 h-72 w-auto -translate-x-1/2 drop-shadow-2xl" />

          </Reveal>
        </div>
      </section>

      <CateringParade />

      <section className="py-24" aria-labelledby="svc-title">
        <div className="container-x">
          <Reveal>
            <SectionTitle eyebrow="Occasions" title="Food for every gathering" kanji="祝" id="svc-title" />
          </Reveal>
          <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <RevealItem key={s.title}>
                <TiltCard className="card h-full p-6">
                  <s.icon className="text-fuji-red" size={30} aria-hidden="true" />
                  <h3 className="mt-4 display text-xl text-cream">{s.title}</h3>
                  <p className="mt-2 text-sm text-cream/70">{s.text}</p>
                </TiltCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="washi py-24" aria-labelledby="platter-title">
        <div className="container-x">
          <Reveal>
            <SectionTitle eyebrow="Platters" title="What we can prepare" kanji="盛" id="platter-title">
              <p>Examples from the restaurant&apos;s published menu. Catering packages and pricing are confirmed on enquiry.</p>
            </SectionTitle>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLATTER_TYPES.map((p) => (
              <RevealItem key={p.key} className="card flex flex-col overflow-hidden">
                <DishImage item={{ id: p.photo, name: p.title, art: p.art, hot: p.key === 'hot-food' }} className="aspect-[4/3]" />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="display text-xl">{p.title}</h3>
                  {p.ids.length ? (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {p.ids.map((id) => getItem(id)).filter(Boolean).map((i) => (
                        <li key={i.id} className="flex justify-between gap-2 border-b border-hair pb-1.5">
                          <span>{i.name}</span>
                          <span className="font-semibold text-fuji-red">{formatGBP(i.price)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-cream/65">Hot-food trays are advertised by the restaurant — dishes and pricing on enquiry.</p>
                  )}
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section id="enquiry" className="scroll-mt-24 py-24" aria-labelledby="enq-title">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <SectionTitle eyebrow="Enquire" title="Plan your event with us" kanji="相談" id="enq-title">
              <p>Tell us about the occasion and we&apos;ll come back with options.</p>
            </SectionTitle>
            <div className="mt-8 flex gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-5 text-sm text-cream/80">
              <Info className="shrink-0 text-gold" size={20} aria-hidden="true" />
              <p>
                Catering packages, minimum order, lead time and service area are to be confirmed with the restaurant. Our kitchen handles
                fish, gluten, soy, sesame and shellfish, and salad dressings contain nuts — please share every dietary requirement.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <EnquiryForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
