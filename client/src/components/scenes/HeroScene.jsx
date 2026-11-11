import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ArrowRight, Smartphone } from 'lucide-react';
import Waiter from '../characters/Waiter';
import Chef, { Wok, Knife } from '../characters/Chef';
import { Guest, Bell, LanternShape, SteamWisps } from '../characters/Extras';
import DishArt from '../menu/DishArt';
import SakuraTrail from '../effects/SakuraTrail';
import { poseWaiter, poseChef, walkCycle, breathe, lookAtPointer, lerp, clamp, pointer, waiterTrayAnchor, setTransform } from '../characters/rig';
import { useMotion } from '../../context/MotionContext';
import { useSiteData } from '../../context/SiteDataContext';
import { HERO_DISH_IDS } from '../../data/site';

/* Stage geometry (viewBox units). The camera pans on narrow screens. */
const W = 1600;
const H = 900;
const FLOOR = 845;
const PASS = { x: 428, y: 650 };
const TABLE = { x: 1262, y: 690 };
const WAITER_IDLE = 700;
const WAITER_PASS = 548;
const WAITER_TABLE = 1072;

const initialState = () => ({
  wx: WAITER_IDLE, facing: -1, lift: 0, bow: 0,
  toss: 0, chop: 0, chefTurn: 0, flame: 0,
  dishScale: 0, dishOpacity: 1, toTray: 0, toTable: 0,
  tableSteam: 0, hearts: 0, heartsRise: 0, bell: 0, ding: 0,
  focusX: 420, follow: 0,
});

const STILL_STATE = {
  ...initialState(),
  wx: WAITER_TABLE, facing: 1, bow: 0.35, flame: 1, dishScale: 1, toTray: 1, toTable: 1,
  tableSteam: 1, hearts: 1, heartsRise: 0.4, focusX: 900,
};

const tf = setTransform;
const setOpacity = (el, v) => {
  if (el && el.__fujiO !== v) {
    el.__fujiO = v;
    el.style.opacity = v;
  }
};

export default function HeroScene() {
  const { still } = useMotion();
  const { getItem } = useSiteData();
  const dishes = HERO_DISH_IDS.map((id) => getItem(id)).filter(Boolean);
  const [dishIndex, setDishIndex] = useState(0);
  const dish = dishes[dishIndex % Math.max(1, dishes.length)];
  const [needsGyroPermission, setNeedsGyroPermission] = useState(false);

  const sectionRef = useRef(null);
  const svgRef = useRef(null);
  const layerView = useRef(null);
  const layerMid = useRef(null);
  const layerMain = useRef(null);
  const layerFront = useRef(null);
  const dishRef = useRef(null);
  const tableSteamRef = useRef(null);
  const heartsRef = useRef(null);
  const bellRef = useRef(null);
  const dingRef = useRef(null);
  const flameRef = useRef(null);
  const foodRef = useRef(null);
  const waiterRig = useRef({});
  const chefRig = useRef({});
  const S = useRef(initialState());
  const view = useRef({ visW: W, cam: 0, par: { x: 0, y: 0 }, target: { x: 0, y: 0 }, prevWx: WAITER_IDLE, phase: 0, amp: 0 });

  /* ── render: writes every transform from the state object ──────── */
  const renderRef = useRef(null);
  renderRef.current = () => {
    const s = S.current;
    const v = view.current;
    const svg = svgRef.current;
    if (!svg) return;
    const t = gsap.ticker.time;
    // DOM reads first (eye tracking), then writes — avoids layout thrashing
    const facingSign = Math.sign(s.facing) || 1;
    const look = still ? { lookX: 0, lookY: 0 } : lookAtPointer(waiterRig.current.eyes, facingSign);
    const chefLook = still ? { lookX: 0, lookY: 0 } : lookAtPointer(chefRig.current.eyes, 1);

    // camera (only pans when the screen is narrower than the stage)
    const focus = lerp(s.focusX, s.wx, s.follow);
    const camTarget = v.visW < W ? clamp(focus - v.visW / 2, 0, W - v.visW) : (W - v.visW) / 2;
    v.cam += (camTarget - v.cam) * (still ? 1 : 0.07);
    const vb = `${v.cam.toFixed(1)} 0 ${v.visW.toFixed(1)} ${H}`;
    if (svg.__fujiVB !== vb) {
      svg.__fujiVB = vb;
      svg.setAttribute('viewBox', vb);
    }

    // mouse / gyro parallax
    v.par.x += (v.target.x - v.par.x) * 0.06;
    v.par.y += (v.target.y - v.par.y) * 0.06;
    const px = v.par.x;
    const py = v.par.y;
    const r1 = (n) => Math.round(n * 10) / 10;
    tf(layerView.current, `translate(${r1(-px * 26)} ${r1(-py * 10)})`);
    tf(layerMid.current, `translate(${r1(px * 10)} ${r1(py * 5)})`);
    tf(layerMain.current, `translate(${r1(px * 22)} ${r1(py * 8)})`);
    tf(layerFront.current, `translate(${r1(px * 48)} ${r1(py * 14)})`);

    // waiter — legs advance with distance travelled (no foot sliding)
    const dx = s.wx - v.prevWx;
    v.prevWx = s.wx;
    v.phase += Math.abs(dx) * 0.055;
    v.amp += (clamp(Math.abs(dx) / 2.2, 0, 1) - v.amp) * 0.22;
    const wc = walkCycle(v.phase, v.amp);
    const waiterPose = {
      x: s.wx, y: FLOOR, scale: 0.92, facing: s.facing,
      bob: wc.bob, legL: wc.legL, legR: wc.legR, armBack: wc.armBack - s.bow * 10,
      lean: s.bow * 14, headTilt: s.bow * 8, breathe: breathe(t),
      armFront: lerp(-18, -100, s.lift), foreFront: lerp(-72, -80, s.lift),
      trayTilt: Math.sin(v.phase * 2) * v.amp * 2.5,
      ...look,
    };
    poseWaiter(waiterRig, waiterPose);

    // chef — wok toss, chop, turn to the pass
    const stir = still ? 0 : Math.sin(t * 3) * 3;
    poseChef(chefRig, {
      x: 250, y: 832, scale: 1,
      armL: 56 - s.toss * 16 + stir * (1 - s.toss), foreL: 18 - s.toss * 16, propLTilt: -s.toss * 16,
      armR: lerp(-22, -44, s.chop > 0 ? 1 : 0) - s.chefTurn * 20, foreR: -24 + s.chop * 30 - s.chefTurn * 30, propRTilt: -26,
      headTilt: -6 * (1 - s.chefTurn) + 8 * s.chefTurn, breathe: breathe(t + 1),
      ...chefLook,
    });
    tf(foodRef.current, `translate(0 ${(-s.toss * 30).toFixed(1)})`);
    setOpacity(flameRef.current, s.flame.toFixed(2));

    // dish: pass → tray → table, following the tray while carried
    let pos = PASS;
    if (s.toTray > 0 || s.toTable > 0) {
      const tray = waiterTrayAnchor(waiterPose);
      const [a, b, k] = s.toTable > 0 ? [tray, TABLE, s.toTable] : [PASS, tray, s.toTray];
      pos = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) - Math.sin(Math.PI * k) * 34 };
    }
    tf(dishRef.current, `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)}) scale(${s.dishScale})`);
    setOpacity(dishRef.current, s.dishOpacity.toFixed(2));
    setOpacity(tableSteamRef.current, (s.tableSteam * s.dishOpacity).toFixed(2));
    setOpacity(heartsRef.current, s.hearts.toFixed(2));
    tf(heartsRef.current, `translate(0 ${(-s.heartsRise * 34).toFixed(1)})`);
    tf(bellRef.current, `translate(0 ${(s.bell * 5).toFixed(1)})`);
    setOpacity(dingRef.current, s.ding.toFixed(2));
    tf(dingRef.current, `translate(470 560) scale(${(0.6 + s.ding * 0.4).toFixed(3)}) rotate(${(-8 + s.ding * 4).toFixed(1)})`);
  };

  /* ── layout: visible stage width from the element's aspect ratio ── */
  useEffect(() => {
    const svg = svgRef.current;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      view.current.visW = Math.max(820, (H * width) / height);
      renderRef.current();
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  /* ── the 11.8 s story loop ─────────────────────────────────────── */
  useEffect(() => {
    if (still) {
      S.current = { ...STILL_STATE };
      view.current.prevWx = STILL_STATE.wx;
      renderRef.current();
      return undefined;
    }
    S.current = initialState();
    const s = S.current;
    const tl = gsap.timeline({ repeat: -1, paused: true, onRepeat: () => setDishIndex((i) => i + 1) });

    // 1. chef cooks: wok tosses with flames, then chops
    tl.to(s, { flame: 1, duration: 0.3 }, 0.1)
      .to(s, { toss: 1, duration: 0.32, ease: 'power2.out', yoyo: true, repeat: 5 }, 0.2)
      .to(s, { chop: 1, duration: 0.12, ease: 'power1.inOut', yoyo: true, repeat: 7 }, 2.3)
      .to(s, { flame: 0.35, duration: 0.5 }, 3.3)
      // 2. chef plates — dish appears on the pass, bell dings
      .to(s, { chefTurn: 1, duration: 0.3, ease: 'power2.out' }, 3.3)
      .fromTo(s, { dishScale: 0 }, { dishScale: 1, duration: 0.4, ease: 'back.out(2.2)' }, 3.55)
      .to(s, { bell: 1, duration: 0.08, yoyo: true, repeat: 1 }, 3.78)
      .fromTo(s, { ding: 0 }, { ding: 1, duration: 0.3, ease: 'back.out(3)' }, 3.78)
      .to(s, { ding: 0, duration: 0.3 }, 4.5)
      .to(s, { chefTurn: 0, duration: 0.45, ease: 'power2.inOut' }, 4.3)
      // 3. waiter walks to the pass (camera follows on phones)
      .to(s, { follow: 1, duration: 0.7 }, 3.85)
      .to(s, { wx: WAITER_PASS, duration: 1.1, ease: 'sine.inOut' }, 3.85)
      // 4. picks up the dish and lifts the tray to the shoulder
      .to(s, { toTray: 1, duration: 0.55, ease: 'power2.inOut' }, 5.0)
      .to(s, { lift: 1, duration: 0.5, ease: 'back.out(1.6)' }, 5.5)
      // 5. turns and carries it across the floor, tray bobbing
      .to(s, { facing: 1, duration: 0.25, ease: 'power2.inOut' }, 5.95)
      .to(s, { wx: WAITER_TABLE, duration: 2.3, ease: 'sine.inOut' }, 6.15)
      // 6. serves: lowers the tray, bows, places the dish; steam + guest reaction
      .to(s, { follow: 0, focusX: 1180, duration: 0.6 }, 8.2)
      .to(s, { lift: 0, duration: 0.45, ease: 'power2.inOut' }, 8.45)
      .to(s, { bow: 1, duration: 0.45, ease: 'power2.out' }, 8.75)
      .to(s, { toTable: 1, duration: 0.5, ease: 'power2.inOut' }, 8.85)
      .to(s, { tableSteam: 1, duration: 0.4 }, 9.2)
      .to(s, { hearts: 1, duration: 0.3 }, 9.4)
      .fromTo(s, { heartsRise: 0 }, { heartsRise: 1, duration: 1.4, ease: 'power1.out' }, 9.4)
      .to(s, { bow: 0, duration: 0.45, ease: 'power2.inOut' }, 9.45)
      .to(s, { hearts: 0, duration: 0.4 }, 10.6)
      // 7. returns to the middle; table is cleared; loop restarts with the next dish
      .to(s, { facing: -1, duration: 0.25, ease: 'power2.inOut' }, 9.8)
      .to(s, { follow: 1, duration: 0.5 }, 9.9)
      .to(s, { wx: WAITER_IDLE, duration: 1.4, ease: 'sine.inOut' }, 10.05)
      .to(s, { focusX: 420, duration: 0.01 }, 11.0)
      .to(s, { follow: 0, duration: 0.6 }, 11.2)
      .to(s, { dishOpacity: 0, duration: 0.4 }, 11.1)
      .to(s, { tableSteam: 0, duration: 0.3 }, 11.1)
      .to({}, { duration: 0.01 }, 11.8);

    // Low-power devices (phones, <=4 cores) render every other frame (~30 fps).
    const lowPower = window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
    let frame = 0;
    const tick = () => {
      frame += 1;
      if (lowPower && frame % 2) return;
      renderRef.current();
    };
    let running = false;
    let ready = false;
    const start = () => {
      if (running || !ready) return;
      running = true;
      tl.play();
      gsap.ticker.add(tick);
    };
    // Let the page finish loading before the loop starts (keeps the main thread free for first paint).
    const onReady = () => {
      const go = () => {
        ready = true;
        const r = sectionRef.current?.getBoundingClientRect();
        if (r && r.bottom > 0 && r.top < window.innerHeight) start();
      };
      if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 1500 });
      else setTimeout(go, 600);
    };
    if (document.readyState === 'complete') onReady();
    else window.addEventListener('load', onReady, { once: true });
    const stop = () => {
      if (!running) return;
      running = false;
      tl.pause();
      gsap.ticker.remove(tick);
    };

    // pause when the hero is off-screen (saves battery)
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.05 });
    io.observe(sectionRef.current);
    const onVis = () => {
      if (document.hidden) return stop();
      const r = sectionRef.current?.getBoundingClientRect();
      if (r && r.bottom > 0 && r.top < window.innerHeight) start();
      return undefined;
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('load', onReady);
      stop();
      tl.kill();
    };
  }, [still]);

  /* ── parallax input: mouse on desktop, gyroscope on phones ──────── */
  useEffect(() => {
    if (still) return undefined;
    const section = sectionRef.current.parentElement || sectionRef.current;
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = section.getBoundingClientRect();
      view.current.target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      view.current.target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => {
      view.current.target.x = 0;
      view.current.target.y = 0;
    };
    section.addEventListener('pointermove', onMove);
    section.addEventListener('pointerleave', onLeave);

    let base = null;
    const onOrient = (e) => {
      if (e.gamma == null) return;
      if (base == null) base = e.beta;
      view.current.target.x = clamp(e.gamma / 25, -1, 1);
      view.current.target.y = clamp((e.beta - base) / 25, -1, 1);
    };
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch && typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') setNeedsGyroPermission(true);
      else window.addEventListener('deviceorientation', onOrient);
    }
    section.__enableGyro = async () => {
      try {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res === 'granted') window.addEventListener('deviceorientation', onOrient);
      } catch {
        /* permission denied — keep static */
      }
      setNeedsGyroPermission(false);
    };
    return () => {
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('deviceorientation', onOrient);
    };
  }, [still]);

  // first paint before the ticker starts
  useEffect(() => {
    renderRef.current();
  });

  return (
    <div ref={sectionRef} className="absolute inset-0">
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        role="img"
        aria-label="Illustrated animation: a chef cooks in an open kitchen, a waiter carries the dish across the restaurant and serves it to a guest, with Mount Fuji and a red sun seen through a round window."
      >
        <defs>
          <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a1416" />
            <stop offset="0.55" stopColor="#7a2a22" />
            <stop offset="1" stopColor="#e0773f" />
          </linearGradient>
          <linearGradient id="hero-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#120f0e" />
            <stop offset="1" stopColor="#261d19" />
          </linearGradient>
          <linearGradient id="hero-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b3a25" />
            <stop offset="1" stopColor="#2e1d13" />
          </linearGradient>
          <linearGradient id="hero-fuji" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b3f57" />
            <stop offset="1" stopColor="#1c1d2a" />
          </linearGradient>
          <radialGradient id="hero-glow">
            <stop offset="0" stopColor="#ffb86b" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffb86b" stopOpacity="0" />
          </radialGradient>
          <clipPath id="hero-window">
            <circle cx="800" cy="330" r="262" />
          </clipPath>
        </defs>

        {/* ── MID LAYER: wall, round window with the Fuji view, kitchen back wall, lanterns ── */}
        <g ref={layerMid}>
          <rect x="-900" y="-60" width={W + 1800} height="760" fill="url(#hero-wall)" />
          {[...Array(70)].map((_, i) => (
            <rect key={i} x={-880 + i * 48} y="-60" width="2" height="760" fill="#fff" opacity="0.025" />
          ))}
          <rect x="-900" y="560" width={W + 1800} height="100" fill="#1b1411" />
          <rect x="-900" y="556" width={W + 1800} height="6" fill="#3a2a20" />

          <g clipPath="url(#hero-window)">
            <g ref={layerView}>
              <rect x="400" y="20" width="800" height="620" fill="url(#hero-sky)" />
              <circle cx="800" cy="272" r="118" fill="#b5121b" />
              <circle cx="800" cy="272" r="150" fill="#b5121b" opacity="0.18" />
              <path d="M470 600 L742 352 Q760 336 778 340 L800 332 L822 340 Q840 336 858 352 L1130 600 Z" fill="url(#hero-fuji)" />
              <path d="M742 352 Q760 336 778 340 L800 332 L822 340 Q840 336 858 352 L842 372 L826 360 L812 380 L798 362 L782 382 L768 364 L754 378 Z" fill="#f5efe6" />
              <path d="M430 470 Q520 452 610 470 T790 470 M820 498 Q930 480 1040 498 T1180 498" stroke="#c9a45c" strokeOpacity="0.45" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M440 560 H1160" stroke="#f5efe6" strokeOpacity="0.12" strokeWidth="40" />
            </g>
          </g>
          <circle cx="800" cy="330" r="262" fill="none" stroke="#4a2f1f" strokeWidth="26" />
          <circle cx="800" cy="330" r="246" fill="none" stroke="#c9a45c" strokeOpacity="0.5" strokeWidth="2" />
          <path d="M548 470 H1052 M560 510 H1040 M800 470 V592" stroke="#4a2f1f" strokeWidth="7" opacity="0.9" />

          {/* kitchen back wall: tiles, hood, shelf, noren */}
          <rect x="-200" y="250" width="700" height="310" fill="#e9e1d3" />
          {[...Array(15)].map((_, i) => (
            <path key={`tv${i}`} d={`M${-200 + i * 48} 250 V560`} stroke="#cfc4b2" strokeWidth="1.5" />
          ))}
          {[...Array(7)].map((_, i) => (
            <path key={`th${i}`} d={`M-200 ${250 + i * 48} H500`} stroke="#cfc4b2" strokeWidth="1.5" />
          ))}
          <path d="M30 330 H190 L170 250 H50 Z" fill="#8b8f97" />
          <rect x="30" y="330" width="160" height="10" fill="#6b6f77" />
          <rect x="230" y="340" width="230" height="10" rx="2" fill="#5b3a25" />
          {[250, 286, 322].map((x, i) => (
            <path key={x} d={`M${x} 340 Q${x - 2} 312 ${x + 14} 312 Q${x + 30} 312 ${x + 28} 340 Z`} fill={['#2c5aa0', '#b5121b', '#f5efe6'][i]} opacity="0.9" />
          ))}
          <rect x="380" y="300" width="18" height="40" rx="4" fill="#3f6b3a" />
          <rect x="406" y="292" width="16" height="48" rx="4" fill="#7a2a22" />
          <rect x="430" y="306" width="18" height="34" rx="4" fill="#c9a45c" />
          {/* noren curtain */}
          <rect x="-40" y="196" width="560" height="10" rx="5" fill="#5b3a25" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <path d={`M${-20 + i * 132} 204 h126 v76 q-63 10 -126 0 Z`} fill="#b5121b" />
              <path d={`M${-20 + i * 132} 204 h126 v12 h-126 Z`} fill="#8f0e15" />
            </g>
          ))}
          <text x="245" y="266" textAnchor="middle" fontFamily="Shippori Mincho, serif" fontWeight="800" fontSize="44" fill="#f5efe6" letterSpacing="60">
            富士厨房
          </text>
          {/* hot lamp over the pass */}
          <path d="M440 206 V300" stroke="#1b1512" strokeWidth="3" />
          <path d="M412 300 H468 L456 318 H424 Z" fill="#c9a45c" />
          <ellipse cx="440" cy="420" rx="90" ry="140" fill="url(#hero-glow)" />

          {/* lanterns (sway; swing harder on hover) */}
          {[
            [140, '富'],
            [500, '士'],
            [1100, '寿'],
            [1460, '司'],
          ].map(([x, k], i) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <path d="M0 -20 V40" stroke="#1b1512" strokeWidth="2" />
              <circle cx="0" cy="110" r="90" fill="url(#hero-glow)" opacity="0.6" />
              <g transform="translate(0 40)">
                <g className="lantern" style={{ animationDelay: `${i * -1.1}s` }}>
                  <LanternShape kanji={k} w={70} h={92} />
                </g>
              </g>
            </g>
          ))}
        </g>

        {/* ── MAIN LAYER: floor, kitchen counter, chef, table, guest, waiter, dish ── */}
        <g ref={layerMain}>
          <rect x="-900" y="652" width={W + 1800} height="320" fill="url(#hero-floor)" />
          {[680, 712, 752, 800, 856].map((y) => (
            <path key={y} d={`M-900 ${y} H${W + 900}`} stroke="#000" strokeOpacity="0.22" strokeWidth="2" />
          ))}
          {[...Array(40)].map((_, i) => (
            <path key={i} d={`M${-900 + i * 90} 652 L${-1100 + i * 100} 900`} stroke="#000" strokeOpacity="0.12" strokeWidth="2" />
          ))}

          {/* chef behind the counter */}
          <Chef
            rig={chefRig}
            mood="happy"
            leftProp={<Wok flameRef={flameRef} foodRef={foodRef} />}
            rightProp={<Knife />}
          />
          {/* steam over the wok */}
          <g transform="translate(96 600)">
            <SteamWisps scale={1.2} opacity={0.55} />
          </g>

          {/* counter */}
          <rect x="10" y="646" width="480" height="16" rx="4" fill="#d9cdb8" />
          <rect x="18" y="662" width="464" height="200" fill="#6b4329" />
          <rect x="18" y="662" width="464" height="14" fill="#4a2e1c" />
          {[...Array(5)].map((_, i) => (
            <rect key={i} x={36 + i * 90} y="690" width="74" height="150" rx="6" fill="#5b3a25" />
          ))}
          <rect x="60" y="640" width="84" height="8" rx="3" fill="#2b2b31" />
          <rect x="290" y="636" width="92" height="12" rx="3" fill="#e2c9a0" />
          <rect x="300" y="628" width="18" height="9" rx="3" fill="#f7875a" />
          <rect x="322" y="628" width="18" height="9" rx="3" fill="#c62a3c" />
          <circle cx="352" cy="632" r="6" fill="#5aa641" />
          <rect x="396" y="642" width="90" height="6" rx="3" fill="#9ca3af" />
          <g transform="translate(470 648)">
            <Bell plungerRef={bellRef} />
          </g>
          <g ref={dingRef} opacity="0" style={{ pointerEvents: 'none' }}>
            <text x="0" y="0" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontWeight="800" fontSize="26" fill="#fde68a">
              ding!
            </text>
            <path d="M-34 -30 l-10 -8 M34 -30 l10 -8 M0 -40 v-12" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* dining table + guest */}
          <g transform="translate(1440 772)">
            <Guest heartsRef={heartsRef} />
          </g>
          <rect x="1130" y="684" width="300" height="14" rx="4" fill="#7a4a2c" />
          <rect x="1130" y="696" width="300" height="10" fill="#5b3a25" />
          <path d="M1160 706 V846 M1400 706 V846" stroke="#4a2e1c" strokeWidth="12" />
          <ellipse cx="1360" cy="682" rx="14" ry="5" fill="#f4f1ea" />
          <rect x="1342" y="664" width="22" height="22" rx="4" fill="#d9cdb8" />
          <path d="M1190 680 L1240 676" stroke="#8a5a30" strokeWidth="3" strokeLinecap="round" />
          <g ref={tableSteamRef} transform={`translate(${TABLE.x} ${TABLE.y - 60})`} opacity="0">
            <SteamWisps scale={1.3} opacity={0.75} />
          </g>

          {/* waiter */}
          <Waiter rig={waiterRig} />

          {/* the dish being served (rotates through real menu dishes) */}
          <g ref={dishRef}>
            {dish && <DishArt art={dish.art} x="-42" y="-58" width="84" height="63" />}
          </g>
        </g>

        {/* ── FOREGROUND: dark foliage at the edges for depth ── */}
        <g ref={layerFront} opacity="0.9">
          {[
            [-40, 1],
            [1640, -1],
          ].map(([x, d]) => (
            <g key={x} transform={`translate(${x} 900) scale(${d} 1)`}>
              {[0, 1, 2, 3, 4].map((i) => (
                <path key={i} d={`M0 0 Q${30 + i * 18} ${-120 - i * 40} ${70 + i * 30} ${-220 - i * 30} Q${50 + i * 14} ${-110 - i * 30} ${12 + i * 6} 0 Z`} fill="#0d1a12" />
              ))}
            </g>
          ))}
        </g>
      </svg>

      {/* readability gradient + overlay content */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-ink/70 via-ink/25 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/80 to-transparent" />
      <SakuraTrail />

      <div className="absolute inset-x-0 bottom-5 z-30 flex flex-col items-center gap-2 px-4">
        {dish && (
          <Link
            to={`/menu#${dish.id}`}
            className="group inline-flex items-center gap-2 rounded-full border border-gold/40 bg-ink/75 px-4 py-2 text-sm text-cream backdrop-blur-md transition hover:border-gold hover:bg-ink"
            aria-live="polite"
          >
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuji-red opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fuji-red" />
            </span>
            Now serving: <strong className="font-semibold text-gold-soft">{dish.name}</strong>
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        )}
        <p className="text-[11px] text-cream/55">Illustrated scene — characters are not real Fuji staff.</p>
      </div>

      {needsGyroPermission && (
        <button
          type="button"
          onClick={() => sectionRef.current?.__enableGyro?.()}
          className="absolute bottom-24 right-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-xs text-cream backdrop-blur"
        >
          <Smartphone size={14} /> Tilt to explore
        </button>
      )}
    </div>
  );
}

export { pointer };
