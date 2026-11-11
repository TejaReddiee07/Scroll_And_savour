import { useEffect, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroScrub from '../components/home/HeroScrub';
import { MarqueeBand, Manifesto, FiveWays, MaskWord, OnTheBoard } from '../components/home/Story';
import { MenuShowcase, FromTheWok, Pour, HouseRules, Visit } from '../components/home/MoreSections';
import { Seo } from '../components/ui';

/**
 * Home — the full scroll story:
 * hero (8 dishes scrubbed by scroll) → marquee → 01 the kitchen → 02 five ways in →
 * FUJI mask word → 03 on the board → 04 the menu → 05 from the wok → pour →
 * 06 house rules → 07 visit → footer wordmark.
 *
 * The hero renders immediately; the sections after it mount one per idle slot
 * (the hero's eight-screen pin gives plenty of runway), which keeps the first
 * load light on phones.
 */
const SECTIONS = [MarqueeBand, Manifesto, FiveWays, MaskWord, OnTheBoard, MenuShowcase, FromTheWok, Pour, HouseRules, Visit];

const idle = (cb) => (window.requestIdleCallback ? window.requestIdleCallback(cb, { timeout: 900 }) : setTimeout(cb, 120));
const cancelIdle = (id) => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id));

export default function Home() {
  const [mounted, setMounted] = useState(0);
  const [go, setGo] = useState(false);

  // start building the rest of the story on the visitor's first sign of intent
  useEffect(() => {
    if (go) return undefined;
    const start = () => setGo(true);
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'scroll'];
    events.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    // a visitor who simply waits still gets everything shortly after load
    const t = setTimeout(start, 6000);
    return () => {
      clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, start));
    };
  }, [go]);

  // then mount one section per idle slot
  useEffect(() => {
    if (!go || mounted >= SECTIONS.length) return undefined;
    const id = idle(() => setMounted((m) => m + 1));
    return () => cancelIdle(id);
  }, [go, mounted]);

  // pinned sections must be measured top-to-bottom whenever new ones mount
  useEffect(() => {
    const t = setTimeout(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    }, 60);
    return () => clearTimeout(t);
  }, [mounted]);

  useEffect(() => {
    const refresh = () => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    };
    document.fonts?.ready.then(refresh);
    window.addEventListener('fuji:loaded', refresh);
    return () => window.removeEventListener('fuji:loaded', refresh);
  }, []);

  return (
    <>
      <Seo
        description="Fuji Japanese Restaurant at 15 Stoke Newington Church Street, London N16 0NX — sushi, sashimi, ramen, katsu curry and bento. Book a table, order online or enquire about catering."
        path="/"
      />
      <HeroScrub />
      {SECTIONS.slice(0, mounted).map((Section) => (
        <Section key={Section.name} />
      ))}
      {mounted < SECTIONS.length && <div aria-hidden="true" className="h-[100svh]" />}
    </>
  );
}
