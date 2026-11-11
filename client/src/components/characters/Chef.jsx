import { useId } from 'react';
import { C, safeId } from './rig';

/**
 * Illustrated chef (design based on the supplied reference: tall white toque,
 * brown braid over the shoulder, white chef jacket, grey apron with red straps,
 * big amber eyes). Local origin = between the feet; ~350 units tall incl. hat.
 *
 * `leftProp` / `rightProp` render in each hand, kept level by poseChef().
 */
export default function Chef({ rig, mood = 'happy', leftProp = null, rightProp = null, blink = true, headOnly = false }) {
  const uid = safeId(useId());
  const set = (name) => (el) => {
    if (rig && el) rig.current[name] = el;
  };

  const head = (
    <g ref={set('head')}>
      {/* hair */}
      <ellipse cx="0" cy="-2" rx="31" ry="30" fill={C.cHair} />
      <ellipse cx="-26" cy="8" rx="5" ry="7" fill={C.skinShade} />
      <ellipse cx="26" cy="8" rx="5" ry="7" fill={C.skinShade} />
      <path d="M-25 -2 Q-26 28 0 34 Q26 28 25 -2 Q24 -20 0 -22 Q-24 -20 -25 -2 Z" fill={C.skin} />
      <path d="M-28 -6 Q-22 -26 0 -24 Q22 -26 28 -6 Q18 -16 2 -15 Q-14 -16 -28 -6 Z" fill={C.cHair} />
      <path d="M-10 -20 Q4 -23 18 -17" stroke={C.cHairLight} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* toque */}
      <path d="M-30 -18 Q-46 -40 -30 -58 Q-28 -78 -8 -76 Q4 -92 20 -78 Q40 -80 38 -58 Q50 -40 30 -18 Z" fill={C.cHat} />
      <path d="M-24 -30 Q-30 -50 -18 -60 M2 -40 Q0 -62 8 -74 M24 -30 Q32 -48 26 -60" stroke={C.cHatShade} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <rect x="-30" y="-26" width="60" height="13" rx="5" fill={C.cHat} />
      <rect x="-30" y="-17" width="60" height="4" rx="2" fill={C.cHatShade} />
      {/* brows */}
      <path d="M-17 -8 Q-10 -13 -3 -9" stroke="#4a2a18" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M3 -9 Q10 -13 17 -8" stroke="#4a2a18" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      {/* eyes */}
      <defs>
        <clipPath id={`${uid}-l`}>
          <ellipse cx="-10" cy="4" rx="7" ry="8" />
        </clipPath>
        <clipPath id={`${uid}-r`}>
          <ellipse cx="10" cy="4" rx="7" ry="8" />
        </clipPath>
      </defs>
      <g className={blink ? 'char-blink' : undefined}>
        <ellipse cx="-10" cy="4" rx="7" ry="8" fill={C.white} />
        <ellipse cx="10" cy="4" rx="7" ry="8" fill={C.white} />
        <g clipPath={`url(#${uid}-l)`}>
          <g ref={set('pupilL')}>
            <circle cx="-10" cy="5" r="5.2" fill={C.cIris} />
            <circle cx="-10" cy="5" r="2.6" fill="#1b0f04" />
            <circle cx="-8.2" cy="3" r="1.6" fill="#fff" />
          </g>
        </g>
        <g clipPath={`url(#${uid}-r)`}>
          <g ref={set('pupilR')}>
            <circle cx="10" cy="5" r="5.2" fill={C.cIris} />
            <circle cx="10" cy="5" r="2.6" fill="#1b0f04" />
            <circle cx="11.8" cy="3" r="1.6" fill="#fff" />
          </g>
        </g>
        <path d="M-17.5 2 Q-10 -5 -2.5 1" stroke={C.lash} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M2.5 1 Q10 -5 17.5 2" stroke={C.lash} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      <circle ref={set('eyes')} cx="0" cy="4" r="0.5" fill="none" />
      <path d="M0 11 Q2.5 15 -0.5 16.5" stroke={C.skinLine} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="-16" cy="15" rx="5" ry="3" fill={C.blush} opacity="0.55" />
      <ellipse cx="16" cy="15" rx="5" ry="3" fill={C.blush} opacity="0.55" />
      {mood === 'happy' && (
        <>
          <path d="M-8 20 Q0 30 9 20 Z" fill={C.lip} />
          <path d="M-6.5 20.5 H7.5 Q0 23 -6.5 20.5 Z" fill="#fff" />
        </>
      )}
      {mood === 'smile' && <path d="M-7 21 Q0 27 8 21" stroke={C.lip} strokeWidth="2.4" fill="none" strokeLinecap="round" />}
      {mood === 'focus' && <path d="M-5 22 Q0 24 5 22" stroke={C.lip} strokeWidth="2.4" fill="none" strokeLinecap="round" />}
    </g>
  );

  if (headOnly) return head;

  const arm = (side) => {
    const L = side === 'L';
    return (
      <g transform={`translate(${L ? -29 : 29} -50)`}>
        <g ref={set(L ? 'armL' : 'armR')}>
          <path d="M-9 -6 Q-12 18 -9 38 H9 Q12 18 9 -6 Z" fill={L ? C.cJacketShade : C.cJacket} />
          <g transform="translate(0 36)">
            <g ref={set(L ? 'foreL' : 'foreR')}>
              <path d="M-8 -2 H8 L6.5 30 H-6.5 Z" fill={L ? C.cJacketShade : C.cJacket} />
              <rect x="-7.5" y="24" width="15" height="7" rx="3" fill={C.cJacketShade} />
              <circle cx="0" cy="36" r="6.5" fill={L ? C.skinShade : C.skin} />
              <g transform="translate(0 36)">
                <g ref={set(L ? 'propL' : 'propR')}>{L ? leftProp : rightProp}</g>
              </g>
            </g>
          </g>
        </g>
      </g>
    );
  };

  return (
    <g ref={set('root')}>
      <ellipse cx="0" cy="0" rx="44" ry="6.5" fill="#000" opacity="0.22" />
      <g ref={set('bob')}>
        {['legL', 'legR'].map((leg, i) => (
          <g key={leg} transform={`translate(${i ? 11 : -11} -126)`}>
            <g ref={set(leg)}>
              <path d="M-9 0 H9 L7.5 112 H-6.5 Z" fill={i ? C.cTrousers : '#2a2c33'} />
              <path d="M-7 109 H7 Q19 110 20 120 V125 H-8 Z" fill={C.shoe} />
            </g>
          </g>
        ))}
        {/* jacket hem + lower apron */}
        <path d="M-31 -184 H31 L33 -146 H-33 Z" fill={C.cJacket} />
        <path d="M-29 -182 H29 L36 -90 Q0 -84 -36 -90 Z" fill={C.cApron} />
        <path d="M-35 -96 Q0 -90 35 -96" stroke={C.cRed} strokeWidth="2.5" fill="none" />
        <path d="M-12 -150 H12 V-128 H-12 Z" fill={C.cApronDark} rx="2" />

        <g transform="translate(0 -178)">
          <g ref={set('upper')}>
            {arm('L')}
            <path d="M-27 3 L-33 -40 Q-34 -55 -20 -58 H20 Q34 -55 33 -40 L27 3 Z" fill={C.cJacket} />
            <path d="M-33 -40 Q-28 -28 -26 2" stroke={C.cJacketShade} strokeWidth="3" fill="none" />
            <path d="M-16 3 V-33 Q0 -35 16 -33 V3 Z" fill={C.cApron} />
            <path d="M-14 -32 L-19 -57 M14 -32 L19 -57" stroke={C.cRed} strokeWidth="5" strokeLinecap="round" />
            <circle cx="-11" cy="-27" r="2.2" fill={C.cRed} />
            <circle cx="11" cy="-27" r="2.2" fill={C.cRed} />
            <path d="M-10 -14 H10 V-4 H-10 Z" fill={C.cApronDark} />
            <rect x="-6.5" y="-74" width="13" height="18" rx="5" fill={C.skinShade} />
            <path d="M-13 -62 H13 V-54 Q0 -51 -13 -54 Z" fill={C.cJacket} stroke={C.cJacketShade} strokeWidth="1" />
            <g transform="translate(0 -100)">{head}</g>
            {/* braid over the shoulder */}
            <g>
              {[0, 1, 2, 3, 4].map((i) => (
                <ellipse key={i} cx={-25 - i * 1.6} cy={-86 + i * 10} rx={7 - i * 0.5} ry="6.5" fill={i % 2 ? C.cHairLight : C.cHair} />
              ))}
              <path d="M-33 -36 l-3 7 l5 -1 Z" fill={C.cHair} />
            </g>
            {arm('R')}
          </g>
        </g>
      </g>
    </g>
  );
}

/* Props the chef can hold (drawn level, hand at 0,0) */
export function Wok({ flameRef, foodRef }) {
  return (
    <g>
      <g ref={flameRef} className="wok-flames">
        <path d="M-90 26 Q-84 6 -76 20 Q-72 -2 -62 18 Q-56 4 -50 22 Q-44 10 -40 26 Z" fill="#f59e0b" />
        <path d="M-84 26 Q-78 12 -72 22 Q-66 8 -60 22 Q-54 14 -48 26 Z" fill="#fde047" />
      </g>
      <path d="M0 -2 L-34 4" stroke="#2b2420" strokeWidth="6" strokeLinecap="round" />
      <path d="M-34 4 L-44 4" stroke="#121114" strokeWidth="5" strokeLinecap="round" />
      <path d="M-98 0 Q-96 22 -66 24 Q-38 22 -36 0 Z" fill="#23232a" />
      <path d="M-98 0 H-36" stroke="#4b4b55" strokeWidth="3" strokeLinecap="round" />
      <g ref={foodRef}>
        <circle cx="-78" cy="-4" r="4" fill="#f59e0b" />
        <circle cx="-66" cy="-6" r="3.5" fill="#22c55e" />
        <circle cx="-58" cy="-3" r="3" fill="#ef4444" />
        <rect x="-72" y="-10" width="8" height="4" rx="2" fill="#fef3c7" />
      </g>
    </g>
  );
}

export function Knife() {
  return (
    <g>
      <rect x="-3" y="-4" width="6" height="16" rx="2" fill="#2b2420" />
      <path d="M-3 11 L3 11 L4 44 Q0 50 -6 44 Z" fill="#d7dde4" />
      <path d="M1 12 L2 44" stroke="#fff" strokeOpacity="0.7" strokeWidth="1" />
    </g>
  );
}

export function Ticket() {
  return (
    <g>
      <rect x="-14" y="-40" width="28" height="38" rx="2" fill="#fff" stroke="#d6d0c4" />
      <path d="M-9 -32 H9 M-9 -25 H6 M-9 -18 H8 M-9 -11 H4" stroke="#9a948a" strokeWidth="1.6" />
    </g>
  );
}
