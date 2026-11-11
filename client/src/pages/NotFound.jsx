import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { Home as HomeIcon, BookOpen, RotateCcw } from 'lucide-react';
import Waiter from '../components/characters/Waiter';
import { poseWaiter, walkCycle, breathe, lerp, clamp, waiterTrayAnchor } from '../components/characters/rig';
import { Seo } from '../components/ui';
import { useMotion } from '../context/MotionContext';

const FLOOR = 340;
const PIECES = [
  { color: '#f7875a', dx: 150, peak: -140, rot: 540 },
  { color: '#c62a3c', dx: 230, peak: -90, rot: -420 },
  { color: '#f7cc4a', dx: 90, peak: -170, rot: 380 },
  { color: '#4d9b3a', maki: true, dx: 300, peak: -60, rot: 720 },
  { color: '#f7875a', maki: true, dx: 40, peak: -110, rot: -300 },
];

function Piece({ p, refFn }) {
  return (
    <g ref={refFn}>
      {p.maki ? (
        <>
          <ellipse cx="0" cy="0" rx="10" ry="7" fill="#1e2a23" />
          <ellipse cx="0" cy="0" rx="7.5" ry="5" fill="#fbf8f1" />
          <ellipse cx="0" cy="0" rx="3" ry="2" fill={p.color} />
        </>
      ) : (
        <>
          <rect x="-11" y="-3" width="22" height="9" rx="4.5" fill="#fbf8f1" />
          <path d="M-13 0 Q-13 -9 0 -9 Q13 -9 13 0 Q0 2 -13 0 Z" fill={p.color} />
        </>
      )}
    </g>
  );
}

export default function NotFound() {
  const { still } = useMotion();
  const svgRef = useRef(null);
  const rig = useRef({});
  const pieceRefs = useRef([]);
  const looseTray = useRef(null);
  const [run, setRun] = useState(0);
  const [oops, setOops] = useState(false);

  useEffect(() => {
    const s = { wx: -80, lean: 0, lift: 1, tilt: 0, scratch: 0, released: 0, trayX: 0, trayY: 0, trayRot: 0, trayOn: 1 };
    const pieces = PIECES.map(() => ({ x: 0, y: 0, r: 0 }));
    const v = { prev: s.wx, phase: 0, amp: 0 };
    setOops(still);

    let lastPose = null;
    const anchorPos = () => (lastPose ? waiterTrayAnchor(lastPose) : { x: 0, y: 0 });

    const render = () => {
      const t = gsap.ticker.time;
      const dx = s.wx - v.prev;
      v.prev = s.wx;
      v.phase += Math.abs(dx) * 0.06;
      v.amp += (clamp(Math.abs(dx) / 2, 0, 1) - v.amp) * 0.25;
      const wc = walkCycle(v.phase, v.amp);
      lastPose = {
        x: s.wx, y: FLOOR, scale: 0.9, facing: 1,
        bob: wc.bob, legL: wc.legL + s.lean * 0.6, legR: wc.legR - s.lean * 0.8,
        lean: s.lean, headTilt: s.lean * 0.3 - s.scratch * 6, breathe: breathe(t),
        armBack: lerp(wc.armBack, -165, s.scratch) + Math.sin(t * 14) * 6 * s.scratch, foreBack: lerp(-12, -40, s.scratch),
        armFront: lerp(-18, -100, s.lift), foreFront: lerp(-72, -80, s.lift), trayTilt: s.tilt,
      };
      poseWaiter(rig, lastPose);
      if (rig.current.tray) rig.current.tray.style.opacity = String(s.trayOn);
      const a = anchorPos();
      pieces.forEach((p, i) => {
        const el = pieceRefs.current[i];
        if (!el) return;
        const x = s.released ? p.x : a.x - 30 + i * 14;
        const y = s.released ? p.y : a.y - 6;
        el.setAttribute('transform', `translate(${x} ${y}) rotate(${s.released ? p.r : 0})`);
      });
      if (looseTray.current) {
        looseTray.current.style.opacity = String(1 - s.trayOn);
        looseTray.current.setAttribute('transform', `translate(${s.trayX} ${s.trayY}) rotate(${s.trayRot})`);
      }
    };

    if (still) {
      Object.assign(s, { wx: 220, lean: 0, lift: 0, scratch: 1, released: 1, trayOn: 0, trayX: 360, trayY: FLOOR - 3, trayRot: 0 });
      pieces.forEach((p, i) => Object.assign(p, { x: 300 + PIECES[i].dx * 0.6, y: FLOOR - 4, r: 20 * i }));
      render();
      return undefined;
    }

    const tl = gsap.timeline({ delay: 0.4 });
    tl.to(s, { wx: 230, duration: 1.5, ease: 'sine.inOut' })
      .to(s, { lean: 26, tilt: -28, lift: 0.75, duration: 0.25, ease: 'power2.in' }, '-=0.15')
      .add(() => {
        const a = anchorPos();
        s.released = 1;
        pieces.forEach((p, i) => {
          const c = PIECES[i];
          p.x = a.x - 30 + i * 14;
          p.y = a.y - 6;
          gsap.to(p, { x: p.x + c.dx, duration: 1.1, ease: 'power1.out' });
          gsap.to(p, { r: c.rot, duration: 1.1, ease: 'power2.out' });
          gsap.timeline().to(p, { y: p.y + c.peak, duration: 0.38, ease: 'power2.out' }).to(p, { y: FLOOR - 4, duration: 0.55, ease: 'bounce.out' });
        });
        s.trayX = a.x;
        s.trayY = a.y;
        s.trayOn = 0;
        gsap.timeline()
          .to(s, { trayX: a.x + 120, trayRot: 200, duration: 0.6, ease: 'power1.out' })
          .to(s, { trayY: FLOOR - 3, duration: 0.6, ease: 'bounce.out' }, 0)
          .to(s, { trayRot: 360, duration: 0.25 }, 0.6);
      })
      .to(s, { lean: -6, lift: 0, tilt: 0, duration: 0.5, ease: 'back.out(2)' }, '+=0.35')
      .add(() => setOops(true))
      .to(s, { lean: 0, scratch: 1, duration: 0.45, ease: 'power2.out' }, '+=0.1');

    gsap.ticker.add(render);
    render();
    return () => {
      tl.kill();
      gsap.ticker.remove(render);
      gsap.killTweensOf(pieces);
      gsap.killTweensOf(s);
    };
  }, [run, still]);

  return (
    <>
      <Seo title="Page not found" description="Oops — this page slipped off the tray." path="/404" noindex />
      <section className="relative overflow-hidden pb-24 pt-32 sm:pt-40">
        <div className="container-x grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="display text-[clamp(6rem,16vw,12rem)] leading-none text-saffron">4<em className="text-chilli">0</em>4</p>
            <h1 className="mt-2 display text-4xl text-cream sm:text-5xl">Oops! This page slipped off the tray.</h1>
            <p className="mt-4 max-w-md text-cream/70">The page you were looking for has been dropped, moved or never existed. Our (illustrated) waiter is very sorry.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/" className="btn btn-primary"><HomeIcon size={17} /> Back to Home</Link>
              <Link to="/menu" className="btn btn-outline"><BookOpen size={17} /> View the menu</Link>
              {!still && (
                <button type="button" onClick={() => { setOops(false); setRun((r) => r + 1); }} className="btn text-cream/70 hover:text-white">
                  <RotateCcw size={16} /> Replay
                </button>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-[28px] ring-1 ring-gold/15">
            <svg ref={svgRef} viewBox="0 0 600 380" className="h-auto w-full" role="img" aria-label="Illustration: a waiter trips and drops a tray of sushi, looking embarrassed">
              <rect width="600" height="380" fill="#221d1b" />
              <circle cx="470" cy="110" r="60" fill="#b5121b" opacity="0.8" />
              <rect y={FLOOR - 4} width="600" height="50" fill="#5b3a25" />
              <rect y={FLOOR - 8} width="600" height="6" fill="#3a2a20" />
              <g key={run}>
                <Waiter rig={rig} mood={oops ? 'oops' : 'smile'} />
              </g>
              <g ref={looseTray} opacity="0">
                <rect x="-48" y="-3" width="96" height="5" rx="2.5" fill="#17171c" />
              </g>
              {PIECES.map((p, i) => (
                <Piece key={i} p={p} refFn={(el) => { pieceRefs.current[i] = el; }} />
              ))}
              {oops && (
                <text x="330" y="150" fontFamily="Shippori Mincho, serif" fontWeight="800" fontSize="34" fill="#fde68a">すみません!</text>
              )}
            </svg>
          </div>
        </div>
      </section>
    </>
  );
}
