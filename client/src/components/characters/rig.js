/**
 * Character rig utilities.
 *
 * Every character is a layered SVG whose moving parts (legs, arms, forearms,
 * head, pupils, props) are nested <g> elements drawn around their own pivot
 * at (0,0). Scenes tween a plain "pose" object with GSAP and call poseX()
 * to write the transforms — no transform-origin guesswork, fully deterministic.
 */

export const C = {
  skin: '#f4c7a6',
  skinShade: '#e6aa86',
  skinLine: '#c98463',
  blush: '#f39a9a',
  lip: '#8f3b2e',
  white: '#ffffff',
  lash: '#2a1810',
  // waiter (reference image 1)
  wHair: '#5a3824',
  wHairLight: '#7a4e33',
  wCap: '#1c2029',
  wCapDark: '#11141a',
  wShirt: '#f7f4ee',
  wShirtShade: '#dcd6cc',
  wDress: '#1f2533',
  wDressDark: '#151a25',
  wButton: '#3d4659',
  wTie: '#11131a',
  wIris: '#6b381b',
  legs: '#262833',
  shoe: '#121114',
  // chef (reference image 2)
  cHair: '#6b3f27',
  cHairLight: '#8a5636',
  cIris: '#c98a12',
  cJacket: '#fbfbfa',
  cJacketShade: '#dfe2e7',
  cApron: '#8e959e',
  cApronDark: '#737a84',
  cRed: '#c3222c',
  cHat: '#fdfdfd',
  cHatShade: '#e2e6ec',
  cTrousers: '#33353d',
};

// Write a transform only when it changed (unchanged writes still invalidate style/paint).
const tf = (el, value) => {
  if (el && el.__fujiT !== value) {
    el.__fujiT = value;
    el.setAttribute('transform', value);
  }
};
export const setTransform = tf;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/* ── shared pointer (one listener for the whole app) ─────────────── */
export const pointer = { x: 0, y: 0, moved: false };
if (typeof window !== 'undefined') {
  pointer.x = window.innerWidth / 2;
  pointer.y = window.innerHeight / 3;
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.moved = true;
    },
    { passive: true },
  );
}

/**
 * Pupil offset (in character-local units) so the eyes look at the pointer.
 * `facing` mirrors x when the character is flipped.
 */
export function lookAtPointer(eyeEl, facing = 1, max = 2.4) {
  if (!eyeEl || !pointer.moved) return { lookX: 0, lookY: 0 };
  const r = eyeEl.getBoundingClientRect();
  const dx = pointer.x - (r.left + r.width / 2);
  const dy = pointer.y - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, d / 160);
  return { lookX: (dx / d) * max * k * facing, lookY: (dy / d) * max * 0.8 * k };
}

/** Walk cycle values from a phase (radians) and amplitude 0..1. */
export function walkCycle(phase, amp = 1) {
  const s = Math.sin(phase);
  return {
    legL: s * 24 * amp,
    legR: -s * 24 * amp,
    armBack: 6 - s * 20 * amp,
    bob: -Math.abs(Math.cos(phase)) * 3.5 * amp,
  };
}

/** Idle breathing scale for the upper body. */
export const breathe = (t, speed = 1.6) => 1 + Math.sin(t * speed) * 0.012;

export const WAITER_DEFAULT = {
  x: 0, y: 0, scale: 1, facing: 1, bob: 0,
  legL: 0, legR: 0, lean: 0, breathe: 1, headTilt: 0,
  armBack: 8, foreBack: -12,
  armFront: -18, foreFront: -72, trayTilt: 0,
  lookX: 0, lookY: 0,
};

export function poseWaiter(rig, pose) {
  const R = rig.current;
  if (!R || !R.root) return;
  const p = { ...WAITER_DEFAULT, ...pose };
  tf(R.root, `translate(${p.x} ${p.y}) scale(${p.facing * p.scale} ${p.scale})`);
  tf(R.bob, `translate(0 ${p.bob})`);
  tf(R.legL, `rotate(${p.legL})`);
  tf(R.legR, `rotate(${p.legR})`);
  tf(R.upper, `rotate(${p.lean}) scale(1 ${p.breathe})`);
  tf(R.head, `rotate(${p.headTilt})`);
  tf(R.armBack, `rotate(${p.armBack})`);
  tf(R.foreBack, `rotate(${p.foreBack})`);
  tf(R.armFront, `rotate(${p.armFront})`);
  tf(R.foreFront, `rotate(${p.foreFront})`);
  // keep the tray level whatever the arm is doing
  tf(R.tray, `rotate(${-(p.lean + p.armFront + p.foreFront) + p.trayTilt})`);
  tf(R.pupilL, `translate(${p.lookX} ${p.lookY})`);
  tf(R.pupilR, `translate(${p.lookX} ${p.lookY})`);
}

export const CHEF_DEFAULT = {
  x: 0, y: 0, scale: 1, facing: 1, bob: 0,
  legL: 0, legR: 0, lean: 0, breathe: 1, headTilt: 0,
  armL: 14, foreL: -10, propLTilt: 0,
  armR: -14, foreR: 10, propRTilt: 0,
  lookX: 0, lookY: 0,
};

export function poseChef(rig, pose) {
  const R = rig.current;
  if (!R || !R.root) return;
  const p = { ...CHEF_DEFAULT, ...pose };
  tf(R.root, `translate(${p.x} ${p.y}) scale(${p.facing * p.scale} ${p.scale})`);
  tf(R.bob, `translate(0 ${p.bob})`);
  tf(R.legL, `rotate(${p.legL})`);
  tf(R.legR, `rotate(${p.legR})`);
  tf(R.upper, `rotate(${p.lean}) scale(1 ${p.breathe})`);
  tf(R.head, `rotate(${p.headTilt})`);
  tf(R.armL, `rotate(${p.armL})`);
  tf(R.foreL, `rotate(${p.foreL})`);
  tf(R.propL, `rotate(${-(p.lean + p.armL + p.foreL) + p.propLTilt})`);
  tf(R.armR, `rotate(${p.armR})`);
  tf(R.foreR, `rotate(${p.foreR})`);
  tf(R.propR, `rotate(${-(p.lean + p.armR + p.foreR) + p.propRTilt})`);
  tf(R.pupilL, `translate(${p.lookX} ${p.lookY})`);
  tf(R.pupilR, `translate(${p.lookX} ${p.lookY})`);
}

/* ── tiny 2D affine helpers (SVG matrix order a b c d e f) ─────────── */
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const T = (x, y) => [1, 0, 0, 1, x, y];
const S = (x, y) => [x, 0, 0, y, 0, 0];
const R = (deg) => {
  const r = (deg * Math.PI) / 180;
  return [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
};

/**
 * Where the waiter's tray anchor is, in the coordinate space the waiter is placed in.
 * Pure maths (mirrors the Waiter.jsx structure) — no DOM reads, so no forced layout per frame.
 */
export function waiterTrayAnchor(pose) {
  const p = { ...WAITER_DEFAULT, ...pose };
  const chain = [
    T(p.x, p.y), S(p.facing * p.scale, p.scale), T(0, p.bob), T(0, -176),
    R(p.lean), S(1, p.breathe), T(27, -50), R(p.armFront), T(0, 37), R(p.foreFront), T(0, 32),
    R(-(p.lean + p.armFront + p.foreFront) + p.trayTilt), T(12, -6),
  ];
  const m = chain.reduce(mul);
  return { x: m[4], y: m[5] };
}

/** World-space position of an element's local origin inside a root <svg>. */
export function originIn(svg, el) {
  if (!svg || !el) return { x: 0, y: 0 };
  const m = svg.getScreenCTM().inverse().multiply(el.getScreenCTM());
  return { x: m.e, y: m.f };
}

/** Makes a string safe to use inside url(#…) references. */
export const safeId = (id) => `f${String(id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
