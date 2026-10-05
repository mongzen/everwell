'use client';
import { useEffect, useRef } from 'react';

const RATES = [
  { label: 'INDIVIDUAL THERAPY', value: '1,500', sub: 'THB · 50 MIN · TELEHEALTH', accent: false },
  { label: 'COUPLES & FAMILY', value: '2,200', sub: 'THB · 60 MIN · TELEHEALTH', accent: false },
  { label: 'INTRO CALL', value: '0', sub: 'THB · 15 MIN · NO OBLIGATION', accent: true },
];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Rates teaser. Final layout = Figma "Rates Reveal / State 3" (always the resting state).
 * When the stack scrolls into view the cards rise in sequence and the digits roll into place.
 */
export default function RatesReveal() {
  const stack = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const reels = useRef<(HTMLSpanElement | null)[][]>([[], [], []]);

  useEffect(() => {
    const el = stack.current!;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = RATES.map((r) => [...r.value].map((ch) => (/\d/.test(ch) ? +ch : -1)));
    const apply = (p: number) => {
      RATES.forEach((_, i) => {
        const c = cards.current[i]; if (!c) return;
        const s = i * 0.22, e = s + 0.5;
        const t = ease(clamp((p - s) / (e - s)));
        c.style.opacity = String(t);
        c.style.transform = `translateY(${(1 - t) * 80}px)`;
        targets[i].forEach((tg, k) => {
          const col = reels.current[i][k]; if (!col || tg < 0) return;
          const roll = ease(clamp((p - s - 0.04 * k) / (e - s)));
          col.style.transform = `translateY(${-(roll * (tg + 10)).toFixed(3)}em)`;
        });
      });
    };
    // size every reel to its final digit so the resting state is the exact Figma text width
    targets.forEach((row, i) => row.forEach((tg, k) => {
      const col = reels.current[i][k]; if (!col || tg < 0) return;
      const w = (col.children[tg + 10] as HTMLElement).getBoundingClientRect().width;
      (col.parentElement as HTMLElement).style.width = `${w}px`;
    }));
    apply(0);
    let raf = 0, started = false;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting || started) return;
      started = true;
      const t0 = performance.now(), D = 2600;
      const tick = (now: number) => { const p = clamp((now - t0) / D); apply(p); if (p < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="rates__stack" ref={stack}>
      <span className="rates__hair rates__hair--1" />
      <span className="rates__hair rates__hair--2" />
      {RATES.map((d, i) => (
        <article key={d.label} className={'rate' + (d.accent ? ' rate--accent' : '')} style={{ ['--i' as string]: i }}
          ref={(n) => { cards.current[i] = n; }}>
          <div className="rate__top"><i /><span>{d.label}</span></div>
          <p className="rate__num" aria-label={`${d.value} baht`}>
            {[...d.value].map((ch, k) => /\d/.test(ch) ? (
              <span className="reel" key={k} aria-hidden="true">
                <span className="reel__col" ref={(n) => { reels.current[i][k] = n; }}>
                  {Array.from({ length: 20 }, (_, n) => <span key={n}>{n % 10}</span>)}
                </span>
              </span>
            ) : <span key={k} className="reel__sep" aria-hidden="true">{ch}</span>)}
          </p>
          <div className="rate__bottom"><span>{d.sub}</span><span className="rate__arrow">→</span></div>
        </article>
      ))}
    </div>
  );
}
