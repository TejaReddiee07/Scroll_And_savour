import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DishArt from '../menu/DishArt';
import Photo from '../media/Photo';
import { DishImage } from '../ui';
import { photoFor } from '../../data/photos';
import { useSiteData } from '../../context/SiteDataContext';
import { SplitReveal, Scramble, Marquee } from '../fx';
import { useMotion } from '../../context/MotionContext';
import { cx } from '../../lib/format';
import chefImg from '../../assets/characters/chef.webp';

gsap.registerPlugin(ScrollTrigger);


/* ── Marquee ─────────────────────────────────────────────────────── */
const ROWS = [
  [{ t: 'Sushi' }, { t: '寿司', jp: true }, { t: 'Sashimi' }, { t: '刺身', jp: true }, { t: 'Ramen' }, { t: 'ラーメン', jp: true }, { t: 'Tempura' }, { t: '天ぷら', jp: true }, { t: 'Bento' }, { t: '弁当', jp: true }],
  [{ t: 'Stoke Newington' }, { t: 'N16' }, { t: 'Dine in' }, { t: 'Collection' }, { t: 'Delivery' }, { t: 'Catering' }, { t: 'Open daily 12–22' }],
];
export function MarqueeBand() {
  return <Marquee rows={ROWS} className="bg-ink" />;
}

/* ── 01 Manifesto: words light up as you scroll, inline media pills grow ── */
const MANIFESTO = [
  'Fuji', 'is', 'a', 'Japanese', 'kitchen', 'on', 'Stoke', 'Newington', 'Church', 'Street', { pill: 'chef' },
  'Sushi', 'and', 'sashimi', { pill: 'sashimi' }, 'sit', 'beside', 'ramen,', 'udon,', 'tempura', 'and', 'katsu', 'curry', { pill: 'ramen' },
  '—', 'twenty-two', 'sections,', 'one', 'hundred', 'and', 'sixty', 'dishes', 'and', 'drinks,', 'from', 'a', '£4.45', 'cucumber', 'maki',
  'to', 'a', '£37.50', 'deluxe', 'sashimi.', 'Dine', 'in,', 'collect,', 'or', 'let', 'it', 'come', 'to', 'you.',
];

function Pill({ kind }) {
  return (
    <span data-pill="" className="mx-[0.12em] inline-block h-[0.82em] w-[1em] translate-y-[0.08em] overflow-hidden rounded-full border border-hair bg-ink-3 align-baseline">
      {kind === 'chef' ? (
        <img src={chefImg} alt="" className="h-full w-full object-cover object-top" />
      ) : (
        <img
          src={photoFor(kind === 'ramen' ? 'miso-ramen' : 'salmon-sashimi')?.srcset?.split(' ')[0]}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      )}
    </span>
  );
}

export function Manifesto() {
  const ref = useRef(null);
  const { still } = useMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const words = [...el.querySelectorAll('[data-w]')];
    const pills = [...el.querySelectorAll('[data-pill]')];
    const pillAt = pills.map((p) => Number(p.parentElement.dataset.at));
    if (still) {
      words.forEach((w) => (w.style.opacity = 1));
      pills.forEach((p) => (p.style.width = '2.6em'));
      return undefined;
    }
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 75%',
      end: 'bottom 45%',
      scrub: true,
      onUpdate: (self) => {
        const lit = self.progress * (words.length + 2);
        words.forEach((w, i) => {
          const o = Math.min(1, Math.max(0.5, lit - i));
          if (w.__o !== o) {
            w.__o = o;
            w.style.opacity = o;
          }
        });
        pills.forEach((p, i) => {
          const k = Math.min(1, Math.max(0, (lit - pillAt[i]) / 2.5));
          p.style.width = `${1 + k * 1.8}em`;
        });
      },
    });
    return () => st.kill();
  }, [still]);

  let w = 0;
  return (
    <section className="relative py-28 sm:py-40" aria-labelledby="craft-title">
      <div className="container-x">
        <p className="eyebrow"><b>01</b> The kitchen <span className="jp normal-case tracking-normal text-cream/60">台所</span></p>
        <h2 id="craft-title" className="sr-only">About Fuji</h2>
        <p ref={ref} className="display mt-10 max-w-6xl text-[clamp(1.9rem,4.6vw,4.4rem)] leading-[1.12]">
          {MANIFESTO.map((t, i) => {
            if (typeof t === 'object') {
              return (
                <span key={i} data-at={w}>
                  <Pill kind={t.pill} />{' '}
                </span>
              );
            }
            w += 1;
            return (
              <span key={i}>
                <span data-w="" style={{ opacity: 0.5 }} className={cx(['£4.45', '£37.50', 'Fuji'].includes(t) && 'italic text-saffron')}>
                  {t}
                </span>{' '}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}

/* ── 02 Five ways in — pinned horizontal scroll ──────────────────── */
const WAYS = [
  { k: '切', title: 'Slice', sub: 'Sashimi', id: 'delux-sashimi', art: 'sashimi:delux', text: 'Salmon, tuna, sea bass and saba, five slices to a plate — or the Delux, seven kinds deep.' },
  { k: '巻', title: 'Roll', sub: 'Maki · Uramaki · Futo maki · Temaki', id: 'rainbow-roll', art: 'uramaki:rainbow', text: 'Eight-piece maki, inside-out uramaki, big futo maki and hand-rolled temaki cones.' },
  { k: '揚', title: 'Fry', sub: 'Tempura · Karaage', id: 'mixed-tempura', art: 'tempura:mixed', text: 'Prawn, squid and vegetable tempura, chicken karage and ebi fry, straight to the table.' },
  { k: '煮', title: 'Simmer', sub: 'Ramen · Udon · Soba', id: 'kimchi-ramen', art: 'ramen:kimchi', text: 'Miso, soya and kimchi ramen; udon and buckwheat soba with prawn tempura or bean curd.' },
  { k: '箱', title: 'Box', sub: 'Bento', id: 'chicken-karage-bento', art: 'bento:karaage', text: 'Seven bento boxes, every one with miso soup — from vegetable to sirloin steak and sushi.' },
];

export function FiveWays() {
  const { getItem } = useSiteData();
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const { still } = useMotion();
  const [horizontal, setHorizontal] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const up = () => setHorizontal(mq.matches && !still);
    up();
    mq.addEventListener('change', up);
    return () => mq.removeEventListener('change', up);
  }, [still]);

  useLayoutEffect(() => {
    if (!horizontal) return undefined;
    const ctx = gsap.context(() => {
      const distance = () => trackRef.current.scrollWidth - window.innerWidth;
      const tween = gsap.to(trackRef.current, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: () => `+=${distance()}`, scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true },
      });
      // parallax the media inside each card
      gsap.utils.toArray('[data-par]').forEach((m) => {
        gsap.fromTo(m, { xPercent: -14 }, { xPercent: 14, ease: 'none', scrollTrigger: { trigger: m.closest('article'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, [horizontal]);

  return (
    <section ref={sectionRef} className={cx('relative overflow-hidden bg-ink-2', horizontal ? 'h-[100svh]' : 'py-24')} aria-labelledby="ways-title">
      <div className={cx('container-x', horizontal && 'absolute inset-x-0 top-24 z-10')}>
        <p className="eyebrow"><b>02</b> Five ways in <span className="text-cream/60">·</span> One kitchen</p>
        <SplitReveal id="ways-title" className="mt-5 max-w-3xl text-[clamp(2.2rem,4.8vw,4.4rem)]">
          Twenty-two sections. <em>Five ways in.</em>
        </SplitReveal>
      </div>
      <div ref={trackRef} className={cx(horizontal ? 'flex h-full w-max items-end gap-8 pb-[8vh] pl-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))] pr-[12vw] pt-[34vh]' : 'no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[clamp(1.1rem,4vw,2.5rem)] pb-4')}>
        {WAYS.map((w, i) => (
          <article key={w.title} className={cx('group relative flex shrink-0 flex-col overflow-hidden rounded-[22px] border border-hair bg-ink-3', horizontal ? 'h-[56vh] w-[min(34vw,460px)]' : 'w-[80vw] max-w-[380px] snap-start')} data-cursor="Look">
            <div className="relative h-[58%] min-h-[220px] overflow-hidden bg-black">
              <div data-par="" className="absolute inset-y-0 -inset-x-[12%]">
                <DishImage item={getItem(w.id) || { id: w.id, name: w.title, art: w.art }} className="h-full w-full" steam={false} sizes="(max-width: 900px) 80vw, 560px" />
              </div>
              <span aria-hidden="true" className="jp absolute right-5 top-3 text-6xl text-cream/10">{w.k}</span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <p className="mono text-[0.7rem] uppercase tracking-[0.2em] text-saffron">{String(i + 1).padStart(2, '0')} · {w.sub}</p>
              <h3 className="display mt-2 text-4xl">{w.title}<span className="text-saffron">.</span></h3>
              <p className="mt-3 text-cream/65">{w.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ── Mask word: FUJI over the living-restaurant scene, zoom through the I ── */
export function MaskWord() {
  const sectionRef = useRef(null);
  const lettersRef = useRef(null);
  const overlayRef = useRef(null);
  const captionRef = useRef(null);
  const mediaRef = useRef(null);
  const { still } = useMotion();
  const LETTERS = [
    { ch: 'F', x: 278 },
    { ch: 'U', x: 468 },
    { ch: 'J', x: 640 },
    { ch: 'I', x: 762 },
  ];
  const origin = { x: 762, y: 236 };

  useLayoutEffect(() => {
    if (still) return undefined;
    const ctx = gsap.context(() => {
      const zoom = { s: 1 };
      const g = lettersRef.current;
      const setZoom = () => g.setAttribute('transform', `translate(${origin.x} ${origin.y}) scale(${zoom.s}) translate(${-origin.x} ${-origin.y})`);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sectionRef.current, start: 'top top', end: '+=220%', scrub: 0.6, pin: true, anticipatePin: 1 },
      });
      tl.fromTo(mediaRef.current, { scale: 1.18 }, { scale: 1, duration: 1.15, ease: 'none' }, 0)
        .from(g.querySelectorAll('text'), { attr: { dy: 260 }, opacity: 0, stagger: 0.08, duration: 0.35, ease: 'power3.out' }, 0)
        .to({}, { duration: 0.2 })
        .to(zoom, { s: 70, duration: 0.6, ease: 'power2.in', onUpdate: setZoom })
        .to(overlayRef.current, { opacity: 0, duration: 0.1 }, '-=0.08')
        .fromTo(captionRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.2 }, '-=0.05');
    }, sectionRef);
    return () => ctx.revert();
  }, [still]);

  return (
    <section ref={sectionRef} className="relative h-[100svh] overflow-hidden bg-ink" aria-label="Fuji — sliced to order, served at your table">
      <div className="absolute inset-0">
        <div ref={mediaRef} className="absolute inset-0 will-change-transform">
          <Photo photo={photoFor('delux-sashimi')} alt="Delux Sashimi at Fuji Japanese Restaurant" sizes="100vw" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,transparent_40%,rgba(0,0,0,.55))]" />
      </div>
      {!still && (
        <svg ref={overlayRef} className="pointer-events-none absolute left-1/2 top-1/2 z-40 h-[max(100%,calc(100vw*0.42))] w-[max(100%,calc(100svh*2.4))] -translate-x-1/2 -translate-y-1/2" viewBox="140 60 720 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <mask id="fuji-mask" maskUnits="userSpaceOnUse" x="-5000" y="-5000" width="11000" height="11000">
              <rect x="-5000" y="-5000" width="11000" height="11000" fill="white" />
              <g ref={lettersRef}>
                {LETTERS.map((l) => (
                  <text key={l.ch} x={l.x} y="330" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="700" fontSize="290" fill="black">
                    {l.ch}
                  </text>
                ))}
              </g>
            </mask>
          </defs>
          <rect x="-5000" y="-5000" width="11000" height="11000" fill="#000" mask="url(#fuji-mask)" />
        </svg>
      )}
      <p ref={captionRef} className="display absolute inset-x-0 bottom-[16%] z-30 px-6 text-center text-[clamp(1.6rem,3.4vw,3rem)] text-cream [text-shadow:0_4px_30px_rgba(0,0,0,.8)]" style={still ? undefined : { opacity: 0 }}>
        Sliced to order. <em>Served at your table.</em>
      </p>
    </section>
  );
}

/* ── 03 On the board — eleven from the sea ───────────────────────── */
const FISH = [
  { en: 'Salmon', jp: 'サーモン', id: 'salmon-nigiri', art: 'nigiri:salmon' },
  { en: 'Tuna', jp: 'マグロ', id: 'tuna-gunkan', art: 'nigiri:tuna' },
  { en: 'Yellowtail', jp: 'ハマチ', id: 'delux-sashimi', art: 'nigiri:yellowtail' },
  { en: 'Mackerel', jp: 'サバ', id: 'saba-nigiri', art: 'nigiri:saba' },
  { en: 'Sea bass', jp: 'スズキ', id: 'sea-bass-nigiri', art: 'nigiri:seabass' },
  { en: 'Scallop', jp: 'ホタテ', id: 'seared-scallop-nigiri', art: 'nigiri:scallop' },
  { en: 'Eel', jp: 'ウナギ', id: 'eel-nigiri', art: 'nigiri:eel' },
  { en: 'Octopus', jp: 'タコ', id: 'octopus-nigiri', art: 'nigiri:octopus' },
  { en: 'Prawn', jp: 'エビ', id: 'prawn-nigiri', art: 'nigiri:prawn' },
  { en: 'Sweet shrimp', jp: '甘エビ', id: 'sweet-shrimp-ama-ebi', art: 'nigiri:amaebi' },
  { en: 'Flying fish roe', jp: 'とびこ', id: 'flying-fish-roe-gunkan', art: 'gunkan:roe' },
];

export function OnTheBoard() {
  const { getItem } = useSiteData();
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(null);
  const listRef = useRef(null);
  useEffect(() => {
    const items = [...listRef.current.querySelectorAll('li')];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.i))),
      { rootMargin: '-48% 0px -48% 0px' },
    );
    items.forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, []);
  const shown = hover ?? active;

  return (
    <section className="relative py-28 sm:py-36" aria-labelledby="board-title">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="lg:sticky lg:top-24 lg:h-[calc(100svh-8rem)]">
          <p className="eyebrow"><b>03</b> On the board <span className="jp normal-case tracking-normal text-cream/60">まな板</span></p>
          <SplitReveal id="board-title" className="mt-5 text-[clamp(2.2rem,4.6vw,4.2rem)]">
            Eleven from the sea. <em>One very sharp knife.</em>
          </SplitReveal>
          <div className="relative mt-8 aspect-[4/3] max-h-[48svh] overflow-hidden rounded-[22px] border border-hair bg-black" data-cursor="Slice">
            {FISH.map((f, i) => (
              <div key={f.en} className="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)]" style={{ opacity: i === shown ? 1 : 0, transform: `scale(${i === shown ? 1 : 0.9}) translateY(${i === shown ? 0 : 16}px)` }} aria-hidden={i !== shown}>
                <DishImage item={getItem(f.id) || { id: f.id, name: f.en, art: f.art }} className="h-full w-full" steam={false} sizes="(max-width: 1024px) 92vw, 620px" />
              </div>
            ))}
            <p className="mono absolute right-5 top-4 z-10 rounded-full bg-black/55 px-2 py-0.5 backdrop-blur text-sm text-cream/70">
              <span className="text-saffron">{String(shown + 1).padStart(2, '0')}</span> / {FISH.length}
            </p>
          </div>
        </div>
        <ol ref={listRef} className="border-t border-hair lg:pt-[18vh]">
          {FISH.map((f, i) => (
            <li
              key={f.en}
              data-i={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={cx('flex items-baseline justify-between gap-6 border-b border-hair py-6 transition-colors', i === shown ? 'text-cream' : 'text-cream/60')}
            >
              <span className="mono text-xs text-saffron/80">{String(i + 1).padStart(2, '0')}</span>
              <Scramble text={f.en} alt={f.jp} active={hover === i} className="display flex-1 text-[clamp(1.8rem,3.6vw,3.2rem)]" />
              <span className="jp text-lg text-cream/60">{f.jp}</span>
            </li>
          ))}
          <li className="pb-[20vh] pt-6 text-sm text-cream/50">All eleven appear across Fuji&apos;s sashimi, nigiri, gunkan and platters.</li>
        </ol>
      </div>
    </section>
  );
}
