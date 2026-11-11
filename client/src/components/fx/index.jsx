import { createElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useMotion } from '../../context/MotionContext';
import { scrollState } from '../../lib/smooth';

gsap.registerPlugin(ScrollTrigger, SplitText);

/* ── Headlines split into lines that rise in through masks ───────── */
export function SplitReveal({ as = 'h2', children, className = '', delay = 0, stagger = 0.09, start = 'top 85%', immediate = false, ...rest }) {
  const ref = useRef(null);
  const { still } = useMotion();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || still) return undefined;
    let split;
    const ctx = gsap.context(() => {
      split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.1,
            ease: 'expo.out',
            stagger,
            delay,
            scrollTrigger: immediate ? undefined : { trigger: el, start, once: true },
          });
        },
      });
    }, el);
    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [still, delay, stagger, start, immediate]);
  return createElement(as, { ref, className, ...rest }, children);
}

/* ── Link text that rolls on hover ───────────────────────────────── */
export function RollText({ children, className = '' }) {
  const text = typeof children === 'string' ? children : '';
  return (
    <span className={`roll ${className}`}>
      <span data-text={text}>{children}</span>
    </span>
  );
}

/* ── Two-row marquee whose speed & skew react to scroll velocity ─── */
export function Marquee({ rows, className = '' }) {
  const rowRefs = useRef([]);
  const { still } = useMotion();
  useEffect(() => {
    if (still) return undefined;
    const state = rows.map(() => ({ x: 0, w: 1 }));
    const measure = () =>
      rowRefs.current.forEach((el, i) => {
        if (el) state[i].w = el.scrollWidth / 2;
      });
    measure();
    window.addEventListener('resize', measure);
    let skew = 0;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (rowRefs.current[0]) io.observe(rowRefs.current[0].parentElement);
    const tick = (_, dt) => {
      if (!visible) return;
      const v = scrollState.velocity || 0;
      const speed = 0.9 + Math.min(6, Math.abs(v) * 0.35);
      skew += (Math.max(-12, Math.min(12, v * 0.6)) - skew) * 0.1;
      rowRefs.current.forEach((el, i) => {
        if (!el) return;
        const dir = i % 2 ? 1 : -1;
        const s = state[i];
        s.x += dir * speed * (dt / 16.7) * (v < 0 ? -1 : 1);
        if (s.x <= -s.w) s.x += s.w;
        if (s.x > 0) s.x -= s.w;
        el.style.transform = `translate3d(${s.x}px,0,0) skewX(${(-skew).toFixed(2)}deg)`;
      });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [rows, still]);

  return (
    <div className={`overflow-hidden border-y border-hair py-5 ${className}`} aria-hidden="true">
      {rows.map((row, i) => (
        <div key={i} className="overflow-hidden">
          <div ref={(el) => (rowRefs.current[i] = el)} className="marquee-track">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center">
                {row.map((w, j) => (
                  <span key={j} className="flex items-center">
                    <span className={`whitespace-nowrap px-6 ${w.jp ? 'jp text-[clamp(1.6rem,4vw,3.4rem)] text-saffron/80' : `display text-[clamp(2rem,5.4vw,4.6rem)] ${i % 2 ? 'italic text-cream/60' : 'text-cream'}`}`}>
                      {w.t}
                    </span>
                    <span className="text-saffron">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Rising sparks canvas (160 desktop / 70 mobile) ──────────────── */
export function Sparks({ className = '' }) {
  const ref = useRef(null);
  const { still } = useMotion();
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || still) return undefined;
    const ctx = canvas.getContext('2d');
    const N = window.innerWidth < 900 ? 70 : 160;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };
    resize();
    const sparks = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(), v: 0.0006 + Math.random() * 0.0022, r: 0.4 + Math.random() * 1.8,
      drift: (Math.random() - 0.5) * 0.0008, phase: Math.random() * 6.28, life: Math.random(),
    }));
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // one pre-rendered glow sprite, drawn with drawImage (no per-frame gradients)
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sc = sprite.getContext('2d');
    const g = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,214,140,1)');
    g.addColorStop(0.35, 'rgba(240,140,50,.55)');
    g.addColorStop(1, 'rgba(194,54,31,0)');
    sc.fillStyle = g;
    sc.fillRect(0, 0, 64, 64);
    let last = 0;
    const tick = (t) => {
      if (!visible) return;
      if (t - last < 1 / 61) return; // cap at the display rate
      last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const s of sparks) {
        s.y -= s.v;
        s.x += s.drift + Math.sin(t * 1.5 + s.phase) * 0.0004;
        if (s.y < -0.05) {
          s.y = 1.05;
          s.x = Math.random();
        }
        const fade = Math.min(1, s.y * 1.4) * (0.55 + 0.45 * Math.sin(t * 6 + s.phase));
        if (fade <= 0.02) continue;
        const size = s.r * 8;
        ctx.globalAlpha = fade;
        ctx.drawImage(sprite, s.x * w - size / 2, s.y * h - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      ro.disconnect();
    };
  }, [still]);
  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}

/* ── Text that scrambles into another string on hover ─────────────── */
const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01234567890ABCDEFGHJK';
export function Scramble({ text, alt, className = '', active }) {
  const [shown, setShown] = useState(text);
  const raf = useRef(0);
  const { still } = useMotion();
  const run = (to) => {
    cancelAnimationFrame(raf.current);
    if (still) return setShown(to);
    const from = shown;
    const len = Math.max(from.length, to.length);
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 520);
      let out = '';
      for (let i = 0; i < len; i += 1) {
        const settle = i / len;
        if (p > settle + 0.25) out += to[i] || '';
        else if (p > settle) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else out += from[i] || '';
      }
      setShown(out);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setShown(to);
    };
    raf.current = requestAnimationFrame(step);
    return undefined;
  };
  useEffect(() => {
    if (active === undefined) return;
    run(active ? alt : text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <span
      className={className}
      onMouseEnter={active === undefined ? () => run(alt) : undefined}
      onMouseLeave={active === undefined ? () => run(text) : undefined}
    >
      <span className="sr-only">{text} ({alt})</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}

/* ── Number that counts up when scrolled into view ───────────────── */
export function CountUp({ to, prefix = '', suffix = '', decimals = 0, duration = 1.8, className = '' }) {
  const ref = useRef(null);
  const { still } = useMotion();
  const fmt = (n) => `${prefix}${n.toFixed(decimals)}${suffix}`;
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (still) {
      el.textContent = fmt(to);
      return undefined;
    }
    const obj = { v: 0 };
    el.textContent = fmt(0);
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => gsap.to(obj, { v: to, duration, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(obj.v)) }),
    });
    return () => st.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, still]);
  return <span ref={ref} className={className}>{fmt(to)}</span>;
}

/* ── Fixed film grain ────────────────────────────────────────────── */
export function Grain() {
  return <div className="grain" aria-hidden="true" />;
}

/* ── Rotating ring badge with a mark in the middle ───────────────── */
export function RingBadge({ text = 'FUJI ✦ JAPANESE KITCHEN ✦ STOKE NEWINGTON ✦ ', size = 132, className = '' }) {
  const id = useRef(`ring-${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <div className={`${className.split(' ').includes('absolute') ? '' : 'relative'} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full animate-spin-slow">
        <defs>
          <path id={id} d="M60 60 m-48 0 a48 48 0 1 1 96 0 a48 48 0 1 1 -96 0" />
        </defs>
        <text fontFamily="DM Mono, monospace" fontSize="8.4" letterSpacing="2.6" fill="currentColor">
          <textPath href={`#${id}`}>{text}</textPath>
        </text>
      </svg>
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <circle cx="60" cy="56" r="13" fill="var(--accent, #c2361f)" />
        <path d="M38 76 L56 56 Q60 52 64 56 L82 76 Z" fill="#f4e9d8" opacity=".92" />
        <path d="M54 58 Q57 55 60 56 Q63 55 66 58 L63 61 L60 59 L57 61 Z" fill="#0a0706" opacity=".35" />
      </svg>
    </div>
  );
}


/* ── Inner-page hero: numbered eyebrow, masked split headline, intro ── */
export function PageHero({ num, label, jp, title, em, children, aside, className = '' }) {
  return (
    <section className={`relative overflow-hidden pb-14 pt-32 sm:pt-40 ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_85%_0%,rgba(192,106,58,.16),transparent_70%)]" />
      {jp && <span aria-hidden="true" className="jp pointer-events-none absolute -right-4 top-16 text-[clamp(7rem,18vw,15rem)] leading-none text-cream/[0.04]">{jp}</span>}
      <div className="container-x relative grid items-end gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow"><b>{num}</b> {label}</p>
          <SplitReveal as="h1" immediate className="mt-5 text-[clamp(3rem,8vw,7.2rem)]">
            {title} {em && <em>{em}</em>}
          </SplitReveal>
          {children && <div className="mt-6 max-w-2xl text-lg text-cream/70">{children}</div>}
        </div>
        {aside && <div className="relative">{aside}</div>}
      </div>
    </section>
  );
}
