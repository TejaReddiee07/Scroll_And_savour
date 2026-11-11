import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, BookOpen, CalendarDays, UtensilsCrossed } from 'lucide-react';
import DishArt from '../menu/DishArt';
import { SteamWisps } from '../characters/Extras';
import { AddButton } from '../menu/DishCard';
import { RingBadge, RollText } from '../fx';
import { SteamRise } from '../ui';
import { Magnetic } from '../effects/Interactions';
import { useSiteData } from '../../context/SiteDataContext';
import { useMotion } from '../../context/MotionContext';
import { scrollToY } from '../../lib/smooth';
import { formatGBP, cx } from '../../lib/format';
import { photoFor } from '../../data/photos';

gsap.registerPlugin(ScrollTrigger);

/* The eight dishes the hero serves, in order. Copy comes from the menu data. */
export const HERO_DISHES = [
  { id: 'delux-sashimi', word: 'Sashimi', jp: '刺身', cat: 'Sashimi', title: ['Delux', 'Sashimi'], accent: '#f7875a' },
  { id: 'chicken-katsu-curry', word: 'Katsu', jp: 'カツカレー', cat: 'Katsu curry rice', title: ['Chicken', 'Katsu-Curry'], accent: '#f0a032' },
  { id: 'prawn-tempura', word: 'Tempura', jp: '天ぷら', cat: 'Starters', title: ['Prawn', 'Tempura'], accent: '#ffc35a' },
  { id: 'miso-ramen', word: 'Ramen', jp: 'ラーメン', cat: 'Ramen noodle soup', title: ['Miso', 'Ramen'], accent: '#c06a3a' },
  { id: 'sirloin-steak-bento', word: 'Bento', jp: '弁当', cat: 'Bento boxes', title: ['Sirloin Steak', 'Bento'], accent: '#d9472e' },
  { id: 'chicken-karage', word: 'Karaage', jp: '唐揚げ', cat: 'Starters', title: ['Chicken', 'Karage'], accent: '#e0913a' },
  { id: 'fuji-roll', word: 'Maki', jp: '太巻', cat: 'Futo maki', title: ['Fuji', 'Roll'], accent: '#e2553a' },
  { id: 'rainbow-roll', word: 'Uramaki', jp: '裏巻', cat: 'Uramaki rolls', title: ['Rainbow', 'Roll'], accent: '#f7875a' },
];

/* ── generic "explode any SVG" ─────────────────────────────────────
   Every leaf shape gets a vector away from the plate centre (in the root
   viewBox), converted into its parent's coordinate space so existing
   transforms are preserved. Large shapes (plates, bowls, boards) barely move. */
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildExplode(svg, seed) {
  const rootCTM = svg.getScreenCTM();
  if (!rootCTM) return [];
  const rootInv = rootCTM.inverse();
  const rnd = mulberry32(seed);
  const C = { x: 100, y: 96 };
  const parts = [];
  svg.querySelectorAll('path, ellipse, circle, rect, text, polygon, line, polyline').forEach((el) => {
    if (el.closest('defs, clipPath, mask')) return;
    let bb;
    try {
      bb = el.getBBox();
    } catch {
      return;
    }
    const ctm = el.getScreenCTM();
    if (!ctm) return;
    const m = rootInv.multiply(ctm);
    const cx0 = bb.x + bb.width / 2;
    const cy0 = bb.y + bb.height / 2;
    const wc = { x: m.a * cx0 + m.c * cy0 + m.e, y: m.b * cx0 + m.d * cy0 + m.f };
    const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
    const area = bb.width * bb.height * s * s;
    const vessel = area > 3800;
    let dx = wc.x - C.x;
    let dy = wc.y - C.y;
    if (Math.hypot(dx, dy) < 3) {
      const a = rnd() * Math.PI * 2;
      dx = Math.cos(a);
      dy = Math.sin(a);
    }
    const ang = Math.atan2(dy, dx) + (rnd() - 0.5) * 0.9;
    const dist = vessel ? 5 + rnd() * 5 : 24 + rnd() * 50 + Math.min(24, 380 / Math.sqrt(area + 1));
    let wx = Math.cos(ang) * dist;
    let wy = Math.sin(ang) * dist * 0.8 - (vessel ? -14 : 16 + rnd() * 20);
    if (vessel) wx *= 0.15;
    const rot = vessel ? (rnd() - 0.5) * 6 : (rnd() - 0.5) * 170;
    let px = wx;
    let py = wy;
    let pcx = wc.x;
    let pcy = wc.y;
    const parent = el.parentNode;
    if (parent && parent !== svg && parent.getScreenCTM) {
      const inv = rootInv.multiply(parent.getScreenCTM()).inverse();
      px = inv.a * wx + inv.c * wy;
      py = inv.b * wx + inv.d * wy;
      pcx = inv.a * wc.x + inv.c * wc.y + inv.e;
      pcy = inv.b * wc.x + inv.d * wc.y + inv.f;
    }
    parts.push({ el, orig: el.getAttribute('transform') || '', px, py, rot, pcx, pcy });
  });
  return parts;
}

/* Real food (cut-out): the dish shatters into jagged pieces that fly out and reassemble. */
function makeCells(seed, cols = 5, rows = 4) {
  const rnd = mulberry32(seed * 7919);
  const v = [];
  for (let j = 0; j <= rows; j += 1) {
    v.push([]);
    for (let i = 0; i <= cols; i += 1) {
      const edgeX = i === 0 || i === cols;
      const edgeY = j === 0 || j === rows;
      const x = (i / cols) * 100 + (edgeX ? 0 : (rnd() - 0.5) * (70 / cols));
      const y = (j / rows) * 100 + (edgeY ? 0 : (rnd() - 0.5) * (70 / rows));
      v[j].push([edgeX ? (i === 0 ? -2 : 102) : x, edgeY ? (j === 0 ? -2 : 102) : y]);
    }
  }
  const cells = [];
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const pts = [v[j][i], v[j][i + 1], v[j + 1][i + 1], v[j + 1][i]];
      const cx = pts.reduce((a, p) => a + p[0], 0) / 4;
      const cy = pts.reduce((a, p) => a + p[1], 0) / 4;
      const dx = (cx - 50) / 50;
      const dy = (cy - 55) / 50;
      const len = Math.hypot(dx, dy) || 1;
      const dist = 55 + rnd() * 75;
      cells.push({
        clip: `polygon(${pts.map((p) => `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`).join(', ')})`,
        cx,
        cy,
        px: (dx / len) * dist * (0.6 + 0.4 * Math.abs(dx)),
        py: (dy / len) * dist * 0.8 - 18 - rnd() * 26,
        rot: (rnd() - 0.5) * 50,
        sc: 0.92 + rnd() * 0.22,
      });
    }
  }
  return cells;
}

function buildShards(root) {
  return {
    kind: 'shards',
    on: null,
    whole: root.querySelector('[data-whole]'),
    layer: root.querySelector('[data-shards]'),
    items: [...root.querySelectorAll('[data-shard]')].map((el) => ({
      el,
      px: Number(el.dataset.px),
      py: Number(el.dataset.py),
      rot: Number(el.dataset.rot),
      sc: Number(el.dataset.sc),
    })),
  };
}

/* Real photos without a cut-out: the knife cut — the photo splits into vertical slices. */
const SLICES = 7;
function buildSlices(nodes, wrap) {
  const mid = (nodes.length - 1) / 2;
  return {
    kind: 'slices',
    wrap,
    items: [...nodes].map((el, k) => ({
      el,
      px: (k - mid) * 16,
      py: (k % 2 ? 1 : -1) * (26 + ((k * 37) % 5) * 9),
      rot: (k - mid) * 1.4,
    })),
  };
}

function applyExplode(parts, e) {
  if (parts && parts.kind === 'shards') {
    const on = e > 0.002;
    if (parts.on !== on) {
      parts.on = on;
      // whole image at rest (no seams), separate pieces only while exploding
      if (parts.whole) parts.whole.style.opacity = on ? '0' : '1';
      if (parts.layer) parts.layer.style.opacity = on ? '1' : '0';
    }
    for (const p of parts.items) {
      const v = on
        ? `translate3d(${(p.px * e).toFixed(1)}px, ${(p.py * e).toFixed(1)}px, 0) rotate(${(p.rot * e).toFixed(1)}deg) scale(${(1 + (p.sc - 1) * e).toFixed(3)})`
        : '';
      if (p.el.__xv !== v) {
        p.el.__xv = v;
        p.el.style.transform = v;
      }
    }
    return;
  }
  if (parts && parts.kind === 'slices') {
    const t = e < 0.0005 ? '' : `scale(${(1 + 0.08 * e).toFixed(4)})`;
    if (parts.wrap.__xv !== t) {
      parts.wrap.__xv = t;
      parts.wrap.style.transform = t;
    }
    for (const p of parts.items) {
      const v = e < 0.0005 ? '' : `translate3d(${(p.px * e).toFixed(1)}px, ${(p.py * e).toFixed(1)}px, 0) rotate(${(p.rot * e).toFixed(2)}deg)`;
      if (p.el.__xv !== v) {
        p.el.__xv = v;
        p.el.style.transform = v;
      }
    }
    return;
  }
  for (const p of parts) {
    const v = e < 0.0005 ? p.orig : `translate(${(p.px * e).toFixed(2)} ${(p.py * e).toFixed(2)}) rotate(${(p.rot * e).toFixed(1)} ${p.pcx.toFixed(1)} ${p.pcy.toFixed(1)}) ${p.orig}`;
    if (p.el.__xv !== v) {
      p.el.__xv = v;
      if (v) p.el.setAttribute('transform', v);
      else p.el.removeAttribute('transform');
    }
  }
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function ShardedCutout({ photo, alt, priority, seed }) {
  const cells = useMemo(() => makeCells(seed), [seed]);
  const common = {
    src: photo.src,
    srcSet: photo.srcset,
    sizes: '(max-width: 1024px) 64vw, 520px',
    alt: '',
    draggable: 'false',
    decoding: 'async',
    className: 'absolute inset-0 h-full w-full object-contain',
  };
  return (
    <div className="hero-food absolute inset-[12%_6%_15%]" role="img" aria-label={alt}>
      <img data-whole="" data-dish-art="" {...common} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} />
      <div data-shards="" className="absolute inset-0" style={{ opacity: 0 }}>
        {cells.map((c, k) => (
          <div
            key={k}
            data-shard=""
            data-px={c.px.toFixed(1)}
            data-py={c.py.toFixed(1)}
            data-rot={c.rot.toFixed(1)}
            data-sc={c.sc.toFixed(3)}
            className="absolute inset-0 will-change-transform"
            style={{ clipPath: c.clip, transformOrigin: `${c.cx.toFixed(1)}% ${c.cy.toFixed(1)}%` }}
          >
            <img {...common} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SlicedPhoto({ photo, alt, priority }) {
  return (
    <div data-slices="" role="img" aria-label={alt} className="absolute inset-0 origin-center">
      {Array.from({ length: SLICES }, (_, k) => (
        <div
          key={k}
          data-slice=""
          className="absolute inset-y-0 overflow-hidden"
          style={{ left: `${(k * 100) / SLICES}%`, width: `calc(${100 / SLICES}% + 1px)` }}
        >
          <img
            src={photo.src}
            srcSet={photo.srcset}
            sizes="(max-width: 1024px) 70vw, 560px"
            alt=""
            draggable="false"
            decoding="async"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority && k === 0 ? 'high' : undefined}
            {...(k === 0 ? { 'data-dish-art': '' } : {})}
            className="absolute inset-y-0 h-full max-w-none object-cover"
            style={{ width: `${SLICES * 100}%`, left: `${-k * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export default function HeroScrub() {
  const { still } = useMotion();
  const { getItem } = useSiteData();
  const dishes = HERO_DISHES.map((d) => ({ ...d, item: getItem(d.id) })).filter((d) => d.item);
  const N = dishes.length;
  const [active, setActive] = useState(0);

  const stageRef = useRef(null);
  const archRef = useRef(null);
  const barRef = useRef(null);
  const dishEls = useRef([]);
  const wordEls = useRef([]);
  const textEls = useRef([]);
  const parts = useRef([]);
  const S = useRef({ cur: 0, e: 0, target: 0, mx: 0, my: 0, lx: 0, ly: 0, st: null });

  // explode data is measured lazily (idle time / on first use) so first paint stays fast
  const partsFor = (i) => {
    if (!parts.current[i]) {
      const root = dishEls.current[i];
      const slices = root?.querySelectorAll('[data-slice]');
      if (root?.querySelector('[data-shards]')) {
        parts.current[i] = buildShards(root);
      } else if (slices?.length) {
        parts.current[i] = buildSlices(slices, root.querySelector('[data-slices]'));
      } else {
        const svg = root?.querySelector('svg[data-dish-art]');
        parts.current[i] = svg ? buildExplode(svg, 1000 + i * 97) : [];
      }
    }
    return parts.current[i];
  };
  useEffect(() => {
    if (still) return undefined;
    parts.current = [];
    let i = 0;
    let id = 0;
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const next = () => {
      if (i >= N) return;
      partsFor(i);
      i += 1;
      id = idle(next, { timeout: 2500 });
    };
    id = idle(next, { timeout: 2500 });
    return () => cancel(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, N]);

  // initial visual state
  useLayoutEffect(() => {
    dishEls.current.forEach((el, i) => el && gsap.set(el, { opacity: i === 0 ? 1 : 0, scale: 1, y: 0, filter: 'blur(0px)' }));
    wordEls.current.forEach((el, i) => el && gsap.set(el.querySelectorAll('.wl'), { yPercent: i === 0 ? 0 : 110 }));
    textEls.current.forEach((el, i) => {
      if (!el) return;
      gsap.set(el, { autoAlpha: i === 0 ? 1 : 0 });
      gsap.set(el.querySelectorAll('.tl'), { yPercent: i === 0 ? 0 : 110 });
    });
    stageRef.current?.style.setProperty('--accent', dishes[0]?.accent || '#f0a032');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N]);

  const change = (to, dir) => {
    const s = S.current;
    const from = s.cur;
    if (to === from) return;
    s.cur = to;
    setActive(to);
    const d = dir >= 0 ? 1 : -1;
    const outD = dishEls.current[from];
    const inD = dishEls.current[to];
    gsap.killTweensOf([outD, inD]);
    gsap.to(outD, { y: -70 * d, scale: 0.86, filter: 'blur(8px)', opacity: 0, duration: 0.7, ease: 'power2.inOut', force3D: true });
    gsap.fromTo(inD, { y: 90 * d, scale: 1.18, filter: 'blur(10px)', opacity: 0 }, { y: 0, scale: 1, filter: 'blur(0px)', opacity: 1, duration: 1.15, ease: 'expo.out', force3D: true, clearProps: 'filter' });
    // the arriving dish jumps straight to the right frame
    s.e = s.target;
    applyExplode(partsFor(to), s.e);
    applyExplode(parts.current[from] || [], 0);

    const outW = wordEls.current[from]?.querySelectorAll('.wl');
    const inW = wordEls.current[to]?.querySelectorAll('.wl');
    if (outW) gsap.to(outW, { yPercent: -110 * d, duration: 0.6, ease: 'power3.in', stagger: { each: 0.025, from: d > 0 ? 'start' : 'end' }, overwrite: true });
    if (inW) gsap.fromTo(inW, { yPercent: 110 * d }, { yPercent: 0, duration: 0.9, ease: 'expo.out', delay: 0.18, stagger: { each: 0.03, from: d > 0 ? 'start' : 'end' }, overwrite: true });

    const outT = textEls.current[from];
    const inT = textEls.current[to];
    if (outT) {
      gsap.to(outT.querySelectorAll('.tl'), { yPercent: -110 * d, duration: 0.5, ease: 'power3.in', stagger: 0.05, overwrite: true });
      gsap.to(outT, { autoAlpha: 0, duration: 0.3, delay: 0.35, overwrite: 'auto' });
    }
    if (inT) {
      gsap.set(inT, { autoAlpha: 1 });
      gsap.fromTo(inT.querySelectorAll('.tl'), { yPercent: 110 * d }, { yPercent: 0, duration: 1, ease: 'expo.out', delay: 0.2, stagger: 0.07, overwrite: true });
    }
    gsap.to(stageRef.current, { '--accent': dishes[to].accent, duration: 0.9, ease: 'power2.out' });
  };

  // pinned scroll: N bands, current dish = floor(progress × N)
  // (layout effect + high refresh priority: must exist before later sections measure)
  useLayoutEffect(() => {
    if (still || !N) return undefined;
    const s = S.current;
    const band = () => window.innerHeight * (window.innerWidth < 900 ? 0.9 : 1.05);
    const st = ScrollTrigger.create({
      trigger: stageRef.current,
      start: 'top top',
      end: () => `+=${band() * N}`,
      pin: true,
      anticipatePin: 1,
      refreshPriority: 10,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress * N;
        const idx = Math.min(N - 1, Math.floor(p));
        const local = idx === N - 1 && self.progress >= 1 ? 1 : p - idx;
        s.target = smooth(0.12, 0.86, local);
        if (idx !== s.cur) change(idx, self.direction);
        if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
      },
    });
    s.st = st;

    const onMove = (e) => {
      const r = stageRef.current.getBoundingClientRect();
      s.mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      s.my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const stage = stageRef.current;
    stage.addEventListener('pointermove', onMove);
    const tick = () => {
      // lerp the explode amount toward the scroll target (factor 0.2)
      const prev = s.e;
      s.e += (s.target - s.e) * 0.2;
      if (Math.abs(s.e - prev) > 0.0005) applyExplode(partsFor(s.cur), s.e);
      // arch leans toward the cursor
      s.lx += (s.mx - s.lx) * 0.08;
      s.ly += (s.my - s.ly) * 0.08;
      if (archRef.current) archRef.current.style.transform = `perspective(1100px) rotateY(${(s.lx * 7).toFixed(2)}deg) rotateX(${(-s.ly * 5).toFixed(2)}deg)`;
    };
    gsap.ticker.add(tick);
    const t = setTimeout(() => ScrollTrigger.refresh(), 500);
    return () => {
      clearTimeout(t);
      gsap.ticker.remove(tick);
      stage.removeEventListener('pointermove', onMove);
      st.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, N]);

  const goTo = (i) => {
    const s = S.current;
    if (still || !s.st) {
      change(i, i > s.cur ? 1 : -1);
      return;
    }
    const band = (s.st.end - s.st.start) / N;
    scrollToY(s.st.start + band * i + band * 0.04);
  };

  const cur = dishes[active];

  return (
    <section
      ref={stageRef}
      className="relative h-[100svh] min-h-[640px] overflow-hidden bg-ink"
      aria-label="Fuji signature dishes — scroll to serve each one"
      style={{ '--accent': dishes[0]?.accent }}
    >
      {/* accent glow + giant word */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_58%_55%,color-mix(in_srgb,var(--accent)_26%,transparent),transparent_70%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[18%] flex justify-center lg:top-[14%]">
        <div className="relative h-[clamp(7rem,24vw,22rem)] w-full">
          {dishes.map((d, i) => (
            <div key={d.id} ref={(el) => (wordEls.current[i] = el)} className="absolute inset-0 flex justify-center overflow-hidden">
              {d.word.split('').map((ch, k) => (
                <span key={k} className="wl display inline-block text-[clamp(7rem,24vw,22rem)] leading-[0.95] text-cream/[0.07]">
                  {ch}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="container-x relative grid h-full grid-rows-[1fr_auto] pb-4 pt-20 md:pb-6 md:pt-28">
        <div className="grid content-center items-center gap-3 lg:grid-cols-[1fr_minmax(300px,520px)_200px] lg:gap-6">
          {/* left: category, masked two-line title, description, price */}
          <div className="relative z-20 order-2 lg:order-1 lg:min-h-[16rem]">
            <h1 className="mono sr-only mb-5 text-[0.7rem] uppercase tracking-[0.24em] text-cream/60 lg:not-sr-only lg:block">
              Fuji Japanese Restaurant <span className="text-saffron">·</span> Stoke Newington, London N16
            </h1>
            <div className="relative">
              {dishes.map((d, i) => (
                <div key={d.id} ref={(el) => (textEls.current[i] = el)} className={cx(i === 0 ? 'relative' : 'absolute inset-x-0 top-0')} aria-hidden={i !== active}>
                  <p className="eyebrow"><b>{String(i + 1).padStart(2, '0')}</b> {d.cat} <span className="jp normal-case tracking-normal text-cream/60">{d.jp}</span></p>
                  <h2 className="mt-2 text-[clamp(2.2rem,6vw,5.6rem)] lg:mt-4">
                    <span className="block overflow-hidden pb-[0.06em]"><span className="tl block">{d.title[0]}</span></span>
                    <span className="block overflow-hidden pb-[0.08em]"><em className="tl block">{d.title[1]}</em></span>
                  </h2>
                  <div className="overflow-hidden">
                    <p className="tl mt-2 line-clamp-2 max-w-md text-sm text-cream/70 lg:mt-4 lg:line-clamp-none lg:text-base">{d.item.description}</p>
                  </div>
                  <div className="overflow-hidden">
                    <p className="tl mono mt-2 text-xl lg:mt-5 lg:text-2xl" style={{ color: 'var(--accent)' }}>{formatGBP(d.item.price)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 lg:mt-7">
              {cur && <AddButton item={cur.item} sourceRef={{ current: dishEls.current[active] }} />}
              <Link to={`/menu#${cur?.id}`} className="btn btn-outline btn-sm"><RollText>See on menu</RollText></Link>
            </div>
          </div>

          {/* centre: the arch with the dish */}
          <div className="relative order-1 mx-auto w-[min(62vw,34svh,440px)] lg:order-2 lg:w-full">
            <div
              ref={archRef}
              data-cursor="Taste"
              className="relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-t-[999px] rounded-b-[28px] border border-hair bg-black shadow-[0_60px_120px_-40px_rgba(0,0,0,.9)] lg:max-h-[68svh]"
            >
              <div className="absolute inset-[7%] rounded-t-[999px] rounded-b-[20px] border border-hair/60" aria-hidden="true" />
              {dishes.map((d, i) => photoFor(d.id) ? (
                <div key={d.id} ref={(el) => (dishEls.current[i] = el)} className="absolute inset-0 will-change-transform" aria-hidden={i !== active}>
                  {photoFor(d.id).cutout ? (
                    <>
                      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_56%_42%_at_50%_57%,rgba(240,160,50,.22),rgba(192,106,58,.06)_50%,transparent_74%)]" />
                      <span className="hero-floor pointer-events-none absolute bottom-[12%] left-[20%] right-[20%] h-[7%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,.95),transparent)] blur-[6px]" />
                      <ShardedCutout photo={photoFor(d.id).cutout} alt={`${d.item.name} at Fuji Japanese Restaurant`} priority={i < 2} seed={i + 1} />
                      {d.item.hot && <SteamRise />}
                    </>
                  ) : (
                    <>
                      <SlicedPhoto photo={photoFor(d.id)} alt={`${d.item.name} at Fuji Japanese Restaurant`} priority={i < 2} />
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_115%,rgba(0,0,0,.75),transparent_55%)]" />
                    </>
                  )}
                </div>
              ) : (
                <div key={d.id} ref={(el) => (dishEls.current[i] = el)} className="absolute inset-x-[2%] top-[22%] aspect-[4/3]" aria-hidden={i !== active}>
                  {d.item.hot && (
                    <svg viewBox="-40 -60 80 60" className="absolute left-1/2 top-[-18%] w-[22%] -translate-x-1/2" aria-hidden="true">
                      <SteamWisps scale={1.3} opacity={0.6} />
                    </svg>
                  )}
                  <DishArt art={d.item.art} className="h-full w-full" style={{ overflow: 'visible' }} title={i === active ? `Illustration of ${d.item.name}` : undefined} />
                </div>
              ))}
              {!photoFor(cur?.id) && <span className="label-illustrative !bottom-4 !left-1/2 -translate-x-1/2">Illustration</span>}
            </div>
            <RingBadge className="absolute -right-8 -top-6 z-10 hidden text-cream/70 lg:block" size={112} />
          </div>

          {/* right: clickable index of all eight */}
          <nav aria-label="Hero dishes" className="relative z-20 order-3 hidden lg:block">
            <ol className="space-y-2.5">
              {dishes.map((d, i) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === active ? 'true' : undefined}
                    className={cx('group flex w-full items-baseline gap-3 text-left transition-colors', i === active ? 'text-cream' : 'text-cream/55 hover:text-cream')}
                  >
                    <span className="mono text-[0.68rem]" style={i === active ? { color: 'var(--accent)' } : undefined}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="display text-lg">{d.item.name.replace(/\s*\(.*\)/, '')}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* bottom: CTAs, 01–08 strip, progress */}
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="hidden flex-wrap gap-2.5 sm:flex">
              <Magnetic><Link to="/menu" className="btn btn-primary"><BookOpen size={15} /> <RollText>Explore menu</RollText></Link></Magnetic>
              <Magnetic><Link to="/reservations" className="btn btn-outline"><CalendarDays size={15} /> <RollText>Book a table</RollText></Link></Magnetic>
              <Magnetic><Link to="/order" className="btn btn-outline"><UtensilsCrossed size={15} /> <RollText>Order online</RollText></Link></Magnetic>
            </div>
            <p className="mono hidden items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em] text-cream/60 sm:inline-flex">
              <ArrowDown size={13} className="animate-bounce" /> Scroll to serve
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ol className="mono flex gap-2 text-[0.7rem] sm:gap-3" aria-label="Dish counter">
              {dishes.map((d, i) => (
                <li key={d.id}>
                  <button type="button" onClick={() => goTo(i)} className={cx('grid h-6 min-w-6 place-items-center transition-colors', i === active ? 'text-cream' : 'text-cream/55 hover:text-cream')}>
                    <span className="sr-only">Show dish </span>
                    {String(i + 1).padStart(2, '0')}
                    <span className="sr-only">: {d.item.name}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="relative h-px flex-1 bg-hair" aria-hidden="true">
              <div ref={barRef} className="absolute inset-0 origin-left scale-x-0" style={{ background: 'var(--accent)' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
