'use client';
import { useEffect, useRef, useState } from 'react';
import { TeamGL } from './Effects';

const TEAM = [
  { name: 'Dr. Natthida Wongsuwan', focus: 'Clinical psychologist · Trauma, anxiety', bio: 'Specialized care for trauma and anxiety, with a calm, steady approach for adults who feel overwhelmed.', photo: 'img_therapist_1.webp', w: 384, offset: false },
  { name: 'Kritsada Chaiyasit', focus: 'Counseling psychologist · Life transitions, burnout', bio: 'Down-to-earth support for adults navigating change, stress and burnout.', photo: 'img_therapist_2.webp', w: 425, offset: true },
  { name: 'Pimchanok Srisuk', focus: 'Counseling psychologist · Teens & families', bio: 'A warm, steady space for teens and the parents who love them.', photo: 'img_therapist_3.webp', w: 425, offset: false },
  { name: 'Siriporn Thongdee', focus: 'Counseling psychologist · Couples, life transitions', bio: 'Warm, practical support for partners and families finding their footing together.', photo: 'img_therapist_4.webp', w: 384, offset: true },
  { name: 'Thanawat Prasert', focus: 'Clinical psychologist · Depression, grief', bio: 'Steady, unhurried sessions for adults moving through loss and low mood.', w: 384, offset: false },
  { name: 'Dr. Napat Rattanakorn', focus: 'Clinical psychologist · Adolescents, anxiety', bio: 'Gentle, collaborative care for teens and the parents who support them.', w: 384, offset: true },
] as const;

export default function TeamSlider() {
  const track = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(1);
  useEffect(() => {
    const view = track.current!, rl = rail.current!, sec = (view.closest('.team') as HTMLElement) ?? view;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let max = 0, x = 0, target = 0, raf = 0, last = 0, shown = 1;

    const measure = () => {
      const pr = parseFloat(getComputedStyle(view).paddingRight) || 0;
      max = Math.max(0, rl.scrollWidth - (view.clientWidth - pr));
      target = Math.min(target, max); x = Math.min(x, max); paint();
    };
    const paint = () => {
      rl.style.transform = `translate3d(${-x}px,0,0)`;
      const p = max > 0 ? x / max : 0;
      if (bar.current) bar.current.style.transform = `translateX(${p * 525}%)`;
      const i = Math.min(TEAM.length, Math.round(p * (TEAM.length - 1)) + 1);
      if (i !== shown) { shown = i; setIdx(i); }
    };
    // Continuous, inertial scrolling: x chases target; no snapping.
    const loop = () => {
      const d = target - x;
      if (Math.abs(d) < 0.1 || reduce) { x = target; raf = 0; paint(); return; }
      x += d * 0.1; paint();
      raf = requestAnimationFrame(loop);
    };
    const move = (to: number) => { target = Math.max(0, Math.min(max, to)); if (!raf) raf = requestAnimationFrame(loop); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(view); ro.observe(rl);

    // Wheel / trackpad over the section: vertical (or horizontal) wheel scrolls the slider sideways, as far as you like.
    // The page only scrolls once the slider is at its start/end; a short guard swallows momentum at the edge.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || max <= 0) return;
      const r = view.getBoundingClientRect(), vh = window.innerHeight;
      if (r.top > vh * 0.75 || r.bottom < vh * 0.25) return;         // slider not in view → normal page scroll
      const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 32 : 1);
      if (!d) return;
      const atEdge = (d > 0 && target >= max - 0.5) || (d < 0 && target <= 0.5);
      const now = performance.now();
      if (atEdge) {
        if (now - last > 350) return;                                // let the page scroll on
        e.preventDefault(); e.stopPropagation(); return;             // swallow the momentum tail
      }
      e.preventDefault(); e.stopPropagation();
      last = now; move(target + d * 1.15);
    };
    sec.addEventListener('wheel', onWheel, { passive: false });

    // Touch drag + keyboard
    let sx = 0, sy = 0, st = 0, lock = false;
    const ts = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = target; lock = false; };
    const tm = (e: TouchEvent) => { const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy; if (!lock && Math.abs(dx) > Math.abs(dy)) lock = true; if (lock) move(st - dx * 1.2); };
    const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); move(target + 420); } if (e.key === 'ArrowLeft') { e.preventDefault(); move(target - 420); } };
    view.addEventListener('touchstart', ts, { passive: true }); view.addEventListener('touchmove', tm, { passive: true });
    view.addEventListener('keydown', key);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); sec.removeEventListener('wheel', onWheel); view.removeEventListener('touchstart', ts); view.removeEventListener('touchmove', tm); view.removeEventListener('keydown', key); };
  }, []);
  return (
    <>
      <div className="slider" ref={track} tabIndex={0} aria-label="Psychologists">
        <div className="slider__rail" ref={rail}>
        {TEAM.map((t) => (
          <article className={'slide' + (t.offset ? ' slide--offset' : '')} key={t.name} style={{ ['--w' as string]: `${t.w}px` }}>
            <div className="card">
              <div className="card__photo">
                {'photo' in t ? (
                  <img className="card__cover" alt={t.name} src={`/images/${t.photo}`} width={768} height={960} />
                ) : null}
              </div>
              <div className="card__info">
                <h3>{t.name}</h3>
                <p className="label card__focus">{t.focus}</p>
                <p className="card__bio">{t.bio}</p>
                <a className="label card__link" href="#contact">View profile →</a>
              </div>
            </div>
          </article>
        ))}
        </div>
      </div>
      <TeamGL track={track} />
      <div className="progress">
        <span className="label progress__hint">Scroll to explore →</span>
        <div className="progress__rail"><div className="progress__bar" ref={bar} /></div>
        <span className="label progress__count">{String(idx).padStart(2, '0')} / {String(TEAM.length).padStart(2, '0')}</span>
      </div>
    </>
  );
}
