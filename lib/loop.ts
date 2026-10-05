import { ColorManagement } from 'three';
// Custom shaders output raw sRGB values, so keep hex colours un-converted (matches the Figma palette).
ColorManagement.enabled = false;

/** Shared render-loop helper: runs only while the host is on screen and the tab is visible. */
export function createLoop(host: Element, tick: (t: number) => void) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, running = false, visible = true, start = performance.now();
  const frame = () => {
    if (!running) return;
    tick(reduce ? 0 : (performance.now() - start) / 1000);
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    const should = visible && !document.hidden;
    if (should && !running) { running = true; raf = requestAnimationFrame(frame); }
    if (!should && running) { running = false; cancelAnimationFrame(raf); }
  };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
  io.observe(host);
  document.addEventListener('visibilitychange', sync);
  tick(0); // always paint one frame (static fallback for reduced motion)
  sync();
  return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', sync); };
}
export const dpr = () => Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.5 : 2);
