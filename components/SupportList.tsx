'use client';
import { useEffect, useRef, useState } from 'react';

const ITEMS: [string, string?][] = [
  ['Anxiety & stress'], ['Depression & low mood'],
  ['Trauma & PTSD', 'Gentle, paced work for experiences that still feel present — never rushed, always at your pace.'],
  ['Relationships & couples'], ['Grief & loss'], ['Life transitions'], ['Burnout & work stress'], ['Teens & parenting'],
];

/** Index list — the hovered row turns dark and the preview card follows it (Figma: Support List, "While hovering"). */
export default function SupportList() {
  const [active, setActive] = useState(2);
  const list = useRef<HTMLUListElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ul = list.current!, c = card.current!;
    const row = ul.children[active] as HTMLElement;
    c.style.top = `${row.offsetTop + row.offsetHeight / 2 - 189}px`;
  }, [active]);

  return (
    <div className="slist">
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
        <div className="slist__card-in"><img src="/images/support-cursor.png" alt="" /></div>
      </div>
    </div>
  );
}
