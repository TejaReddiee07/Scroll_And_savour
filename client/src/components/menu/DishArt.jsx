import { memo } from 'react';

/**
 * Original flat illustrations for every dish on the menu (no photographs).
 * `art` = "type" or "type:variant" (see menu.json). viewBox 200×150.
 * These are ILLUSTRATIVE — always rendered with an "Illustrative image" label.
 */

const RICE = '#fbf8f1';
const RICE_DOT = '#e9e2d2';
const NORI = '#1e2a23';
const NORI_2 = '#2b3a31';
const GREEN = '#5aa641';
const LEAF = '#3f8f3a';
const SESAME = '#f3e3b5';

const FISH = {
  salmon: ['#f7875a', '#ffc6a9'],
  tuna: ['#c62a3c', '#ea6474'],
  seabass: ['#f3ece2', '#d6cab9'],
  saba: ['#aebfcd', '#4b5e74'],
  eel: ['#6e3b1e', '#a3622f'],
  tamago: ['#f7cc4a', '#e2a72a'],
  prawn: ['#f8a27e', '#fff1e8'],
  octopus: ['#f1c3ca', '#8e3b5b'],
  scallop: ['#f6ecdc', '#e3d1b4'],
  searedsalmon: ['#ea7a4b', '#5e3018'],
  amaebi: ['#f7a898', '#ffdcd2'],
  soyasalmon: ['#c86233', '#e8935f'],
  yellowtail: ['#f6dfca', '#e9a594'],
  inari: ['#c98a3e', '#a86c28'],
};

/* ── primitives ─────────────────────────────────────────────────── */
const Plate = ({ cx = 100, cy = 104, rx = 88, ry = 36, color = '#2a2a31', rim = '#3a3a43' }) => (
  <>
    <ellipse cx={cx} cy={cy + 5} rx={rx} ry={ry} fill="#000" opacity="0.18" />
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={rim} />
    <ellipse cx={cx} cy={cy - 1} rx={rx - 9} ry={ry - 6} fill={color} />
  </>
);

const LightPlate = (p) => <Plate color="#f4f1ea" rim="#dcd5c8" {...p} />;

const Board = ({ y = 92 }) => (
  <>
    <path d={`M18 ${y + 22} L182 ${y + 22} L176 ${y + 34} L24 ${y + 34} Z`} fill="#000" opacity="0.18" />
    <path d={`M14 ${y} H186 L180 ${y + 26} H20 Z`} fill="#c08a4f" />
    <path d={`M14 ${y} H186 L184 ${y + 6} H16 Z`} fill="#d7a466" />
    <path d={`M40 ${y + 26} V${y + 34} M160 ${y + 26} V${y + 34}`} stroke="#8a5a30" strokeWidth="8" />
  </>
);

const Bowl = ({ cx = 100, top = 66, w = 136, h = 62, body = '#f4f1ea', pattern = '#2c5aa0', inner = '#fffaf2', fill }) => (
  <>
    <ellipse cx={cx} cy={top + h + 4} rx={w * 0.36} ry="8" fill="#000" opacity="0.2" />
    <path d={`M${cx - w / 2} ${top} Q${cx - w / 2 + 6} ${top + h} ${cx} ${top + h} Q${cx + w / 2 - 6} ${top + h} ${cx + w / 2} ${top} Z`} fill={body} />
    {pattern && (
      <path
        d={`M${cx - w / 2 + 10} ${top + 18} q12 -8 24 0 t24 0 t24 0 t24 0 t24 0`}
        stroke={pattern}
        strokeWidth="4"
        fill="none"
        opacity="0.8"
      />
    )}
    <ellipse cx={cx} cy={top} rx={w / 2} ry={w * 0.13} fill={inner} />
    {fill && <ellipse cx={cx} cy={top + 2} rx={w / 2 - 7} ry={w * 0.13 - 5} fill={fill} />}
  </>
);

const Lacquer = (p) => <Bowl body="#1b1515" pattern={null} inner="#9c1a1f" {...p} />;

const Rice = ({ cx, cy, rx = 30, ry = 14 }) => (
  <>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={RICE} />
    {[...Array(7)].map((_, i) => (
      <ellipse key={i} cx={cx - rx * 0.6 + (i * rx * 1.2) / 6} cy={cy - ry * 0.3 + ((i * 7) % 5) * 1.6} rx="2.4" ry="1.3" fill={RICE_DOT} />
    ))}
  </>
);

const Lemon = ({ x, y, r = 11 }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={`M${-r} 0 A${r} ${r} 0 0 1 ${r} 0 Z`} fill="#fde047" />
    <path d={`M${-r + 3} 0 A${r - 3} ${r - 3} 0 0 1 ${r - 3} 0 Z`} fill="#fef9c3" />
    <path d={`M0 0 L0 ${-r + 3} M0 0 L${-r * 0.55} ${-r * 0.55} M0 0 L${r * 0.55} ${-r * 0.55}`} stroke="#fde047" strokeWidth="1.5" />
  </g>
);

const Wasabi = ({ x, y }) => (
  <path d={`M${x - 9} ${y} Q${x - 8} ${y - 10} ${x} ${y - 12} Q${x + 8} ${y - 10} ${x + 9} ${y} Z`} fill="#8fbf4a" />
);

const Ginger = ({ x, y }) => (
  <g>
    <ellipse cx={x} cy={y} rx="10" ry="5" fill="#f6b8b0" />
    <ellipse cx={x + 5} cy={y - 3} rx="9" ry="4.5" fill="#f9cbc4" />
  </g>
);

const Shiso = ({ x, y, rot = -20, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-26 0 Q-10 -16 26 0 Q-10 16 -26 0 Z" fill={LEAF} />
    <path d="M-24 0 H24" stroke="#2f6b2b" strokeWidth="1.4" />
  </g>
);

const Daikon = ({ x, y }) => (
  <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
    {[...Array(9)].map((_, i) => (
      <path key={i} d={`M${x - 16 + i * 4} ${y + 6} q4 -12 ${8 - (i % 3) * 4} -18`} fill="none" />
    ))}
  </g>
);

const Chopsticks = ({ x = 30, y = 40, rot = 18 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <rect x="0" y="0" width="120" height="4" rx="2" fill="#8a5a30" />
    <rect x="4" y="8" width="118" height="4" rx="2" fill="#a26b39" />
  </g>
);

const Scallion = ({ cx, cy, n = 6, spread = 30 }) => (
  <g>
    {[...Array(n)].map((_, i) => (
      <circle key={i} cx={cx - spread / 2 + (i * spread) / (n - 1)} cy={cy + ((i * 5) % 7) - 3} r="2.6" fill="#7cc35a" stroke="#4d8a37" strokeWidth="0.8" />
    ))}
  </g>
);

/* Nigiri piece: rice block + draped topping (x,y = centre) */
function Nigiri({ x, y, fish = 'salmon', s = 1 }) {
  const [a, b] = FISH[fish] || FISH.salmon;
  if (fish === 'inari') {
    return (
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <path d="M-28 6 Q-30 -16 -4 -18 Q26 -18 28 4 Q26 16 0 16 Q-26 16 -28 6 Z" fill={a} />
        <path d="M-20 -6 Q0 -12 20 -6" stroke={b} strokeWidth="2" fill="none" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-26" y="-8" width="52" height="22" rx="11" fill={RICE} />
      <path d="M-30 -2 Q-30 -20 0 -20 Q31 -20 31 -2 Q30 6 0 4 Q-30 6 -30 -2 Z" fill={a} />
      {fish === 'tamago' ? (
        <rect x="-5" y="-21" width="10" height="34" fill={NORI} />
      ) : fish === 'searedsalmon' || fish === 'scallop' ? (
        <path d="M-22 -10 l6 -6 M-10 -12 l6 -6 M2 -12 l6 -6 M14 -10 l6 -6" stroke={b} strokeWidth="2.4" strokeLinecap="round" />
      ) : fish === 'eel' ? (
        <>
          <path d="M-26 -8 Q0 -16 26 -8" stroke="#3a1c0c" strokeWidth="2" fill="none" />
          <rect x="-4" y="-21" width="8" height="34" fill={NORI} />
        </>
      ) : fish === 'octopus' ? (
        <path d="M-28 -2 Q0 8 30 -2" stroke={b} strokeWidth="4" fill="none" />
      ) : (
        <path d="M-20 -14 q6 8 2 16 M-6 -17 q6 9 2 18 M8 -17 q6 9 2 18 M21 -14 q4 7 1 14" stroke={b} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
      {(fish === 'prawn' || fish === 'amaebi') && <path d="M28 -6 l10 -8 l-2 12 Z" fill="#e2553a" />}
    </g>
  );
}

function Gunkan({ x, y, top = 'roe', s = 1 }) {
  const color = top === 'roe' ? '#f2671f' : top === 'spicytuna' ? '#d9473a' : '#c62a3c';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-22" y="-14" width="44" height="28" rx="8" fill={NORI} />
      <ellipse cx="0" cy="-14" rx="22" ry="7" fill={color} />
      {top === 'roe'
        ? [...Array(12)].map((_, i) => <circle key={i} cx={-16 + (i % 6) * 6.4} cy={-16 + Math.floor(i / 6) * 4} r="2.2" fill="#ff9a4a" />)
        : <path d="M-14 -16 q7 -6 14 0 t14 0" stroke={top === 'spicytuna' ? '#fb923c' : '#ea6474'} strokeWidth="2.4" fill="none" />}
      <path d="M-22 -2 H22" stroke={NORI_2} strokeWidth="1.5" />
    </g>
  );
}

/* Roll slice seen from above at 3/4 (cylinder) */
function RollSlice({ x, y, r = 16, outer = 'nori', fillings = ['#f7875a'], topping }) {
  const outerColor = { nori: NORI, rice: RICE, sesame: RICE, roe: '#f2671f', tempura: '#e0a347', seaweed: NORI }[outer];
  const ringColor = outer === 'nori' ? RICE : NORI;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M${-r} 0 V8 A${r} ${r * 0.62} 0 0 0 ${r} 8 V0 Z`} fill={outer === 'nori' ? NORI_2 : outer === 'tempura' ? '#c4862c' : '#e9e2d2'} />
      <ellipse cx="0" cy="0" rx={r} ry={r * 0.62} fill={outerColor} />
      {outer === 'sesame' && [...Array(10)].map((_, i) => <ellipse key={i} cx={Math.cos(i) * r * 0.82} cy={Math.sin(i) * r * 0.5} rx="1.6" ry="1" fill="#d6c38b" />)}
      {outer === 'roe' && [...Array(10)].map((_, i) => <circle key={i} cx={Math.cos(i * 0.7) * r * 0.82} cy={Math.sin(i * 0.7) * r * 0.5} r="1.6" fill="#ff9a4a" />)}
      {outer === 'tempura' && [...Array(8)].map((_, i) => <circle key={i} cx={Math.cos(i * 0.8) * r * 0.85} cy={Math.sin(i * 0.8) * r * 0.52} r="2" fill="#f2c66d" />)}
      <ellipse cx="0" cy="0" rx={r * 0.78} ry={r * 0.78 * 0.62} fill={ringColor} />
      {outer !== 'nori' && <ellipse cx="0" cy="0" rx={r * 0.62} ry={r * 0.62 * 0.62} fill={RICE} />}
      {fillings.length === 1 ? (
        <ellipse cx="0" cy="0" rx={r * 0.32} ry={r * 0.32 * 0.62} fill={fillings[0]} />
      ) : (
        fillings.map((f, i) => (
          <ellipse key={i} cx={(i - (fillings.length - 1) / 2) * r * 0.3} cy={(i % 2 ? 1 : -1) * r * 0.08} rx={r * 0.18} ry={r * 0.14} fill={f} />
        ))
      )}
      {topping && <path d={`M${-r} -3 Q0 ${-r * 0.9} ${r} -3 Q0 ${-r * 0.35} ${-r} -3 Z`} fill={topping} />}
    </g>
  );
}

const Tempura = ({ x, y, rot = 0, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M-34 4 Q-30 -12 -6 -12 Q20 -14 30 -4 Q22 10 -4 10 Q-26 12 -34 4 Z" fill="#e8b155" />
    {[...Array(7)].map((_, i) => <circle key={i} cx={-26 + i * 8} cy={-8 + (i % 3) * 5} r="3.2" fill="#f4cc7a" />)}
    <path d="M30 -4 l14 -10 l-4 14 Z" fill="#e2553a" />
  </g>
);

const Cutlet = ({ x, y, w = 74, slices = 5, color = '#d99a3e' }) => (
  <g transform={`translate(${x} ${y})`}>
    {[...Array(slices)].map((_, i) => (
      <g key={i} transform={`translate(${-w / 2 + (i * w) / slices} ${-i * 1.5})`}>
        <rect x="0" y="-10" width={w / slices - 1.5} height="20" rx="4" fill={color} />
        <rect x="2" y="-6" width={w / slices - 5.5} height="12" rx="3" fill="#f6e7c8" />
        <circle cx={w / slices / 2} cy="-8" r="1.4" fill="#f4cc7a" />
      </g>
    ))}
  </g>
);

const Karaage = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-16 4 Q-20 -10 -6 -14 Q8 -18 14 -6 Q20 6 6 10 Q-10 14 -16 4 Z" fill="#b8662a" />
    <path d="M-10 -4 Q-4 -10 4 -8" stroke="#d98a3d" strokeWidth="3" fill="none" strokeLinecap="round" />
    <circle cx="6" cy="2" r="2" fill="#8a4518" />
  </g>
);

const Gyoza = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-20 6 Q-22 -14 0 -16 Q22 -14 20 6 Z" fill="#f4e6c8" />
    <path d="M-20 6 Q0 12 20 6 Q0 2 -20 6 Z" fill="#c9852f" />
    <path d="M-10 -12 l3 6 M-3 -15 l2 7 M4 -15 l1 7 M11 -12 l0 6" stroke="#dcc79c" strokeWidth="1.6" strokeLinecap="round" />
  </g>
);

const Noodles = ({ cx, cy, w = 90, color = '#f3e2a6', thick = 3, rows = 4 }) => (
  <g stroke={color} strokeWidth={thick} fill="none" strokeLinecap="round">
    {[...Array(rows)].map((_, i) => (
      <path key={i} d={`M${cx - w / 2} ${cy - rows * 2 + i * 5} q${w / 8} -6 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0`} />
    ))}
  </g>
);

const EggHalf = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="0" rx="12" ry="9" fill="#fff" />
    <circle cx="0" cy="0" r="5.5" fill="#f59e0b" />
    <circle cx="0" cy="0" r="3" fill="#fbbf24" />
  </g>
);

const Naruto = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse rx="10" ry="7" fill="#fff" />
    <path d="M-5 0 a5 3.5 0 1 1 5 3.5 a3 2 0 1 1 -3 -2" stroke="#ec4899" strokeWidth="1.8" fill="none" />
  </g>
);

const MisoCup = ({ x, y, s = 0.42 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Lacquer cx={0} top={0} w={120} h={60} fill="#c08442" />
    <rect x="-20" y="-6" width="9" height="7" fill="#fff8e6" />
    <rect x="6" y="-3" width="9" height="7" fill="#fff8e6" />
    <path d="M-30 4 q6 -4 12 0" stroke="#2f5d2a" strokeWidth="4" fill="none" />
  </g>
);

const Pea = ({ x, y }) => <circle cx={x} cy={y} r="2.6" fill="#65a30d" />;
const Bits = ({ cx, cy, w, colors, n = 14, seed = 1 }) => (
  <g>
    {[...Array(n)].map((_, i) => {
      const k = (i * 37 + seed * 11) % 100;
      return <rect key={i} x={cx - w / 2 + ((k * 7) % w)} y={cy - 8 + ((k * 3) % 16)} width="5" height="3.2" rx="1.4" fill={colors[i % colors.length]} transform={`rotate(${k * 3} ${cx - w / 2 + ((k * 7) % w)} ${cy})`} />;
    })}
  </g>
);

/* ── dish types ─────────────────────────────────────────────────── */
const MAKI_FILL = {
  cucumber: ['#4d9b3a'],
  avocado: ['#a3c95b'],
  kyampo: ['#9a6a3a'],
  salmon: ['#f7875a'],
  tuna: ['#c62a3c'],
  spicytuna: ['#d9473a'],
  eel: ['#6e3b1e'],
  tunacucumber: ['#c62a3c', '#4d9b3a'],
  salmonavocado: ['#f7875a', '#a3c95b'],
};

const URA = {
  veg: { outer: 'sesame', f: ['#4d9b3a', '#a3c95b'] },
  alaska: { outer: 'sesame', f: ['#c86233', '#4d9b3a'] },
  california: { outer: 'roe', f: ['#f2a7a0', '#a3c95b'] },
  salmonavocado: { outer: 'rice', f: ['#f7875a', '#a3c95b'] },
  prawntempura: { outer: 'sesame', f: ['#e8b155', '#f8a27e'] },
  spicysalmon: { outer: 'sesame', f: ['#e5603a', '#4d9b3a'] },
  philadelphia: { outer: 'rice', f: ['#fffaf0', '#f7875a', '#a3c95b'] },
  spicytuna: { outer: 'tempura', f: ['#d9473a', '#4d9b3a'] },
  crunchytuna: { outer: 'tempura', f: ['#c62a3c', '#4d9b3a'] },
  jumbo: { outer: 'rice', f: ['#f7875a', '#e8b155', '#a3c95b'] },
  rainbow: { outer: 'rice', f: ['#f2a7a0', '#a3c95b'], tops: ['#c62a3c', '#f7875a'] },
  ebipanko: { outer: 'roe', f: ['#d99a3e', '#a3c95b'] },
  dragon: { outer: 'rice', f: ['#e8b155', '#a3c95b'], tops: ['#6e3b1e'] },
};

function rollRow(cfg, n = 5, y = 90) {
  return [...Array(n)].map((_, i) => (
    <RollSlice
      key={i}
      x={40 + i * 30}
      y={y + (i % 2 ? 6 : -2)}
      r={15}
      outer={cfg.outer}
      fillings={cfg.f}
      topping={cfg.tops ? cfg.tops[i % cfg.tops.length] : undefined}
    />
  ));
}

const SET_CONTENT = {
  salmon: { n: ['salmon', 'salmon', 'salmon'], m: ['#f7875a'] },
  veg: { n: ['inari', 'inari'], m: ['#4d9b3a', '#a3c95b'], outer: 'sesame' },
  salmontuna: { n: ['salmon', 'tuna', 'salmon'], m: ['#4d9b3a'] },
  sushi: { n: ['salmon', 'tuna', 'seabass', 'tamago'], m: ['#4d9b3a'] },
  tuna: { n: ['tuna', 'tuna', 'tuna'], m: ['#c62a3c'] },
  fuji: { n: ['salmon', 'prawn', 'tuna', 'inari'], m: ['#f2a7a0', '#a3c95b'], outer: 'roe' },
  nigiri: { n: ['salmon', 'searedsalmon', 'prawn', 'scallop'], g: true },
  mix: { n: ['salmon', 'tuna', 'seabass'], m: ['#f2a7a0', '#a3c95b'], outer: 'roe' },
  makiura: { rolls: true },
  delux: { n: ['salmon', 'tuna', 'prawn', 'seabass', 'searedsalmon'], m: ['#f7875a', '#a3c95b'], outer: 'rice' },
};

function SashimiFan({ x, y, fish, n = 4, s = 1 }) {
  const [a, b] = FISH[fish] || FISH.salmon;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[...Array(n)].map((_, i) => (
        <g key={i} transform={`translate(${i * 10 - n * 5} ${-i * 2}) rotate(${-12 + i * 4})`}>
          <rect x="-14" y="-10" width="28" height="22" rx="6" fill={a} stroke="#00000014" />
          <path d="M-8 -8 q4 8 0 18 M2 -8 q4 8 0 18" stroke={b} strokeWidth="2" fill="none" />
        </g>
      ))}
    </g>
  );
}

const DRINK = {
  water: { kind: 'glass', liquid: '#cfe8f7' },
  sparkling: { kind: 'glass', liquid: '#d7eef9', bubbles: true },
  apple: { kind: 'glass', liquid: '#f2c94c' },
  orange: { kind: 'glass', liquid: '#f59e0b' },
  pineapple: { kind: 'glass', liquid: '#f7d65a' },
  tonic: { kind: 'glass', liquid: '#e8f3f8', bubbles: true, lime: true },
  lemonade: { kind: 'glass', liquid: '#f4f1c9', bubbles: true, lemon: true },
  cola: { kind: 'can', body: '#c8202b', band: '#fff' },
  dietcola: { kind: 'can', body: '#d4d6db', band: '#c8202b' },
  zerocola: { kind: 'can', body: '#18181b', band: '#c8202b' },
  'bottle-still': { kind: 'bottle', body: '#9cc9e8', cap: '#1d4ed8' },
  'bottle-sparkling': { kind: 'bottle', body: '#a8d5c0', cap: '#15803d' },
  ramune: { kind: 'ramune' },
};

const BEER = {
  asahi0: { label: '#d4d6db', band: '#1d4ed8', text: '0.0%' },
  orion: { label: '#f8fafc', band: '#1e3a8a', text: '' },
  asahi: { label: '#d4d6db', band: '#18181b', text: '' },
  sapporo: { label: '#18181b', band: '#c9a45c', text: '' },
  kirin: { label: '#f5e6b8', band: '#b91c1c', text: '' },
};

function Drink({ v }) {
  const d = DRINK[v] || DRINK.water;
  if (d.kind === 'can') {
    return (
      <>
        <ellipse cx="100" cy="132" rx="40" ry="8" fill="#000" opacity="0.18" />
        <rect x="74" y="34" width="52" height="96" rx="8" fill={d.body} />
        <rect x="74" y="70" width="52" height="16" fill={d.band} opacity="0.9" />
        <ellipse cx="100" cy="36" rx="26" ry="6" fill="#d4d4d8" />
        <rect x="80" y="40" width="6" height="84" rx="3" fill="#fff" opacity="0.18" />
      </>
    );
  }
  if (d.kind === 'bottle') {
    return (
      <>
        <ellipse cx="100" cy="134" rx="34" ry="7" fill="#000" opacity="0.18" />
        <path d="M88 20 H112 V44 Q126 52 126 70 V128 Q126 134 120 134 H80 Q74 134 74 128 V70 Q74 52 88 44 Z" fill={d.body} opacity="0.9" />
        <rect x="88" y="12" width="24" height="12" rx="3" fill={d.cap} />
        <rect x="74" y="80" width="52" height="26" fill="#fff" opacity="0.65" />
        <rect x="80" y="54" width="5" height="70" rx="2.5" fill="#fff" opacity="0.35" />
      </>
    );
  }
  if (d.kind === 'ramune') {
    return (
      <>
        <ellipse cx="100" cy="134" rx="30" ry="6" fill="#000" opacity="0.18" />
        <path d="M90 14 H110 V30 Q120 40 112 52 Q124 60 124 76 V128 Q124 134 118 134 H82 Q76 134 76 128 V76 Q76 60 88 52 Q80 40 90 30 Z" fill="#9bd7f0" opacity="0.85" />
        <circle cx="100" cy="44" r="7" fill="#e0f2fe" stroke="#7cc4e4" />
        <rect x="90" y="8" width="20" height="8" rx="3" fill="#ec4899" />
        <rect x="76" y="86" width="48" height="22" fill="#fff" opacity="0.7" />
        <path d="M84 97 q8 -6 16 0 t16 0" stroke="#0ea5e9" strokeWidth="2.4" fill="none" />
      </>
    );
  }
  return (
    <>
      <ellipse cx="100" cy="134" rx="36" ry="7" fill="#000" opacity="0.18" />
      <path d="M70 30 H130 L124 128 Q123 134 116 134 H84 Q77 134 76 128 Z" fill="#e8f4fb" opacity="0.55" />
      <path d="M73 56 H127 L123 126 Q122 130 116 130 H84 Q78 130 77 126 Z" fill={d.liquid} />
      <ellipse cx="100" cy="56" rx="27" ry="4" fill="#fff" opacity="0.45" />
      {[...Array(4)].map((_, i) => <rect key={i} x={84 + i * 9} y={64 + (i % 2) * 10} width="10" height="10" rx="2" fill="#fff" opacity="0.35" transform={`rotate(${i * 15} ${89 + i * 9} ${69})`} />)}
      {d.bubbles && [...Array(9)].map((_, i) => <circle key={i} cx={82 + ((i * 13) % 36)} cy={70 + ((i * 17) % 52)} r="1.8" fill="#fff" opacity="0.8" />)}
      {d.lemon && <Lemon x={124} y={40} r={14} />}
      {d.lime && <circle cx="124" cy="36" r="12" fill="#84cc16" stroke="#d9f99d" strokeWidth="3" />}
      <rect x="78" y="34" width="5" height="90" rx="2.5" fill="#fff" opacity="0.4" />
    </>
  );
}

const ART = {
  nigiri: (v) => (
    <>
      <Plate />
      <Nigiri x={72} y={96} fish={v} />
      <Nigiri x={128} y={100} fish={v} />
      <Wasabi x={164} y={112} />
      <Ginger x={40} y={116} />
    </>
  ),
  gunkan: (v) => (
    <>
      <Plate />
      <Gunkan x={76} y={100} top={v} />
      <Gunkan x={126} y={104} top={v} />
      <Wasabi x={164} y={112} />
    </>
  ),
  maki: (v) => (
    <>
      <Plate />
      {[[56, 92], [92, 86], [128, 92], [74, 112], [110, 114], [146, 112]].map(([x, y], i) => (
        <RollSlice key={i} x={x} y={y} r={15} outer="nori" fillings={MAKI_FILL[v] || ['#4d9b3a']} />
      ))}
      <Ginger x={168} y={94} />
    </>
  ),
  uramaki: (v) => (
    <>
      <Plate rx={92} ry={32} cy={102} />
      {rollRow(URA[v] || URA.california)}
      {(v === 'dragon' || v === 'rainbow' || v === 'spicytuna' || v === 'spicysalmon') && (
        <path d="M30 80 q15 -8 30 0 t30 0 t30 0 t30 0" stroke={v === 'dragon' ? '#5a2d12' : '#fde7c7'} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
    </>
  ),
  futomaki: (v) => {
    const outer = v === 'fuji' ? 'tempura' : v === 'spider' ? 'nori' : 'nori';
    const f = v === 'nori' ? ['#f7cc4a', '#9a6a3a', '#fffaf0', '#e8935f'] : v === 'fuji' ? ['#f8a27e', '#f7cc4a', '#1e2a23'] : ['#d98a3d', '#a3c95b', '#f2a7a0'];
    return (
      <>
        <Plate />
        {[[62, 94], [106, 90], [150, 96], [84, 116], [128, 116]].map(([x, y], i) => (
          <RollSlice key={i} x={x} y={y} r={19} outer={outer} fillings={f} />
        ))}
        {v === 'spider' && <path d="M140 80 l18 -14 M146 84 l20 -8 M60 80 l-16 -14" stroke="#c8692d" strokeWidth="4" strokeLinecap="round" />}
      </>
    );
  },
  temaki: (v) => {
    const fill = { veg: ['#4d9b3a', '#a3c95b', '#86efac'], avocado: ['#a3c95b'], prawn: ['#e8b155', '#a3c95b'], salmon: ['#f7875a', '#a3c95b'], eel: ['#6e3b1e', '#4d9b3a'], tuna: ['#c62a3c', '#4d9b3a'] }[v] || ['#4d9b3a'];
    return (
      <>
        <Plate />
        <g transform="translate(100 100) rotate(-28)">
          <path d="M-8 44 L-38 -24 Q0 -40 38 -24 Z" fill={NORI} />
          <ellipse cx="0" cy="-26" rx="38" ry="12" fill={RICE} />
          {fill.map((c, i) => <ellipse key={i} cx={-16 + i * 14} cy={-32 - (i % 2) * 4} rx="9" ry="7" fill={c} />)}
          {v === 'prawn' && <path d="M18 -40 l12 -16 l2 14 Z" fill="#e2553a" />}
          {v === 'veg' && <path d="M-20 -36 q4 -12 12 -14 M-4 -38 q2 -12 10 -16" stroke={LEAF} strokeWidth="4" fill="none" strokeLinecap="round" />}
          <path d="M-30 -8 L30 -8" stroke={NORI_2} strokeWidth="2" />
        </g>
      </>
    );
  },
  sashimi: (v) => {
    const groups = {
      saba: ['saba'], salmon: ['salmon'], seabass: ['seabass'], tuna: ['tuna'],
      mix: ['salmon', 'tuna', 'seabass', 'soyasalmon', 'saba'],
      delux: ['salmon', 'tuna', 'yellowtail', 'saba', 'seabass', 'soyasalmon'],
    }[v] || ['salmon'];
    if (groups.length === 1) {
      return (
        <>
          <Plate color="#24242a" />
          <Daikon x={72} y={92} />
          <Shiso x={96} y={98} />
          <SashimiFan x={110} y={100} fish={groups[0]} n={5} />
          <Wasabi x={160} y={114} />
          <Lemon x={44} y={112} r={10} />
        </>
      );
    }
    return (
      <>
        <Board y={86} />
        <Daikon x={100} y={84} />
        {groups.map((g, i) => (
          <SashimiFan key={g} x={38 + (i % 3) * 62 + (i > 2 ? 30 : 0)} y={i > 2 ? 104 : 84} fish={g} n={3} s={0.8} />
        ))}
        {v === 'delux' && (
          <g>
            <circle cx="170" cy="96" r="8" fill={FISH.scallop[0]} />
            <circle cx="160" cy="104" r="8" fill={FISH.scallop[0]} />
          </g>
        )}
        <Shiso x={30} y={104} s={0.7} />
      </>
    );
  },
  chirashi: () => (
    <>
      <Lacquer top={62} w={150} h={66} fill={RICE} />
      <SashimiFan x={68} y={60} fish="salmon" n={2} s={0.7} />
      <SashimiFan x={104} y={56} fish="tuna" n={2} s={0.7} />
      <rect x="120" y="56" width="20" height="9" rx="2" fill={FISH.tamago[0]} />
      <ellipse cx="88" cy="70" rx="10" ry="5" fill="#a3c95b" />
      <circle cx="134" cy="70" r="6" fill="#f2671f" />
      <path d="M50 64 q6 -6 12 0" stroke="#3f8f3a" strokeWidth="3" fill="none" />
      <Shiso x={150} y={58} s={0.5} />
    </>
  ),
  edamame: () => (
    <>
      <Bowl top={70} w={130} h={54} body="#2b2b31" pattern={null} inner="#3a3a42" />
      {[...Array(9)].map((_, i) => (
        <g key={i} transform={`translate(${52 + (i % 5) * 22} ${62 + Math.floor(i / 5) * 12}) rotate(${(i * 37) % 60 - 30})`}>
          <path d="M-14 0 Q-14 -7 -7 -7 Q0 -4 7 -7 Q14 -7 14 0 Q14 6 7 5 Q0 3 -7 5 Q-14 6 -14 0 Z" fill="#6bb33f" />
          <circle cx="-6" cy="-1" r="2.4" fill="#86c95a" />
          <circle cx="2" cy="-1" r="2.4" fill="#86c95a" />
        </g>
      ))}
      <Scallion cx={100} cy={58} n={5} spread={50} />
    </>
  ),
  springroll: () => (
    <>
      <Plate />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${70 + i * 26} ${96 - i * 4}) rotate(-24)`}>
          <rect x="-36" y="-9" width="72" height="18" rx="9" fill="#d99a3e" />
          <path d="M-24 -9 l8 18 M-6 -9 l8 18 M12 -9 l8 18" stroke="#c4862c" strokeWidth="2" />
          <ellipse cx="36" cy="0" rx="4" ry="9" fill="#f0c27a" />
        </g>
      ))}
      <ellipse cx="160" cy="112" rx="14" ry="7" fill="#c2410c" />
    </>
  ),
  gyoza: () => (
    <>
      <Plate />
      {[0, 1, 2, 3, 4].map((i) => <Gyoza key={i} x={50 + i * 25} y={100 - (i % 2) * 4} />)}
      <ellipse cx="170" cy="116" rx="12" ry="6" fill="#3b2412" />
    </>
  ),
  croquette: () => (
    <>
      <Plate />
      <path d="M40 104 q10 -10 22 -2 q8 -10 20 0" stroke="#bbe08a" strokeWidth="4" fill="none" />
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${92 + i * 40} ${98 - i * 4})`}>
          <ellipse rx="26" ry="16" fill="#c9852f" />
          {[...Array(14)].map((_, j) => <circle key={j} cx={((j * 13) % 40) - 20} cy={((j * 7) % 22) - 11} r="1.8" fill="#e8b155" />)}
        </g>
      ))}
      <path d="M100 86 q14 -6 30 0" stroke="#5a2d12" strokeWidth="3" fill="none" />
    </>
  ),
  agedashi: () => (
    <>
      <Bowl top={66} w={136} h={58} body="#2b2b31" pattern={null} inner="#3a3a42" fill="#a7652d" />
      {[[80, 62], [106, 58], [120, 70], [92, 74]].map(([x, y], i) => (
        <rect key={i} x={x - 11} y={y - 9} width="22" height="17" rx="4" fill="#e3a54c" />
      ))}
      <ellipse cx="100" cy="56" rx="9" ry="5" fill="#fff" />
      <Scallion cx={100} cy={52} n={4} spread={20} />
    </>
  ),
  eggplant: () => (
    <>
      <Plate rx={86} ry={32} />
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${80 + i * 46} ${98 - i * 6}) rotate(-8)`}>
          <path d="M-34 4 Q-34 -14 0 -14 Q34 -14 36 2 Q30 12 0 12 Q-30 12 -34 4 Z" fill="#4c1d55" />
          <path d="M-30 0 Q-28 -10 0 -10 Q28 -10 32 0 Q24 6 0 6 Q-26 6 -30 0 Z" fill="#a85d22" />
          {[...Array(6)].map((_, j) => <ellipse key={j} cx={-18 + j * 7} cy={-3 + (j % 2) * 3} rx="1.6" ry="1" fill={SESAME} />)}
        </g>
      ))}
    </>
  ),
  greens: (v) => (
    <>
      <Plate />
      {v === 'bokchoy'
        ? [0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${70 + i * 30} ${100 - (i % 2) * 6}) rotate(${-30 + i * 25})`}>
              <path d="M0 18 Q-8 0 -4 -16 Q4 -24 10 -14 Q14 2 6 18 Z" fill="#2f7d32" />
              <path d="M2 18 Q-2 4 2 -6" stroke="#c7e8a6" strokeWidth="6" strokeLinecap="round" />
            </g>
          ))
        : (
          <>
            <Bits cx={100} cy={98} w={110} colors={['#f97316', '#16a34a', '#facc15', '#dc2626', '#86efac']} n={26} />
            {[60, 96, 132].map((x, i) => <path key={i} d={`M${x} 98 q10 -14 22 -4`} stroke="#4d9b3a" strokeWidth="6" fill="none" strokeLinecap="round" />)}
          </>
        )}
      <path d="M44 112 q30 6 60 2" stroke="#7c2d12" strokeOpacity="0.4" strokeWidth="3" fill="none" />
    </>
  ),
  yakitori: () => (
    <>
      <Plate rx={90} ry={30} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${100} ${90 + i * 10}) rotate(-6)`}>
          <rect x="-70" y="-1.5" width="140" height="3" rx="1.5" fill="#c9a36b" />
          {[-44, -20, 4, 28].map((x, j) => (
            <rect key={x} x={x} y="-8" width="20" height="16" rx="6" fill={j % 2 && i === 1 ? '#6aa84f' : '#9c4f1c'} />
          ))}
        </g>
      ))}
    </>
  ),
  karaage: () => (
    <>
      <Plate />
      <path d="M40 100 q10 -16 26 -8 q4 -12 18 -4" fill="#a3d977" />
      {[[86, 100], [110, 94], [132, 102], [100, 112], [124, 116], [74, 114]].map(([x, y], i) => <Karaage key={i} x={x} y={y} s={1.15} />)}
      <Lemon x={160} y={96} r={12} />
    </>
  ),
  tempura: (v) => {
    const pieces = {
      prawn: [['p', 70, 98, -10], ['p', 106, 92, -6], ['p', 130, 106, -14]],
      squid: [['r', 70, 100], ['r', 100, 94], ['r', 128, 104], ['r', 88, 114]],
      veg: [['v', 70, 100, '#f59e0b'], ['v', 104, 94, '#7e22ce'], ['b', 132, 104], ['v', 92, 116, '#16a34a']],
      mixed: [['p', 76, 96, -10], ['r', 118, 92], ['v', 138, 110, '#7e22ce'], ['b', 96, 114]],
    }[v] || [];
    return (
      <>
        <Plate color="#2a2420" />
        <path d="M44 86 h112" stroke="#f3e9d2" strokeWidth="10" strokeLinecap="round" opacity="0.6" />
        {pieces.map((p, i) => {
          if (p[0] === 'p') return <Tempura key={i} x={p[1]} y={p[2]} rot={p[3]} s={0.9} />;
          if (p[0] === 'r') return <ellipse key={i} cx={p[1]} cy={p[2]} rx="16" ry="10" fill="none" stroke="#e8b155" strokeWidth="7" />;
          if (p[0] === 'b') return <g key={i}><circle cx={p[1]} cy={p[2]} r="13" fill="#e8b155" /><circle cx={p[1] - 4} cy={p[2] - 4} r="6" fill="#4d7c0f" opacity="0.6" /></g>;
          return <g key={i}><ellipse cx={p[1]} cy={p[2]} rx="16" ry="11" fill="#e8b155" /><ellipse cx={p[1]} cy={p[2]} rx="11" ry="7" fill={p[3]} opacity="0.55" /></g>;
        })}
        <ellipse cx="164" cy="116" rx="12" ry="6" fill="#7c4a1e" />
      </>
    );
  },
  ebifry: () => (
    <>
      <Plate />
      <path d="M40 104 q16 -18 34 -6 q10 -10 22 0" fill="#c7e8a6" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${96 + i * 20} ${100 - i * 6}) rotate(-24)`}>
          <path d="M-30 6 Q-34 -8 -10 -10 Q20 -12 28 -2 Q22 10 -6 10 Q-26 12 -30 6 Z" fill="#c4802c" />
          {[...Array(9)].map((_, j) => <circle key={j} cx={-24 + j * 6} cy={-4 + (j % 3) * 4} r="1.8" fill="#e8b155" />)}
          <path d="M28 -2 l14 -12 l-2 14 Z" fill="#e2553a" />
        </g>
      ))}
      <Lemon x={160} y={116} r={11} />
    </>
  ),
  platter: () => (
    <>
      <Board y={88} />
      <Gyoza x={46} y={88} s={0.8} />
      <Gyoza x={72} y={92} s={0.8} />
      <g transform="translate(108 86) rotate(-20)"><rect x="-26" y="-7" width="52" height="14" rx="7" fill="#d99a3e" /></g>
      <ellipse cx="146" cy="90" rx="16" ry="11" fill="#c9852f" />
      <Tempura x={96} y={106} rot={-6} s={0.7} />
      {[...Array(4)].map((_, i) => <path key={i} d={`M${140 + i * 9} ${108} q5 -5 9 0`} stroke="#6bb33f" strokeWidth="5" fill="none" strokeLinecap="round" />)}
    </>
  ),
  salad: (v) => (
    <>
      <Bowl top={70} w={140} h={54} body="#f4f1ea" pattern="#5a8f3a" inner="#fffaf2" />
      {v === 'seaweed' ? (
        <g stroke="#3ccf4e" strokeWidth="3.4" fill="none" strokeLinecap="round">
          {[...Array(12)].map((_, i) => <path key={i} d={`M${50 + i * 9} 72 q4 -16 ${10 - (i % 3) * 6} -24`} />)}
        </g>
      ) : (
        [...Array(9)].map((_, i) => (
          <path key={i} d={`M${48 + i * 12} 70 q6 -18 16 -12 q-2 10 -16 12 Z`} fill={i % 2 ? '#65a30d' : '#84cc16'} />
        ))
      )}
      {['salmon', 'beef', 'tuna'].includes(v) &&
        [0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${76 + i * 24} ${54 - (i % 2) * 4}) rotate(${-10 + i * 8})`}>
            <rect x="-12" y="-7" width="24" height="15" rx="4" fill={v === 'beef' ? '#9b4a3a' : v === 'tuna' ? '#c62a3c' : '#f7875a'} />
            <rect x="-12" y="-7" width="24" height="4" rx="2" fill={v === 'beef' ? '#4a2318' : '#5e3018'} />
          </g>
        ))}
      {[...Array(10)].map((_, i) => <ellipse key={i} cx={60 + i * 9} cy={64 + (i % 3) * 3} rx="1.6" ry="1" fill={SESAME} />)}
    </>
  ),
  soup: (v) => (
    <>
      <Lacquer top={62} w={140} h={66} fill={v === 'seaweed' ? '#8fa860' : '#c08442'} />
      {v === 'seaweed' ? (
        <>
          <ellipse cx="100" cy="62" rx="20" ry="12" fill="#fff" />
          <circle cx="100" cy="62" r="7" fill="#f59e0b" />
          <path d="M56 66 q8 -8 16 0 M128 66 q8 -8 16 0" stroke="#1f4d1c" strokeWidth="4" fill="none" />
        </>
      ) : (
        <>
          {[[78, 60], [104, 66], [122, 58]].map(([x, y], i) => <rect key={i} x={x} y={y} width="11" height="9" rx="2" fill="#fff8e6" />)}
          <path d="M60 64 q6 -6 12 0 M136 62 q6 -6 12 0" stroke="#1f4d1c" strokeWidth="4" fill="none" />
        </>
      )}
      <Scallion cx={100} cy={56} n={5} spread={40} />
    </>
  ),
  ramen: (v) => {
    const broth = { miso: '#d9a35a', soya: '#8a5a2b', kimchi: '#d4502a', veg: '#d9a35a', vegclear: '#e7cf96' }[v] || '#d9a35a';
    const veg = v === 'veg' || v === 'vegclear';
    return (
      <>
        <Bowl top={62} w={160} h={70} fill={broth} />
        <Noodles cx={100} cy={66} w={110} color="#f6e6a8" thick={3.5} rows={3} />
        <rect x="128" y="34" width="22" height="34" rx="2" fill={NORI} transform="rotate(12 139 51)" />
        {veg ? (
          <>
            <Gyoza x={78} y={60} s={0.6} />
            <Gyoza x={98} y={56} s={0.6} />
            <rect x="110" y="58" width="12" height="10" rx="2" fill="#fff8e6" />
          </>
        ) : (
          <>
            <EggHalf x={80} y={60} />
            <ellipse cx="106" cy="58" rx="14" ry="8" fill="#f1d3b5" />
            <path d="M96 58 h20" stroke="#c9906a" strokeWidth="2" />
            {v === 'kimchi' && <Gyoza x={64} y={66} s={0.55} />}
          </>
        )}
        <path d="M54 70 q5 -10 10 0 M60 72 q5 -10 10 0" stroke="#fefce8" strokeWidth="2.4" fill="none" />
        <Scallion cx={118} cy={72} n={5} spread={26} />
        <Chopsticks x={40} y={20} rot={14} />
      </>
    );
  },
  noodlesoup: (v) => {
    const soba = v?.includes('soba');
    const tempura = v?.includes('tempura');
    return (
      <>
        <Bowl top={62} w={160} h={70} body="#f4f1ea" pattern="#2c5aa0" fill="#c99a5a" />
        <Noodles cx={100} cy={66} w={110} color={soba ? '#8b6b4a' : '#fbf3dc'} thick={soba ? 3 : 6} rows={3} />
        {tempura ? (
          <>
            <Tempura x={84} y={54} rot={-30} s={0.75} />
            <Tempura x={116} y={56} rot={-18} s={0.75} />
          </>
        ) : (
          <>
            <path d="M74 54 L104 50 L98 70 Z" fill="#d9963d" />
            <path d="M106 52 L134 56 L118 72 Z" fill="#e3a54c" />
          </>
        )}
        <Naruto x={140} y={70} />
        <Scallion cx={70} cy={72} n={4} spread={18} />
      </>
    );
  },
  curry: (v) => (
    <>
      <Plate rx={92} ry={36} color="#f4f1ea" rim="#dcd5c8" />
      <Rice cx={66} cy={98} rx={34} ry={18} />
      <path d="M92 86 Q150 76 170 98 Q160 122 100 120 Q86 108 92 86 Z" fill="#8a5222" />
      {[[120, 98, '#f97316'], [140, 108, '#fbbf24'], [110, 112, '#f97316']].map(([x, y, c], i) => <rect key={i} x={x} y={y} width="9" height="8" rx="2" fill={c} />)}
      {v === 'croquette' ? (
        [0, 1, 2].map((i) => <ellipse key={i} cx={98 + i * 22} cy={92 + (i % 2) * 6} rx="14" ry="10" fill="#c9852f" />)
      ) : v === 'prawn' ? (
        [0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${104 + i * 18} ${94 - i * 3}) rotate(-30)`}>
            <path d="M-22 4 Q-24 -8 -6 -8 Q16 -10 20 0 Q16 8 -4 8 Q-18 10 -22 4 Z" fill="#c4802c" />
            <path d="M20 0 l10 -8 l-2 10 Z" fill="#e2553a" />
          </g>
        ))
      ) : (
        <Cutlet x={124} y={92} w={80} slices={6} />
      )}
      <ellipse cx="54" cy="116" rx="10" ry="5" fill="#dc2626" />
    </>
  ),
  friedrice: (v) => (
    <>
      <Plate color={v === 'kids' ? '#fde68a' : '#2a2a31'} rim={v === 'kids' ? '#f59e0b' : '#3a3a43'} />
      <path d="M40 104 Q42 64 100 62 Q158 64 160 104 Q100 116 40 104 Z" fill="#f3dc9b" />
      <Bits cx={100} cy={88} w={100} colors={['#f97316', '#65a30d', '#facc15', '#fef3c7']} n={30} seed={3} />
      {v === 'chicken' || v === 'kids' ? <Bits cx={100} cy={80} w={70} colors={['#f1d3b5', '#e8c19c']} n={8} seed={5} /> : null}
      {v === 'seafood' && [0, 1, 2].map((i) => <path key={i} d={`M${74 + i * 22} ${84 - (i % 2) * 6} q8 -8 14 0 q-6 4 -14 0`} fill="#f8a27e" stroke="#e2553a" />)}
      {v === 'egg' && <Bits cx={100} cy={84} w={80} colors={['#fde047']} n={10} seed={7} />}
      {v === 'kids' && (
        <g>
          <path d="M100 62 V36" stroke="#8a5a30" strokeWidth="2.4" />
          <path d="M100 36 h22 l-6 6 l6 6 h-22 Z" fill="#b5121b" />
        </g>
      )}
    </>
  ),
  mabo: () => (
    <>
      <Bowl top={64} w={150} h={64} body="#1b1515" pattern={null} inner="#3a2a22" fill="#b6352a" />
      {[[70, 60], [92, 66], [112, 58], [128, 68], [84, 54]].map(([x, y], i) => <rect key={i} x={x} y={y} width="13" height="11" rx="2" fill="#fbf3e2" />)}
      <path d="M60 70 q10 -6 18 0 M120 56 q8 -6 16 0" stroke="#4c1d55" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Scallion cx={100} cy={60} n={5} spread={40} />
    </>
  ),
  grill: (v) => (
    <>
      <Plate rx={94} ry={36} />
      {v === 'mackerel' ? (
        <g transform="translate(92 98) rotate(-6)">
          <path d="M-46 0 Q-40 -16 0 -16 Q40 -16 50 0 Q40 14 0 14 Q-40 14 -46 0 Z" fill="#94a3b8" />
          <path d="M-40 -2 Q0 -12 44 -2" stroke="#475569" strokeWidth="3" fill="none" />
          {[-24, -8, 8, 24].map((x) => <path key={x} d={`M${x} -12 l8 22`} stroke="#3b2412" strokeWidth="3" opacity="0.6" />)}
        </g>
      ) : (
        <g transform="translate(92 98)">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${-40 + i * 18} ${-i * 2}) rotate(-10)`}>
              <rect x="-8" y="-12" width="16" height="24" rx="4" fill="#5e2a17" />
              <rect x="-5" y="-9" width="10" height="18" rx="3" fill="#c25a4a" />
            </g>
          ))}
          <path d="M-46 -14 q20 -8 44 -4 q20 4 44 -2" stroke="#3b1a0c" strokeWidth="3" fill="none" opacity="0.7" />
        </g>
      )}
      <Lemon x={56} y={118} r={9} />
      <MisoCup x={168} y={72} />
    </>
  ),
  bento: (v) => {
    const protein = {
      veg: () => [0, 1].map((i) => <ellipse key={i} cx={64 + i * 22} cy={74} rx="14" ry="10" fill="#c9852f" />),
      karaage: () => [[58, 74], [80, 70], [70, 86], [92, 84]].map(([x, y], i) => <Karaage key={i} x={x} y={y} s={0.85} />),
      katsu: () => <Cutlet x={76} y={78} w={58} slices={5} />,
      teriyaki: () => (
        <g>
          {[0, 1, 2, 3].map((i) => <rect key={i} x={52 + i * 15} y={70 - (i % 2) * 3} width="13" height="18" rx="4" fill="#8a4518" />)}
          <path d="M50 70 q30 -8 60 0" stroke="#3b1a0c" strokeWidth="2" fill="none" />
        </g>
      ),
      salmon: () => (
        <g transform="translate(78 78) rotate(-8)">
          <path d="M-28 0 Q-24 -12 0 -12 Q26 -12 30 0 Q24 12 0 12 Q-24 12 -28 0 Z" fill="#e2703f" />
          <path d="M-20 -6 l40 0 M-22 2 l44 0" stroke="#9a3b16" strokeWidth="2" opacity="0.6" />
        </g>
      ),
      steak: () => [0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${56 + i * 14} ${78 - i * 2}) rotate(-10)`}>
          <rect x="-6" y="-12" width="12" height="24" rx="3" fill="#5e2a17" />
          <rect x="-4" y="-9" width="8" height="18" rx="2" fill="#c25a4a" />
        </g>
      )),
      sushi: () => (
        <g>
          <Nigiri x={64} y={74} fish="salmon" s={0.55} />
          <Nigiri x={94} y={74} fish="tuna" s={0.55} />
          <RollSlice x={62} y={92} r={10} outer="roe" fillings={['#f2a7a0', '#a3c95b']} />
          <RollSlice x={86} y={92} r={10} outer="roe" fillings={['#f2a7a0', '#a3c95b']} />
        </g>
      ),
    }[v] || (() => null);
    return (
      <>
        <rect x="18" y="44" width="148" height="88" rx="8" fill="#000" opacity="0.2" transform="translate(4 6)" />
        <rect x="18" y="44" width="148" height="88" rx="8" fill="#141110" />
        <rect x="24" y="50" width="136" height="76" rx="4" fill="#9c1a1f" />
        <rect x="28" y="54" width="82" height="42" rx="3" fill="#1a1414" />
        <rect x="114" y="54" width="42" height="42" rx="3" fill="#1a1414" />
        <rect x="28" y="100" width="62" height="22" rx="3" fill="#1a1414" />
        <rect x="94" y="100" width="62" height="22" rx="3" fill="#1a1414" />
        {protein()}
        <Rice cx={135} cy={75} rx={17} ry={16} />
        <circle cx="135" cy="72" r="4" fill="#b91c1c" />
        {[...Array(6)].map((_, i) => <path key={i} d={`M${34 + i * 9} 112 q4 -8 9 0`} fill="#65a30d" />)}
        <rect x="104" y="106" width="16" height="10" rx="2" fill="#facc15" />
        <rect x="124" y="106" width="16" height="10" rx="2" fill="#f9a8d4" />
        <MisoCup x={176} y={54} s={0.32} />
      </>
    );
  },
  donburi: (v) => (
    <>
      {v === 'unaju' ? (
        <>
          <rect x="22" y="56" width="156" height="72" rx="8" fill="#141110" />
          <rect x="28" y="60" width="144" height="40" rx="4" fill={RICE} />
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${66 + i * 68} 78)`}>
              <path d="M-32 0 Q-30 -14 0 -14 Q30 -14 32 0 Q30 12 0 12 Q-30 12 -32 0 Z" fill="#6e3b1e" />
              <path d="M-26 -4 l52 0 M-24 4 l48 0" stroke="#3a1c0c" strokeWidth="2.4" />
              <path d="M-20 -8 q10 -4 20 0" stroke="#c87a3a" strokeWidth="2" fill="none" />
            </g>
          ))}
          <path d="M28 100 H172 V122 Q172 128 166 128 H34 Q28 128 28 122 Z" fill="#9c1a1f" />
        </>
      ) : (
        <>
          <Bowl top={62} w={150} h={70} body="#1b1515" pattern={null} inner="#9c1a1f" fill={RICE} />
          {v === 'tendon' ? (
            <>
              <Tempura x={80} y={52} rot={-26} s={0.8} />
              <Tempura x={108} y={48} rot={-14} s={0.8} />
              <Tempura x={128} y={58} rot={-30} s={0.7} />
              <ellipse cx="76" cy="66" rx="13" ry="8" fill="#e8b155" />
            </>
          ) : (
            <>
              <path d="M52 62 Q100 44 148 62 Q100 74 52 62 Z" fill="#fde68a" />
              <Cutlet x={100} y={58} w={84} slices={6} />
              <Scallion cx={100} cy={50} n={5} spread={40} />
            </>
          )}
        </>
      )}
    </>
  ),
  side: (v) => {
    const fill = { rice: RICE, curry: '#8a5222', pickles: '#fef3c7', noodle: '#fbf3dc', wasabipeas: '#e8f1d6', tofu: '#fbf6ea' }[v] || RICE;
    return (
      <>
        <Bowl top={66} w={120} h={56} body="#2b2b31" pattern={null} inner="#3a3a42" fill={fill} />
        {v === 'rice' && <Rice cx={100} cy={62} rx={44} ry={12} />}
        {v === 'curry' && [[86, 62, '#f97316'], [108, 66, '#fbbf24'], [100, 58, '#f97316']].map(([x, y, c], i) => <rect key={i} x={x} y={y} width="9" height="7" rx="2" fill={c} />)}
        {v === 'pickles' && (
          <>
            {[0, 1, 2].map((i) => <ellipse key={i} cx={78 + i * 14} cy={64} rx="9" ry="5" fill="#facc15" />)}
            <Ginger x={124} y={62} />
          </>
        )}
        {v === 'noodle' && <Noodles cx={100} cy={64} w={80} color="#fbf3dc" thick={5} rows={3} />}
        {v === 'wasabipeas' && [...Array(14)].map((_, i) => <circle key={i} cx={66 + (i % 7) * 11} cy={58 + Math.floor(i / 7) * 9} r="5" fill="#a3c95b" stroke="#84a94a" />)}
        {v === 'tofu' && [[78, 58], [96, 62], [114, 58]].map(([x, y], i) => <rect key={i} x={x} y={y} width="16" height="12" rx="2" fill="#fffdf6" stroke="#e7e0cf" />)}
      </>
    );
  },
  dorayaki: (v) => {
    const fill = { redbean: '#6b1d1d', custard: '#fcd34d', greentea: '#a3c26a' }[v] || '#6b1d1d';
    return (
      <>
        <LightPlate />
        <g transform="translate(86 96)">
          <ellipse cx="0" cy="8" rx="40" ry="14" fill="#9a5a24" />
          <ellipse cx="0" cy="4" rx="38" ry="10" fill={fill} />
          <ellipse cx="0" cy="-4" rx="40" ry="14" fill="#b86f2c" />
          <ellipse cx="0" cy="-7" rx="32" ry="9" fill="#cf8a3e" />
        </g>
        <g transform="translate(146 92)">
          <circle r="16" fill="#fff7e6" />
          <path d="M-14 6 q6 6 14 2 q8 4 14 -4" fill="#fff7e6" />
        </g>
      </>
    );
  },
  mochi: (v) => {
    const c = { mango: ['#fcd34d', '#fde68a'], coconut: ['#fafaf9', '#ffffff'], chocolate: ['#7c4a2d', '#9b6b4a'] }[v] || ['#fcd34d', '#fde68a'];
    return (
      <>
        <Plate color="#24242a" />
        {[0, 1].map((i) => (
          <g key={i} transform={`translate(${80 + i * 42} ${92 + i * 4})`}>
            <ellipse cx="0" cy="8" rx="24" ry="8" fill="#000" opacity="0.18" />
            <path d="M-24 6 Q-26 -22 0 -22 Q26 -22 24 6 Q0 14 -24 6 Z" fill={c[0]} />
            <ellipse cx="-8" cy="-10" rx="7" ry="4" fill={c[1]} opacity="0.7" />
            {[...Array(5)].map((_, j) => <circle key={j} cx={-14 + j * 7} cy={-2 + (j % 2) * 4} r="1" fill="#fff" opacity="0.7" />)}
          </g>
        ))}
      </>
    );
  },
  icecream: (v) => {
    const c = { greentea: ['#9cbf6a', '#b6d38a'], blacksesame: ['#4a4547', '#6b6668'], vanilla: ['#f6efd9', '#fffaf0'] }[v] || ['#f6efd9', '#fffaf0'];
    return (
      <>
        <Bowl top={84} w={120} h={40} body="#f4f1ea" pattern="#c9a45c" inner="#fffaf2" />
        <circle cx="86" cy="70" r="20" fill={c[0]} />
        <circle cx="114" cy="66" r="20" fill={c[0]} />
        <ellipse cx="80" cy="62" rx="7" ry="4" fill={c[1]} />
        <ellipse cx="108" cy="58" rx="7" ry="4" fill={c[1]} />
        {v === 'blacksesame' && [...Array(8)].map((_, i) => <circle key={i} cx={78 + i * 6} cy={70 + (i % 2) * 5} r="1" fill="#1f1b1c" />)}
        <path d="M128 40 l-10 34" stroke="#d6a861" strokeWidth="6" strokeLinecap="round" />
      </>
    );
  },
  set: (v) => {
    const s = SET_CONTENT[v] || SET_CONTENT.sushi;
    if (s.rolls) {
      return (
        <>
          <Board y={88} />
          {rollRow(URA.salmonavocado, 3, 84).map((el, i) => <g key={`a${i}`} transform="translate(-8 0)">{el}</g>)}
          {[0, 1, 2].map((i) => <RollSlice key={`b${i}`} x={52 + i * 30} y={106} r={13} outer="roe" fillings={['#d99a3e', '#a3c95b']} />)}
          {[0, 1].map((i) => <RollSlice key={`c${i}`} x={150 + i * 22} y={i ? 104 : 86} r={13} outer="sesame" fillings={['#e8b155', '#f8a27e']} />)}
        </>
      );
    }
    const n = s.n.length;
    return (
      <>
        <Board y={90} />
        {s.n.map((f, i) => (
          <Nigiri key={i} x={38 + i * (n > 4 ? 25 : 30)} y={86} fish={f} s={n > 4 ? 0.62 : 0.7} />
        ))}
        {s.g && <Gunkan x={166} y={86} top="roe" s={0.7} />}
        {s.m && [0, 1, 2, 3].map((i) => (
          <RollSlice key={i} x={130 + (i % 2) * 24 + (n > 4 ? 14 : 0)} y={i < 2 ? 82 : 102} r={11} outer={s.outer || 'nori'} fillings={s.m} />
        ))}
        <Wasabi x={38} y={110} />
        <Ginger x={64} y={112} />
      </>
    );
  },
  stirfry: (v = 'soba-veg') => {
    const [kind, protein] = v.split('-');
    return (
      <>
        <Plate />
        <Noodles cx={100} cy={96} w={120} color={kind === 'udon' ? '#e8c58a' : '#c98b4a'} thick={kind === 'udon' ? 7 : 3.4} rows={kind === 'udon' ? 4 : 6} />
        <Bits cx={100} cy={92} w={110} colors={['#f97316', '#16a34a', '#facc15', '#a3e635']} n={20} seed={2} />
        {protein === 'chicken' && <Bits cx={100} cy={88} w={90} colors={['#f1d3b5', '#e8c19c']} n={10} seed={9} />}
        {protein === 'beef' && <Bits cx={100} cy={88} w={90} colors={['#5e2a17', '#7c3a22']} n={10} seed={9} />}
        {protein === 'seafood' && [0, 1, 2].map((i) => <path key={i} d={`M${70 + i * 26} ${88 - (i % 2) * 6} q8 -8 14 0 q-6 4 -14 0`} fill="#f8a27e" stroke="#e2553a" />)}
        <Chopsticks x={30} y={50} rot={10} />
      </>
    );
  },
  drink: (v) => <Drink v={v} />,
  beer: (v) => {
    const b = BEER[v] || BEER.asahi;
    return (
      <>
        <ellipse cx="100" cy="134" rx="62" ry="8" fill="#000" opacity="0.18" />
        <path d="M58 18 H74 V40 Q86 48 86 64 V128 Q86 134 80 134 H52 Q46 134 46 128 V64 Q46 48 58 40 Z" fill="#7a3e12" opacity="0.92" />
        <rect x="56" y="12" width="20" height="10" rx="2" fill="#c9a45c" />
        <rect x="46" y="76" width="40" height="34" fill={b.label} />
        <rect x="46" y="76" width="40" height="7" fill={b.band} />
        {b.text && <text x="66" y="102" textAnchor="middle" fontSize="10" fontWeight="700" fill={b.band}>{b.text}</text>}
        <path d="M104 52 H150 L146 128 Q145 134 138 134 H116 Q109 134 108 128 Z" fill="#f2b532" />
        <path d="M102 44 Q104 32 116 36 Q124 26 136 34 Q150 30 152 44 Q150 54 104 54 Z" fill="#fffaf0" />
        {[...Array(6)].map((_, i) => <circle key={i} cx={116 + (i % 3) * 10} cy={70 + i * 9} r="1.6" fill="#fff" opacity="0.7" />)}
      </>
    );
  },
  sake: (v) => (
    <>
      <ellipse cx="100" cy="134" rx="56" ry="8" fill="#000" opacity="0.18" />
      <path d={v === '250' ? 'M70 10 H86 V36 Q98 44 98 60 V128 Q98 134 92 134 H64 Q58 134 58 128 V60 Q58 44 70 36 Z' : 'M70 30 H86 V50 Q96 56 96 70 V128 Q96 134 90 134 H66 Q60 134 60 128 V70 Q60 56 70 50 Z'} fill="#8fc3e8" opacity="0.85" />
      <rect x="62" y="84" width="34" height="28" fill="#fff" opacity="0.85" />
      <text x="79" y="103" textAnchor="middle" fontFamily="Shippori Mincho, serif" fontSize="14" fontWeight="800" fill="#1e3a8a">酒</text>
      <path d="M120 86 H156 L152 124 Q151 130 145 130 H131 Q125 130 124 124 Z" fill="#e8f4fb" opacity="0.6" />
      <path d="M122 96 H154 L151 122 Q150 126 145 126 H131 Q126 126 125 122 Z" fill="#eef6ff" />
      {[...Array(6)].map((_, i) => <circle key={i} cx={130 + (i % 3) * 8} cy={102 + i * 3} r="1.4" fill="#93c5fd" />)}
    </>
  ),
};

function DishArt({ art = 'set:sushi', className = '', title, ...rest }) {
  const [type, variant] = String(art).split(':');
  const render = ART[type] || ART.set;
  return (
    <svg
      data-dish-art=""
      viewBox="0 0 200 150"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      preserveAspectRatio="xMidYMid meet"
      {...rest}
    >
      {render(variant)}
    </svg>
  );
}

export default memo(DishArt);
export const DISH_ART_TYPES = Object.keys(ART);
