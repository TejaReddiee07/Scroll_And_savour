import { Link } from 'react-router-dom';
import { Seo } from '../components/ui';
import { useSiteData } from '../context/SiteDataContext';
import { useConsent } from '../context/ConsentContext';
import { useMotion } from '../context/MotionContext';
import { DIETARY, SITE } from '../data/site';

function PolicyPage({ title, kanji, intro, updated = '11 November 2026', children, path, description }) {
  return (
    <>
      <Seo title={title} description={description} path={path} />
      <article className="relative pb-24 pt-32 sm:pt-40">
        <span aria-hidden="true" className="kanji-watermark -right-4 top-16 text-cream">{kanji}</span>
        <div className="container-x relative max-w-3xl">
          <p className="eyebrow"><b>—</b> Policies</p>
          <h1 className="mt-5 text-[clamp(2.6rem,6vw,5rem)]">{title}</h1>
          <p className="mt-4 text-cream/75">{intro}</p>
          <p className="mt-2 text-xs text-cream/50">Last updated: {updated}. Draft for the owner&apos;s review — not legal advice.</p>
          <div className="mt-10 space-y-8 text-cream/80 [&_h2]:display [&_h2]:text-2xl [&_h2]:text-cream [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:underline [&_a]:decoration-gold [&_a]:underline-offset-2">
            {children}
          </div>
        </div>
      </article>
    </>
  );
}

export function Privacy() {
  const { settings } = useSiteData();
  const c = settings.contact;
  return (
    <PolicyPage
      title="Privacy policy"
      kanji="個人"
      path="/privacy"
      description="How Fuji Japanese Restaurant handles personal information sent through this website."
      intro="This policy explains what personal information this website collects, why, and the choices you have."
    >
      <section>
        <h2>Who we are</h2>
        <p>
          {SITE.name}, {c.addressLines.join(', ')} (“we”, “us”). Contact: <a href={`mailto:${c.email}`}>{c.email}</a> · {c.phone}.
          <em className="text-gold-soft"> [Owner to confirm the legal entity name and any company registration details.]</em>
        </p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Table requests:</strong> name, phone, email, party size, date, time and any special requests.</li>
          <li><strong>Orders:</strong> name, phone, email, delivery address (for delivery), order contents and notes.</li>
          <li><strong>Catering enquiries:</strong> name, email, phone, event details, guest numbers, budget and message.</li>
          <li><strong>Contact messages:</strong> name, email, optional phone, subject and message.</li>
          <li><strong>Technical data:</strong> server logs (IP address, browser type, time of request) kept for security and rate limiting.</li>
        </ul>
        <p>We do not take card payments on this website.</p>
      </section>
      <section>
        <h2>Why we use it (lawful basis)</h2>
        <ul>
          <li>To respond to and manage your booking, order or enquiry — <em>steps prior to a contract / contract</em>.</li>
          <li>To keep the website secure and prevent spam — <em>legitimate interests</em>.</li>
          <li>Optional anonymous analytics and map embeds — <em>consent</em>, which you can withdraw at any time.</li>
        </ul>
      </section>
      <section>
        <h2>Who we share it with</h2>
        <p>
          Our hosting and infrastructure providers process data on our behalf (for example website hosting, the MongoDB Atlas database
          and Cloudinary image storage). If you choose to load Google Maps, Google receives data under its own privacy policy. We never
          sell your data. <em className="text-gold-soft">[Owner to confirm the final list of processors.]</em>
        </p>
      </section>
      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep booking, order and enquiry records only as long as needed for the purpose and our legal obligations.
          <em className="text-gold-soft"> [Owner to set retention periods, e.g. 12 months for bookings and enquiries.]</em>
        </p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>
          Under UK data protection law you can ask to access, correct or delete your data, object to or restrict processing, and
          withdraw consent. Email <a href={`mailto:${c.email}`}>{c.email}</a>. You can also complain to the Information
          Commissioner&apos;s Office (ico.org.uk).
        </p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>See our <Link to="/cookies">cookie policy</Link>.</p>
      </section>
    </PolicyPage>
  );
}

export function Cookies() {
  const { openPanel, consent } = useConsent();
  return (
    <PolicyPage
      title="Cookie policy"
      kanji="設定"
      path="/cookies"
      description="Cookies and browser storage used by the Fuji Japanese Restaurant website."
      intro="We use as little browser storage as possible. Anything non-essential stays off until you say yes."
    >
      <section>
        <h2>Essential storage (always on)</h2>
        <ul>
          <li><code>fuji:cart:v1</code> — remembers the dishes in your cart (local storage).</li>
          <li><code>fuji:consent:v1</code> — remembers your cookie choices (local storage).</li>
          <li><code>fuji:motion-paused</code> — remembers whether you paused animations (local storage).</li>
          <li><code>fuji_admin</code> — secure, http-only sign-in cookie used only by restaurant staff on the admin dashboard.</li>
        </ul>
      </section>
      <section>
        <h2>Optional (off by default)</h2>
        <ul>
          <li><strong>Analytics</strong> — anonymous counts of menu views, calls, booking, order and catering clicks. No analytics provider is connected yet; nothing is sent until one is approved and you consent.</li>
          <li><strong>Third-party embeds</strong> — the Google Map on the contact and home pages. Google sets its own cookies when the map loads.</li>
        </ul>
      </section>
      <section>
        <h2>Your current choice</h2>
        <p>
          {consent
            ? `Analytics: ${consent.analytics ? 'on' : 'off'} · Third-party embeds: ${consent.thirdParty ? 'on' : 'off'}.`
            : 'You have not made a choice yet — non-essential cookies are off.'}
        </p>
        <button type="button" onClick={openPanel} className="btn btn-primary mt-4">Change cookie settings</button>
      </section>
    </PolicyPage>
  );
}

export function Allergens() {
  const { allergenNotice, categories } = useSiteData();
  const { paused, togglePaused, reduced } = useMotion();
  const notes = categories.filter((c) => c.note);
  return (
    <PolicyPage
      title="Allergens & accessibility"
      kanji="安心"
      path="/allergens"
      description="Allergen information for Fuji's menu and accessibility features of this website."
      intro="Please read before ordering, and always speak to the restaurant about allergies."
    >
      <section>
        <h2>Allergen information</h2>
        <p className="rounded-2xl border border-gold/35 bg-gold/10 p-4 text-cream">{allergenNotice}</p>
        <ul>
          {notes.map((c) => (
            <li key={c.slug}><strong>{c.name}:</strong> {c.note}</li>
          ))}
        </ul>
        <p>
          A full allergen matrix and cross-contamination procedures are to be confirmed with the restaurant. Please call before
          ordering if you have an allergy or intolerance.
        </p>
      </section>
      <section>
        <h2>Dietary labels</h2>
        <ul>
          {Object.entries(DIETARY).map(([k, d]) => (
            <li key={k}><strong>{d.short}</strong> — {d.label}. Shown only where the restaurant&apos;s menu labels the dish.</li>
          ))}
          <li><strong>Spicy</strong>, <strong>Popular</strong> and <strong>Chef&apos;s pick</strong> are also the restaurant&apos;s own labels.</li>
        </ul>
      </section>
      <section>
        <h2>Website accessibility</h2>
        <ul>
          <li>Full keyboard navigation with visible focus rings and a “Skip to content” link.</li>
          <li>All animations respect your device&apos;s “reduce motion” setting{reduced ? ' (currently on — animations are replaced with still illustrations)' : ''}.</li>
          <li>A “Pause animations” control in the header, menu and footer.</li>
          <li>Text alternatives for illustrations, labelled form fields with error messages, and colour contrast designed for WCAG 2.2 AA.</li>
        </ul>
        {!reduced && (
          <button type="button" onClick={togglePaused} className="btn btn-outline mt-4" aria-pressed={paused}>
            {paused ? 'Play animations' : 'Pause animations'}
          </button>
        )}
        <p>
          Venue accessibility (step-free access, toilets, seating) is to be confirmed with the restaurant — please call{' '}
          {SITE.phone} before your visit.
        </p>
      </section>
    </PolicyPage>
  );
}
