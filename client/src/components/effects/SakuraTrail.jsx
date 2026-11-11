import { useEffect, useRef } from 'react';
import { useMotion } from '../../context/MotionContext';

/**
 * Cherry-blossom petals that drift from the cursor and fade out.
 * Place inside a `relative` container; listens to pointer moves on that container.
 * Desktop pointers only; disabled for reduced motion / paused animations.
 */
export default function SakuraTrail({ density = 1, className = '' }) {
  const canvasRef = useRef(null);
  const { still } = useMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || still) return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const petals = [];
    let raf = 0;
    let last = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = host.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const drawPetal = (p) => {
      ctx.save();
      ctx.translate(p.x * dpr, p.y * dpr);
      ctx.rotate(p.rot);
      ctx.scale(p.size * dpr, p.size * dpr * Math.abs(Math.cos(p.flip)) + 0.2 * dpr);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.bezierCurveTo(0.9, -1, 1.1, 0.4, 0, 1);
      ctx.bezierCurveTo(-1.1, 0.4, -0.9, -1, 0, -1);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = petals.length - 1; i >= 0; i -= 1) {
        const p = petals[i];
        p.vy += 0.02;
        p.x += p.vx + Math.sin(p.t * 0.05) * 0.4;
        p.y += p.vy;
        p.t += 1;
        p.rot += p.vr;
        p.flip += 0.06;
        p.life -= 0.011;
        if (p.life <= 0) petals.splice(i, 1);
        else drawPetal(p);
      }
      raf = petals.length ? requestAnimationFrame(tick) : 0;
    };

    const colors = ['#f4c6cf', '#f9d9df', '#f2aebd', '#fbe4e8'];
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      if (now - last < 45 / density || petals.length > 70) return;
      last = now;
      const r = host.getBoundingClientRect();
      petals.push({
        x: e.clientX - r.left + (Math.random() - 0.5) * 10,
        y: e.clientY - r.top + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.4,
        vy: Math.random() * 0.4 + 0.2,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.08,
        flip: Math.random() * Math.PI,
        size: 4 + Math.random() * 4,
        life: 1,
        t: 0,
        color: colors[(Math.random() * colors.length) | 0],
      });
      if (!raf) raf = requestAnimationFrame(tick);
    };

    host.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      host.removeEventListener('pointermove', onMove);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [still, density]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 z-20 ${className}`} />;
}
