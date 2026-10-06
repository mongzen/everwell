'use client';
import { useEffect, useRef } from 'react';

/**
 * Category outro — scroll-driven version of the Figma "Support Outro" prototype (Intro → Expand → Full).
 *  Intro : marquee at rest, 320px photo, caption visible
 *  Expand: marquee slides left, photo grows to 720×520, caption fades out
 *  Full  : marquee fades away, photo fills the stage under a 45% forest overlay, quote appears
 *  Exit  : photo keeps growing past the stage while everything fades into the next section's mist background
 * The stage is pinned (sticky) while the wrapper's extra height scrolls through the three states.
 */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const seg = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)));

export default function SupportOutro() {
  const pin = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const mq = useRef<HTMLDivElement>(null), img = useRef<HTMLImageElement>(null), shade = useRef<HTMLDivElement>(null);
  const cap = useRef<HTMLDivElement>(null), quote = useRef<HTMLQuoteElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // stays on the Intro state
    const P = pin.current!, S = stage.current!;
    let raf = 0, last = NaN;
    const update = () => {
      const W = S.clientWidth, H = S.clientHeight, small = W < 800;
      const r = P.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - H));
      const key = p + W * 7 + H * 13;
      if (key === last) return;                       // nothing moved since the last frame
      last = key;
      const e1 = seg(p, 0.06, 0.3), e2 = seg(p, 0.32, 0.56), e3 = seg(p, 0.74, 1);
      const s0 = small ? 240 : 320, ew = Math.min(720, W - 48), eh = ew * (520 / 720), ms = small ? 0.5 : 1;
      const grow = 1 + 0.45 * e3;
      const w = lerp(lerp(s0, ew, e1), W, e2) * grow, h = lerp(lerp(s0, eh, e1), H, e2) * grow;
      const box = `${w}px`, boxH = `${h}px`, left = `${(W - w) / 2}px`, top = `${(H - h) / 2}px`;
      for (const el of [img.current!, shade.current!]) { el.style.width = box; el.style.height = boxH; el.style.left = left; el.style.top = top; }
      shade.current!.style.opacity = String(lerp(lerp(0, 0.1, e1), 0.45, e2) * (1 - e3));
      img.current!.style.opacity = String(1 - e3);
      S.style.background = `rgba(46,58,49,${1 - e3})`;
      mq.current!.style.transform = `translate3d(${-(460 * e1 + 380 * e2) * ms}px,0,0)`;
      mq.current!.style.opacity = String(1 - e2);
      cap.current!.style.opacity = String(1 - seg(p, 0.06, 0.2));
      quote.current!.style.opacity = String(seg(p, 0.58, 0.68) * (1 - seg(p, 0.76, 0.88)));
    };
    // Poll the scroll position every frame instead of relying on scroll events (Lenis / programmatic scrolls
    // don't always emit them); update() bails out immediately when nothing changed.
    const tick = () => { update(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="outro-pin" ref={pin}>
      <div className="outro" ref={stage}>
        <div className="outro__marquee" ref={mq} aria-hidden="true">
          <div className="outro__track">{Array.from({ length: 10 }, (_, i) => <span key={i}>Support</span>)}</div>
        </div>
        <img className="outro__img" ref={img} src="/images/img_support_center.webp" width="640" height="640" alt="" />
        <div className="outro__shade" ref={shade} aria-hidden="true" />
        <div className="outro__cap" ref={cap}><p>Anxiety · Depression · Trauma · Couples · Grief · Life transitions</p><p className="label">8 AREAS OF CARE</p></div>
        <blockquote className="outro__quote" ref={quote} aria-hidden="true"><p>“Not sure what to call it? That’s okay. We’ll figure it out together, at your pace.”</p><footer className="label">/ Everwell care team</footer></blockquote>
      </div>
    </div>
  );
}
