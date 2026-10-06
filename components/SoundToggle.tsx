'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Hero sound toggle — plays/pauses the ambient track with a soft fade.
 * Uses Web Audio so the loop is gapless (an <audio loop> leaves a small gap with mp3).
 * Starts off: browsers block autoplay until the visitor interacts.
 */
const SRC = '/audio/ambient.mp3';
const VOLUME = 0.22;       // quiet background level (0–1)
const FADE_IN = 2.5, FADE_OUT = 3.5;   // seconds — slow, soft fade in/out

export default function SoundToggle() {
  const [on, setOn] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const buf = useRef<AudioBuffer | null>(null);
  const src = useRef<AudioBufferSourceNode | null>(null);
  const wanted = useRef(false);
  const busy = useRef(false);

  // Smooth exponential-style fade (setTargetAtTime): starts gently and settles, no abrupt cut.
  // `sec` is roughly how long until it is inaudible/at target.
  const ramp = (to: number, sec: number) => {
    const c = ctx.current!, g = gain.current!.gain, now = c.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.setTargetAtTime(to, now, sec / 4.5);
  };

  const start = async () => {
    if (!ctx.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx.current = new AC();
      gain.current = ctx.current.createGain(); gain.current.gain.value = 0; gain.current.connect(ctx.current.destination);
    }
    const c = ctx.current;
    if (c.state === 'suspended') await c.resume();
    if (!buf.current) buf.current = await c.decodeAudioData(await (await fetch(SRC)).arrayBuffer());
    if (!src.current) {
      const s = c.createBufferSource(); s.buffer = buf.current; s.loop = true; s.connect(gain.current!); s.start(); src.current = s;
    }
    ramp(VOLUME, FADE_IN);
  };

  const toggle = async () => {
    if (busy.current) return;
    if (!wanted.current) {
      wanted.current = true; setOn(true); busy.current = true;
      try { await start(); } catch { wanted.current = false; setOn(false); } finally { busy.current = false; }
    } else {
      wanted.current = false; setOn(false);
      ramp(0, FADE_OUT);
      window.setTimeout(() => { if (!wanted.current) ctx.current?.suspend(); }, FADE_OUT * 1000 + 300);   // only pause once fully faded
    }
  };

  // mute while the tab is hidden, pick up again when it returns
  useEffect(() => {
    const vis = () => {
      const c = ctx.current; if (!c || !wanted.current) return;
      if (document.hidden) c.suspend(); else c.resume().then(() => ramp(VOLUME, 1));
    };
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); try { src.current?.stop(); } catch {} ctx.current?.close(); };
  }, []);

  return (
    <button type="button" className={'sound' + (on ? ' is-on' : '')} onClick={toggle} aria-pressed={on} aria-label={on ? 'Turn sound off' : 'Turn sound on'}>
      <span className="sound__bars" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="sound__label label">{on ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}
