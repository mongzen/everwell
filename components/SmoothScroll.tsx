'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// Site-wide smooth scrolling. Native scroll position is preserved, so scroll listeners (Nav, effects) keep working.
// Skipped on /drift: that page is a fixed full-screen canvas with nothing to scroll, and Lenis' extra
// requestAnimationFrame loop would just compete with the WebGL render loop.
export default function SmoothScroll() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname?.startsWith('/drift')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ anchors: true });
    let raf = requestAnimationFrame(function tick(t) {
      lenis.raf(t);
      raf = requestAnimationFrame(tick);
    });
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [pathname]);
  return null;
}
