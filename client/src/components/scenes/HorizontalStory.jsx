import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Chef, { Knife } from '../characters/Chef';
import Waiter from '../characters/Waiter';
import { Guest, Bell, SteamWisps } from '../characters/Extras';
import DishArt from '../menu/DishArt';
import { poseChef, poseWaiter, walkCycle } from '../characters/rig';
import { useMotion } from '../../context/MotionContext';
import { cx } from '../../lib/format';

gsap.registerPlugin(ScrollTrigger);

const Floor = () => (
  <>
    <rect y="250" width="400" height="50" fill="#5b3a25" />
    <rect y="246" width="400" height="6" fill="#3a2a20" />
  </>
);

function PanelArt({ kind, rigs }) {
  if (kind === 'ingredients') {
    return (
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
        <circle cx="200" cy="140" r="110" fill="#b5121b" opacity="0.9" />
        <g transform="translate(70 40)"><DishArt art="sashimi:delux" width="260" height="195" /></g>
      </svg>
    );
  }
  if (kind === 'chef') {
    return (
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
        <circle cx="150" cy="120" r="105" fill="#b5121b" opacity="0.85" />
        <Chef rig={rigs.chef} mood="focus" rightProp={<Knife />} />
        <rect x="20" y="210" width="360" height="12" rx="3" fill="#d9cdb8" />
        <rect x="20" y="222" width="360" height="78" fill="#6b4329" />
        <rect x="210" y="200" width="110" height="12" rx="3" fill="#e2c9a0" />
        {[230, 256, 282].map((x, i) => <rect key={x} x={x} y="192" width="20" height="9" rx="3" fill={['#f7875a', '#c62a3c', '#f3ece2'][i]} />)}
      </svg>
    );
  }
  if (kind === 'pass') {
    return (
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
        <rect x="20" y="210" width="360" height="12" rx="3" fill="#d9cdb8" />
        <rect x="20" y="222" width="360" height="78" fill="#6b4329" />
        <g transform="translate(110 112)"><DishArt art="curry:chicken" width="160" height="120" /></g>
        <g transform="translate(320 210) scale(1.6)"><Bell /></g>
        <text x="320" y="120" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontWeight="800" fontSize="28" fill="#fde68a">ding!</text>
        <g transform="translate(190 120)"><SteamWisps scale={1.4} /></g>
      </svg>
    );
  }
  if (kind === 'carry') {
    return (
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
        <Floor />
        <Waiter rig={rigs.waiter} mood="happy" trayContent={<DishArt art="ramen:miso" x="-42" y="-58" width="84" height="63" />} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true">
      <Floor />
      <g transform="translate(300 196)"><Guest heartsRef={(el) => el && el.setAttribute('opacity', '1')} /></g>
      <rect x="40" y="168" width="240" height="12" rx="4" fill="#7a4a2c" />
      <path d="M64 180 V252 M256 180 V252" stroke="#4a2e1c" strokeWidth="10" />
      <g transform="translate(110 112)"><DishArt art="bento:steak" width="96" height="72" /></g>
      <g transform="translate(158 110)"><SteamWisps /></g>
    </svg>
  );
}

const PANELS = [
  { kind: 'ingredients', n: '一', title: 'Fresh ingredients', text: 'Salmon, tuna, yellowtail, mackerel, sea bass and scallop — the line-up behind the Delux Sashimi.' },
  { kind: 'chef', n: '二', title: 'The chef prepares', text: 'Rolls are cut, nigiri shaped, tempura fried and noodles tossed in the wok.' },
  { kind: 'pass', n: '三', title: 'Ding! On the pass', text: 'Plated and ready — a quick ring of the bell and it is time to serve.' },
  { kind: 'carry', n: '四', title: 'Carried with care', text: 'Ramen, katsu curry and bento make their way across the floor while they are hot.' },
  { kind: 'table', n: '五', title: 'At your table', text: 'Steam rising, chopsticks ready. いただきます — enjoy your meal.' },
];

/** "From kitchen to table" — scrolls sideways while the page scrolls down (desktop). */
export default function HorizontalStory() {
  const { still } = useMotion();
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const rigs = { chef: useRef({}), waiter: useRef({}) };
  const [horizontal, setHorizontal] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setHorizontal(mq.matches && !still);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [still]);

  useEffect(() => {
    poseChef(rigs.chef, { x: 150, y: 330, scale: 0.78, armR: -38, foreR: -34, armL: 18, foreL: -10, headTilt: 6 });
    const poseW = (p) => {
      const x = 90 + p * 220;
      const wc = still ? walkCycle(0, 0) : walkCycle(p * 60, 1);
      poseWaiter(rigs.waiter, { x, y: 262, scale: 0.68, facing: 1, legL: wc.legL, legR: wc.legR, armBack: wc.armBack, bob: wc.bob, armFront: -100, foreFront: -80 });
    };
    poseW(0.4);
    if (!horizontal) return undefined;

    const ctx = gsap.context(() => {
      const distance = () => trackRef.current.scrollWidth - window.innerWidth;
      gsap.to(trackRef.current, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          scrub: 0.6,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // the waiter walks while panel 4 is on screen
            const local = gsap.utils.clamp(0, 1, (self.progress - 0.45) / 0.4);
            poseW(local);
          },
        },
      });
    }, sectionRef);
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      clearTimeout(t);
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizontal, still]);

  return (
    <section ref={sectionRef} className={cx('relative overflow-hidden bg-charcoal', horizontal ? 'h-screen' : 'py-20')} aria-labelledby="story-title">
      <div className={cx('container-x', horizontal ? 'absolute inset-x-0 top-24 z-10' : '')}>
        <p className="eyebrow">From kitchen to table</p>
        <h2 id="story-title" className="mt-2 font-display text-3xl text-cream sm:text-4xl">A dish&apos;s journey at Fuji</h2>
      </div>
      <div
        ref={trackRef}
        className={cx(
          horizontal ? 'flex h-full w-max items-center gap-10 pl-[max(2rem,calc((100vw-1240px)/2+2rem))] pr-[20vw] pt-24' : 'container-x mt-10 flex flex-col gap-8',
        )}
      >
        {PANELS.map((p) => (
          <article
            key={p.kind}
            className={cx('relative grid shrink-0 items-center gap-6 overflow-hidden rounded-[28px] bg-ink/60 p-6 ring-1 ring-gold/15', horizontal ? 'h-[62vh] w-[min(78vw,920px)] grid-cols-[1.1fr_1fr] p-10' : 'sm:grid-cols-2')}
          >
            <span aria-hidden="true" className="pointer-events-none absolute -right-4 -top-10 font-display text-[12rem] font-extrabold leading-none text-cream/[0.05]">{p.n}</span>
            <div className="relative aspect-[4/3] w-full">
              <PanelArt kind={p.kind} rigs={rigs} />
            </div>
            <div className="relative">
              <p className="font-display text-5xl text-fuji-red">0{PANELS.indexOf(p) + 1}<span className="ml-3 align-middle text-2xl text-gold/80">{p.n}</span></p>
              <h3 className="mt-2 font-display text-2xl text-cream sm:text-3xl">{p.title}</h3>
              <p className="mt-3 text-cream/70">{p.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
