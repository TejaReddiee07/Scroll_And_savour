import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Chef from '../characters/Chef';
import { C, lookAtPointer } from '../characters/rig';
import { useMotion } from '../../context/MotionContext';

/**
 * Small illustrated chef who peeks from the side of the menu category bar
 * and waves whenever the active category changes (`trigger`).
 */
export default function PeekChef({ trigger, className = '' }) {
  const rig = useRef({});
  const bodyRef = useRef(null);
  const handRef = useRef(null);
  const bubbleRef = useRef(null);
  const { still } = useMotion();

  // pupils follow the pointer
  useEffect(() => {
    if (still) return undefined;
    let raf = 0;
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { lookX, lookY } = lookAtPointer(rig.current.eyes, 1, 2.6);
        ['pupilL', 'pupilR'].forEach((k) => rig.current[k]?.setAttribute('transform', `translate(${lookX} ${lookY})`));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [still]);

  // peek + wave on category change
  useEffect(() => {
    if (still || trigger == null) return undefined;
    const tl = gsap.timeline();
    tl.fromTo(bodyRef.current, { y: 34, rotation: 8, svgOrigin: '0 40' }, { y: 0, rotation: -4, duration: 0.45, ease: 'back.out(2)' })
      .fromTo(handRef.current, { rotation: -10, svgOrigin: '0 0' }, { rotation: 28, duration: 0.16, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0.15)
      .fromTo(bubbleRef.current, { opacity: 0, scale: 0.6, svgOrigin: '-30 -96' }, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(3)' }, 0.2)
      .to(bubbleRef.current, { opacity: 0, duration: 0.3 }, 1.5)
      .to(bodyRef.current, { rotation: 0, y: 6, duration: 0.6, ease: 'power2.inOut' }, 1.1);
    return () => tl.kill();
  }, [trigger, still]);

  return (
    <svg viewBox="-75 -130 150 150" className={className} aria-hidden="true">
      <g ref={bubbleRef} opacity="0">
        <path d="M-74 -122 h52 q8 0 8 8 v14 q0 8 -8 8 h-30 l-8 8 v-8 h-14 q-8 0 -8 -8 v-14 q0 -8 8 -8 Z" fill="#f5efe6" />
        <text x="-48" y="-102" textAnchor="middle" fontFamily="Shippori Mincho, serif" fontWeight="800" fontSize="15" fill="#b5121b">はい!</text>
      </g>
      <g ref={bodyRef}>
        {/* shoulders */}
        <path d="M-40 40 Q-40 4 -16 0 H16 Q40 4 40 40 Z" fill={C.cJacket} />
        <path d="M-14 0 L-18 40 M14 0 L18 40" stroke={C.cRed} strokeWidth="5" />
        <g transform="translate(0 -36) scale(0.95)">
          <Chef rig={rig} headOnly mood="happy" />
        </g>
        {/* waving hand */}
        <g transform="translate(40 4)">
          <g ref={handRef}>
            <path d="M-6 6 L6 -30" stroke={C.cJacket} strokeWidth="14" strokeLinecap="round" />
            <circle cx="8" cy="-38" r="9" fill={C.skin} />
            <path d="M3 -46 v-6 M8 -47 v-7 M13 -45 v-6" stroke={C.skin} strokeWidth="4" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  );
}
