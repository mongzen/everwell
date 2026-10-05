'use client';
import { useRef, useState } from 'react';

const ITEMS: [string, string?][] = [
  ['Anxiety & stress'], ['Depression & low mood'],
  ['Trauma & PTSD', 'Gentle, paced work for experiences that still feel present — never rushed, always at your pace.'],
  ['Relationships & couples'], ['Grief & loss'], ['Life transitions'], ['Burnout & work stress'], ['Teens & parenting'],
];

export default function SupportList() {
  const [active, setActive] = useState(2);
  const cursor = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLUListElement>(null);
  const move = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    cursor.current!.style.transform = `translate(${e.clientX - r.left + 24}px, ${e.clientY - r.top - 190}px)`;
  };
  return (
    <ul className="support-list" ref={wrap} onPointerMove={move}>
      {ITEMS.map(([title, desc], i) => (
        <li key={title} className={i === active ? 'on' : ''} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
          <a href="#contact">
            <span className="num-sm">{String(i + 1).padStart(2, '0')}</span>
            <span className="row-title">{title}</span>
            <span className="row-arrow" aria-hidden="true">→</span>
          </a>
          {desc && <p className="row-desc">{desc}</p>}
        </li>
      ))}
      <div className="cursor-card" ref={cursor} aria-hidden="true" />
    </ul>
  );
}
