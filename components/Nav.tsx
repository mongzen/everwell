'use client';
import { useEffect, useState } from 'react';

const LINKS = [
  ['Home', '#top'], ['Services', '#services'], ['Psychologists', '#psychologists'], ['Fees', '#fees'], ['Contact us', '#contact'],
];

export default function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > window.innerHeight * 0.85);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={'nav' + (solid ? ' nav--solid' : '') + (open ? ' nav--open' : '')}>
      <a className="nav__logo" href="#top">Everwell</a>
      <div className="nav__right">
        <nav className="nav__links" aria-label="Primary">
          {LINKS.map(([t, h]) => <a key={t} className="label" href={h} onClick={() => setOpen(false)}>{t}</a>)}
        </nav>
        <a className="glass nav__cta" href="#contact"><span className="label">Book a consultation</span></a>
        <button className="nav__burger label" aria-expanded={open} onClick={() => setOpen(!open)}>Menu</button>
      </div>
    </header>
  );
}
