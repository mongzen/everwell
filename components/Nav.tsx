'use client';
import { useEffect, useState } from 'react';

const LINKS = [
  ['Home', '#top'], ['Services', '#services'], ['Psychologists', '#psychologists'], ['Fees', '#fees'], ['Contact us', '#contact'],
];

export default function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > window.innerHeight * 0.8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={'nav' + (solid ? ' nav-solid' : '') + (open ? ' nav-open' : '')}>
      <a className="nav-logo" href="#top">Everwell</a>
      <nav className="nav-links" aria-label="Primary">
        {LINKS.map(([t, h]) => <a key={t} href={h} onClick={() => setOpen(false)}>{t}</a>)}
      </nav>
      <a className="btn btn-light nav-cta" href="#contact">Book a consultation</a>
      <button className="nav-burger" aria-expanded={open} aria-label="Menu" onClick={() => setOpen(!open)}>Menu</button>
    </header>
  );
}
