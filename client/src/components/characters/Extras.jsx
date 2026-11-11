import { C } from './rig';

/** Seated guest (side view, faces −x). Origin = seat level under the hips. */
export function Guest({ heartsRef }) {
  return (
    <g>
      {/* chair */}
      <path d="M-6 0 H46 V8 H-6 Z" fill="#6b4329" />
      <path d="M40 0 V-92 H48 V0 Z" fill="#5b3a25" />
      <path d="M-2 8 V74 M42 8 V74" stroke="#5b3a25" strokeWidth="6" />
      {/* legs */}
      <path d="M2 -4 H-34 V68 H-24 V8 H8 Z" fill="#3b3f52" />
      <path d="M-38 66 H-20 V74 H-44 Q-44 66 -38 66 Z" fill={C.shoe} />
      {/* body */}
      <path d="M-4 -2 Q-12 -46 2 -66 Q20 -76 32 -60 Q38 -30 32 -2 Z" fill="#e8a3b1" />
      <path d="M-2 -40 Q-22 -34 -40 -30" stroke="#e8a3b1" strokeWidth="13" strokeLinecap="round" />
      <circle cx="-44" cy="-30" r="6" fill={C.skin} />
      <path d="M-46 -34 L-72 -46 M-44 -36 L-70 -50" stroke="#a16207" strokeWidth="2" strokeLinecap="round" />
      {/* head */}
      <rect x="8" y="-80" width="12" height="14" rx="5" fill={C.skinShade} />
      <circle cx="12" cy="-98" r="24" fill="#2b1d16" />
      <circle cx="30" cy="-116" r="10" fill="#2b1d16" />
      <path d="M-10 -98 Q-12 -76 8 -74 Q24 -74 26 -92 Q26 -110 8 -112 Q-8 -112 -10 -98 Z" fill={C.skin} />
      <path d="M-12 -104 Q-4 -122 18 -116 Q30 -110 30 -96 Q20 -110 4 -106 Q-6 -104 -12 -104 Z" fill="#2b1d16" />
      <path d="M-4 -96 Q0 -100 4 -96" stroke={C.lash} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="-3" cy="-88" rx="4" ry="2.4" fill={C.blush} opacity="0.6" />
      <path d="M-9 -84 Q-5 -80 -1 -83" stroke={C.lip} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* reaction */}
      <g ref={heartsRef} opacity="0">
        <path d="M-20 -134 c-4 -6 -12 -2 -8 4 l8 8 l8 -8 c4 -6 -4 -10 -8 -4 Z" fill="#e11d48" />
        <path d="M6 -150 c-3 -4 -9 -1 -6 3 l6 6 l6 -6 c3 -4 -3 -7 -6 -3 Z" fill="#f472b6" />
        <path d="M-36 -152 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" fill="#fbbf24" />
        <path d="M22 -128 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z" fill="#fde68a" />
      </g>
    </g>
  );
}

/** Delivery rider on a scooter (faces +x). Origin = ground under the scooter centre. */
export function Rider({ wheelBackRef, wheelFrontRef, riderRef }) {
  const wheel = (ref, x) => (
    <g transform={`translate(${x} -17)`}>
      <g ref={ref}>
        <circle r="17" fill="#17171b" />
        <circle r="8" fill="#9ca3af" />
        <path d="M0 -8 V8 M-8 0 H8" stroke="#4b5563" strokeWidth="2" />
      </g>
    </g>
  );
  return (
    <g>
      <ellipse cx="0" cy="0" rx="78" ry="6" fill="#000" opacity="0.22" />
      {wheel(wheelBackRef, -48)}
      {wheel(wheelFrontRef, 52)}
      {/* delivery box */}
      <rect x="-82" y="-104" width="50" height="44" rx="6" fill="#b5121b" />
      <rect x="-82" y="-104" width="50" height="9" rx="4" fill="#8f0e15" />
      <text x="-57" y="-70" textAnchor="middle" fontFamily="Shippori Mincho, serif" fontWeight="800" fontSize="18" fill="#fff">富士</text>
      {/* scooter */}
      <path d="M-66 -24 Q-70 -52 -36 -54 H6 Q14 -54 18 -46 L34 -20 H-60 Z" fill="#f5efe6" />
      <path d="M18 -46 L44 -96" stroke="#3f3f46" strokeWidth="6" strokeLinecap="round" />
      <path d="M36 -98 H56" stroke="#17171b" strokeWidth="6" strokeLinecap="round" />
      <path d="M30 -60 Q52 -60 58 -24 L46 -22 Q40 -46 26 -48 Z" fill="#b5121b" />
      <circle cx="58" cy="-72" r="5" fill="#fde68a" />
      <g ref={riderRef}>
        {/* rider */}
        <path d="M-30 -56 Q-28 -70 -8 -70 L4 -40 L28 -40 L28 -30 L-4 -30 Q-26 -32 -30 -56 Z" fill="#262833" />
        <path d="M-26 -60 Q-34 -100 -6 -112 Q10 -112 12 -96 L4 -60 Z" fill="#b5121b" />
        <path d="M-6 -100 Q14 -98 38 -96" stroke="#b5121b" strokeWidth="9" strokeLinecap="round" />
        <circle cx="40" cy="-96" r="5" fill={C.skin} />
        <rect x="-8" y="-122" width="10" height="12" rx="4" fill={C.skinShade} />
        <circle cx="-4" cy="-138" r="21" fill="#f5efe6" />
        <path d="M-25 -140 Q-24 -162 -2 -160 Q20 -158 17 -136 Z" fill="#b5121b" />
        <path d="M2 -144 Q16 -144 17 -132 Q10 -128 2 -130 Z" fill="#1f2937" opacity="0.85" />
      </g>
    </g>
  );
}

/** Kitchen service bell. `plungerRef` dips on "ding". */
export function Bell({ plungerRef }) {
  return (
    <g>
      <g ref={plungerRef}>
        <rect x="-2" y="-34" width="4" height="8" fill="#a1a1aa" />
        <circle cx="0" cy="-35" r="3.5" fill="#d4d4d8" />
      </g>
      <path d="M-18 -4 Q-18 -28 0 -28 Q18 -28 18 -4 Z" fill="#d6b25e" />
      <path d="M-10 -20 Q-4 -26 4 -25" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="-22" y="-5" width="44" height="6" rx="3" fill="#8a6d2f" />
    </g>
  );
}

/** Paper lantern. Use with className="lantern" on a wrapper for the sway. */
export function LanternShape({ kanji = '', w = 52, h = 70, color = '#b5121b' }) {
  return (
    <g>
      <rect x={-w * 0.22} y={-6} width={w * 0.44} height="8" rx="2" fill="#1b1512" />
      <ellipse cx="0" cy={h / 2} rx={w / 2} ry={h / 2} fill={color} />
      {[0.25, 0.5, 0.75].map((k) => (
        <path key={k} d={`M${-w / 2 + 1} ${h * k} Q0 ${h * k + 4} ${w / 2 - 1} ${h * k}`} stroke="#000" strokeOpacity="0.18" fill="none" />
      ))}
      <ellipse cx={-w * 0.18} cy={h * 0.36} rx={w * 0.1} ry={h * 0.22} fill="#fff" opacity="0.12" />
      {kanji && (
        <text x="0" y={h / 2 + w * 0.17} textAnchor="middle" fontFamily="Shippori Mincho, serif" fontWeight="800" fontSize={w * 0.46} fill="#1b1512" opacity="0.85">
          {kanji}
        </text>
      )}
      <rect x={-w * 0.22} y={h - 2} width={w * 0.44} height="8" rx="2" fill="#1b1512" />
      <path d={`M0 ${h + 6} V${h + 20}`} stroke="#c9a45c" strokeWidth="2" />
      <circle cx="0" cy={h + 22} r="3" fill="#c9a45c" />
    </g>
  );
}

/** Rising steam wisps (CSS animated). */
export function SteamWisps({ scale = 1, opacity = 0.7 }) {
  return (
    <g transform={`scale(${scale})`} opacity={opacity} pointerEvents="none">
      {[-10, 0, 10].map((x, i) => (
        <path
          key={x}
          className="steam-wisp"
          d={`M${x} 0 q-6 -8 0 -16 q6 -8 0 -16`}
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          style={{ animationDelay: `${i * 0.7}s` }}
        />
      ))}
    </g>
  );
}
