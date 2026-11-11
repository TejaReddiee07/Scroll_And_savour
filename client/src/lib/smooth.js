import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * One Lenis instance for the public site, driven by the GSAP ticker so
 * ScrollTrigger scrubs stay perfectly in sync. Disabled for reduced motion.
 */
let lenis = null;
let tickerFn = null;
export const scrollState = { velocity: 0 };

export function startSmooth() {
  if (lenis || typeof window === 'undefined') return lenis;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
  lenis.on('scroll', (e) => {
    scrollState.velocity = e.velocity || 0;
    ScrollTrigger.update();
  });
  tickerFn = (time) => lenis?.raf(time * 1000);
  gsap.ticker.add(tickerFn);
  gsap.ticker.lagSmoothing(0);
  if (import.meta.env.DEV) window.__lenis = lenis;
  return lenis;
}

export function stopSmooth() {
  if (!lenis) return;
  gsap.ticker.remove(tickerFn);
  lenis.destroy();
  lenis = null;
}

export const getLenis = () => lenis;

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

export function scrollToY(y, opts = {}) {
  if (lenis) lenis.scrollTo(y, { duration: 1.2, ...opts });
  else window.scrollTo({ top: y, behavior: 'auto' });
}

export function scrollToEl(el, offset = -90) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.2 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset });
}

/** Freeze page scroll while a dialog/drawer is open. */
export function lockScroll(locked) {
  if (lenis) (locked ? lenis.stop() : lenis.start());
  document.documentElement.style.overflow = locked ? 'hidden' : '';
}
