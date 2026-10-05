'use client';
import { useEffect, useRef, useState } from 'react';

const TEAM = [
  ['Dr. Natthida Wongsuwan', 'Clinical psychologist · Trauma, anxiety', 'Specialized care for trauma and anxiety, with a calm, steady approach for adults who feel overwhelmed.'],
  ['Kritsada Chaiyasit', 'Counseling psychologist · Life transitions, burnout', 'Down-to-earth support for adults navigating change, stress and burnout.'],
  ['Pimchanok Srisuk', 'Counseling psychologist · Teens & families', 'A warm, steady space for teens and the parents who love them.'],
  ['Siriporn Thongdee', 'Counseling psychologist · Couples, life transitions', 'Warm, practical support for partners and families finding their footing together.'],
  ['Thanawat Prasert', 'Clinical psychologist · Depression, grief', 'Steady, unhurried sessions for adults moving through loss and low mood.'],
  ['Dr. Napat Rattanakorn', 'Clinical psychologist · Adolescents, anxiety', 'Gentle, collaborative care for teens and the parents who support them.'],
];
const TONES = ['#c9d3c6', '#d9cdb8', '#bfcabd', '#d4c6b0', '#c3cfc2', '#dccfba'];

export default function TeamSlider() {
  const track = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [idx, setIdx] = useState(1);
  useEffect(() => {
    const el = track.current!;
    const on = () => {
      const max = el.scrollWidth - el.clientWidth;
      const v = max > 0 ? el.scrollLeft / max : 0;
      setP(v); setIdx(Math.min(TEAM.length, Math.round(v * (TEAM.length - 1)) + 1));
    };
    on(); el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, []);
  return (
    <>
      <div className="slider" ref={track} tabIndex={0} aria-label="Psychologists">
        {TEAM.map(([name, role, blurb], i) => (
          <article className="therapist" key={name}>
            <div className="photo" style={{ background: `linear-gradient(160deg, ${TONES[i]}, #e8e1d2)` }} role="img" aria-label={`Portrait placeholder for ${name}`}>
              <span>{name.replace('Dr. ', '').split(' ').map((s) => s[0]).join('')}</span>
            </div>
            <h3>{name}</h3>
            <div className="role">{role}</div>
            <p>{blurb}</p>
            <a href="#contact">View profile →</a>
          </article>
        ))}
      </div>
      <div className="slider-progress">
        <span>Scroll to explore →</span>
        <div className="rail"><div className="bar" style={{ width: '16%', transform: `translateX(${p * 525}%)` }} /></div>
        <span>{String(idx).padStart(2, '0')} / {String(TEAM.length).padStart(2, '0')}</span>
      </div>
    </>
  );
}
