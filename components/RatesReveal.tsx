'use client';
import { useEffect, useRef } from 'react';

const RATES = [
  { label: 'Individual therapy', value: '1,500', sub: 'THB · 50 min · online', accent: false },
  { label: 'Couples & family', value: '2,200', sub: 'THB · 60 min · online', accent: false },
  { label: 'Intro call', value: '0', sub: 'THB · 15 min · no obligation', accent: true },
];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Pinned scroll stage: three rate cards rise in a staircase while their digits roll into place. */
export default function RatesReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const reelRefs = useRef<(HTMLSpanElement | null)[][]>([[], [], []]);

  useEffect(() => {
    const section = sectionRef.current!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, ticking = false;
    const targets = RATES.map((r) => [...r.value].map((ch) => (/\d/.test(ch) ? +ch : -1)));

    const paint = () => {
      ticking = false;
      const r = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = reduce ? 1 : clamp(-r.top / total);
      const narrow = window.innerWidth < 800;
      RATES.forEach((_, i) => {
        const el = cardRefs.current[i]; if (!el) return;
        const start = i * 0.26, end = start + 0.34;
        const t = ease(clamp((p - start) / (end - start)));
        const rise = narrow ? (2 - i) * 70 : (2 - i) * 88;
        el.style.opacity = String(t);
        el.style.transform = `translateY(${(1 - t) * 80 - rise}px)`;
        targets[i].forEach((target, k) => {
          const col = reelRefs.current[i][k]; if (!col || target < 0) return;
          const roll = ease(clamp((p - start - 0.05 * k) / (end - start)));
          col.style.transform = `translateY(${-(roll * (target + 10)).toFixed(3)}em)`;
        });
      });
    };
    const onScroll = () => { if (!ticking) { ticking = true; raf = requestAnimationFrame(paint); } };
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  return (
    <section className="rates" id="fees" ref={sectionRef} aria-labelledby="rates-h">
      <div className="rates-stage">
        <div className="eyebrow">Service fees</div>
        <h2 id="rates-h">Clear, upfront fees.</h2>
        <div className="rates-grid">
          {RATES.map((d, i) => (
            <article key={d.label} ref={(el) => { cardRefs.current[i] = el; }} className={'rate-card' + (d.accent ? ' accent' : '')}
              style={{ ['--i' as string]: i }}>
              <div className="rate-label"><i />{d.label}</div>
              <div className="rate-num" aria-label={`${d.value} baht`}>
                {[...d.value].map((ch, k) =>
                  /\d/.test(ch) ? (
                    <span className="reel" key={k} aria-hidden="true">
                      <span className="reel-col" ref={(el) => { reelRefs.current[i][k] = el; }}>
                        {Array.from({ length: 20 }, (_, n) => <span key={n}>{n % 10}</span>)}
                      </span>
                    </span>
                  ) : <span key={k} className="reel-sep" aria-hidden="true">{ch}</span>
                )}
              </div>
              <div className="rate-sub"><span>{d.sub}</span><span aria-hidden="true">→</span></div>
            </article>
          ))}
        </div>
        <a className="btn btn-dark rates-cta" href="#contact">See service fees</a>
      </div>
    </section>
  );
}
