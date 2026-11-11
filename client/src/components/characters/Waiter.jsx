import { useId } from 'react';
import { C, safeId } from './rig';

/**
 * Illustrated waiter (design based on the supplied reference: black flat cap,
 * brown ponytail, white rolled-sleeve shirt, black bow tie, navy pinafore).
 * Local origin = between the feet on the ground; faces +x. ~330 units tall.
 *
 * Pass `rig` (a useRef({})) to receive the moving parts, then drive it with poseWaiter().
 * `trayContent` is rendered on the tray (already level).
 */
export default function Waiter({ rig, mood = 'smile', withTray = true, trayContent = null, blink = true }) {
  const uid = safeId(useId());
  const set = (name) => (el) => {
    if (rig && el) rig.current[name] = el;
  };

  return (
    <g ref={set('root')}>
      <ellipse cx="0" cy="0" rx="42" ry="6.5" fill="#000" opacity="0.22" />
      <g ref={set('bob')}>
        {/* legs (drawn behind the skirt) */}
        {['legL', 'legR'].map((leg, i) => (
          <g key={leg} transform={`translate(${i ? 10 : -10} -126)`}>
            <g ref={set(leg)}>
              <path d="M-7.5 0 H7.5 L6 112 H-5 Z" fill={i ? C.legs : '#1f212b'} />
              <path d="M-6 109 H6 Q18 110 19 120 V125 H-7 Z" fill={C.shoe} />
              <path d="M-4 112 H8" stroke="#fff" strokeOpacity="0.12" strokeWidth="1.5" />
            </g>
          </g>
        ))}

        {/* skirt */}
        <path d="M-27 -180 H27 L45 -101 Q0 -92 -45 -101 Z" fill={C.wDress} />
        <path d="M-9 -176 L-15 -97 M9 -176 L15 -97 M0 -176 V-95" stroke="#000" strokeOpacity="0.28" strokeWidth="1.2" />

        <g transform="translate(0 -176)">
          <g ref={set('upper')}>
            {/* far arm */}
            <g transform="translate(-27 -50)">
              <g ref={set('armBack')}>
                <path d="M-8.5 -5 Q-11.5 18 -8.5 38 H8.5 Q11 18 8.5 -5 Z" fill={C.wShirtShade} />
                <rect x="-10" y="27" width="20" height="11" rx="5" fill="#cfc8bc" />
                <g transform="translate(0 37)">
                  <g ref={set('foreBack')}>
                    <path d="M-5.5 0 H5.5 L4.5 33 H-4.5 Z" fill={C.skinShade} />
                    <circle cx="0" cy="37" r="6.5" fill={C.skinShade} />
                  </g>
                </g>
              </g>
            </g>

            {/* torso */}
            <path d="M-25 3 L-31 -40 Q-32 -54 -18 -57 H18 Q32 -54 31 -40 L25 3 Z" fill={C.wShirt} />
            <path d="M-31 -40 Q-26 -30 -24 2" stroke={C.wShirtShade} strokeWidth="3" fill="none" />
            <path d="M-18 3 V-38 Q0 -41 18 -38 V3 Z" fill={C.wDress} />
            <path d="M-16 -37 L-21 -56 M16 -37 L21 -56" stroke={C.wDress} strokeWidth="6.5" strokeLinecap="round" />
            <circle cx="-12" cy="-32" r="2.4" fill={C.wButton} />
            <circle cx="12" cy="-32" r="2.4" fill={C.wButton} />
            <rect x="-26" y="-6" width="52" height="9" rx="2.5" fill={C.wDressDark} />

            {/* neck, collar, bow tie */}
            <rect x="-6.5" y="-74" width="13" height="20" rx="5" fill={C.skinShade} />
            <path d="M-12 -60 L-1 -52 L-3 -63 Z M12 -60 L1 -52 L3 -63 Z" fill={C.wShirt} stroke={C.wShirtShade} strokeWidth="0.9" />
            <path d="M0 -54 L-12 -60 Q-14 -54 -12 -48 Z M0 -54 L12 -60 Q14 -54 12 -48 Z" fill={C.wTie} />
            <circle cx="0" cy="-54" r="2.8" fill="#272b36" />

            {/* head */}
            <g transform="translate(2 -101)">
              <g ref={set('head')}>
                <path d="M-21 -6 Q-47 4 -42 33 Q-38 50 -30 42 Q-36 22 -16 6 Z" fill={C.wHair} />
                <ellipse cx="-1" cy="-4" rx="31" ry="32" fill={C.wHair} />
                <ellipse cx="-24" cy="7" rx="5" ry="7" fill={C.skinShade} />
                <path d="M-24 -6 Q-25 26 -2 33 Q22 34 28 8 Q31 -14 20 -22 Q2 -28 -14 -22 Q-24 -16 -24 -6 Z" fill={C.skin} />
                <path d="M-27 -9 Q-22 -34 4 -32 Q26 -30 30 -8 Q21 -21 7 -19 Q-5 -16 -10 -5 Q-14 -18 -27 -9 Z" fill={C.wHair} />
                <path d="M-6 -27 Q8 -30 20 -24" stroke={C.wHairLight} strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M-25 -3 Q-31 14 -22 27" stroke={C.wHair} strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M27 -1 Q33 12 26 23" stroke={C.wHair} strokeWidth="3.4" fill="none" strokeLinecap="round" />
                {/* flat cap */}
                <path d="M-35 -13 Q-37 -41 -2 -45 Q35 -45 37 -17 Q20 -27 0 -27 Q-21 -25 -35 -13 Z" fill={C.wCap} />
                <path d="M9 -22 Q34 -27 45 -16 Q31 -11 11 -15 Z" fill={C.wCapDark} />
                <path d="M-27 -31 Q-2 -41 27 -33" stroke="#fff" strokeOpacity="0.09" strokeWidth="3" fill="none" />
                <circle cx="0" cy="-43" r="2.6" fill={C.wCapDark} />
                {/* brows */}
                <path d="M-15 -9 Q-8 -14 -2 -10" stroke="#3a2416" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                <path d="M11 -10 Q18 -14 24 -9" stroke="#3a2416" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                {/* eyes */}
                <defs>
                  <clipPath id={`${uid}-l`}>
                    <ellipse cx="-8" cy="2.5" rx="6" ry="7" />
                  </clipPath>
                  <clipPath id={`${uid}-r`}>
                    <ellipse cx="17" cy="2.5" rx="6" ry="7" />
                  </clipPath>
                </defs>
                <g className={blink ? 'char-blink' : undefined}>
                  <ellipse cx="-8" cy="2.5" rx="6" ry="7" fill={C.white} />
                  <ellipse cx="17" cy="2.5" rx="6" ry="7" fill={C.white} />
                  <g clipPath={`url(#${uid}-l)`}>
                    <g ref={set('pupilL')}>
                      <circle cx="-7" cy="3.5" r="4.4" fill={C.wIris} />
                      <circle cx="-7" cy="3.5" r="2.2" fill="#140b06" />
                      <circle cx="-5.6" cy="1.9" r="1.3" fill="#fff" />
                    </g>
                  </g>
                  <g clipPath={`url(#${uid}-r)`}>
                    <g ref={set('pupilR')}>
                      <circle cx="18" cy="3.5" r="4.4" fill={C.wIris} />
                      <circle cx="18" cy="3.5" r="2.2" fill="#140b06" />
                      <circle cx="19.4" cy="1.9" r="1.3" fill="#fff" />
                    </g>
                  </g>
                  <path d="M-14.5 -0.5 Q-8 -6.5 -1.5 -0.5" stroke={C.lash} strokeWidth="2.3" fill="none" strokeLinecap="round" />
                  <path d="M10.5 -0.5 Q17 -6.5 23.5 -0.5 L26.5 -3" stroke={C.lash} strokeWidth="2.3" fill="none" strokeLinecap="round" />
                </g>
                <circle ref={set('eyes')} cx="4.5" cy="2.5" r="0.5" fill="none" />
                {/* nose, blush, mouth */}
                <path d="M6.5 9 Q9 14 5.5 15.5" stroke={C.skinLine} strokeWidth="1.6" fill="none" strokeLinecap="round" />
                <ellipse cx="-13" cy="13.5" rx="5" ry="3" fill={C.blush} opacity={mood === 'oops' ? 0.95 : 0.5} />
                <ellipse cx="22" cy="13.5" rx="4.5" ry="3" fill={C.blush} opacity={mood === 'oops' ? 0.95 : 0.5} />
                {mood === 'oops' && (
                  <>
                    <ellipse cx="6" cy="23" rx="3.4" ry="4.4" fill={C.lip} />
                    <path d="M31 -12 q4 6 0 9 q-4 -3 0 -9 Z" fill="#9fd3f5" />
                  </>
                )}
                {mood === 'happy' && <path d="M-2 19 Q6 30 15 19 Z" fill={C.lip} />}
                {mood === 'smile' && (
                  <path d="M-2 20 Q6 26.5 14.5 20" stroke={C.lip} strokeWidth="2.3" fill="none" strokeLinecap="round" />
                )}
              </g>
            </g>

            {/* near (tray) arm */}
            <g transform="translate(27 -50)">
              <g ref={set('armFront')}>
                <path d="M-8.5 -5 Q-11 18 -8.5 38 H8.5 Q11.5 18 8.5 -5 Z" fill={C.wShirt} />
                <rect x="-10" y="27" width="20" height="11" rx="5" fill="#e6e0d6" />
                <g transform="translate(0 37)">
                  <g ref={set('foreFront')}>
                    <path d="M-5.5 0 H5.5 L4.5 33 H-4.5 Z" fill={C.skin} />
                    <circle cx="0" cy="37" r="6.5" fill={C.skin} />
                    {withTray && (
                      <g transform="translate(0 32)">
                        <g ref={set('tray')}>
                          <path d="M-36 -5 H60 L56 0 H-32 Z" fill="#17171c" />
                          <rect x="-37" y="-6.5" width="98" height="2.2" rx="1.1" fill="#3b3c45" />
                          <g ref={set('trayAnchor')} transform="translate(12 -6)">
                            {trayContent}
                          </g>
                        </g>
                      </g>
                    )}
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}
