import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '../../context/MotionContext';

const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ── 3D tilt card with light glare ─────────────────────────────── */
export function TiltCard({ children, className = '', max = 9, glare = true, as: Tag = 'div', ...rest }) {
  const ref = useRef(null);
  const { still } = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || still || !finePointer()) return undefined;
    let raf = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--rx', `${(0.5 - py) * max}deg`);
        el.style.setProperty('--ry', `${(px - 0.5) * max}deg`);
        el.style.setProperty('--gx', `${px * 100}%`);
        el.style.setProperty('--gy', `${py * 100}%`);
        el.style.setProperty('--go', '1');
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--go', '0');
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [still, max]);

  return (
    <Tag
      ref={ref}
      className={`relative [transform-style:preserve-3d] transition-transform duration-300 ease-out ${className}`}
      style={{ transform: 'perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))' }}
      {...rest}
    >
      {children}
      {glare && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: 'var(--go, 0)',
            background: 'radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,.28), transparent 55%)',
            mixBlendMode: 'soft-light',
          }}
        />
      )}
    </Tag>
  );
}

/* ── Magnetic wrapper: pulls primary CTAs toward the cursor ─────── */
export function Magnetic({ children, strength = 0.32, className = '' }) {
  const ref = useRef(null);
  const { still } = useMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || still || !finePointer()) return undefined;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    };
    const onLeave = () => {
      el.style.transform = 'translate(0,0)';
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [still, strength]);

  return (
    <span ref={ref} className={`inline-flex transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${className}`}>
      {children}
    </span>
  );
}

/* ── Scroll reveal: fade + slide up (fade only when motion is reduced) ── */
export function Reveal({ children, delay = 0, y = 28, className = '', as = 'div', once = true, amount = 0.2 }) {
  const { still } = useMotion();
  const M = motion[as] || motion.div;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: still ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: still ? 0.3 : 0.75, delay: still ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/** Staggered grid: wrap items with <RevealItem>. */
export function RevealGroup({ children, className = '', stagger = 0.08, as = 'div' }) {
  const M = motion[as] || motion.div;
  return (
    <M
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.08 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </M>
  );
}

export function RevealItem({ children, className = '', as = 'div', ...rest }) {
  const { still } = useMotion();
  const M = motion[as] || motion.div;
  return (
    <M
      className={className}
      variants={{
        hidden: { opacity: 0, y: still ? 0 : 30 },
        show: { opacity: 1, y: 0, transition: { duration: still ? 0.3 : 0.7, ease: [0.22, 1, 0.36, 1] } },
      }}
      {...rest}
    >
      {children}
    </M>
  );
}

/* ── Tap ripple for touch devices ──────────────────────────────── */
export function TapRipple() {
  const { still } = useMotion();
  useEffect(() => {
    if (still) return undefined;
    const onDown = (e) => {
      if (e.pointerType !== 'touch') return;
      const s = document.createElement('span');
      s.setAttribute('aria-hidden', 'true');
      Object.assign(s.style, {
        position: 'fixed', left: `${e.clientX - 30}px`, top: `${e.clientY - 30}px`, width: '60px', height: '60px',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 9998,
        border: '2px solid rgba(212,32,42,.7)', background: 'rgba(244,198,207,.25)',
        transform: 'scale(.2)', opacity: '1', transition: 'transform .55s cubic-bezier(.22,1,.36,1), opacity .55s',
      });
      document.body.appendChild(s);
      requestAnimationFrame(() => {
        s.style.transform = 'scale(1.6)';
        s.style.opacity = '0';
      });
      setTimeout(() => s.remove(), 600);
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onDown);
  }, [still]);
  return null;
}

/* ── DOM steam overlay (shown on hover/focus of a .group) ───────── */
export function Steam({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 50"
      className={`pointer-events-none absolute left-1/2 top-[8%] z-[3] w-16 -translate-x-1/2 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100 ${className}`}
    >
      {[18, 30, 42].map((x, i) => (
        <path
          key={x}
          className="steam-wisp"
          d={`M${x} 48 q-7 -9 0 -18 q7 -9 0 -18`}
          stroke="rgba(255,255,255,.85)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      ))}
    </svg>
  );
}
