import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Waiter from '../characters/Waiter';
import { poseWaiter, walkCycle, breathe, lookAtPointer, lerp, clamp } from '../characters/rig';
import { useMotion } from '../../context/MotionContext';

const TABLE_Y = 300;

/**
 * Reservation illustration. Idle: the waiter waits beside an empty table.
 * When `confirmed` flips to true she walks in and lays the table, finishing
 * with a "Reserved" card showing the booking name and time.
 */
export default function TableSetting({ confirmed = false, guests = 2, name = '', time = '', dateLabel = '' }) {
  const { still } = useMotion();
  const rig = useRef({});
  const itemsRef = useRef([]);
  const cardRef = useRef(null);
  const sparkleRef = useRef(null);
  const S = useRef({ wx: 130, facing: 1, lift: 0.15, bow: 0, place: 0 });
  const V = useRef({ prev: 130, phase: 0, amp: 0 });
  const settings = Math.min(4, Math.max(1, guests));
  const slots = settings === 1 ? [330] : [...Array(settings)].map((_, i) => 250 + (i * 160) / (settings - 1));

  useEffect(() => {
    const s = S.current;
    const v = V.current;
    const render = () => {
      const t = gsap.ticker.time;
      const dx = s.wx - v.prev;
      v.prev = s.wx;
      v.phase += Math.abs(dx) * 0.06;
      v.amp += (clamp(Math.abs(dx) / 2, 0, 1) - v.amp) * 0.25;
      const wc = walkCycle(v.phase, v.amp);
      const look = still ? { lookX: 0, lookY: 0 } : lookAtPointer(rig.current.eyes, Math.sign(s.facing) || 1);
      poseWaiter(rig, {
        x: s.wx, y: 400, scale: 0.95, facing: s.facing,
        bob: wc.bob, legL: wc.legL, legR: wc.legR, armBack: wc.armBack,
        lean: s.bow * 12, headTilt: s.bow * 6, breathe: breathe(t),
        armFront: lerp(-18, -60, s.lift), foreFront: lerp(-72, -40, s.place),
        ...look,
      });
    };

    const items = itemsRef.current.filter(Boolean);
    const all = [...items, cardRef.current, sparkleRef.current].filter(Boolean);
    let tl;
    if (!confirmed) {
      gsap.set(all, { opacity: 0, scale: 0, svgOrigin: '0 0' });
      Object.assign(s, { wx: 130, facing: 1, lift: 0.15, bow: 0, place: 0 });
    } else if (still) {
      gsap.set(all, { opacity: 1, scale: 1, svgOrigin: '0 0' });
      Object.assign(s, { wx: 130, facing: 1, lift: 0, bow: 0.3, place: 0 });
    } else {
      gsap.set(all, { opacity: 0, scale: 0, svgOrigin: '0 0' });
      Object.assign(s, { wx: -90, facing: 1, lift: 0.6, bow: 0, place: 0 });
      v.prev = -90;
      tl = gsap.timeline();
      tl.to(s, { wx: 130, duration: 1.4, ease: 'sine.inOut' });
      items.forEach((el, i) => {
        tl.to(s, { place: 1, bow: 0.5, lift: 0.1, duration: 0.22, ease: 'power2.out' }, `>-0.02`)
          .to(el, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2.4)' }, '<0.08')
          .to(s, { place: 0, bow: 0, lift: 0.5, duration: 0.2, ease: 'power2.in' }, i === items.length - 1 ? '>' : '>-0.05');
      });
      tl.to(cardRef.current, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(3)' }, '+=0.1')
        .to(sparkleRef.current, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(3)' }, '<0.2')
        .to(s, { bow: 1, lift: 0, duration: 0.5, ease: 'power2.out' }, '<')
        .to(s, { bow: 0.15, duration: 0.6, ease: 'power2.inOut' }, '+=0.3');
    }
    gsap.ticker.add(render);
    render();
    return () => {
      tl?.kill();
      gsap.ticker.remove(render);
    };
  }, [confirmed, still, settings]);

  const setItem = (i) => (el) => {
    itemsRef.current[i] = el;
  };
  let k = 0;

  return (
    <svg viewBox="0 0 600 420" className="h-auto w-full" role="img" aria-label={confirmed ? `Illustration: the waiter has laid a table for ${guests} with a Reserved card` : 'Illustration: a waiter waits beside an empty table'}>
      <defs>
        <linearGradient id="ts-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe6d6" />
          <stop offset="1" stopColor="#e2d5bf" />
        </linearGradient>
      </defs>
      <rect width="600" height="330" fill="url(#ts-wall)" />
      <circle cx="470" cy="120" r="70" fill="#b5121b" opacity="0.9" />
      <path d="M360 230 L450 150 Q462 140 470 144 L480 140 L490 144 Q498 140 510 150 L600 230 Z" fill="#3b3f57" opacity="0.35" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={i * 130} y="0" width="3" height="330" fill="#cdbfa6" />
      ))}
      <rect y="320" width="600" height="100" fill="#8a5a3b" />
      <rect y="316" width="600" height="8" fill="#5b3a25" />
      {[350, 372, 400].map((y) => <path key={y} d={`M0 ${y} H600`} stroke="#000" strokeOpacity="0.12" strokeWidth="2" />)}

      {/* table */}
      <rect x="200" y={TABLE_Y} width="370" height="14" rx="4" fill="#6b4329" />
      <rect x="200" y={TABLE_Y + 12} width="370" height="8" fill="#4a2e1c" />
      <path d={`M226 ${TABLE_Y + 20} V400 M544 ${TABLE_Y + 20} V400`} stroke="#4a2e1c" strokeWidth="11" />
      {/* vase with a sakura branch */}
      <g transform={`translate(548 ${TABLE_Y})`}>
        <path d="M-9 0 Q-12 -22 -4 -30 H4 Q12 -22 9 0 Z" fill="#2c5aa0" />
        <path d="M0 -30 Q-6 -60 -22 -76 M0 -40 Q10 -62 22 -70" stroke="#5b3a25" strokeWidth="2.4" fill="none" />
        {[[-22, -76], [-14, -64], [22, -70], [12, -58], [-6, -52]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" fill="#f4c6cf" />)}
      </g>

      {/* place settings */}
      {slots.map((x) => (
        <g key={x}>
          <g transform={`translate(${x} ${TABLE_Y - 2})`}>
            <g ref={setItem(k++)}>
              <ellipse cx="0" cy="0" rx="20" ry="5.5" fill="#fff" />
              <ellipse cx="0" cy="-1" rx="12" ry="3.2" fill="#f1ebe0" />
            </g>
          </g>
          <g transform={`translate(${x + 18} ${TABLE_Y - 3})`}>
            <g ref={setItem(k++)}>
              <rect x="-2" y="-2" width="6" height="3" rx="1" fill="#b5121b" />
              <rect x="-4" y="-4" width="24" height="2.2" rx="1" fill="#8a5a30" transform="rotate(-8)" />
              <rect x="-4" y="-1" width="24" height="2.2" rx="1" fill="#a26b39" transform="rotate(-8)" />
            </g>
          </g>
        </g>
      ))}
      <g transform={`translate(${slots[0] - 30} ${TABLE_Y})`}>
        <g ref={setItem(k++)}>
          <path d="M-7 0 V-13 H7 V0 Z" fill="#f5efe6" stroke="#c9a45c" strokeWidth="1.2" />
        </g>
      </g>

      {/* Reserved card */}
      <g transform={`translate(488 ${TABLE_Y - 2})`}>
        <g ref={cardRef}>
          <path d="M-46 0 L-40 -58 H40 L46 0 Z" fill="#fff" stroke="#c9a45c" strokeWidth="1.5" />
          <text x="0" y="-38" textAnchor="middle" fontFamily="Shippori Mincho, serif" fontWeight="800" fontSize="14" fill="#b5121b">予約</text>
          <text x="0" y="-24" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontWeight="700" fontSize="10" fill="#141110" letterSpacing="1.5">RESERVED</text>
          <text x="0" y="-12" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontSize="8" fill="#141110">{name ? name.slice(0, 18) : ''}</text>
          <text x="0" y="-3" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontSize="7" fill="#6b625a">{[dateLabel, time].filter(Boolean).join(' · ')}</text>
        </g>
      </g>
      <g transform={`translate(488 ${TABLE_Y - 80})`}>
        <g ref={sparkleRef}>
          {[[-36, -6], [34, 0], [0, -18]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 7} l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z`} fill="#c9a45c" />
          ))}
        </g>
      </g>

      <Waiter rig={rig} mood={confirmed ? 'happy' : 'smile'} />
    </svg>
  );
}
