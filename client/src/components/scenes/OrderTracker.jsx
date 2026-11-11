import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ClipboardList, Flame, Package, Bike, ShoppingBag, CheckCircle2 } from 'lucide-react';
import Chef, { Wok, Ticket } from '../characters/Chef';
import { Rider, Bell, SteamWisps } from '../characters/Extras';
import { poseChef, breathe, lookAtPointer } from '../characters/rig';
import { useMotion } from '../../context/MotionContext';
import { cx } from '../../lib/format';

export const STATUS_FLOW = {
  delivery: ['received', 'cooking', 'packing', 'out-for-delivery', 'completed'],
  collection: ['received', 'cooking', 'packing', 'ready-for-collection', 'completed'],
};

const LABELS = {
  received: { label: 'Order received', icon: ClipboardList },
  cooking: { label: 'Chef is cooking', icon: Flame },
  packing: { label: 'Packing', icon: Package },
  'out-for-delivery': { label: 'Out for delivery', icon: Bike },
  'ready-for-collection': { label: 'Ready for collection', icon: ShoppingBag },
  completed: { label: 'Completed', icon: CheckCircle2 },
};

function Bag({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-30 0 H30 L26 -56 H-26 Z" fill="#b5121b" />
      <path d="M-14 -56 Q-14 -76 0 -76 Q14 -76 14 -56" stroke="#8f0e15" strokeWidth="5" fill="none" />
      <text x="0" y="-20" textAnchor="middle" fontFamily="Shippori Mincho, serif" fontWeight="800" fontSize="20" fill="#fff">富士</text>
    </g>
  );
}

/** Animated stage illustration for the current order status. */
export function TrackerScene({ status, fulfilment }) {
  const { still } = useMotion();
  const chefRig = useRef({});
  const flameRef = useRef(null);
  const foodRef = useRef(null);
  const boxesRef = useRef(null);
  const riderGroup = useRef(null);
  const wheelB = useRef(null);
  const wheelF = useRef(null);
  const roadRef = useRef(null);
  const bellRef = useRef(null);
  const printerPaper = useRef(null);
  const S = useRef({ toss: 0, read: 0 });

  const stage = status === 'out-for-delivery' || status === 'ready-for-collection' || status === 'completed' ? status : status;
  const showChef = ['received', 'cooking', 'packing'].includes(stage) || stage === 'ready-for-collection';

  useEffect(() => {
    const s = S.current;
    const render = () => {
      const t = gsap.ticker.time;
      const look = still ? { lookX: 0, lookY: 0 } : lookAtPointer(chefRig.current.eyes, 1);
      if (stage === 'cooking') {
        poseChef(chefRig, { x: 250, y: 290, scale: 0.72, armL: 54 - s.toss * 16, foreL: 18 - s.toss * 14, propLTilt: -s.toss * 16, armR: -16, foreR: 8, breathe: breathe(t), headTilt: -6, ...look });
        if (foodRef.current) foodRef.current.setAttribute('transform', `translate(0 ${-s.toss * 26})`);
      } else if (stage === 'received') {
        poseChef(chefRig, { x: 250, y: 290, scale: 0.72, armL: 10, foreL: -8, armR: -40 - s.read * 10, foreR: -70, propRTilt: 0, headTilt: 6 + s.read * 4, breathe: breathe(t), ...look });
      } else {
        poseChef(chefRig, { x: 250, y: 290, scale: 0.72, armL: 12, foreL: -10, armR: -30 - s.toss * 30, foreR: -40, breathe: breathe(t), headTilt: 4, ...look });
      }
    };
    const tl = gsap.timeline({ repeat: -1 });
    if (!still) {
      if (stage === 'cooking') tl.to(s, { toss: 1, duration: 0.32, yoyo: true, repeat: 1, ease: 'power2.out' }).to({}, { duration: 0.3 });
      if (stage === 'received') {
        tl.fromTo(printerPaper.current, { attr: { height: 0, y: -44 } }, { attr: { height: 44, y: -88 }, duration: 1.2, ease: 'steps(8)' })
          .to(s, { read: 1, duration: 0.6, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.3)
          .to({}, { duration: 0.6 });
      }
      if (stage === 'packing') {
        tl.fromTo(boxesRef.current?.children || [], { y: -70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.35, ease: 'bounce.out' })
          .to(s, { toss: 1, duration: 0.3, yoyo: true, repeat: 3 }, 0)
          .to(boxesRef.current?.children || [], { opacity: 0, duration: 0.3 }, '+=0.8');
      }
      if (stage === 'out-for-delivery') {
        tl.to([wheelB.current, wheelF.current], { rotation: 360, svgOrigin: '0 0', duration: 0.5, ease: 'none', repeat: 3 }, 0)
          .to(roadRef.current, { x: -120, duration: 2, ease: 'none' }, 0)
          .to(riderGroup.current, { y: -3, duration: 0.12, yoyo: true, repeat: 15, ease: 'sine.inOut' }, 0);
      }
      if (stage === 'ready-for-collection') {
        tl.to(bellRef.current, { y: 5, duration: 0.08, yoyo: true, repeat: 3 }).to({}, { duration: 1.4 });
      }
      if (stage === 'completed') tl.to({}, { duration: 1 });
    }
    gsap.ticker.add(render);
    render();
    return () => {
      tl.kill();
      gsap.ticker.remove(render);
    };
  }, [stage, still]);

  return (
    <svg viewBox="0 0 900 320" className="h-auto w-full" role="img" aria-label={`Illustration: ${LABELS[stage]?.label || stage}`}>
      <defs>
        <linearGradient id="trk-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2220" />
          <stop offset="1" stopColor="#1b1715" />
        </linearGradient>
      </defs>
      <rect width="900" height="320" fill="url(#trk-bg)" />
      <circle cx="760" cy="90" r="54" fill="#b5121b" opacity="0.85" />
      <path d="M600 250 L700 150 Q712 140 722 146 L740 138 L758 146 Q768 140 780 150 L880 250 Z" fill="#3b3f57" opacity="0.7" />

      {stage === 'out-for-delivery' || stage === 'completed' ? (
        <>
          <rect x="0" y="250" width="900" height="70" fill="#2b2b31" />
          <g ref={roadRef}>
            {[...Array(14)].map((_, i) => <rect key={i} x={i * 120} y="282" width="60" height="6" rx="3" fill="#f5efe6" opacity="0.6" />)}
          </g>
          {[60, 180, 320].map((x, i) => (
            <g key={x} opacity="0.5">
              <rect x={x} y={140 - i * 20} width="90" height={110 + i * 20} fill="#3a302b" />
              {[0, 1, 2].map((r) => <rect key={r} x={x + 16} y={160 - i * 20 + r * 30} width="16" height="14" fill="#fde68a" opacity="0.5" />)}
            </g>
          ))}
          {stage === 'out-for-delivery' ? (
            <g transform="translate(560 286)">
              <g ref={riderGroup}>
                <Rider wheelBackRef={wheelB} wheelFrontRef={wheelF} />
              </g>
            </g>
          ) : (
            <g transform="translate(520 250)">
              <rect x="-60" y="-150" width="160" height="150" fill="#4a3a32" />
              <rect x="-10" y="-80" width="44" height="80" fill="#6b4329" />
              <Bag x={70} y={0} s={0.9} />
              <g>
                {[0, 1, 2].map((i) => <path key={i} d={`M${80 + i * 20} ${-110 - i * 14} c-4 -6 -12 -2 -8 4 l8 8 l8 -8 c4 -6 -4 -10 -8 -4 Z`} fill="#f472b6" />)}
              </g>
            </g>
          )}
        </>
      ) : (
        <>
          {/* kitchen counter strip */}
          <rect x="0" y="232" width="900" height="88" fill="#6b4329" />
          <rect x="0" y="226" width="900" height="10" fill="#d9cdb8" />
          {showChef && (
            <Chef
              rig={chefRig}
              mood="happy"
              leftProp={stage === 'cooking' ? <Wok flameRef={flameRef} foodRef={foodRef} /> : null}
              rightProp={stage === 'received' ? <Ticket /> : null}
            />
          )}
          <rect x="0" y="236" width="900" height="84" fill="#6b4329" />
          {stage === 'cooking' && (
            <g transform="translate(150 200)">
              <SteamWisps scale={1.2} />
            </g>
          )}
          {stage === 'received' && (
            <g transform="translate(470 226)">
              <rect x="-40" y="-40" width="80" height="40" rx="6" fill="#d4d4d8" />
              <rect x="-26" y="-44" width="52" height="6" fill="#18181b" />
              <rect ref={printerPaper} x="-22" y="-88" width="44" height="44" fill="#fff" />
              <text x="80" y="-60" fontFamily="DM Sans, sans-serif" fontWeight="700" fontSize="20" fill="#fde68a">New order!</text>
            </g>
          )}
          {stage === 'packing' && (
            <g transform="translate(500 226)">
              <g ref={boxesRef}>
                <rect x="-34" y="-46" width="40" height="22" rx="3" fill="#f5efe6" />
                <rect x="-2" y="-46" width="40" height="22" rx="3" fill="#e9e1d3" />
                <rect x="-18" y="-66" width="40" height="20" rx="3" fill="#f5efe6" />
              </g>
              <Bag x={130} y={0} />
            </g>
          )}
          {stage === 'ready-for-collection' && (
            <g transform="translate(520 226)">
              <Bag x={0} y={0} />
              <g transform="translate(110 0)">
                <Bell plungerRef={bellRef} />
              </g>
              <rect x="-70" y="-150" width="140" height="44" rx="8" fill="#b5121b" />
              <text x="0" y="-120" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontWeight="800" fontSize="20" fill="#fff">READY!</text>
            </g>
          )}
        </>
      )}
    </svg>
  );
}

export function TrackerSteps({ status, fulfilment }) {
  const flow = STATUS_FLOW[fulfilment] || STATUS_FLOW.delivery;
  const steps = flow.slice(0, 4);
  const idx = status === 'completed' ? 4 : flow.indexOf(status);
  const pct = Math.max(0, Math.min(1, idx / (steps.length - 1)));
  return (
    <ol className="relative grid grid-cols-4 gap-2" aria-label="Order progress">
      <span className="absolute left-[12.5%] right-[12.5%] top-5 h-1 rounded-full bg-cream/10" aria-hidden="true" />
      <span className="absolute left-[12.5%] top-5 h-1 rounded-full bg-fuji-red transition-[width] duration-700" style={{ width: `${pct * 75}%` }} aria-hidden="true" />
      {steps.map((st, i) => {
        const Icon = LABELS[st].icon;
        const done = i < idx || status === 'completed';
        const current = i === idx;
        return (
          <li key={st} className="relative flex flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
            <span
              className={cx(
                'relative z-10 grid h-11 w-11 place-items-center rounded-full border-2 transition-colors',
                done ? 'border-fuji-red bg-fuji-red text-white' : current ? 'border-fuji-red bg-ink text-fuji-red' : 'border-cream/20 bg-ink text-cream/40',
              )}
            >
              {current && <span className="absolute inset-0 animate-ping rounded-full border-2 border-fuji-red opacity-60" aria-hidden="true" />}
              <Icon size={18} />
            </span>
            <span className={cx('mt-2 text-xs font-semibold sm:text-sm', current || done ? 'text-cream' : 'text-cream/45')}>{LABELS[st].label}</span>
            <span className="sr-only">{done ? '(done)' : current ? '(in progress)' : '(pending)'}</span>
          </li>
        );
      })}
    </ol>
  );
}
