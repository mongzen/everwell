'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Sky } from './engine';
import { CRISIS_RE, LABELS, isMobileWidth, stageMetrics, type Layout } from './data';

type View = 'welcome' | 'conv' | 'sky' | 'safety';
type Msg = { id: number; role: 'wren' | 'you' | 'system'; text: string };

const STARTERS = ['Something worried me', 'A small win', 'I just feel off'];
const GREETING = 'Good evening. Want to add something to your sky tonight?';
const DESK = 'The Unfinished Desk';

/* ------------------------------------------------------------------
   PLACEHOLDER BRAIN — there is no Wren backend yet. These canned lines
   come straight from the Figma conversation frame so the flow can be
   clicked through. Replace `replyTo()` with the real AI call before launch.
------------------------------------------------------------------ */
const FIRST_REPLY =
  "That sounds tiring — like the day doesn't really end. I've placed it as a new star. It sits close to two others you shared about work. Want to look at that pattern together?";
const LISTEN_REPLY = "I'm here, and I'm listening. Take your time.";
const NEXT_REPLY = 'Thank you for telling me. What feels heaviest about it right now?';

export default function ConstellationScene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sky = useRef<Sky | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const msgId = useRef(1);
  const log = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState({ w: 1440, h: 900 });
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>('welcome');
  const [back, setBack] = useState<View>('conv');
  const [story, setStory] = useState('');
  const [chat, setChat] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, role: 'wren', text: GREETING }]);
  const [tonight, setTonight] = useState<string | null>(null);
  const [listen, setListen] = useState(false);
  const [simple, setSimple] = useState(false);
  const [deskName, setDeskName] = useState(DESK);
  const [renaming, setRenaming] = useState(false);
  const [time, setTime] = useState(0.983);

  const mobile = isMobileWidth(size.w);
  const m = useMemo(() => stageMetrics(size.w, size.h, mobile), [size, mobile]);
  const layout: Layout =
    view === 'welcome' ? (mobile ? 'wM' : 'wD') : view === 'sky' ? (mobile ? 'mSky' : 'dSky') : mobile ? 'mConv' : 'dConv';

  /* viewport size */
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  /* WebGL sky */
  useEffect(() => {
    let disposed = false;
    import('./engine').then(({ Sky }) => {
      if (disposed || !canvas.current) return;
      try { sky.current = new Sky(canvas.current); } catch { setFailed(true); }
    });
    return () => {
      disposed = true;
      timers.current.forEach(clearTimeout);
      sky.current?.dispose();
      sky.current = null;
    };
  }, []);

  /* keep the engine in step with React state (sky may mount a tick later, so depend on `failed` too) */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      sky.current?.set({ layout, tonight: tonight !== null, time, hidden: simple });
      sky.current?.setActive(view !== 'safety');
    });
    return () => cancelAnimationFrame(id);
  }, [layout, tonight, time, simple, view, failed, size]);

  useEffect(() => {
    // the engine may finish loading after the first effect run — nudge it once
    const id = setTimeout(() => sky.current?.set({ layout, tonight: tonight !== null, time, hidden: simple }), 400);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [msgs]);

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  const push = useCallback((role: Msg['role'], text: string) => {
    setMsgs((x) => [...x, { id: msgId.current++, role, text }]);
  }, []);

  /* ---------- actions ---------- */
  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    push('you', text);
    if (CRISIS_RE.test(text)) {
      later(() => { setBack('conv'); setView('safety'); }, 350);
      return;
    }
    if (tonight === null) {
      later(() => push('wren', FIRST_REPLY), 700);
      later(() => { setTonight(text); push('system', `New star · linked to ${deskName}`); }, 1500);
    } else {
      later(() => push('wren', listen ? LISTEN_REPLY : NEXT_REPLY), 700);
    }
  };

  const begin = (e: React.FormEvent) => {
    e.preventDefault();
    setView('conv');
    if (story.trim()) { const s = story; setStory(''); later(() => send(s), 500); }
  };
  const submitChat = (e: React.FormEvent) => { e.preventDefault(); const t = chat; setChat(''); send(t); };
  const openSafety = () => { setBack(view === 'safety' ? 'conv' : view); setView('safety'); };
  const reflect = () => {
    setView('conv');
    const n = tonight === null ? 5 : 6;
    later(() => push('wren', `Looking at ${deskName}: in 4 of these ${n} stories you described yourself as “not doing enough”. What do you make of that?`), 500);
  };

  /* timeline handle */
  const dragTime = (clientX: number) => {
    const el = trackRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTime(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };

  const deskCount = 5 + (tonight !== null && view === 'sky' ? 1 : 0);
  const stage = { width: m.sw, height: m.sh, transform: `translate(${m.offX}px, ${m.offY}px) scale(${m.s})` };
  const labels = LABELS[layout];
  const LABEL_TEXT = {
    desk: { title: deskName, sub: `${deskCount} stars · work & pressure` },
    wins: { title: 'Small Wins', sub: '4 stars · moments you felt okay' },
    afraid: { title: 'Afraid of Being Left', sub: '3 stars · relationships' },
  } as const;
  const showHud = view !== 'safety';

  return (
    <div className={'cst' + (mobile ? ' cst--m' : '')} data-view={view} data-simple={simple || undefined} data-lenis-prevent>
      <canvas ref={canvas} className="cst__canvas" aria-hidden="true" />
      {failed && <p className="cst__fail">This sky needs WebGL. Try a recent browser.</p>}

      <div className="cst__stage" style={stage}>
        {/* ---------------- HUD ---------------- */}
        {showHud && (
          <header className="cst__hud">
            <a href="/" className="cst__brand">Constellation</a>
            <p className="cst__meta" aria-live="polite">
              {view === 'welcome' ? 'Your sky is waiting' : 'Your sky · 12 stars · 3 constellations'}
            </p>
          </header>
        )}

        {/* ---------------- constellation captions ---------------- */}
        {(['desk', 'wins', 'afraid'] as const).map((id) => {
          const d = labels[id];
          const t = LABEL_TEXT[id];
          return (
            <div
              key={id}
              className={'cst__label' + (d && !simple && view !== 'welcome' && view !== 'safety' ? ' is-on' : '')}
              style={d ? { left: d.x, top: d.y, ['--ta' as string]: d.title, ['--sa' as string]: d.sub ?? 0 } : undefined}
              aria-hidden={!d}
            >
              <p className="cst__label-title" style={{ fontSize: d?.size ?? 24 }}>{t.title}</p>
              {d?.sub != null && <p className="cst__label-sub">{t.sub}</p>}
            </div>
          );
        })}

        {/* ---------------- Welcome ---------------- */}
        <main className={'cst__welcome' + (view === 'welcome' ? ' is-on' : '')} aria-hidden={view !== 'welcome'}>
          <p className="cst__eyebrow">Constellation · AI companion</p>
          <h1 className="cst__title">Every story becomes a star.</h1>
          <p className="cst__lede">
            Tell Wren what&apos;s on your mind. Over time, your stories form constellations — and the patterns behind them become easier to see.
          </p>
          <form className="cst__input" onSubmit={begin}>
            <input
              type="text" value={story} onChange={(e) => setStory(e.target.value)} maxLength={280}
              placeholder="Tell me a story from today…" aria-label="Tell me a story from today" autoComplete="off"
              tabIndex={view === 'welcome' ? 0 : -1}
            />
            <button type="submit" className="cst__btn" tabIndex={view === 'welcome' ? 0 : -1}>Light the first star</button>
          </form>
          <div className="cst__starters">
            {STARTERS.map((s) => (
              <button key={s} type="button" className="cst__pill" onClick={() => setStory(s)} tabIndex={view === 'welcome' ? 0 : -1}>{s}</button>
            ))}
          </div>
          <p className="cst__disclaimer">
            Wren is an AI, not a therapist, and can&apos;t diagnose. Your sky is private and can be deleted anytime (PDPA). In crisis, call 1323.
          </p>
        </main>

        {/* ---------------- Conversation ---------------- */}
        <section className={'cst__view' + (view === 'conv' ? ' is-on' : '')} aria-hidden={view !== 'conv'} aria-label="Conversation with Wren">
          <div className="cst__panel">
            <div className="cst__panel-head">
              <div>
                <p className="cst__wren">Wren</p>
                <p className="cst__sub">Tonight · adding to your sky</p>
              </div>
              <span className="cst__tag">AI · not a therapist</span>
            </div>
            <div className="cst__rule" />
            <div className="cst__msgs" ref={log} role="log" aria-live="polite" aria-label="Messages">
              {msgs.map((x) =>
                x.role === 'system' ? (
                  <div key={x.id} className="cst__sys">{x.text}</div>
                ) : (
                  <div key={x.id} className={'cst__row' + (x.role === 'you' ? ' is-you' : '')}>
                    <p className={'cst__bubble ' + (x.role === 'you' ? 'is-you' : 'is-wren')}>{x.text}</p>
                  </div>
                ),
              )}
            </div>
            <div className="cst__modes">
              <button type="button" className="cst__pill cst__pill--s" aria-pressed={listen} data-on={listen || undefined} onClick={() => setListen((v) => !v)} tabIndex={view === 'conv' ? 0 : -1}>Just listen</button>
              <button type="button" className="cst__pill cst__pill--s" onClick={() => setView('sky')} tabIndex={view === 'conv' ? 0 : -1}>Show patterns</button>
              <a className="cst__pill cst__pill--s" href="/drift?feel=anxious" tabIndex={view === 'conv' ? 0 : -1}>Breathe first</a>
            </div>
            <form className="cst__input cst__input--chat" onSubmit={submitChat}>
              <input
                type="text" value={chat} onChange={(e) => setChat(e.target.value)} maxLength={500}
                placeholder="Tell me a story from today…" aria-label="Message to Wren" autoComplete="off"
                tabIndex={view === 'conv' ? 0 : -1}
              />
              <button type="submit" className="cst__send" aria-label="Send" tabIndex={view === 'conv' ? 0 : -1}>→</button>
            </form>
            <button type="button" className="cst__crisis" onClick={openSafety} tabIndex={view === 'conv' ? 0 : -1}>
              In crisis? Call 1323 (24 h) · Get help now →
            </button>
          </div>

          {!mobile && (
            <div className="cst__controls">
              <button type="button" className="cst__pill cst__pill--c" aria-pressed={simple} data-on={simple || undefined} onClick={() => setSimple((v) => !v)} tabIndex={view === 'conv' ? 0 : -1}>Simple chat mode</button>
              <button type="button" className="cst__pill cst__pill--c" onClick={() => setView('sky')} tabIndex={view === 'conv' ? 0 : -1}>View whole sky</button>
            </div>
          )}
          {mobile && (
            <button type="button" className="cst__pill cst__pill--sky" onClick={() => setView('sky')} tabIndex={view === 'conv' ? 0 : -1}>Sky</button>
          )}

          {!mobile && tonight !== null && !simple && (
            <aside className="cst__card">
              <p className="cst__card-eyebrow">New star · tonight</p>
              <p className="cst__card-quote">“{tonight.length > 70 ? tonight.slice(0, 67) + '…' : tonight}”</p>
              <p className="cst__card-sub">Linked to {deskName}</p>
            </aside>
          )}
        </section>

        {/* ---------------- Sky overview ---------------- */}
        <section className={'cst__view' + (view === 'sky' ? ' is-on' : '')} aria-hidden={view !== 'sky'} aria-label="Your sky">
          <div className="cst__insight">
            {mobile ? (
              <>
                <p className="cst__insight-eyebrow">Pattern noticed</p>
                <p className="cst__insight-quote">In 4 of {deskCount} stories you said “not doing enough”.</p>
              </>
            ) : (
              <>
                <p className="cst__insight-eyebrow">Constellation · {deskCount} stars</p>
                {renaming ? (
                  <input
                    className="cst__rename" autoFocus value={deskName} maxLength={40} aria-label="Rename constellation"
                    onChange={(e) => setDeskName(e.target.value)}
                    onBlur={() => { if (!deskName.trim()) setDeskName(DESK); setRenaming(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
                  />
                ) : (
                  <h2 className="cst__insight-title">{deskName}</h2>
                )}
                <p className="cst__insight-body">
                  A pattern Wren noticed: in 4 of these {deskCount} stories you described yourself as “not doing enough”, even on days you finished a lot.
                </p>
                <p className="cst__insight-note">This is a reflection, not a diagnosis. You decide what it means.</p>
              </>
            )}
            <div className="cst__actions">
              <button type="button" className="cst__btn cst__btn--s" onClick={reflect} tabIndex={view === 'sky' ? 0 : -1}>Reflect with Wren</button>
              {!mobile && <button type="button" className="cst__pill cst__pill--r" onClick={() => setRenaming(true)} tabIndex={view === 'sky' ? 0 : -1}>Rename</button>}
            </div>
          </div>

          {!mobile && (
            <>
              <div className="cst__timeline">
                <div
                  className="cst__track" ref={trackRef}
                  onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); dragTime(e.clientX); }}
                  onPointerMove={(e) => { if (e.buttons) dragTime(e.clientX); }}
                  role="slider" aria-label="Sky timeline" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(time * 100)}
                  tabIndex={view === 'sky' ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') setTime((t) => Math.max(0, t - 0.03));
                    if (e.key === 'ArrowRight') setTime((t) => Math.min(1, t + 0.03));
                  }}
                >
                  <span className="cst__handle" style={{ left: `${time * 100}%` }} />
                </div>
                {['Jul', 'Aug', 'Sep', 'Oct'].map((mo, i) => (
                  <span key={mo} className="cst__month" style={{ left: `${(i / 3) * 100}%` }}>{mo}</span>
                ))}
              </div>
              <button type="button" className="cst__btn cst__btn--talk" onClick={() => setView('conv')} tabIndex={view === 'sky' ? 0 : -1}>Talk with Wren</button>
            </>
          )}
        </section>
      </div>

      {/* ---------------- Safety mode (full screen, no sky) ---------------- */}
      <Safety open={view === 'safety'} onBack={() => setView(back === 'safety' ? 'conv' : back)} />
    </div>
  );
}

function Safety({ open, onBack }: { open: boolean; onBack: () => void }) {
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => { if (open) first.current?.focus(); }, [open]);
  return (
    <div className={'cst__safety' + (open ? ' is-on' : '')} role="alertdialog" aria-modal={open} aria-hidden={!open} aria-labelledby="cst-safe-title">
      <div className="cst__calm" aria-hidden="true" />
      <div className="cst__safe">
        <p className="cst__safe-eyebrow">Pausing the sky for a moment</p>
        <h2 id="cst-safe-title" className="cst__safe-title">You don&apos;t have to carry this alone.</h2>
        <p className="cst__safe-body">
          It sounds like things feel really heavy right now. I&apos;m an AI, so I want to make sure you can reach a real person who can help straight away.
        </p>
        <a ref={first} className="cst__action is-primary" href="tel:1323" tabIndex={open ? 0 : -1}>
          <span><strong>Call 1323</strong><small>Mental health hotline · free, 24 hours</small></span><span aria-hidden="true">→</span>
        </a>
        <a className="cst__action" href="tel:1669" tabIndex={open ? 0 : -1}>
          <span><strong>Call 1669</strong><small>Emergency medical services</small></span><span aria-hidden="true">→</span>
        </a>
        <a className="cst__action" href="/#contact" tabIndex={open ? 0 : -1}>
          <span><strong>Talk to an Everwell psychologist</strong><small>Book the next available session</small></span><span aria-hidden="true">→</span>
        </a>
        <button type="button" className="cst__safe-back" onClick={onBack} tabIndex={open ? 0 : -1}>I&apos;m safe — keep talking with me</button>
      </div>
    </div>
  );
}
