'use client';
import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import './BreatheInvite.css';

const BreathOrb = dynamic(() => import('./BreathOrb'), { ssr: false });

/**
 * Drift invite — a quiet check-in between Rates and Contact.
 * Marquee "Breathe" drifts behind a breath ring that expands for 5.5 s and contracts for 5.5 s
 * (≈5.5 breaths/min, the same resonance pace used in Drift). Each answer opens Drift tuned to that feeling.
 */
const FEELINGS = [
  { id: 'busy', label: 'Busy' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'tired', label: 'Tired' },
  { id: 'okay', label: 'Just okay' },
];

export default function BreatheInvite() {
  const root = useRef<HTMLElement>(null);

  // play the animations only while the section is on screen, and reveal the copy once
  useEffect(() => {
    const el = root.current!;
    const io = new IntersectionObserver(([e]) => {
      el.classList.toggle('is-live', e.isIntersecting);
      if (e.isIntersecting) el.classList.add('is-in');
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="binv" id="pause" ref={root} aria-labelledby="binv-q">
      <div className="binv__marquee" aria-hidden="true">
        <div className="binv__track">{Array.from({ length: 8 }, (_, i) => <span key={i}>Breathe</span>)}</div>
      </div>

      <div className="binv__ring" aria-hidden="true">
        <span className="binv__outer" />
        <span className="binv__breath" />
        <BreathOrb />
        <span className="binv__word binv__word--in">Breathe in</span>
        <span className="binv__word binv__word--out">Breathe out</span>
        <span className="binv__pace label">5.5 seconds</span>
      </div>

      <div className="binv__check">
        <p className="binv__lead">Not ready to book yet? Take a 2-minute pause first.</p>
        <h2 className="binv__q" id="binv-q">How does your mind feel right now?</h2>
        <div className="binv__answers">
          {FEELINGS.map((f) => (
            <a key={f.id} className="binv__answer" href={`/drift?feel=${f.id}`}>{f.label}</a>
          ))}
        </div>
        <p className="binv__tag label">Tap one — Drift sets the pace for you · 2 min</p>
      </div>
    </section>
  );
}
