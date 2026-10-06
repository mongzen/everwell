'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Aquarium, Mode, Size, Species } from './engine';

const SPECIES_UI: { id: Species; name: string; note: string; color: string }[] = [
  { id: 'moon', name: 'Moon Jelly', note: 'Pale and slow. The calmest swimmer.', color: '#C4DEFF' },
  { id: 'crystal', name: 'Crystal Jelly', note: 'Glows blue-green when the light finds it.', color: '#82ECFF' },
  { id: 'pink', name: 'Pink Drifter', note: 'Long trailing arms, gentle pulse.', color: '#FFA0CE' },
  { id: 'lantern', name: 'Lantern Jelly', note: 'A warm amber glow for late nights.', color: '#FFC482' },
];
const SIZES: Size[] = ['small', 'medium', 'large'];

/* Music: five original loops. All are slow (no beat), low-register and swell once every
   11 s, so they gently pace breathing at ~5.5 breaths per minute. */
export const TRACKS = [
  { id: 'drift', name: 'Drift', note: 'Muffled ambient, as heard under water', src: '/audio/ambient.mp3', gain: 0.67, lowpass: 650 },
  { id: 'tezhnia', name: 'Tężnia', note: 'Warm pad and trickling water — after Polish brine graduation towers', src: '/audio/drift/tezhnia.mp3', gain: 1, lowpass: 0 },
  { id: 'kuromoji', name: 'Kuromoji', note: 'Soft wooden mallet notes over a slow pad', src: '/audio/drift/kuromoji.mp3', gain: 1, lowpass: 0 },
  { id: 'deep-water', name: 'Deep Water', note: 'Low drone and slow sea swells', src: '/audio/drift/deep-water.mp3', gain: 1, lowpass: 0 },
  { id: 'night-bell', name: 'Night Bell', note: 'One singing-bowl tone per breath', src: '/audio/drift/night-bell.mp3', gain: 1, lowpass: 0 },
] as const;
type TrackId = (typeof TRACKS)[number]['id'];

function useDriftSound() {
  const ctx = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const cur = useRef<{ src: AudioBufferSourceNode; g: GainNode } | null>(null);
  const buffers = useRef(new Map<string, AudioBuffer>());
  const data = useRef<Float32Array | null>(null);
  const [on, setOn] = useState(false);
  const [track, setTrack] = useState<TrackId>('tezhnia');

  const ramp = (p: AudioParam, to: number, sec: number) => {
    const c = ctx.current!;
    p.cancelScheduledValues(c.currentTime);
    p.setValueAtTime(p.value, c.currentTime);
    p.setTargetAtTime(to, c.currentTime, sec / 4.5);
  };

  const init = () => {
    if (ctx.current) return ctx.current;
    const c = new AudioContext();
    const m = c.createGain(); m.gain.value = 0;
    const a = c.createAnalyser(); a.fftSize = 1024; a.smoothingTimeConstant = 0.9;
    m.connect(a).connect(c.destination);
    ctx.current = c; master.current = m; analyser.current = a;
    data.current = new Float32Array(a.fftSize);
    return c;
  };

  const play = async (id: TrackId) => {
    const c = init();
    const t = TRACKS.find((x) => x.id === id)!;
    let buf = buffers.current.get(id);
    if (!buf) {
      const decoded: AudioBuffer = await fetch(t.src).then((r) => r.arrayBuffer()).then((b) => c.decodeAudioData(b));
      buffers.current.set(id, decoded);
      buf = decoded;
    }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const g = c.createGain(); g.gain.value = 0;
    if (t.lowpass) {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = t.lowpass; lp.Q.value = 0.6;
      src.connect(lp).connect(g);
    } else src.connect(g);
    g.connect(master.current!);
    src.start();
    const old = cur.current;
    if (old) { ramp(old.g.gain, 0, 4); old.src.stop(c.currentTime + 5); }
    ramp(g.gain, t.gain, 4);            // 4 s cross-fade between tracks
    cur.current = { src, g };
  };

  const toggle = async () => {
    const c = init();
    if (!on) {
      setOn(true);
      await c.resume();
      if (!cur.current) await play(track);
      ramp(master.current!.gain, 0.32, 3);
    } else {
      setOn(false);
      ramp(master.current!.gain, 0, 3.5);
    }
  };

  const choose = async (id: TrackId) => {
    setTrack(id);
    if (on && ctx.current) await play(id);
  };

  /** smoothed loudness 0..1 for the light pulse */
  const level = () => {
    const a = analyser.current, d = data.current;
    if (!a || !d || !on) return 0;
    a.getFloatTimeDomainData(d as any);
    let sum = 0; for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
    return Math.min(1, Math.sqrt(sum / d.length) * 6);
  };

  /** soft water-drop "bloop", tuned to an A-minor pentatonic so it sits with the music */
  const boop = (seed: string) => {
    const c = ctx.current; if (!c || !on) return;
    const notes = [220, 261.6, 293.7, 329.6, 392, 440];
    let h = 0; for (const ch of seed) h += ch.charCodeAt(0);
    const f = notes[(h + Math.floor(Math.random() * 3)) % notes.length];
    const t = c.currentTime;
    const out = c.createGain(); out.gain.value = 0.9;
    const delay = c.createDelay(); delay.delayTime.value = 0.19;
    const fb = c.createGain(); fb.gain.value = 0.28;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    out.connect(c.destination); out.connect(delay); delay.connect(lp).connect(fb).connect(delay); lp.connect(c.destination);
    [[1, 0.09, 'sine'], [2.01, 0.025, 'triangle']].forEach(([mul, amp, type]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type as OscillatorType;
      o.frequency.setValueAtTime(f * (mul as number) * 1.45, t);
      o.frequency.exponentialRampToValueAtTime(f * (mul as number), t + 0.07);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp as number, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(g).connect(out); o.start(t); o.stop(t + 1.2);
    });
    setTimeout(() => out.disconnect(), 3000);
  };

  /** tiny water "tik" for UI presses, quiet and pitched from a pentatonic scale */
  const tick = () => {
    const c = ctx.current; if (!c || !on) return;
    const notes = [523.3, 587.3, 659.3, 784, 880];
    const f = notes[Math.floor(Math.random() * notes.length)], t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 1.3, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.4);
  };

  const bubble = () => {
    const c = ctx.current; if (!c || !on) return;
    for (let i = 0; i < 3; i++) {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.09;
      o.type = 'sine'; o.frequency.setValueAtTime(380 + Math.random() * 200, t); o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 400, t + 0.12);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.2);
    }
  };

  useEffect(() => () => { ctx.current?.close(); }, []);
  return { on, toggle, track, choose, level, bubble, boop, tick };
}

/* Arriving from the home-page check-in (?feel=…) tunes the first view */
const FEEL: Record<string, { mode: Mode; track?: TrackId; lead: string }> = {
  busy: { mode: 'watch', lead: "A busy mind settles faster when there's something slow to watch." },
  anxious: { mode: 'breathe', lead: "Let's slow your breathing together — 5.5 seconds in, 5.5 seconds out." },
  tired: { mode: 'watch', track: 'night-bell', lead: 'Rest your eyes on the light. Night Bell is ready when you turn the sound on.' },
  okay: { mode: 'light', lead: 'Guide a little light through the dark and see who follows.' },
};

export default function DriftGame() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const aq = useRef<Aquarium | null>(null);
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState<Mode | 'add'>('watch');
  const [count, setCount] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [species, setSpecies] = useState<Species>('moon');
  const [size, setSize] = useState(1);
  const [breath, setBreath] = useState({ inhale: true, sec: 6, scale: 0.75 });
  const [pattern, setPattern] = useState<'resonance' | 'longExhale'>('resonance');
  const [menu, setMenu] = useState(false);
  const [touchable, setTouchable] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; c: string }[]>([]);
  const [booped, setBooped] = useState(false);
  const [failed, setFailed] = useState(false);
  const sound = useDriftSound();
  const [feel, setFeel] = useState<string | null>(null);
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get('feel');
    if (f && FEEL[f]) { setFeel(f); if (FEEL[f].track) sound.choose(FEEL[f].track!); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enter = () => {
    setEntered(true);
    if (feel) choose(FEEL[feel].mode);
  };

  useEffect(() => {
    let disposed = false;
    import('./engine').then(({ Aquarium }) => {
      if (disposed || !canvas.current) return;
      try {
        const a = new Aquarium(canvas.current);
        a.onCount = setCount;
        setCount(a.jellies.length);
        aq.current = a;
      } catch { setFailed(true); }
    });
    return () => { disposed = true; aq.current?.dispose(); aq.current = null; };
  }, []);

  // feed the music level to the light pulse
  useEffect(() => {
    let raf = 0;
    const tick = () => { aq.current?.setAudioLevel(sound.level()); raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  });

  // breathing pattern
  useEffect(() => {
    import('./engine').then(({ BREATH_PATTERNS }) => {
      const p = BREATH_PATTERNS.find((x) => x.id === pattern)!;
      aq.current?.setBreath(p);
    });
  }, [pattern]);

  // keep the breath guide in sync with the engine clock
  useEffect(() => {
    if (mode !== 'breathe') return;
    let raf = 0;
    const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);
    const tick = () => {
      const a = aq.current;
      if (a) {
        const b = a.breathState();
        const scale = b.inhale ? 0.72 + 0.28 * ease(b.t) : 1 - 0.28 * ease(b.t);
        setBreath({ inhale: b.inhale, sec: Math.max(1, Math.ceil(b.remaining)), scale });
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  /** jelly "boing" + a few rising bubbles on any playful button */
  const pop = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.classList.remove('is-pop'); void el.offsetWidth; el.classList.add('is-pop');
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 3; i++) {
      const b = document.createElement('span');
      b.className = 'jelly-bub';
      b.style.left = `${e.clientX - r.left + (Math.random() - 0.5) * 16}px`;
      b.style.top = `${e.clientY - r.top}px`;
      b.style.setProperty('--d', `${i * 70}ms`);
      b.style.setProperty('--x', `${(Math.random() - 0.5) * 18}px`);
      b.style.setProperty('--s', `${4 + Math.random() * 4}px`);
      el.appendChild(b);
      setTimeout(() => b.remove(), 1000);
    }
    sound.tick();
    if ('vibrate' in navigator) try { navigator.vibrate(6); } catch {}
  };

  // the soft blob that slides (and wobbles) under the active mode
  const modesRef = useRef<HTMLElement>(null);
  const [blob, setBlob] = useState<{ x: number; w: number; n: number }>({ x: 0, w: 0, n: 0 });
  useLayoutEffect(() => {
    const place = () => {
      const on = modesRef.current?.querySelector<HTMLElement>('button.is-on');
      if (on) setBlob((b) => ({ x: on.offsetLeft, w: on.offsetWidth, n: b.x === on.offsetLeft ? b.n : b.n + 1 }));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [mode, entered]);

  const choose = (m: Mode | 'add') => {
    setMode(m);
    if (m !== 'add') aq.current?.setMode(m);
  };

  // keep the panel open so people can release several jellies in a row
  const [released, setReleased] = useState(0);
  const release = () => {
    aq.current?.spawn(species, SIZES[size]);
    setReleased((n) => n + 1);
  };
  useEffect(() => {
    if (!released) return;
    const id = setTimeout(() => setReleased(0), 1600);
    return () => clearTimeout(id);
  }, [released]);

  return (
    <div
      data-lenis-prevent
      className={'drift' + (hidden ? ' is-hidden' : '') + (mode === 'light' ? ' is-light' : '') + (touchable ? ' is-touch' : '')}
      onPointerMove={(e) => {
        aq.current?.pointer(e.clientX, e.clientY);
        if (e.pointerType === 'mouse' && !(e.target as HTMLElement).closest('button, .drift__panel, .drift__tracks')) {
          const t = !!aq.current?.pick(e.clientX, e.clientY);
          if (t !== touchable) setTouchable(t);
        }
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button, .drift__panel, .drift__tracks, input')) return;
        if (menu) setMenu(false);
        if (!entered) return;
        const col = aq.current?.boop(e.clientX, e.clientY);
        if (col) {
          sound.boop(col);
          setBooped(true);
          const id = Date.now() + Math.random();
          setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY, c: col }]);
          setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 1400);
          if ('vibrate' in navigator) try { navigator.vibrate(10); } catch {}
          return;
        }
        if (hidden) { setHidden(false); return; }
        if (mode === 'light') { aq.current?.pointer(e.clientX, e.clientY); aq.current?.releasePlankton(); sound.bubble(); }
      }}
    >
      <canvas ref={canvas} className="drift__canvas" aria-hidden="true" />
      <div className="drift__grain" aria-hidden="true" />
      {ripples.map((r) => (
        <span key={r.id} className="drift__ripple" style={{ left: r.x, top: r.y, ['--c' as any]: r.c }} aria-hidden="true" />
      ))}

      {failed && <p className="drift__fail">This aquarium needs WebGL. Try a recent browser.</p>}

      {/* start */}
      <section className={'drift__intro' + (entered ? ' is-gone' : '')} aria-hidden={entered}>
        <p className="drift__eyebrow">A quiet aquarium</p>
        <h1 className="drift__title">Drift</h1>
        <p className="drift__lead">{feel ? FEEL[feel].lead : 'Watch jellyfish float through the dark. No goals, no timer — just slow breathing and soft light.'}</p>
        <button type="button" className="drift__btn" onClick={enter}>Enter the tank</button>
        <p className="drift__note">Best with sound on and headphones</p>
      </section>

      {/* HUD */}
      <div className={'drift__hud' + (entered ? ' is-in' : '')}>
        <header className="drift__top">
          <div>
            <a href="/" className="drift__brand">Drift</a>
            <p className="drift__sub">A quiet aquarium</p>
          </div>
          <div className="drift__audio">
            <button type="button" className="drift__track jelly-btn" onPointerDown={pop} onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="listbox">
              {TRACKS.find((t) => t.id === sound.track)!.name}
            </button>
            <button type="button" className={'drift-sound' + (sound.on ? ' is-on' : '')} onClick={sound.toggle} aria-pressed={sound.on}>
              <span className="sound__bars" aria-hidden="true"><i /><i /><i /><i /></span>
              <span>{sound.on ? 'Sound on' : 'Sound off'}</span>
            </button>
            {menu && (
              <ul className="drift__tracks" role="listbox" aria-label="Music">
                {TRACKS.map((t, i) => (
                  <li key={t.id} style={{ ['--i' as any]: i }}>
                    <button type="button" role="option" aria-selected={sound.track === t.id} className={'jelly-btn' + (sound.track === t.id ? ' is-sel' : '')} onPointerDown={pop}
                      onClick={() => { sound.choose(t.id); if (!sound.on) sound.toggle(); setMenu(false); }}>
                      <strong>{t.name}</strong><span>{t.note}</span>
                    </button>
                  </li>
                ))}
                <li className="drift__tracks-note">Original loops · slow swell every 11 s to pace your breathing</li>
              </ul>
            )}
          </div>
        </header>

        {entered && mode === 'watch' && !booped && <p className="drift__hint drift__hint--soft">Tap a jellyfish — gently</p>}
        {mode === 'light' && <p className="drift__hint">Move to guide the light · click to release plankton</p>}

        {mode === 'breathe' && (
          <div className="drift__breath" aria-live="polite">
            <span className="drift__ring" />
            <span className="drift__ring drift__ring--b" style={{ transform: `translate(-50%,-50%) scale(${breath.scale})` }} />
            <p className="drift__breath-label">{breath.inhale ? 'Breathe in' : 'Breathe out'}</p>
            <p className="drift__breath-count">{breath.sec}</p>
            <div className="drift__breath-foot">
              <div className="drift__patterns" role="radiogroup" aria-label="Breathing pace">
                <button type="button" role="radio" aria-checked={pattern === 'resonance'} className={pattern === 'resonance' ? 'is-on' : ''} onClick={() => setPattern('resonance')}>Resonance · 5.5 in / 5.5 out</button>
                <button type="button" role="radio" aria-checked={pattern === 'longExhale'} className={pattern === 'longExhale' ? 'is-on' : ''} onClick={() => setPattern('longExhale')}>Longer exhale · 4 in / 6 out</button>
              </div>
              <p className="drift__breath-sub">Breathe softly through your nose, into the belly. Try 5–10 minutes.<br />If you feel light-headed, stop and breathe normally.</p>
            </div>
          </div>
        )}

        {mode === 'add' && (
          <aside className="drift__panel" aria-label="Add a jellyfish">
            <div className="drift__panel-head">
              <h2>Add to your tank</h2>
              <button type="button" className="drift__close" onClick={() => choose('watch')}>Close</button>
            </div>
            {SPECIES_UI.map((s) => (
              <button key={s.id} type="button" className={'drift__sp' + (species === s.id ? ' is-sel' : '')} onClick={() => setSpecies(s.id)} aria-pressed={species === s.id}>
                <span className="drift__sp-pv" style={{ ['--c' as any]: s.color }}>
                  <svg viewBox="0 0 40 52" aria-hidden="true">
                    <path d="M6 20 C6 9 13 4 20 4 C27 4 34 9 34 20 Q31 22 28 20 Q24 22 20 20 Q16 22 12 20 Q9 22 6 20Z" fill="var(--c)" fillOpacity=".55" stroke="#fff" strokeOpacity=".5" strokeWidth=".8" />
                    {[10, 15, 20, 25, 30].map((x, i) => <path key={x} d={`M${x} 21 C${x - 2} 30 ${x + 2} 38 ${x + (i % 2 ? 2 : -2)} 48`} stroke="var(--c)" strokeOpacity=".7" strokeWidth=".8" fill="none" />)}
                  </svg>
                </span>
                <span className="drift__sp-txt"><strong>{s.name}</strong><span>{s.note}</span></span>
              </button>
            ))}
            <label className="drift__size">
              <span className="drift__size-row"><span>Size</span><span>{SIZES[size]}</span></span>
              <input type="range" min={0} max={2} step={1} value={size} onChange={(e) => setSize(+e.target.value)} />
            </label>
            <button type="button" className="drift__btn jelly-btn" onPointerDown={pop} onClick={release} aria-live="polite">
              {released ? (released > 1 ? `Released ×${released} — add another?` : 'Released — add another?') : 'Release into the tank'}
            </button>
          </aside>
        )}

        <footer className="drift__bottom">
          <p className="drift__count">{count} jellies drifting</p>
          <nav className="drift__modes" aria-label="Mode" ref={modesRef}>
            <span className="drift__blob" style={{ transform: `translateX(${blob.x}px)`, width: blob.w }} aria-hidden="true"><i key={blob.n} /></span>
            {([['watch', 'Watch'], ['light', 'Light'], ['breathe', 'Breathe'], ['add', 'Add jelly']] as const).map(([m, l]) => (
              <button key={m} type="button" className={'jelly-btn' + (mode === m ? ' is-on' : '')} onPointerDown={pop} onClick={() => choose(m)} aria-pressed={mode === m}>{l}</button>
            ))}
          </nav>
          <button type="button" className="drift__hide" onClick={() => setHidden(true)}>Hide interface</button>
        </footer>
      </div>
      {hidden && <p className="drift__show">Tap anywhere to show the interface</p>}
    </div>
  );
}
