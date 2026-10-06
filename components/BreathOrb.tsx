'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createLoop, dpr } from '@/lib/loop';

/**
 * Breath Ring as a living "AI voice" orb (Three.js).
 * - Breathes on the resonance pace: 5.5 s in (grows) / 5.5 s out (shrinks).
 * - The surface is the "Meet the team" palette (cream · mist · linen with sage and clay pools),
 *   slowly swirling inside the circle.
 * - The edge ripples like a voice assistant that is speaking; it leans toward and "listens" to the pointer.
 * - Soft listening waves drift outward from the edge.
 * Falls back to the CSS ring (.binv__breath) when WebGL is unavailable.
 */
const CYCLE = 11, HALF = CYCLE / 2;

const VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Ashima / Ian McEwan 3D simplex noise (MIT)
const SNOISE = /* glsl */`
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+10.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g; vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + C.yyy; vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0; vec4 s1 = floor(b1) * 2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uTime;    // seconds
uniform float uBreath;  // 0 = exhaled, 1 = inhaled
uniform float uVoice;   // 0..1 "speaking" energy
uniform vec2  uLean;    // pointer lean, -1..1
uniform float uPx;      // one pixel in uv units (for crisp edges)
${SNOISE}
const vec3 CREAM = vec3(0.957, 0.937, 0.902);
const vec3 MIST  = vec3(0.890, 0.918, 0.878);
const vec3 LINEN = vec3(0.918, 0.890, 0.839);
const vec3 PAPER = vec3(0.984, 0.973, 0.949);
const vec3 SAGE  = vec3(0.231, 0.325, 0.259);
const vec3 CLAY  = vec3(0.478, 0.361, 0.275);
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main(){
  vec2 p = (vUv - 0.5) * 2.0 - uLean * 0.035;
  float len = length(p), ang = atan(p.y, p.x);
  float t = uTime;

  // breathing radius (orb fills 1/1.3 of the canvas when fully inhaled)
  float R = 0.769 * mix(0.7, 1.0, uBreath);

  // edge stays a perfect circle; the "voice" only lives in the glow and the listening waves
  float edge = R;
  float aa = uPx * 2.0;
  float inside = smoothstep(edge + aa, edge - aa, len);

  // interior: Meet-the-team palette swirling inside the circle
  vec2 q = rot(t * 0.06) * (p / R);
  float n  = snoise(vec3(q * 0.6, t * 0.09));
  float n2 = snoise(vec3(q * 0.9 + n * 0.5 + 3.0, t * 0.11));
  vec3 col = mix(MIST, CREAM, smoothstep(-0.9, 0.9, q.y + n * 0.35));
  col = mix(col, LINEN, smoothstep(-0.2, 1.0, n2) * 0.45);
  col = mix(col, SAGE, smoothstep(0.2, 1.3, -q.x * 0.6 - q.y * 0.55 + n2 * 0.3) * (0.16 + 0.06 * uVoice));
  col = mix(col, CLAY, smoothstep(0.3, 1.3, q.x * 0.5 + q.y * 0.6 + n * 0.3) * 0.12);
  // soft light from the upper left + glassy rim
  col = mix(col, PAPER, exp(-length(q - vec2(-0.32, 0.38)) * 2.6) * 0.6);
  float rim = len / edge;
    col = mix(col, PAPER, smoothstep(0.93, 1.0, rim) * 0.35);

  // outside: breath-linked halo + listening waves drifting outward
  float out_ = max(len - edge, 0.0);
  float halo = exp(-out_ * 16.0) * (0.07 + 0.12 * uBreath + 0.06 * uVoice);
  float waves = 0.0;
  for (int i = 0; i < 3; i++) {
    float f = fract(t * 0.16 + float(i) / 3.0);
    float rr = edge + f * 0.3;
    waves += smoothstep(aa * 1.2, 0.0, abs(len - rr)) * (1.0 - f) * (1.0 - f) * 0.22;
  }
  float a = max(inside, (halo + waves) * (1.0 - inside));
  vec3 c = mix(PAPER, col, inside);
  gl_FragColor = vec4(c * a, a);   // premultiplied
}`;

const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);

export default function BreathOrb() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = host.current!, cv = canvas.current!;
    const ring = el.parentElement!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, premultipliedAlpha: true, antialias: false }); }
    catch { return; }                                    // keep the CSS ring
    ring.classList.add('has-gl');
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(dpr());
    const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: false, blending: THREE.NoBlending,
      uniforms: { uTime: { value: 0 }, uBreath: { value: 0 }, uVoice: { value: 0.4 }, uLean: { value: new THREE.Vector2() }, uPx: { value: 0.005 } },
    });
    const geo = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geo, mat));

    const resize = () => {
      const s = el.clientWidth;
      renderer.setSize(s, s, false);
      mat.uniforms.uPx.value = 2 / Math.max(1, s * renderer.getPixelRatio());
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    // pointer: lean toward it, and "listen" (more voice energy) when it is close
    const lean = new THREE.Vector2(), leanTarget = new THREE.Vector2();
    let near = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1, y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      const d = Math.hypot(x, y);
      leanTarget.set(x, y).clampLength(0, 1).multiplyScalar(d < 2 ? 1 : 0);
      near = d < 1.1 ? 1 : 0;
    };
    const onLeave = () => { leanTarget.set(0, 0); near = 0; };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    let voice = 0.4, phase = '';
    const stop = createLoop(el, (t) => {
      const c = t % CYCLE, inhale = c < HALF;
      const b = inhale ? ease(c / HALF) : 1 - ease((c - HALF) / HALF);
      // speech-like cadence: soft syllables that swell most at the turn of each breath
      const talk = 0.35 + 0.65 * Math.abs(Math.sin(t * 3.1) * Math.sin(t * 1.7 + 0.6));
      const target = 0.25 + 0.45 * talk * (0.6 + 0.4 * Math.sin(Math.PI * (c % HALF) / HALF)) + near * 0.35;
      voice += (target - voice) * 0.08;
      lean.lerp(leanTarget, 0.05);
      const u = mat.uniforms;
      u.uTime.value = t; u.uBreath.value = b; u.uVoice.value = voice; u.uLean.value.copy(lean);
      renderer.render(scene, cam);
      const ph = inhale ? 'in' : 'out';
      if (ph !== phase) { phase = ph; ring.dataset.phase = ph; }
    });

    return () => {
      stop(); ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      ring.classList.remove('has-gl');
      geo.dispose(); mat.dispose(); renderer.dispose();
    };
  }, []);

  return (
    <div ref={host} className="binv__orb" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
