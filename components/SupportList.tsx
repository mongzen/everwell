'use client';
import { useEffect, useRef, useState } from 'react';

const ITEMS: [string, string?][] = [
  ['Anxiety & stress'], ['Depression & low mood'],
  ['Trauma & PTSD', 'Gentle, paced work for experiences that still feel present — never rushed, always at your pace.'],
  ['Relationships & couples'], ['Grief & loss'], ['Life transitions'], ['Burnout & work stress'], ['Teens & parenting'],
];

const TRAIL = 6;                                   // stacked copies of the preview, as in Codrops "Image Motion Trail (Opaque)"
const amt = (i: number) => 0.05 + 0.035 * i;       // lerp speed per layer: back copies lag, the top one leads
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Index list — the hovered row turns dark and the preview card follows it (Figma: Support List, "While hovering"). */
export default function SupportList() {
  const [active, setActive] = useState(2);
  const list = useRef<HTMLUListElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const wake = useRef<(snap?: boolean) => void>(() => {});
  const placed = useRef(false);

  // Each layer eases toward the target (hovered row + a little pointer drift) at its own speed → motion trail.
  useEffect(() => {
    const layers = Array.from(card.current!.children) as HTMLElement[];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pos = layers.map(() => ({ x: 0, y: target.current.y }));
    let raf = 0;
    const paint = () => layers.forEach((l, i) => { l.style.transform = `translate3d(${pos[i].x}px,${pos[i].y}px,0) rotate(4deg)`; });
    const frame = () => {
      let moving = false;
      pos.forEach((p, i) => {
        p.x = lerp(p.x, target.current.x, amt(i)); p.y = lerp(p.y, target.current.y, amt(i));
        if (Math.abs(p.x - target.current.x) > 0.1 || Math.abs(p.y - target.current.y) > 0.1) moving = true;
      });
      paint();
      raf = moving ? requestAnimationFrame(frame) : 0;
    };
    wake.current = (snap) => {
      if (reduce || snap) { pos.forEach((p) => { p.x = target.current.x; p.y = target.current.y; }); paint(); }
      else if (!raf) raf = requestAnimationFrame(frame);
    };
    paint();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Aim at the active row's centre (rows change height when active, so measure after render).
  useEffect(() => {
    const row = list.current!.children[active] as HTMLElement;
    target.current.y = row.offsetTop + row.offsetHeight / 2 - 189;
    wake.current(!placed.current); placed.current = true;   // first placement snaps, later ones trail
  }, [active]);

  // Subtle horizontal drift following the pointer across the list, like the reference's cursor follow.
  const onMove = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    target.current.x = ((e.clientX - r.left) / r.width - 0.5) * 60;
    wake.current();
  };

  return (
    <div className="slist" onMouseMove={onMove}>
      <ul className="slist__rows" ref={list}>
        {ITEMS.map(([title, desc], i) => (
          <li key={title} className={'slist__row' + (i === active ? ' is-active' : '')}
            onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
            <a href="#contact">
              <span className="label slist__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="slist__title">
                <span className="slist__name">{title}</span>
                {desc && i === active && <span className="slist__desc">{desc}</span>}
              </span>
              <span className="slist__arrow" aria-hidden="true">→</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="slist__card" ref={card} aria-hidden="true">
        {Array.from({ length: TRAIL }, (_, i) => (
          <div className="slist__card-in" key={i}><img src="/images/img_support_cursor.webp" width="560" height="760" alt="" /></div>
        ))}
      </div>
    </div>
  );
}
