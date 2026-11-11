import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ExternalLink, KeyRound } from 'lucide-react';
import { SITE } from '../../data/site';
import { useSiteData } from '../../context/SiteDataContext';
import { useConsent } from '../../context/ConsentContext';
import { useMotion } from '../../context/MotionContext';
import { summariseHours } from '../../lib/format';
import { RollText } from '../fx';
import { Logo, MotionToggle, OpenPill } from './Header';

gsap.registerPlugin(ScrollTrigger);

const explore = [
  { to: '/menu', label: 'Full menu' },
  { to: '/order', label: 'Order online' },
  { to: '/reservations', label: 'Book a table' },
  { to: '/catering', label: 'Catering' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Visit & contact' },
];

const elsewhere = [
  { href: SITE.links.deliveroo, label: 'Deliveroo' },
  { href: SITE.links.uberEats, label: 'Uber Eats' },
  { href: SITE.links.openTable, label: 'OpenTable' },
  { href: SITE.links.maps, label: 'Google Maps' },
  { href: SITE.links.officialSite, label: 'fujirestaurant.co.uk' },
];

const WORD = 'FUJI';

export default function Footer() {
  const { settings } = useSiteData();
  const { openPanel } = useConsent();
  const { still } = useMotion();
  const wordRef = useRef(null);
  const hours = summariseHours(settings.hours);
  const c = settings.contact;

  // giant wordmark rises letter by letter from the centre
  useLayoutEffect(() => {
    if (still || !wordRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.from(wordRef.current.querySelectorAll('.fl'), {
        yPercent: 105,
        duration: 1.2,
        ease: 'expo.out',
        stagger: { each: 0.08, from: 'center' },
        scrollTrigger: { trigger: wordRef.current, start: 'top 92%', once: true },
      });
    }, wordRef);
    return () => ctx.revert();
  }, [still]);

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-hair bg-ink text-cream/80">
      <div className="container-x grid gap-12 py-20 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="display mt-6 max-w-xs text-2xl text-cream">
            A taste of Japan in the heart of <em>Stoke Newington.</em>
          </p>
          <OpenPill className="mt-6" />
        </div>
        <nav aria-label="Footer">
          <h2 className="mono text-[0.68rem] uppercase tracking-[0.2em] text-saffron">Explore</h2>
          <ul className="mt-4 space-y-2">
            {explore.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-cream"><RollText>{l.label}</RollText></Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="mono text-[0.68rem] uppercase tracking-[0.2em] text-saffron">Visit</h2>
          <address className="mt-4 not-italic leading-relaxed">{c.addressLines.join(', ')}</address>
          <a href={`tel:${c.phoneIntl}`} className="mono mt-3 block text-cream hover:text-saffron"><RollText>{c.phone}</RollText></a>
          <a href={`mailto:${c.email}`} className="mt-1 block break-all text-sm hover:text-cream">{c.email}</a>
          <dl className="mt-4 space-y-1 text-sm">
            {hours.map((h) => (
              <div key={h.days} className="flex justify-between gap-4">
                <dt>{h.days}</dt>
                <dd className="mono text-cream">{h.time}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="mono text-[0.68rem] uppercase tracking-[0.2em] text-saffron">Order & book elsewhere</h2>
          <ul className="mt-4 space-y-2">
            {elsewhere.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-cream">
                  <RollText>{l.label}</RollText> <ExternalLink size={12} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative select-none border-t border-hair pt-6" aria-hidden="true">
        <p className="mono text-center text-xs uppercase tracking-[0.3em] text-saffron">
          <span className="jp text-base normal-case tracking-[0.2em]">おかわり？</span> &nbsp;One more plate?
        </p>
        <div ref={wordRef} className="flex justify-center overflow-hidden leading-[0.78]">
          {WORD.split('').map((ch, i) => (
            <span key={i} className="fl display inline-block text-[clamp(9rem,38vw,34rem)] text-cream/[0.92]" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144' }}>
              {ch}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-hair">
        <div className="container-x flex flex-col gap-4 py-6 text-xs text-cream/50 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl">
            © {new Date().getFullYear()} {SITE.name}. Website proposal — content to be confirmed by the owner. Dish images are original
            illustrations, not photographs of Fuji&apos;s food; animated characters are illustrations, not real staff.
          </p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <li><Link to="/privacy" className="hover:text-cream">Privacy</Link></li>
            <li><Link to="/cookies" className="hover:text-cream">Cookies</Link></li>
            <li><Link to="/allergens" className="hover:text-cream">Allergens & accessibility</Link></li>
            <li><button type="button" onClick={openPanel} className="hover:text-cream">Cookie settings</button></li>
            <li><MotionToggle withLabel /></li>
            <li>
              <Link to="/admin" className="btn btn-outline btn-sm">
                <KeyRound size={13} aria-hidden="true" /> Owner login
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
