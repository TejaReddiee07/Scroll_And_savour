import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExternalLink, Loader2, ShoppingBag, Info, CreditCard, HandCoins, Lock } from 'lucide-react';
import { Seo, DishImage, DietaryBadges, Field } from '../components/ui';
import { AddButton } from '../components/menu/DishCard';
import { CartSummary } from '../components/layout/CartDrawer';
import { PageHero } from '../components/fx';
import { MenuFilters, useMenuFilter, AllergenNotice } from './Menu';
import { useSiteData } from '../context/SiteDataContext';
import { useCart } from '../context/CartContext';
import { track } from '../context/ConsentContext';
import { api } from '../lib/api';
import { usePaymentConfig, METHOD_LABELS, rememberPendingPayment, clearPendingPayment } from '../lib/payments';
import StripePay from '../components/checkout/StripePay';
import { SITE } from '../data/site';
import { formatGBP, cx } from '../lib/format';
import waiterImg from '../assets/characters/waiter.webp';

const UK_POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;
const PHONE = /^[+()\d\s-]{10,20}$/;

const schema = z
  .object({
    fulfilment: z.enum(['delivery', 'collection']),
    name: z.string().trim().min(2, 'Please enter your name').max(80),
    phone: z.string().trim().regex(PHONE, 'Please enter a valid phone number'),
    email: z.string().trim().email('Please enter a valid email address'),
    line1: z.string().trim().max(120).optional(),
    line2: z.string().trim().max(120).optional(),
    postcode: z.string().trim().max(10).optional(),
    notes: z.string().trim().max(500).optional(),
    website: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfilment !== 'delivery') return;
    if (!v.line1 || v.line1.length < 3) ctx.addIssue({ path: ['line1'], code: 'custom', message: 'Please enter the delivery address' });
    if (!v.postcode || !UK_POSTCODE.test(v.postcode)) ctx.addIssue({ path: ['postcode'], code: 'custom', message: 'Please enter a valid UK postcode' });
  });

function OrderRow({ item }) {
  const ref = useRef(null);
  return (
    <li className={cx('flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/5', item.available === false && 'opacity-55')}>
      <div ref={ref} className="shrink-0">
        <DishImage item={item} className="h-[72px] w-24 rounded-xl" steam={false} compactLabel />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold text-cream">{item.name}</p>
          <p className="shrink-0 text-sm tabular-nums text-gold-soft">{formatGBP(item.price)}</p>
        </div>
        {item.description && <p className="truncate text-xs text-cream/55">{item.description}</p>}
        <DietaryBadges dietary={item.dietary} tags={item.tags} size="xs" className="mt-1" />
      </div>
      <AddButton item={item} sourceRef={ref} compact />
    </li>
  );
}

function PaymentChoice({ value, onChange, config, liveOrdering }) {
  const options = [];
  if (config?.enabled) options.push({ id: 'online', title: 'Pay now', sub: (config.methods || []).map((m) => METHOD_LABELS[m] || m).join(' · ') });
  if (config?.inPerson !== false) options.push({ id: 'in-person', title: 'Pay on collection / delivery', sub: 'Card or cash when you get your food' });
  if (options.length < 2) return null;
  return (
    <fieldset>
      <legend className="field-label">How would you like to pay?</legend>
      <div className="grid gap-2" role="radiogroup">
        {options.map((o) => (
          <label
            key={o.id}
            className={cx(
              'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition',
              value === o.id ? 'border-saffron bg-saffron/5' : 'border-hair hover:border-cream/30',
            )}
          >
            <input type="radio" name="payment-choice" value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} className="mt-1 accent-[#f0a032]" />
            <span>
              <span className="flex items-center gap-2 font-semibold text-cream">
                {o.id === 'online' ? <CreditCard size={16} aria-hidden="true" /> : <HandCoins size={16} aria-hidden="true" />}
                {o.title}
              </span>
              <span className="mt-0.5 block text-xs text-cream/60">{o.sub}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Checkout() {
  const { isOnline, liveOrdering, settings } = useSiteData();
  const cart = useCart();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const payConfig = usePaymentConfig(isOnline);
  const [payChoice, setPayChoice] = useState(null);
  const [stripeReady, setStripeReady] = useState(false);
  const payRef = useRef(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { fulfilment: cart.fulfilment, website: '' } });

  useEffect(() => setValue('fulfilment', cart.fulfilment), [cart.fulfilment, setValue]);
  // default: pay online when it's available
  useEffect(() => {
    if (!payConfig || payChoice) return;
    setPayChoice(payConfig.enabled ? 'online' : 'in-person');
  }, [payConfig, payChoice]);

  const fulfilment = watch('fulfilment');
  const belowMinimum = settings.minimumOrder != null && cart.subtotal < Number(settings.minimumOrder);
  const online = isOnline && payChoice === 'online' && payConfig?.enabled;
  const amountPence = Math.round(cart.total * 100);

  const onSubmit = async (v) => {
    setServerError('');
    if (!cart.lines.length) return setServerError('Your cart is empty — add a dish first.');
    if (cart.lines.some((l) => l.available === false)) return setServerError('Please remove unavailable items from your cart.');
    if (belowMinimum) return setServerError(`The minimum order is ${formatGBP(settings.minimumOrder)}.`);
    if (!isOnline) return setServerError('Online ordering is unavailable right now. Please call the restaurant on 020 7254 6093 to order.');
    const customer = {
      name: v.name,
      phone: v.phone,
      email: v.email,
      notes: v.notes || '',
      ...(v.fulfilment === 'delivery' ? { address: { line1: v.line1, line2: v.line2 || '', postcode: v.postcode.toUpperCase() } } : {}),
    };
    const body = (payment) => ({
      items: cart.lines.map((l) => ({ itemId: l.id, quantity: l.qty })),
      fulfilment: v.fulfilment,
      customer,
      website: v.website,
      payment,
    });
    try {
      let reference;
      if (online) {
        const result = await payRef.current.pay({
          createOrder: async () => {
            const order = await api('/orders', { method: 'POST', body: body('online') });
            rememberPendingPayment(order.reference);
            return order;
          },
          returnUrl: (ref) => `${window.location.origin}/order/track/${ref}?pay=1`,
        });
        reference = result.reference;
      } else {
        reference = (await api('/orders', { method: 'POST', body: body('in-person') })).reference;
      }
      track('order_submitted', { payment: online ? 'online' : 'in-person' });
      cart.clear();
      clearPendingPayment();
      navigate(`/order/track/${reference}${online ? '?pay=1' : ''}`);
    } catch (e) {
      setServerError(
        e.reference
          ? `${e.message} Your order ${e.reference} is saved but not paid — you can try paying again.`
          : e.message || 'Something went wrong. Please try again or call the restaurant.',
      );
    }
    return undefined;
  };

  const field = (name) => ({ id: `co-${name}`, 'aria-invalid': errors[name] ? 'true' : 'false', 'aria-describedby': errors[name] ? `co-${name}-error` : undefined });

  return (
    <form id="checkout" onSubmit={handleSubmit(onSubmit)} noValidate className="scroll-mt-28 space-y-4">
      <h2 className="display text-2xl text-cream">Your details</h2>
      <input type="hidden" {...register('fulfilment')} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="co-website">Website</label>
        <input id="co-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>
      <Field label="Full name" id="co-name" error={errors.name?.message} required>
        <input className="field" autoComplete="name" {...field('name')} {...register('name')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" id="co-phone" error={errors.phone?.message} required>
          <input className="field" type="tel" autoComplete="tel" {...field('phone')} {...register('phone')} />
        </Field>
        <Field label="Email" id="co-email" error={errors.email?.message} required>
          <input className="field" type="email" autoComplete="email" {...field('email')} {...register('email')} />
        </Field>
      </div>
      {fulfilment === 'delivery' && (
        <>
          <Field label="Address line 1" id="co-line1" error={errors.line1?.message} required>
            <input className="field" autoComplete="address-line1" {...field('line1')} {...register('line1')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="Address line 2" id="co-line2" error={errors.line2?.message}>
              <input className="field" autoComplete="address-line2" {...field('line2')} {...register('line2')} />
            </Field>
            <Field label="Postcode" id="co-postcode" error={errors.postcode?.message} required>
              <input className="field uppercase" autoComplete="postal-code" {...field('postcode')} {...register('postcode')} />
            </Field>
          </div>
          <p className="text-xs text-cream/60">Delivery areas and fees are to be confirmed by the restaurant.</p>
        </>
      )}
      <Field label="Notes for the kitchen (optional)" id="co-notes" error={errors.notes?.message} hint="Please tell the restaurant about any allergies by phone before ordering.">
        <textarea className="field min-h-20" rows={3} {...field('notes')} {...register('notes')} />
      </Field>

      {isOnline && <PaymentChoice value={payChoice} onChange={setPayChoice} config={payConfig} liveOrdering={liveOrdering} />}
      {online && cart.lines.length > 0 && (
        <div className="rounded-2xl border border-hair bg-ink/40 p-4" aria-label="Payment details">
          {!stripeReady && (
            <p className="mono flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-cream/60">
              <Loader2 className="animate-spin" size={14} /> Loading secure payment form…
            </p>
          )}
          <StripePay ref={payRef} publishableKey={payConfig.publishableKey} amountPence={amountPence} onReady={() => setStripeReady(true)} />
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-cream/55">
            <Lock size={12} aria-hidden="true" /> Payments are processed by Stripe. Card details never touch Fuji&apos;s servers.
          </p>
        </div>
      )}

      {serverError && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200" role="alert">{serverError}</p>}
      <button type="submit" disabled={isSubmitting || !cart.lines.length || (online && !stripeReady)} className="btn btn-primary w-full">
        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : online ? <Lock size={18} /> : <ShoppingBag size={18} />}
        {online ? `Pay ${formatGBP(cart.total)}` : `Place order · ${formatGBP(cart.total)}`}
      </button>
      <p className="text-center text-xs text-cream/60">
        {!isOnline
          ? 'Online ordering is unavailable right now — please call 020 7254 6093.'
          : online
            ? 'You are charged now. The kitchen starts as soon as the payment is confirmed.'
            : 'Pay the restaurant when your order is handed over.'}
      </p>
    </form>
  );
}

export default function Order() {
  const { categories, isOnline, liveOrdering } = useSiteData();
  const { lines } = useCart();
  const f = useMenuFilter(categories);
  const [cat, setCat] = useState('all');
  const shown = useMemo(() => (cat === 'all' ? f.filtered : f.filtered.filter((c) => c.slug === cat)), [cat, f.filtered]);

  return (
    <>
      <Seo title="Order online" description="Order Fuji's sushi, ramen, katsu curry and bento for delivery or collection in Stoke Newington, London N16." path="/order" />
      <PageHero
        num="—"
        label="Delivery & collection"
        jp="注文"
        title="Order"
        em="online."
        aside={<img src={waiterImg} alt="Illustrated waiter mascot presenting a tray (illustration)" width="437" height="360" className="ml-auto hidden w-64 rounded-[22px] border border-hair bg-cream/95 px-2 pt-2 lg:block" />}
      >
            <div className="flex flex-wrap items-center gap-3">
            </div>
            <p className="mt-4 text-base">
              {'Order for collection or delivery and pay securely online with card, Apple Pay, Google Pay, Revolut Pay or Klarna — or pay when your food is handed over. You can also order through:'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ['Official website', SITE.links.officialSite],
                ['Deliveroo', SITE.links.deliveroo],
                ['Uber Eats', SITE.links.uberEats],
              ].map(([l, h]) => (
                <a key={h} href={h} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" onClick={() => track('order_click', { channel: l })}>
                  {l} <ExternalLink size={13} />
                </a>
              ))}
            </div>
      </PageHero>

      <div className="container-x grid gap-10 pb-24 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <MenuFilters f={f} />
          <div className="no-scrollbar -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Category">
            <button type="button" className="chip shrink-0" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>All</button>
            {f.filtered.map((c) => (
              <button key={c.slug} type="button" className="chip shrink-0" aria-pressed={cat === c.slug} onClick={() => setCat(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
          <AllergenNotice className="mt-5" />
          <div className="mt-6 space-y-8">
            {shown.map((c) => (
              <section key={c.slug} aria-labelledby={`o-${c.slug}`}>
                <h2 id={`o-${c.slug}`} className="sticky top-0 z-10 -mx-2 bg-ink/90 px-2 py-3 text-3xl text-cream backdrop-blur transition-[top] duration-500 [html.header-shown_&]:top-16 md:[html.header-shown_&]:top-20">
                  {c.name} <span className="jp text-base text-saffron/80">{c.jp}</span>
                </h2>
                {c.note && <p className="mb-2 flex gap-1.5 text-xs text-gold-soft"><Info size={13} className="mt-0.5" /> {c.note}</p>}
                <ul className="space-y-1">
                  {c.items.map((item) => <OrderRow key={item.id} item={item} />)}
                </ul>
              </section>
            ))}
            {!shown.length && <p className="py-12 text-center text-cream/60">No dishes match. Try clearing the filters.</p>}
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto" data-lenis-prevent="" aria-label="Your order and checkout">
          <div className="card space-y-6 p-5 sm:p-6">
            <h2 className="display text-3xl text-cream">Your <em>order</em></h2>
            {lines.length ? <CartSummary compact /> : <p className="text-sm text-cream/60">Your cart is empty — add dishes from the list.</p>}
            <hr className="border-cream/10" />
            <Checkout />
          </div>
        </aside>
      </div>
    </>
  );
}
