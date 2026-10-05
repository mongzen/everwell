'use client';
import { useEffect, useRef, useState } from 'react';

const TEAM = [
  { name: 'Dr. Natthida Wongsuwan', focus: 'Clinical psychologist · Trauma, anxiety', bio: 'Specialized care for trauma and anxiety, with a calm, steady approach for adults who feel overwhelmed.', photo: 'photo-1.png', w: 384, offset: false, crop: { h: '106.62%', l: '-0.01%', t: '-3.26%', w: '99.96%' } },
  { name: 'Kritsada Chaiyasit', focus: 'Counseling psychologist · Life transitions, burnout', bio: 'Down-to-earth support for adults navigating change, stress and burnout.', photo: 'photo-2.png', w: 425, offset: true },
  { name: 'Pimchanok Srisuk', focus: 'Counseling psychologist · Teens & families', bio: 'A warm, steady space for teens and the parents who love them.', photo: 'photo-3.png', w: 425, offset: false, crop: { h: '106.54%', l: '0', t: '-0.02%', w: '99.88%' } },
  { name: 'Siriporn Thongdee', focus: 'Counseling psychologist · Couples, life transitions', bio: 'Warm, practical support for partners and families finding their footing together.', photo: 'photo-4.png', w: 384, offset: true },
  { name: 'Thanawat Prasert', focus: 'Clinical psychologist · Depression, grief', bio: 'Steady, unhurried sessions for adults moving through loss and low mood.', w: 384, offset: false },
  { name: 'Dr. Napat Rattanakorn', focus: 'Clinical psychologist · Adolescents, anxiety', bio: 'Gentle, collaborative care for teens and the parents who support them.', w: 384, offset: true },
] as const;

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
        {TEAM.map((t) => (
          <article className={'slide' + (t.offset ? ' slide--offset' : '')} key={t.name} style={{ ['--w' as string]: `${t.w}px` }}>
            <div className="card">
              <div className="card__photo">
                {'photo' in t ? (
                  'crop' in t && t.crop
                    ? <img className="card__crop" alt={t.name} src={`/images/${t.photo}`} style={{ height: t.crop.h, left: t.crop.l, top: t.crop.t, width: t.crop.w }} />
                    : <img className="card__cover" alt={t.name} src={`/images/${t.photo}`} />
                ) : <span className="card__ph">Photo · 4:5 · same crop for every clinician</span>}
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
      <div className="progress">
        <span className="label progress__hint">Scroll to explore →</span>
        <div className="progress__rail"><div className="progress__bar" style={{ transform: `translateX(${p * 525}%)` }} /></div>
        <span className="label progress__count">{String(idx).padStart(2, '0')} / {String(TEAM.length).padStart(2, '0')}</span>
      </div>
    </>
  );
}
