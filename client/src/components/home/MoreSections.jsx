import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, ArrowRight, Phone, BookOpen, Navigation, ExternalLink, BadgePercent } from 'lucide-react';
import DishArt from '../menu/DishArt';
import { AddButton } from '../menu/DishCard';
import Chef, { Wok } from '../characters/Chef';
import { SteamWisps } from '../characters/Extras';
import { poseChef, breathe } from '../characters/rig';
import { SplitReveal, Sparks, CountUp, RollText } from '../fx';
import { TiltCard, Magnetic } from '../effects/Interactions';
import { DietaryBadges, DishImage } from '../ui';
import Photo from '../media/Photo';
import { useSiteData } from '../../context/SiteDataContext';
import { useMotion } from '../../context/MotionContext';
import { SITE } from '../../data/site';
import { PHOTOS } from '../../data/photos';
import { formatGBP, openStatus, summariseHours, cx } from '../../lib/format';

gsap.registerPlugin(ScrollTrigger);

const Steam = ({ className = '' }) => (
  <svg viewBox="-40 -60 80 60" className={`pointer-events-none absolute left-1/2 w-[22%] -translate-x-1/2 ${className}`} aria-hidden="true">
    <SteamWisps scale={1.3} opacity={0.6} />
  </svg>
);

/* ── 04 The menu ─────────────────────────────────────────────────── */
const SHOWCASE = ['delux-sashimi', 'chicken-karage', 'chicken-katsu-curry', 'prawn-tempura-soba-soup', 'sirloin-steak-bento', 'fuji-roll', 'rainbow-roll', 'unaju-eel-fish'];

function MenuRow({ item }) {
  const ref = useRef(null);
  return (
    <li className="group flex items-center gap-4 border-b border-hair py-4">
      <div ref={ref} className="h-24 w-28 shrink-0 overflow-hidden rounded-2xl border border-hair sm:h-28 sm:w-36">
        <DishImage item={item} className="h-full w-full" steam={false} compactLabel sizes="(max-width: 640px) 112px, 144px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-4">
          <p className="display text-xl text-cream">{item.name}</p>
          <span className="mono shrink-0 text-saffron">{formatGBP(item.price)}</span>
        </div>
        {item.description && <p className="mt-1 line-clamp-2 text-sm text-cream/60">{item.description}</p>}
        <div className="mt-2 flex items-center justify-between gap-3">
          <DietaryBadges dietary={item.dietary} tags={item.tags} size="xs" />
          <AddButton item={item} sourceRef={ref} compact />
        </div>
      </div>
    </li>
  );
}

export function MenuShowcase() {
  const { getItem, categories, allergenNotice } = useSiteData();
  const rows = SHOWCASE.map((id) => getItem(id)).filter(Boolean);
  const [hover, setHover] = useState(null);
  const [tab, setTab] = useState(categories[0]?.slug);
  const thumbRef = useRef(null);
  const listRef = useRef(null);
  const { still } = useMotion();

  // thumbnail follows the cursor
  useEffect(() => {
    if (still || !window.matchMedia('(hover: hover)').matches) return undefined;
    const list = listRef.current;
    const pos = { x: 0, y: 0, tx: 0, ty: 0, r: 0 };
    const onMove = (e) => {
      const r = list.getBoundingClientRect();
      pos.tx = e.clientX - r.left;
      pos.ty = e.clientY - r.top;
    };
    const tick = () => {
      const dx = pos.tx - pos.x;
      pos.x += dx * 0.14;
      pos.y += (pos.ty - pos.y) * 0.14;
      pos.r += (Math.max(-12, Math.min(12, dx * 0.08)) - pos.r) * 0.1;
      if (thumbRef.current) thumbRef.current.style.transform = `translate3d(${pos.x - 140}px, ${pos.y - 110}px, 0) rotate(${pos.r}deg)`;
    };
    list.addEventListener('pointermove', onMove);
    gsap.ticker.add(tick);
    return () => {
      list.removeEventListener('pointermove', onMove);
      gsap.ticker.remove(tick);
    };
  }, [still]);

  const current = categories.find((c) => c.slug === tab) || categories[0];

  return (
    <section className="relative bg-ink-2 py-28 sm:py-36" aria-labelledby="menu-title">
      <div className="container-x">
        <p className="eyebrow"><b>04</b> The menu <span className="jp normal-case tracking-normal text-cream/60">お品書き</span></p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <SplitReveal id="menu-title" className="max-w-3xl text-[clamp(2.4rem,5vw,4.6rem)]">
            Made for <em>the whole table.</em>
          </SplitReveal>
          <Link to="/menu" className="btn btn-outline"><RollText>Full menu</RollText> <ArrowRight size={15} /></Link>
        </div>

        <ol ref={listRef} className="relative mt-14 border-t border-hair" onMouseLeave={() => setHover(null)}>
          {rows.map((item, i) => (
            <li key={item.id} onMouseEnter={() => setHover(i)}>
              <Link to={`/menu#${item.id}`} className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 border-b border-hair py-6 transition-colors hover:text-cream sm:grid-cols-[3.5rem_1.4fr_1fr_auto]" data-cursor="Taste">
                <span className="mono text-xs text-saffron">{String(i + 1).padStart(2, '0')}</span>
                <span className="display text-[clamp(1.6rem,3.2vw,2.8rem)] transition-transform duration-500 group-hover:translate-x-3">{item.name}</span>
                <span className="hidden text-sm text-cream/50 sm:block">{item.categoryName}</span>
                <span className="mono text-lg text-cream/80">{formatGBP(item.price)}</span>
              </Link>
            </li>
          ))}
          <div ref={thumbRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-10 hidden h-[210px] w-[280px] md:block">
            {rows.map((item, i) => (
              <div key={item.id} className="absolute inset-0 overflow-hidden rounded-[18px] border border-hair bg-black shadow-2xl transition-all duration-500" style={{ opacity: hover === i ? 1 : 0, transform: `scale(${hover === i ? 1 : 0.85})` }}>
                <DishImage item={item} className="h-full w-full" steam={false} sizes="280px" />
              </div>
            ))}
          </div>
        </ol>

        {/* tabbed full menu */}
        <div className="mt-20">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Menu sections">
            {categories.map((c) => (
              <button key={c.slug} type="button" role="tab" aria-selected={tab === c.slug} className="chip shrink-0" onClick={() => setTab(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
          {current && (
            <div role="tabpanel" aria-label={current.name} className="mt-8 grid gap-x-12 lg:grid-cols-2">
              <div className="lg:col-span-2 mb-2 flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="display text-3xl">{current.name} <span className="jp text-xl text-saffron/80">{current.jp}</span></h3>
                {current.note && <p className="mono text-xs uppercase tracking-[0.14em] text-saffron/80">{current.note}</p>}
              </div>
              <ul className="contents">
                {current.items.map((item) => <MenuRow key={item.id} item={{ ...item, categoryName: current.name }} />)}
              </ul>
            </div>
          )}
          <p className="mt-8 max-w-3xl text-xs text-cream/60">{allergenNotice}</p>
        </div>
      </div>
    </section>
  );
}

/* ── 05 From the wok: embers, sparks, counter, chef, tilt cards ──── */
function WokChef() {
  const rig = useRef({});
  const flameRef = useRef(null);
  const foodRef = useRef(null);
  const { still } = useMotion();
  useEffect(() => {
    const s = { toss: 0 };
    const render = () => {
      const t = gsap.ticker.time;
      poseChef(rig, { x: 210, y: 400, scale: 0.95, armL: 52 - s.toss * 16, foreL: 18 - s.toss * 14, propLTilt: -s.toss * 16, armR: -20, foreR: 6, headTilt: -6, breathe: breathe(t) });
      foodRef.current?.setAttribute('transform', `translate(0 ${(-s.toss * 30).toFixed(1)})`);
    };
    render();
    if (still) return undefined;
    const tl = gsap.timeline({ repeat: -1 }).to(s, { toss: 1, duration: 0.32, ease: 'power2.out', yoyo: true, repeat: 3 }).to({}, { duration: 0.6 });
    gsap.ticker.add(render);
    return () => {
      tl.kill();
      gsap.ticker.remove(render);
    };
  }, [still]);
  return (
    <svg viewBox="0 0 400 420" className="h-full w-full" role="img" aria-label="Illustration: the chef tosses a flaming wok">
      <Chef rig={rig} mood="happy" leftProp={<Wok flameRef={flameRef} foodRef={foodRef} />} />
      <g transform="translate(100 300)"><SteamWisps scale={1.4} opacity={0.55} /></g>
      <rect x="0" y="292" width="400" height="12" rx="4" fill="#d9cdb8" opacity=".85" />
      <rect x="0" y="304" width="400" height="116" fill="#3a2418" />
      <rect x="0" y="304" width="400" height="10" fill="#2a1a10" />
      {[20, 150, 280].map((x) => <rect key={x} x={x} y="326" width="100" height="80" rx="6" fill="#2e1c12" />)}
    </svg>
  );
}

const WOK_CARDS = ['prawn-tempura', 'chicken-karage', 'yaki-udon-seafood'];

export function FromTheWok() {
  const { getItem } = useSiteData();
  const cards = WOK_CARDS.map((id) => getItem(id)).filter(Boolean);
  return (
    <section className="relative overflow-hidden py-28 sm:py-36" aria-labelledby="wok-title">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_105%,rgba(194,54,31,.55),transparent_70%),radial-gradient(ellipse_40%_30%_at_20%_100%,rgba(240,160,50,.35),transparent_70%),radial-gradient(ellipse_40%_30%_at_85%_100%,rgba(192,106,58,.4),transparent_70%)]" />
      <Sparks />
      <div className="container-x relative">
        <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow"><b>05</b> From the wok <span className="jp normal-case tracking-normal text-cream/60">鍋</span></p>
            <SplitReveal id="wok-title" className="mt-5 text-[clamp(2.8rem,7vw,6.6rem)]">
              Fire does <em>the talking.</em>
            </SplitReveal>
            <div className="mt-10 flex items-end gap-5">
              <CountUp to={18} className="display text-[clamp(4.5rem,11vw,9rem)] leading-none text-saffron" />
              <p className="mono mb-3 max-w-[12rem] text-xs uppercase tracking-[0.18em] text-cream/60">small plates &amp; warm starters on the menu</p>
            </div>
          </div>
          <div className="relative mx-auto aspect-[400/420] w-full max-w-[380px]">
            <WokChef />
            <span className="mono absolute bottom-1 left-0 text-[0.6rem] uppercase tracking-[0.18em] text-cream/60">Illustrated character — not a member of staff</span>
          </div>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {cards.map((item) => (
            <WokCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function WokCard({ item }) {
  const ref = useRef(null);
  return (
    <TiltCard className="group overflow-hidden rounded-[22px] border border-hair bg-ink/80 backdrop-blur" data-cursor="Fire">
      <div ref={ref} className="relative aspect-[4/3] bg-black">
        <DishImage item={item} className="h-full w-full" sizes="(max-width: 768px) 92vw, 420px" />
      </div>
      <div className="flex items-center justify-between gap-3 p-5">
        <div>
          <p className="display text-xl">{item.name}</p>
          <p className="mono text-sm text-saffron">{formatGBP(item.price)}</p>
        </div>
        <AddButton item={item} sourceRef={ref} compact />
      </div>
    </TiltCard>
  );
}

/* ── Pour: sticky broth pour behind kinetic words, then four bowls ── */
const POUR_WORDS = ['Miso.', 'Soya.', 'Broth.', 'Patience.'];
const BOWLS = ['miso-ramen', 'kimchi-ramen', 'prawn-tempura-udon-soup', 'miso-soup'];

export function Pour() {
  const ref = useRef(null);
  const { still } = useMotion();
  const { getItem } = useSiteData();
  const bowls = BOWLS.map((id) => getItem(id)).filter(Boolean);

  useLayoutEffect(() => {
    if (still) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('[data-kw]').forEach((el, i) => {
        gsap.fromTo(el, { xPercent: i % 2 ? 60 : -60, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 45%', scrub: true } });
      });
    }, ref);
    return () => ctx.revert();
  }, [still]);

  return (
    <section ref={ref} className="relative" aria-label="Broths and noodle soups">
      <div className="relative">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <PourFilm />
        </div>
        <div className="relative -mt-[100svh] flex min-h-[220svh] flex-col justify-center gap-[12vh] py-[20vh]">
          {POUR_WORDS.map((w, i) => (
            <p key={w} data-kw="" className={cx('display container-x text-[clamp(4rem,14vw,12rem)] leading-none', i % 2 ? 'text-right italic text-saffron' : 'text-cream')} style={{ textShadow: '0 10px 60px rgba(0,0,0,.6)' }}>
              {w}
            </p>
          ))}
        </div>
      </div>
      <div className="container-x relative z-10 grid gap-5 pb-28 sm:grid-cols-2 lg:grid-cols-4">
        {bowls.map((item) => (
          <Link key={item.id} to={`/menu#${item.id}`} className="group overflow-hidden rounded-[20px] border border-hair bg-ink-3" data-cursor="Taste">
            <div className="relative aspect-square bg-black">
              <DishImage item={item} className="h-full w-full" sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 320px" />
            </div>
            <div className="flex items-baseline justify-between gap-3 p-4">
              <span className="display text-lg">{item.name}</span>
              <span className="mono text-sm text-saffron">{formatGBP(item.price)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PourFilm() {
  return (
    <svg viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="pour-glow" cx="50%" cy="70%" r="60%">
          <stop offset="0" stopColor="#3a2416" />
          <stop offset="1" stopColor="#0a0706" />
        </radialGradient>
        <linearGradient id="pour-stream" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c06a3a" stopOpacity="0" />
          <stop offset="0.2" stopColor="#d9a35a" />
          <stop offset="1" stopColor="#b8742e" />
        </linearGradient>
      </defs>
      <rect width="800" height="900" fill="url(#pour-glow)" />
      <path d="M392 0 C396 200 404 420 400 600" stroke="url(#pour-stream)" strokeWidth="14" fill="none" strokeLinecap="round">
        <animate attributeName="stroke-width" values="14;11;15;12;14" dur="1.6s" repeatCount="indefinite" />
      </path>
      <path d="M396 40 C398 220 402 420 400 600" stroke="#ffc35a" strokeOpacity=".35" strokeWidth="3" fill="none" strokeDasharray="30 50">
        <animate attributeName="stroke-dashoffset" values="0;-160" dur="0.9s" repeatCount="indefinite" />
      </path>
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx="400" cy="640" rx="40" ry="10" fill="none" stroke="#ffc35a" strokeOpacity=".5" strokeWidth="2">
          <animate attributeName="rx" values="20;180" dur="2.4s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
          <animate attributeName="ry" values="5;40" dur="2.4s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values=".6;0" dur="2.4s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
      <ellipse cx="400" cy="640" rx="230" ry="46" fill="#8a5a2b" />
      <ellipse cx="400" cy="640" rx="230" ry="46" fill="none" stroke="#f4e9d8" strokeOpacity=".12" strokeWidth="2" />
      <path d="M170 640 Q180 800 400 812 Q620 800 630 640" fill="#1b1410" />
      <path d="M190 690 q30 -16 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#2c5aa0" strokeWidth="6" fill="none" opacity=".7" />
      {[340, 400, 460].map((x, i) => (
        <path key={x} d={`M${x} 600 q-14 -30 0 -60 q14 -30 0 -60`} stroke="#f4e9d8" strokeOpacity=".22" strokeWidth="6" fill="none" strokeLinecap="round">
          <animate attributeName="opacity" values="0;1;0" dur="3s" begin={`${i}s`} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0 20;0 -40" dur="3s" begin={`${i}s`} repeatCount="indefinite" />
        </path>
      ))}
    </svg>
  );
}

/* ── 06 House rules ──────────────────────────────────────────────── */
const RULES = [
  { q: ['Every bento comes', 'with miso soup.'], a: 'No need to ask — all seven bento boxes include it.' },
  { q: ['Mochi comes', 'in pairs.'], a: 'Mango, coconut or chocolate — two pieces a portion. Sharing is optional.' },
  { q: ['Our salad dressings', 'contain nuts.'], a: 'Including the bento salad dressing. We will keep saying it.' },
  { q: ['Allergies? Tell us', 'before you order.'], a: 'The kitchen handles fish, gluten, soy, sesame and shellfish.' },
];

export function HouseRules() {
  const [i, setI] = useState(0);
  const go = (d) => setI((x) => (x + d + RULES.length) % RULES.length);
  return (
    <section className="relative bg-ink-2 py-28 sm:py-36" aria-roledescription="carousel" aria-labelledby="rules-title">
      <div className="container-x">
        <p className="eyebrow"><b>06</b> House rules <span className="jp normal-case tracking-normal text-cream/60">決まり</span></p>
        <h2 id="rules-title" className="sr-only">House rules</h2>
        <div className="relative mt-10 min-h-[18rem] sm:min-h-[16rem]">
          {RULES.map((r, k) => (
            <figure
              key={k}
              aria-hidden={k !== i}
              className="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)]"
              style={{ opacity: k === i ? 1 : 0, transform: `translateY(${k === i ? 0 : k < i ? -30 : 30}px)`, pointerEvents: k === i ? 'auto' : 'none' }}
            >
              <blockquote className="display max-w-5xl text-[clamp(2.2rem,5.4vw,5rem)] leading-[1.02]">
                “{r.q[0]} <em>{r.q[1]}</em>”
              </blockquote>
              <figcaption className="mono mt-6 text-sm text-cream/55">{r.a}</figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-5">
          <button type="button" onClick={() => go(-1)} className="grid h-12 w-12 place-items-center rounded-full border border-hair transition hover:border-saffron" aria-label="Previous rule">
            <ArrowLeft size={18} />
          </button>
          <button type="button" onClick={() => go(1)} className="grid h-12 w-12 place-items-center rounded-full border border-hair transition hover:border-saffron" aria-label="Next rule">
            <ArrowRight size={18} />
          </button>
          <div className="flex gap-2" role="tablist" aria-label="Choose a rule">
            {RULES.map((_, k) => (
              <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Rule ${k + 1}`} onClick={() => setI(k)} className="grid h-6 min-w-6 place-items-center">
                <span className={cx('block h-1.5 rounded-full transition-all', k === i ? 'w-8 bg-saffron' : 'w-3 bg-cream/40')} />
              </button>
            ))}
          </div>
          <p className="mono ml-auto text-xs text-cream/60">{String(i + 1).padStart(2, '0')} / {String(RULES.length).padStart(2, '0')}</p>
        </div>
      </div>
    </section>
  );
}

/* ── 07 Visit ────────────────────────────────────────────────────── */
function LondonClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <time className="mono tabular-nums" dateTime={now.toISOString()}>
      {now.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </time>
  );
}

function StorefrontFilm() {
  if (PHOTOS.storefront) {
    return (
      <div className="h-full w-full motion-safe:animate-[pushin_24s_ease-in-out_infinite_alternate]">
        <Photo photo={PHOTOS.storefront} alt="Fuji Japanese Restaurant on Stoke Newington Church Street" sizes="100vw" className="h-full w-full opacity-70" />
      </div>
    );
  }
  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="h-full w-full motion-safe:animate-[pushin_24s_ease-in-out_infinite_alternate]" aria-hidden="true">
      <defs>
        <linearGradient id="sf-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a0706" /><stop offset="1" stopColor="#1b1410" /></linearGradient>
        <linearGradient id="sf-wet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a1d15" /><stop offset="1" stopColor="#0a0706" /></linearGradient>
        <radialGradient id="sf-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffc35a" stopOpacity=".55" /><stop offset="1" stopColor="#ffc35a" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#sf-sky)" />
      <rect x="260" y="120" width="680" height="440" fill="#1b1410" />
      <rect x="300" y="250" width="340" height="270" fill="#f0a032" opacity=".55" />
      <rect x="300" y="250" width="340" height="270" fill="url(#sf-glow)" />
      <rect x="680" y="250" width="200" height="310" fill="#120d0a" />
      <rect x="700" y="270" width="160" height="290" fill="#c06a3a" opacity=".35" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${300 + i * 68} 240 h64 v62 q-32 8 -64 0 Z`} fill="#c2361f" opacity=".9" />)}
      <rect x="280" y="150" width="640" height="70" fill="#0a0706" />
      {[340, 860].map((x) => (
        <g key={x}>
          <circle cx={x} cy="250" r="70" fill="url(#sf-glow)" opacity=".7" />
          <ellipse cx={x} cy="250" rx="22" ry="30" fill="#c2361f" />
        </g>
      ))}
      <rect y="560" width="1200" height="240" fill="url(#sf-wet)" />
      <rect x="300" y="560" width="340" height="200" fill="#f0a032" opacity=".08" />
      {[...Array(20)].map((_, i) => <rect key={i} x={310 + i * 16} y={580 + (i % 5) * 30} width="3" height={60 + (i % 3) * 30} fill="#ffc35a" opacity=".07" />)}
    </svg>
  );
}

export function Visit() {
  const { settings, offers, categories, items } = useSiteData();
  const status = openStatus(settings.hours);
  const hours = summariseHours(settings.hours);
  const c = settings.contact;
  const min = Math.min(...items.map((i) => i.price));
  return (
    <section className="relative overflow-hidden" aria-labelledby="visit-title">
      <div className="absolute inset-0">
        <StorefrontFilm />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/75 to-ink" />
      </div>
      <div className="container-x relative py-28 sm:py-40">
        <p className="eyebrow"><b>07</b> Visit <span className="jp normal-case tracking-normal text-cream/60">ご来店</span></p>
        <SplitReveal id="visit-title" className="mt-5 text-[clamp(3rem,8vw,7.5rem)]">
          Come hungry. <em>Sit down.</em>
        </SplitReveal>
        {!PHOTOS.storefront && <p className="mono mt-3 text-[0.62rem] uppercase tracking-[0.18em] text-cream/60">Illustrated storefront — approved photograph to follow</p>}

        <dl className="mt-14 grid grid-cols-2 gap-6 border-y border-hair py-8 md:grid-cols-4">
          {[
            [<CountUp key="a" to={categories.length} />, 'menu sections'],
            [<CountUp key="b" to={items.length} />, 'dishes & drinks'],
            [<CountUp key="c" to={10} />, 'hours open, daily'],
            [<CountUp key="d" to={min} decimals={2} prefix="£" />, 'starting price'],
          ].map(([n, l]) => (
            <div key={l} className="flex flex-col">
              <dt className="mono order-2 text-[0.68rem] uppercase tracking-[0.18em] text-cream/55">{l}</dt>
              <dd className="display order-1 text-[clamp(2.4rem,5vw,4rem)] text-saffron">{n}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr_1fr]">
          <div>
            <p className="mono text-xs uppercase tracking-[0.18em] text-cream/50">London time</p>
            <p className="display mt-2 text-4xl"><LondonClock /></p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className={cx('h-2 w-2 rounded-full', status.open ? 'bg-emerald-400' : 'bg-cream/35')} /> {status.label}
            </p>
          </div>
          <div>
            <p className="mono text-xs uppercase tracking-[0.18em] text-cream/50">Find us</p>
            <address className="mt-2 not-italic text-lg leading-relaxed">{c.addressLines.join(', ')}</address>
            <a href={`tel:${c.phoneIntl}`} className="mono mt-2 inline-block text-saffron"><RollText>{c.phone}</RollText></a>
          </div>
          <div>
            <p className="mono text-xs uppercase tracking-[0.18em] text-cream/50">Hours</p>
            <dl className="mt-2 space-y-1">
              {hours.map((h) => (
                <div key={h.days} className="flex justify-between gap-6 border-b border-hair pb-1"><dt>{h.days}</dt><dd className="mono">{h.time}</dd></div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-cream/60">{settings.hoursNote}</p>
          </div>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          <Magnetic className="w-full"><a href={`tel:${c.phoneIntl}`} className="btn btn-primary w-full !min-h-16 !text-sm"><Phone size={17} /> <RollText>Call to order</RollText></a></Magnetic>
          <Magnetic className="w-full"><Link to="/menu" className="btn btn-outline w-full !min-h-16 !text-sm"><BookOpen size={17} /> <RollText>See the menu</RollText></Link></Magnetic>
          <Magnetic className="w-full"><a href={SITE.links.maps} target="_blank" rel="noreferrer" className="btn btn-outline w-full !min-h-16 !text-sm"><Navigation size={17} /> <RollText>Directions</RollText></a></Magnetic>
        </div>

        {offers?.length > 0 && (
          <div className="mt-12 grid gap-4 md:grid-cols-[1.4fr_1fr]">
            {offers.slice(0, 1).map((o) => (
              <div key={o._id || o.title} className="flex flex-wrap items-center gap-4 rounded-[18px] border border-dashed border-saffron/50 bg-saffron/5 p-5">
                <BadgePercent className="text-saffron" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="display text-xl">{o.title}</p>
                  <p className="text-sm text-cream/60">{o.verified ? o.terms : `As advertised on the official homepage — ${o.terms}`}</p>
                </div>
                <a href={SITE.links.officialSite} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Check terms <ExternalLink size={13} /></a>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-hair p-5">
              <p className="mr-auto text-sm text-cream/65">Reviews live where guests leave them:</p>
              <a href={SITE.links.maps} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Google <ExternalLink size={13} /></a>
              <a href={SITE.links.openTable} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">OpenTable <ExternalLink size={13} /></a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
