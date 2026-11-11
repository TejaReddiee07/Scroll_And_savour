import { Suspense, useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from './Header';
import Footer from './Footer';
import CartDrawer, { FloatingCartButton } from './CartDrawer';
import CookieBanner from './CookieBanner';
import CustomCursor from '../effects/CustomCursor';
import { TapRipple } from '../effects/Interactions';
import { Grain } from '../fx';
import { useMotion } from '../../context/MotionContext';
import { track } from '../../context/ConsentContext';
import { startSmooth, stopSmooth, scrollToTop } from '../../lib/smooth';

export function PageFallback() {
  return (
    <div className="grid min-h-[100svh] place-items-center" role="status" aria-live="polite">
      <div className="mono flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-cream/60">
        <span className="h-2 w-2 animate-ping rounded-full bg-saffron" />
        Loading
      </div>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const outlet = useOutlet();
  const { still } = useMotion();

  // Lenis smooth scroll for the public site (off for reduced motion / pause)
  useEffect(() => {
    if (still) {
      stopSmooth();
      return undefined;
    }
    startSmooth();
    return () => stopSmooth();
  }, [still]);

  useEffect(() => {
    track('page_view', { path: location.pathname });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => {
          if (!location.hash) scrollToTop();
          requestAnimationFrame(() => ScrollTrigger.refresh());
        }}
      >
        <motion.main
          id="main"
          key={location.pathname}
          tabIndex={-1}
          className="min-h-[100svh] flex-1 overflow-x-clip outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: still ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<PageFallback />}>{outlet}</Suspense>
        </motion.main>
      </AnimatePresence>
      <Footer />
      <CartDrawer />
      <FloatingCartButton />
      <CookieBanner />
      <CustomCursor />
      <TapRipple />
      <Grain />
    </div>
  );
}
