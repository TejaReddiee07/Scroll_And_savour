import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Waiter from '../characters/Waiter';
import DishArt from '../menu/DishArt';
import { poseWaiter, walkCycle, breathe } from '../characters/rig';
import { useMotion } from '../../context/MotionContext';

gsap.registerPlugin(ScrollTrigger);

const PLATTERS = ['set:delux', 'sashimi:delux', 'set:makiura'];
const GAP = 420;

/** Waiters carry large sushi platters across the section as the page scrolls. */
export default function CateringParade() {
  const { still } = useMotion();
  const sectionRef = useRef(null);
  const rigs = [useRef({}), useRef({}), useRef({})];

  useEffect(() => {
    const state = { p: 0 };
    const render = () => {
      const t = gsap.ticker.time;
      rigs.forEach((rig, i) => {
        const x = still ? 380 + i * GAP : -260 - i * GAP + state.p * (1600 + 260 + 2 * GAP + 260);
        const phase = x * 0.055;
        const wc = still ? walkCycle(0, 0) : walkCycle(phase, 1);
        poseWaiter(rig, {
          x, y: 330, scale: 0.8, facing: 1,
          bob: wc.bob, legL: wc.legL, legR: wc.legR, armBack: wc.armBack,
          armFront: -100, foreFront: -80, breathe: breathe(t + i),
          trayTilt: still ? 0 : Math.sin(phase * 2) * 2,
        });
      });
    };
    render();
    if (still) return undefined;
    const tween = gsap.to(state, {
      p: 1,
      ease: 'none',
      onUpdate: render,
      scrollTrigger: { trigger: sectionRef.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);

  return (
    <div ref={sectionRef} className="relative overflow-hidden bg-[#1b1512]" aria-hidden="true">
      <svg viewBox="0 0 1600 360" className="block h-[42vw] max-h-[360px] min-h-[220px] w-full" preserveAspectRatio="xMidYMax slice">
        <rect width="1600" height="270" fill="#221a16" />
        {[...Array(9)].map((_, i) => (
          <g key={i} transform={`translate(${90 + i * 180} 0)`}>
            <path d="M0 0 V36" stroke="#3a2a20" strokeWidth="2" />
            <ellipse cx="0" cy="64" rx="22" ry="28" fill="#b5121b" opacity="0.85" />
            <circle cx="0" cy="64" r="60" fill="#ffb86b" opacity="0.06" />
          </g>
        ))}
        <rect y="262" width="1600" height="100" fill="#5b3a25" />
        <rect y="258" width="1600" height="6" fill="#3a2a20" />
        {[290, 320].map((y) => <path key={y} d={`M0 ${y} H1600`} stroke="#000" strokeOpacity="0.2" strokeWidth="2" />)}
        {rigs.map((rig, i) => (
          <Waiter
            key={i}
            rig={rig}
            mood="happy"
            trayContent={<DishArt art={PLATTERS[i]} x="-62" y="-86" width="124" height="93" />}
          />
        ))}
      </svg>
    </div>
  );
}
