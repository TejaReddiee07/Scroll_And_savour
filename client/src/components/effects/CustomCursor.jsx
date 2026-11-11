import { useEffect, useRef, useState } from 'react';
import { useMotion } from '../../context/MotionContext';

const INTERACTIVE = 'a, button, [role="button"], [role="tab"], label[for], select, summary';
const TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]';

/**
 * Refined desktop cursor: a precise dot that tracks the pointer exactly, plus a thin ring
 * that follows with a soft lag. Over links the ring grows slightly; over photos a small
 * label ("View") sits beside the pointer instead of covering the image. Text fields keep
 * the native I-beam. Hidden on touch devices, with reduced motion, or when paused.
 */
export default function CustomCursor() {
  const { still } = useMotion();
  const [enabled, setEnabled] = useState(false);
  const dot = useRef(null);
  const ring = useRef(null);
  const tag = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setEnabled(mq.matches && !still);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [still]);

  useEffect(() => {
    if (!enabled) return undefined;
    const html = document.documentElement;
    html.classList.add('has-custom-cursor');
    const pos = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let mode = '';
    let label = '';
    let visible = false;
    let raf = 0;

    const setMode = (m, l = '') => {
      if (m === mode && l === label) return;
      mode = m;
      label = l;
      ring.current.dataset.mode = m;
      dot.current.dataset.mode = m;
      tag.current.dataset.show = l ? '1' : '0';
      if (l) tag.current.textContent = l;
    };

    const onMove = (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        visible = true;
        ringPos.x = pos.x;
        ringPos.y = pos.y;
        html.classList.add('cursor-visible');
      }
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return setMode('');
      if (t.closest(TEXT)) return setMode('text');
      const media = t.closest('[data-cursor]');
      if (media) {
        const v = media.getAttribute('data-cursor');
        return setMode('media', v && v !== 'view' ? v : 'View');
      }
      if (t.closest(INTERACTIVE)) return setMode('link');
      return setMode('');
    };
    const onLeave = () => {
      visible = false;
      html.classList.remove('cursor-visible');
    };
    const onDown = () => html.classList.add('cursor-down');
    const onUp = () => html.classList.remove('cursor-down');

    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.22;
      ringPos.y += (pos.y - ringPos.y) * 0.22;
      dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      tag.current.style.transform = `translate3d(${pos.x + 18}px, ${pos.y + 18}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(raf);
      html.classList.remove('has-custom-cursor', 'cursor-visible', 'cursor-down');
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[10000]">
      <style>{`
        .fc{position:fixed;left:0;top:0;pointer-events:none;opacity:0;transition:opacity .25s}
        html.cursor-visible .fc{opacity:1}
        .fc-dot{width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#fff;mix-blend-mode:difference;
          transition:opacity .25s, width .25s cubic-bezier(.22,1,.36,1), height .25s cubic-bezier(.22,1,.36,1), margin .25s cubic-bezier(.22,1,.36,1)}
        .fc-ring{width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:1px solid rgba(244,233,216,.45);
          transition:opacity .25s, width .35s cubic-bezier(.22,1,.36,1), height .35s cubic-bezier(.22,1,.36,1), margin .35s cubic-bezier(.22,1,.36,1), border-color .3s, background-color .3s}
        .fc-ring[data-mode=link]{width:46px;height:46px;margin:-23px 0 0 -23px;border-color:rgba(240,160,50,.9);background:rgba(240,160,50,.06)}
        .fc-dot[data-mode=link]{width:4px;height:4px;margin:-2px 0 0 -2px}
        .fc-ring[data-mode=media]{width:56px;height:56px;margin:-28px 0 0 -28px;border-color:rgba(255,255,255,.8)}
        html.cursor-visible .fc-ring[data-mode=text], html.cursor-visible .fc-dot[data-mode=text]{opacity:0}
        html.cursor-down .fc-ring{width:26px;height:26px;margin:-13px 0 0 -13px}
        .fc-tag{padding:5px 10px;border-radius:999px;background:rgba(10,7,6,.72);border:1px solid rgba(244,233,216,.18);
          -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);color:#f4e9d8;font:500 10px/1 'DM Mono',ui-monospace,monospace;
          letter-spacing:.16em;text-transform:uppercase;white-space:nowrap;opacity:0;transition:opacity .2s}
        html.cursor-visible .fc-tag[data-show='1']{opacity:1}
        html.cursor-visible .fc-tag[data-show='0']{opacity:0}
        html.has-custom-cursor input, html.has-custom-cursor textarea, html.has-custom-cursor [contenteditable=true]{cursor:text!important}
      `}</style>
      <div ref={ring} className="fc fc-ring" data-mode="" />
      <div ref={dot} className="fc fc-dot" data-mode="" />
      <div ref={tag} className="fc fc-tag" data-show="0" />
    </div>
  );
}
