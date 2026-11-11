import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { useConsent } from '../../context/ConsentContext';

/** Consent banner: non-essential categories are rejected by default. */
export default function CookieBanner() {
  const { decided, consent, acceptAll, rejectAll, save, panelOpen, openPanel, closePanel } = useConsent();
  const [analytics, setAnalytics] = useState(false);
  const [thirdParty, setThirdParty] = useState(false);

  useEffect(() => {
    if (panelOpen) {
      setAnalytics(!!consent?.analytics);
      setThirdParty(!!consent?.thirdParty);
    }
  }, [panelOpen, consent]);

  const show = !decided || panelOpen;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="region"
          aria-label="Cookie consent"
          className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-2xl border border-gold/25 bg-charcoal/95 p-5 text-cream shadow-2xl backdrop-blur-lg sm:inset-x-6 sm:bottom-6"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex gap-4">
            <Cookie className="mt-1 hidden shrink-0 text-gold sm:block" size={26} aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-display text-lg">Cookies & your privacy</h2>
              <p className="mt-1 text-sm text-cream/75">
                We use essential storage to remember your cart and preferences. With your permission we can also measure
                anonymous usage and show embedded Google Maps (which sets Google cookies). Non-essential cookies are off unless you
                turn them on. <Link to="/cookies" className="underline decoration-gold underline-offset-2">Cookie policy</Link>.
              </p>

              {panelOpen && (
                <fieldset className="mt-4 space-y-3 rounded-xl border border-cream/10 p-4">
                  <legend className="px-1 text-xs font-bold uppercase tracking-widest text-gold">Choose categories</legend>
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" checked disabled className="mt-1 accent-fuji-red" />
                    <span><strong>Essential</strong> — cart, cookie choice, animation preference. Always on.</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 accent-fuji-red" />
                    <span><strong>Analytics</strong> — anonymous counts of menu views, calls, booking and order clicks.</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" checked={thirdParty} onChange={(e) => setThirdParty(e.target.checked)} className="mt-1 accent-fuji-red" />
                    <span><strong>Third-party embeds</strong> — Google Maps on the contact page.</span>
                  </label>
                </fieldset>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {panelOpen ? (
                  <>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => save({ analytics, thirdParty })}>Save choices</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={rejectAll}>Reject non-essential</button>
                    {decided && <button type="button" className="btn btn-sm text-cream/70" onClick={closePanel}>Cancel</button>}
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-outline btn-sm" onClick={rejectAll}>Reject non-essential</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={openPanel}>Customise</button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={acceptAll}>Accept all</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
