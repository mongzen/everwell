import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/* ------------------------------------------------------------------ */
/*  Drift — jellyfish aquarium engine                                  */
/* ------------------------------------------------------------------ */

export type Mode = 'watch' | 'light' | 'breathe';
export type Species = 'moon' | 'crystal' | 'pink' | 'violet' | 'lantern';
export type Size = 'small' | 'medium' | 'large';

export const SPECIES: Record<Species, { color: string; name: string; note: string; tempo: number }> = {
  moon: { color: '#C4DEFF', name: 'Moon Jelly', note: 'Pale and slow. The calmest swimmer.', tempo: 1.25 },
  crystal: { color: '#82ECFF', name: 'Crystal Jelly', note: 'Glows blue-green when the light finds it.', tempo: 0.85 },
  pink: { color: '#FFA0CE', name: 'Pink Drifter', note: 'Long trailing arms, gentle pulse.', tempo: 0.95 },
  violet: { color: '#BA96FF', name: 'Violet Bell', note: 'Deep-water colour, wide soft bell.', tempo: 1.1 },
  lantern: { color: '#FFC482', name: 'Lantern Jelly', note: 'A warm amber glow for late nights.', tempo: 1.0 },
};

/**
 * Paced-breathing patterns (no breath holds).
 * - resonance: 5.5 s in / 5.5 s out ≈ 5.5 breaths per minute, the resonance-frequency
 *   rate used in HRV biofeedback (typical individual range 4.5–7 breaths/min).
 * - longExhale: 4 s in / 6 s out = 6 breaths per minute with a longer exhale.
 */
export type BreathPattern = { id: 'resonance' | 'longExhale'; inS: number; outS: number };
export const BREATH_PATTERNS: BreathPattern[] = [
  { id: 'resonance', inS: 5.5, outS: 5.5 },
  { id: 'longExhale', inS: 4, outS: 6 },
];

/** breath phase: { inhale, t (0..1 within the half), remaining seconds in the half } */
export function breathPhase(time: number, p: BreathPattern) {
  const cycle = p.inS + p.outS;
  const t = ((time % cycle) + cycle) % cycle;
  return t < p.inS
    ? { inhale: true, t: t / p.inS, remaining: p.inS - t }
    : { inhale: false, t: (t - p.inS) / p.outS, remaining: cycle - t };
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ---------------------------- shaders ----------------------------- */

const BELL_VERT = /* glsl */ `
  uniform float uC;      // contraction 0..1
  uniform float uFlare;  // rim flare after the stroke
  uniform float uSquish; // soft squash when touched
  uniform float uTime;
  uniform float uSeed;
  varying vec3 vObj;
  varying float vV;
  varying vec3 vN;
  varying vec3 vView;
  void main(){
    vec3 p = position;
    float v = clamp((1.0 - p.y) / 1.16, 0.0, 1.0);          // 0 top -> 1 rim
    float squeeze = 1.0 - uC * 0.26 * smoothstep(0.1, 1.0, v) + uFlare * 0.09 * smoothstep(0.55, 1.0, v);
    float ang = atan(p.z, p.x);
    float ripple = 1.0 + (0.02 + uFlare * 0.03) * sin(ang * 8.0 + uTime * 0.6 + uSeed) * smoothstep(0.6, 1.0, v)
                       + 0.012 * sin(ang * 3.0 - uTime * 0.4 + uSeed) * smoothstep(0.3, 1.0, v);
    p.xz *= squeeze * ripple;
    p.y = p.y * 0.68 * (1.0 + uC * 0.2) - uC * 0.1 * v + uFlare * 0.03 * v;
    p.xz *= 1.0 + uSquish * 0.16;
    p.y *= 1.0 - uSquish * 0.22;
    vObj = position;
    vV = v;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = -mv.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const BELL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  uniform float uGlow;
  uniform float uInner;
  varying vec3 vObj;
  varying float vV;
  varying vec3 vN;
  varying vec3 vView;
  void main(){
    float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.2);
    float ang = atan(vObj.z, vObj.x);
    float canals = pow(abs(cos(ang * 8.0)), 80.0) * smoothstep(0.08, 0.5, vV) * (1.0 - smoothstep(0.85, 1.0, vV));
    // four horseshoe gonads seen from above
    float gon = 0.0;
    for (int k = 0; k < 4; k++) {
      float a = float(k) * 1.5708 + 0.7854;
      vec2 c = vec2(cos(a), sin(a)) * 0.24;
      float d = abs(length(vObj.xz - c) - 0.11);
      gon += smoothstep(0.035, 0.0, d) * step(0.0, dot(normalize(vObj.xz - c + 1e-4), -normalize(c)) + 0.55);
    }
    gon *= 1.0 - smoothstep(0.25, 0.45, vV);
    float rim = smoothstep(0.86, 1.0, vV);
    vec3 col = uColor * (0.04 + fres * 0.5 + rim * 0.28 + canals * 0.2) + mix(uColor, vec3(1.0), 0.45) * gon * 0.4 + uColor * (1.0 - vV) * 0.05;
    col *= uInner;
    gl_FragColor = vec4(col * uAlpha * uGlow, 1.0);
  }
`;

const BG_VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const BG_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uAspect;
  uniform float uPulse;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  void main(){
    vec3 top = vec3(0.031, 0.086, 0.172);
    vec3 mid = vec3(0.016, 0.039, 0.102);
    vec3 bot = vec3(0.008, 0.016, 0.047);
    float y = vUv.y;
    vec3 col = mix(bot, mid, smoothstep(0.0, 0.55, y));
    col = mix(col, top, smoothstep(0.55, 1.0, y));
    // god rays: skewed bands from the surface
    float x = (vUv.x - 0.5) * uAspect + (1.0 - y) * 0.28;
    float rays = 0.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float c = -0.9 + fi * 0.38 + sin(uTime * 0.05 + fi * 1.7) * 0.05;
      float w = 0.05 + 0.03 * sin(fi * 2.3);
      rays += smoothstep(w, 0.0, abs(x - c)) * (0.6 + 0.4 * sin(uTime * 0.3 + fi * 1.3));
    }
    rays *= smoothstep(0.15, 1.0, y) * 0.045;
    // caustic shimmer near the surface
    float n = noise(vec2(vUv.x * 9.0 * uAspect, vUv.y * 4.0) + vec2(uTime * 0.08, uTime * 0.05));
    float caust = pow(n, 3.0) * smoothstep(0.75, 1.0, y) * 0.05;
    col += vec3(0.62, 0.84, 1.0) * (rays + caust) * (1.0 + uPulse * 1.6);
    col += vec3(0.05, 0.11, 0.18) * uPulse * 0.22 * smoothstep(0.0, 1.0, y);
    // vignette
    vec2 q = vUv - 0.5; q.x *= uAspect * 0.8;
    col *= 1.0 - smoothstep(0.35, 0.95, length(q)) * 0.65;
    gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
  }
`;

const SNOW_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSpeed;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPR;
  varying float vA;
  void main(){
    vec3 p = position;
    p.y = mod(p.y - uTime * aSpeed + 18.0, 36.0) - 18.0;
    p.x += sin(uTime * 0.2 + aSeed * 6.28) * 0.4;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPR * (30.0 / -mv.z);
    vA = 0.25 + 0.55 * fract(aSeed * 7.13);
    vA *= smoothstep(-40.0, -14.0, mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const SNOW_FRAG = /* glsl */ `
  varying float vA;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vA;
    gl_FragColor = vec4(vec3(0.6, 0.75, 1.0) * a * 0.6, 1.0);
  }
`;

const ORB_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOn;
  varying vec2 vUv;
  void main(){
    float d = length(vUv - 0.5) * 2.0;
    float core = smoothstep(0.08, 0.0, d);
    float halo = exp(-d * 6.0) * 0.45;
    float rings = 0.0;
    for (int i = 0; i < 3; i++) {
      float r = fract(uTime * 0.25 + float(i) / 3.0);
      rings += smoothstep(0.012, 0.0, abs(d - r)) * (1.0 - r) * 0.35;
    }
    vec3 col = vec3(0.75, 0.95, 1.0) * (halo + rings) + vec3(1.0) * core;
    gl_FragColor = vec4(col * uOn, 1.0);
  }
`;

/* ------------------------- title + glass lens ---------------------- */

// The intro title "Drift" is drawn into a texture and rendered in the scene, gently wobbling like liquid.
const TITLE_VERT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec3 p = position;
    p.z += (sin(p.x * 2.1 + uTime * 1.4) + sin(p.y * 3.3 - uTime * 1.1)) * 0.06;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const TITLE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uFade;
  varying vec2 vUv;
  void main(){
    vec2 uv = vUv;
    uv.x += sin(uv.y * 9.0 + uTime * 1.4) * 0.0035;
    uv.y += sin(uv.x * 7.0 - uTime * 1.1) * 0.004;
    float a = texture2D(uMap, uv).a;
    vec3 col = mix(vec3(0.86, 0.93, 1.0), vec3(0.96, 0.94, 0.9), uv.y);
    gl_FragColor = vec4(col * a * uFade * 0.92, a * uFade);
  }
`;

// Full-screen glass lens (post-process): a refracting sphere that follows the pointer,
// magnifies what is behind it and splits the colours at its rim (chromatic aberration).
const LENS_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uAspect: { value: 1 },
    uR: { value: 0.16 },
    uOn: { value: 0 },
    uTime: { value: 0 },
  },
  vertexShader: BG_VERT,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uMouse;
    uniform float uAspect, uR, uOn, uTime;
    varying vec2 vUv;
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      vec2 d = vUv - uMouse; d.x *= uAspect;
      float dist = length(d);
      float r = uR * (1.0 + 0.015 * sin(uTime * 1.3));
      if (uOn < 0.001 || dist > r * 1.25) { gl_FragColor = base; return; }
      float k = clamp(dist / r, 0.0, 1.0);
      float z = sqrt(max(1.0 - k * k, 0.0));                  // sphere height
      vec2 dir = d / max(dist, 1e-4);
      // magnify toward the centre, bend strongly near the rim
      vec2 local = d * mix(0.55, 1.0, k * k) - dir * (1.0 - z) * r * 0.25;
      float ca = 0.007 * k * k;                               // chromatic split grows at the edge
      vec2 toUv = vec2(1.0 / uAspect, 1.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uMouse + (local - dir * ca) * toUv).r;
      col.g = texture2D(tDiffuse, uMouse + local * toUv).g;
      col.b = texture2D(tDiffuse, uMouse + (local + dir * ca) * toUv).b;
      // glass: soft fresnel rim, a specular highlight, faint inner shade
      float rim = smoothstep(0.78, 1.0, k);
      col += vec3(0.75, 0.9, 1.0) * rim * 0.16;
      col += vec3(1.0) * exp(-length(d / r - vec2(-0.38, 0.42)) * 7.0) * 0.32;
      col *= 1.0 - smoothstep(0.96, 1.0, k) * 0.25;
      float inside = 1.0 - smoothstep(r * 0.985, r * 1.0, dist);
      // thin outer halo so the lens edge reads against the dark water
      float halo = smoothstep(r * 1.06, r, dist) * (1.0 - inside) * 0.12;
      vec3 outc = mix(base.rgb, col, inside) + vec3(0.7, 0.88, 1.0) * halo;
      gl_FragColor = vec4(mix(base.rgb, outc, uOn), 1.0);
    }
  `,
};

/* ---------------------------- jellyfish --------------------------- */

const TENTACLES = 24;
const T_SEG = 28;
const ARMS = 4;
const A_SEG = 22;
const BELL_GEO = new THREE.SphereGeometry(1, 72, 36, 0, Math.PI * 2, 0, Math.PI * 0.55);

class Jelly {
  group = new THREE.Group();
  vel = new THREE.Vector3();
  R: number;
  color: THREE.Color;
  period: number;
  offset = Math.random();
  seed = Math.random() * 100;
  c = 0;
  flare = 0;
  squish = 0;
  squishV = 0;
  boopGlow = 0;
  prevC = 0;
  glow = 1;
  targetQ = new THREE.Quaternion();
  wander = new THREE.Vector3();
  nextWander = 0;
  glowTarget = 1;
  fade = 0;
  dying = false;
  bellMat: THREE.ShaderMaterial;
  innerMat: THREE.ShaderMaterial;
  // level of detail: small (usually distant) jellies get fewer, shorter-simulated tentacles
  nT: number; nS: number; iters: number;
  tPos: Float32Array; tPrev: Float32Array; tLen: number[] = [];
  aPos: Float32Array; aPrev: Float32Array; aLen: number;
  tGeo = new THREE.BufferGeometry();
  aGeo = new THREE.BufferGeometry();
  lines: THREE.LineSegments;
  arms: THREE.Mesh;

  constructor(public scene: THREE.Scene, species: Species, R: number, pos: THREE.Vector3) {
    const sp = SPECIES[species];
    this.R = R;
    const small = R < 1.1;
    this.nT = small ? 14 : TENTACLES;
    this.nS = small ? 20 : T_SEG;
    this.iters = small ? 2 : 3;
    this.color = new THREE.Color(sp.color);
    this.period = sp.tempo * rand(6.5, 8.5);
    this.group.position.copy(pos);
    this.group.scale.setScalar(R);
    this.group.rotation.z = rand(-0.25, 0.25);
    this.group.rotation.x = rand(-0.15, 0.15);

    const uni = (inner: number) => ({
      uC: { value: 0 }, uFlare: { value: 0 }, uSquish: { value: 0 }, uTime: { value: 0 }, uSeed: { value: this.seed },
      uColor: { value: this.color }, uAlpha: { value: 0 }, uGlow: { value: 1 }, uInner: { value: inner },
    });
    const common = { vertexShader: BELL_VERT, fragmentShader: BELL_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide };
    this.bellMat = new THREE.ShaderMaterial({ ...common, uniforms: uni(1) });
    this.innerMat = new THREE.ShaderMaterial({ ...common, uniforms: uni(0.3) });
    const bell = new THREE.Mesh(BELL_GEO, this.bellMat);
    const inner = new THREE.Mesh(BELL_GEO, this.innerMat);
    inner.scale.set(0.78, 0.7, 0.78);
    inner.position.y = -0.06;
    this.group.add(bell, inner);
    scene.add(this.group);

    // tentacles (world-space verlet chains)
    this.tPos = new Float32Array(this.nT * this.nS * 3);
    this.tPrev = new Float32Array(this.nT * this.nS * 3);
    for (let i = 0; i < this.nT; i++) this.tLen.push(R * rand(5, 9) / (this.nS - 1));
    const segs = this.nT * (this.nS - 1) * 2;
    this.tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs * 3), 3));
    this.tGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(segs * 3), 3));
    this.lines = new THREE.LineSegments(this.tGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.lines.frustumCulled = false;
    scene.add(this.lines);

    // oral arms (frilly ribbons)
    this.aPos = new Float32Array(ARMS * A_SEG * 3);
    this.aPrev = new Float32Array(ARMS * A_SEG * 3);
    this.aLen = (R * 3.4) / (A_SEG - 1);
    const verts = ARMS * A_SEG * 2;
    this.aGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    this.aGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    const idx: number[] = [];
    for (let a = 0; a < ARMS; a++) for (let j = 0; j < A_SEG - 1; j++) {
      const b = (a * A_SEG + j) * 2;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
    this.aGeo.setIndex(idx);
    this.arms = new THREE.Mesh(this.aGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.arms.frustumCulled = false;
    scene.add(this.arms);

    this.group.updateMatrixWorld();
    const tmp = new THREE.Vector3();
    for (let i = 0; i < this.nT; i++) {
      this.anchorT(i, tmp);
      for (let j = 0; j < this.nS; j++) {
        const k = (i * this.nS + j) * 3;
        this.tPos[k] = this.tPrev[k] = tmp.x; this.tPos[k + 1] = this.tPrev[k + 1] = tmp.y - j * this.tLen[i]; this.tPos[k + 2] = this.tPrev[k + 2] = tmp.z;
      }
    }
    for (let a = 0; a < ARMS; a++) {
      this.anchorA(a, tmp);
      for (let j = 0; j < A_SEG; j++) {
        const k = (a * A_SEG + j) * 3;
        this.aPos[k] = this.aPrev[k] = tmp.x; this.aPos[k + 1] = this.aPrev[k + 1] = tmp.y - j * this.aLen; this.aPos[k + 2] = this.aPrev[k + 2] = tmp.z;
      }
    }
  }

  private anchorT(i: number, out: THREE.Vector3) {
    const a = (i / this.nT) * Math.PI * 2;
    const r = 0.97 * (1 - this.c * 0.26 + this.flare * 0.09);
    const y = -0.157 * 0.68 * (1 + this.c * 0.2) - this.c * 0.1 + this.flare * 0.03;
    out.set(Math.cos(a) * r, y, Math.sin(a) * r).applyMatrix4(this.group.matrixWorld);
  }
  private anchorA(a: number, out: THREE.Vector3) {
    const ang = (a / ARMS) * Math.PI * 2 + 0.4;
    out.set(Math.cos(ang) * 0.14, -0.05, Math.sin(ang) * 0.14).applyMatrix4(this.group.matrixWorld);
  }

  update(t: number, dt: number, ctx: { mode: Mode; pulse: number; breathC: number | null; bounds: (z: number) => { w: number; h: number }; light: THREE.Vector3 | null; plankton: THREE.Vector3[] }) {
    // swim cycle
    this.prevC = this.c;
    if (ctx.breathC !== null) this.c += (ctx.breathC - this.c) * Math.min(1, dt * 6);
    else {
      const p = ((t / this.period + this.offset) % 1 + 1) % 1;
      this.c = p < 0.28 ? Math.pow(Math.sin((Math.PI / 2) * (p / 0.28)), 2) : 1 - smooth(0.28, 0.9, p);
      this.flare = Math.sin(Math.PI * clamp((p - 0.3) / 0.45, 0, 1)) * 0.8;
    }
    if (ctx.breathC !== null) this.flare += ((ctx.breathC < this.prevC ? 0.6 : 0) - this.flare) * Math.min(1, dt * 1.5);
    const dc = this.c - this.prevC;
    const pos = this.group.position;
    const b = ctx.bounds(pos.z);

    // wander: each jelly slowly heads for its own point somewhere on screen, then picks a new one
    if (t > this.nextWander || pos.distanceTo(this.wander) < this.R * 1.5) {
      this.wander.set(rand(-0.85, 0.85) * b.w, rand(-0.6, 0.45) * b.h, clamp(pos.z + rand(-3, 3), -18, 5));
      this.nextWander = t + rand(18, 34);
    }
    const goal = ctx.light ?? this.wander;
    const toGoal = goal.clone().sub(pos);
    const dy = toGoal.y;

    // stroke strength depends on where it wants to go: strong when the goal is above, light when below
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion);
    const thrust = 0.35 + 1.25 * smooth(-4, 3, dy);
    if (dc > 0) this.vel.addScaledVector(up, dc * thrust);

    // flow field + gentle sink (sinks a little faster when it should go down)
    this.vel.x += Math.sin(pos.y * 0.15 + t * 0.03 + this.seed) * 0.04 * dt;
    this.vel.z += Math.cos(pos.x * 0.12 + t * 0.02 + this.seed) * 0.03 * dt;
    this.vel.y -= (0.05 + 0.1 * smooth(0, -5, dy)) * dt;
    this.vel.x += clamp(toGoal.x * 0.012, -0.05, 0.05) * dt;
    this.vel.z += clamp(toGoal.z * 0.01, -0.04, 0.04) * dt;

    // light and plankton
    // squishy spring after a touch: squash, overshoot, settle
    this.squishV += (-38 * this.squish - 3.2 * this.squishV) * dt;
    this.squish += this.squishV * dt;
    this.boopGlow *= Math.exp(-0.9 * dt);
    this.glowTarget = 1 + ctx.pulse * 0.55 + this.boopGlow;
    if (ctx.light) {
      const dist = toGoal.length();
      if (dist > 2.5) this.vel.addScaledVector(toGoal.clone().normalize(), 0.08 * dt);
      this.glowTarget += 1.3 * Math.exp(-dist / 6);
    }
    for (const pk of ctx.plankton) if (pk.distanceTo(pos) < 6) this.glowTarget += 0.9;

    // soft bounds (bell stays well below the top edge so the whole jelly is visible)
    const mx = b.w - this.R * 1.5, top = b.h * 0.62 - this.R, bottom = -b.h * 0.7;
    if (pos.x > mx) this.vel.x -= (pos.x - mx) * 0.6 * dt;
    if (pos.x < -mx) this.vel.x -= (pos.x + mx) * 0.6 * dt;
    if (pos.y > top) this.vel.y -= (pos.y - top) * 1.2 * dt;
    if (pos.y < bottom) this.vel.y += (bottom - pos.y) * 0.5 * dt + 0.15 * dt;
    if (pos.z > 6) this.vel.z -= (pos.z - 6) * 0.5 * dt;
    if (pos.z < -18) this.vel.z += (-18 - pos.z) * 0.5 * dt;

    this.vel.multiplyScalar(Math.exp(-0.45 * dt));
    pos.addScaledVector(this.vel, dt * 1.2);

    // tilt the bell toward the goal (how jellyfish steer), never flipping upside down
    const heading = toGoal.clone().normalize().multiplyScalar(0.7).add(this.vel.clone().multiplyScalar(0.6));
    heading.y = Math.max(heading.y, 0) + 0.55;
    heading.x += Math.sin(t * 0.05 + this.seed) * 0.06;
    if (heading.lengthSq() > 1e-4) {
      this.targetQ.setFromUnitVectors(new THREE.Vector3(0, 1, 0), heading.normalize());
      this.group.quaternion.slerp(this.targetQ, Math.min(1, dt * 0.3));
    }
    this.group.updateMatrixWorld();

    // fade / glow
    this.fade = this.dying ? Math.max(0, this.fade - dt * 0.5) : Math.min(1, this.fade + dt * 0.5);
    this.glow += (this.glowTarget - this.glow) * Math.min(1, dt * 2);
    const depth = clamp((pos.z + 22) / 28, 0.22, 1);
    const alpha = this.fade * depth;
    for (const m of [this.bellMat, this.innerMat]) {
      m.uniforms.uC.value = this.c; m.uniforms.uFlare.value = this.flare; m.uniforms.uSquish.value = this.squish; m.uniforms.uTime.value = t; m.uniforms.uAlpha.value = alpha; m.uniforms.uGlow.value = this.glow;
    }

    this.simulate(t, dt, alpha);
  }

  private simulate(t: number, dt: number, alpha: number) {
    const tmp = new THREE.Vector3();
    const f = Math.min(dt * 60, 2);
    const damp = Math.pow(0.975, f);
    const g = -0.0005 * this.R * f * f;
    // tentacles
    for (let i = 0; i < this.nT; i++) {
      this.anchorT(i, tmp);
      const base = i * this.nS * 3;
      this.tPos[base] = tmp.x; this.tPos[base + 1] = tmp.y; this.tPos[base + 2] = tmp.z;
      for (let j = 1; j < this.nS; j++) {
        const k = base + j * 3;
        const sway = (Math.sin(t * 0.35 + i * 0.7 + j * 0.25 + this.seed) + 0.5 * Math.sin(t * 0.6 + j * 0.4 + i)) * 0.0009 * this.R * f;
        for (let a = 0; a < 3; a++) {
          const v = (this.tPos[k + a] - this.tPrev[k + a]) * damp;
          this.tPrev[k + a] = this.tPos[k + a];
          this.tPos[k + a] += v + (a === 1 ? g : a === 0 ? sway : sway * 0.5);
        }
      }
      for (let it = 0; it < this.iters; it++) for (let j = 1; j < this.nS; j++) this.constrain(this.tPos, base + (j - 1) * 3, base + j * 3, this.tLen[i], j === 1);
    }
    // arms
    for (let a = 0; a < ARMS; a++) {
      this.anchorA(a, tmp);
      const base = a * A_SEG * 3;
      this.aPos[base] = tmp.x; this.aPos[base + 1] = tmp.y; this.aPos[base + 2] = tmp.z;
      for (let j = 1; j < A_SEG; j++) {
        const k = base + j * 3;
        const sway = Math.sin(t * 0.3 + a * 1.9 + j * 0.3) * 0.0008 * this.R * f;
        for (let q = 0; q < 3; q++) {
          const v = (this.aPos[k + q] - this.aPrev[k + q]) * damp;
          this.aPrev[k + q] = this.aPos[k + q];
          this.aPos[k + q] += v + (q === 1 ? g * 0.8 : q === 0 ? sway : -sway * 0.6);
        }
      }
      for (let it = 0; it < 2; it++) for (let j = 1; j < A_SEG; j++) this.constrain(this.aPos, base + (j - 1) * 3, base + j * 3, this.aLen, j === 1);
    }
    this.writeGeometry(t, alpha);
  }

  private constrain(p: Float32Array, ia: number, ib: number, len: number, pinA: boolean) {
    const dx = p[ib] - p[ia], dy = p[ib + 1] - p[ia + 1], dz = p[ib + 2] - p[ia + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const diff = (d - len) / d;
    const wa = pinA ? 0 : 0.5, wb = pinA ? 1 : 0.5;
    p[ia] += dx * diff * wa; p[ia + 1] += dy * diff * wa; p[ia + 2] += dz * diff * wa;
    p[ib] -= dx * diff * wb; p[ib + 1] -= dy * diff * wb; p[ib + 2] -= dz * diff * wb;
  }

  private writeGeometry(t: number, alpha: number) {
    const lp = this.tGeo.attributes.position.array as Float32Array;
    const lc = this.tGeo.attributes.color.array as Float32Array;
    const { r, g, b } = this.color;
    const k0 = alpha * Math.min(1.6, this.glow) * 0.38;
    let o = 0;
    for (let i = 0; i < this.nT; i++) for (let j = 0; j < this.nS - 1; j++) {
      for (let e = 0; e < 2; e++) {
        const src = (i * this.nS + j + e) * 3;
        lp[o] = this.tPos[src]; lp[o + 1] = this.tPos[src + 1]; lp[o + 2] = this.tPos[src + 2];
        const fade = Math.pow(1 - (j + e) / (this.nS - 1), 1.4) * k0;
        lc[o] = r * fade; lc[o + 1] = g * fade; lc[o + 2] = b * fade;
        o += 3;
      }
    }
    this.tGeo.attributes.position.needsUpdate = true;
    this.tGeo.attributes.color.needsUpdate = true;

    const ap = this.aGeo.attributes.position.array as Float32Array;
    const ac = this.aGeo.attributes.color.array as Float32Array;
    const ka = alpha * Math.min(1.6, this.glow) * 0.22;
    o = 0;
    for (let a = 0; a < ARMS; a++) for (let j = 0; j < A_SEG; j++) {
      const k = (a * A_SEG + j) * 3;
      const kn = (a * A_SEG + Math.min(A_SEG - 1, j + 1)) * 3, kp = (a * A_SEG + Math.max(0, j - 1)) * 3;
      const tx = this.aPos[kn] - this.aPos[kp], ty = this.aPos[kn + 1] - this.aPos[kp + 1];
      const l = Math.hypot(tx, ty) || 1;
      const s = j / (A_SEG - 1);
      const w = this.R * 0.24 * (1 - s * 0.75) * (0.7 + 0.5 * Math.sin(j * 1.1 + t * 0.7 + a));
      const nx = -ty / l * w, ny = tx / l * w;
      const fade = Math.pow(1 - s, 1.2) * ka;
      for (let side = -1; side <= 1; side += 2) {
        ap[o] = this.aPos[k] + nx * side; ap[o + 1] = this.aPos[k + 1] + ny * side; ap[o + 2] = this.aPos[k + 2];
        const edge = side > 0 ? 1.0 : 0.55;
        ac[o] = r * fade * edge; ac[o + 1] = g * fade * edge; ac[o + 2] = b * fade * edge;
        o += 3;
      }
    }
    this.aGeo.attributes.position.needsUpdate = true;
    this.aGeo.attributes.color.needsUpdate = true;
  }

  /** gentle touch: squash the bell, glow, and float a little away from the finger */
  boop(from: THREE.Vector3) {
    this.squishV += 3.2;
    this.boopGlow = 0.65;
    const away = this.group.position.clone().sub(from); away.z = 0;
    if (away.lengthSq() > 1e-4) this.vel.addScaledVector(away.normalize(), 0.25);
    this.vel.y += 0.35;
  }

  dispose() {
    this.scene.remove(this.group, this.lines, this.arms);
    this.bellMat.dispose(); this.innerMat.dispose();
    this.tGeo.dispose(); this.aGeo.dispose();
    (this.lines.material as THREE.Material).dispose(); (this.arms.material as THREE.Material).dispose();
  }
}

/* ---------------------------- aquarium ---------------------------- */

const SIZE_R: Record<Size, [number, number]> = { small: [0.7, 1.0], medium: [1.2, 1.6], large: [1.9, 2.4] };

export class Aquarium {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  jellies: Jelly[] = [];
  mode: Mode = 'watch';
  breath: BreathPattern = BREATH_PATTERNS[0];
  breathStart = 0;
  audioLevel = 0;
  pulse = 0;
  clock = new THREE.Clock();
  time = 0;
  raf = 0;
  running = true;
  reduced = false;
  max: number;
  onCount?: (n: number) => void;

  bg: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  snow: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  orb: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  light = new THREE.Vector3(0, 0, 0);
  lightTarget = new THREE.Vector3(0, 0, 0);
  pointerActive = false;
  title: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
  intro = true;
  lensPass!: ShaderPass;
  lensTarget = new THREE.Vector2(0.5, 0.5);
  titleCenter = new THREE.Vector2(0.5, 0.5);
  lastPointer = -10;
  bursts: { pts: THREE.Points; vel: Float32Array; life: number; center: THREE.Vector3; rate: number; feed: boolean }[] = [];

  constructor(public canvas: HTMLCanvasElement) {
    const mobile = window.innerWidth < 760;
    // tank capacity: jellies are never removed, adding simply stops when the tank is full
    this.max = mobile ? 40 : 100;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x02040c, 1);
    this.camera.position.set(0, 0, 30);

    // background plane locked to the camera
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: BG_FRAG, uniforms: { uTime: { value: 0 }, uAspect: { value: 1 }, uPulse: { value: 0 } }, depthWrite: false }));
    this.bg.renderOrder = -1;
    this.camera.add(this.bg);
    this.bg.position.z = -150;
    this.scene.add(this.camera);

    // marine snow
    const N = mobile ? 700 : 1500;
    const sp = new Float32Array(N * 3), ss = new Float32Array(N), sv = new Float32Array(N), sd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      sp[i * 3] = rand(-34, 34); sp[i * 3 + 1] = rand(-18, 18); sp[i * 3 + 2] = rand(-30, 12);
      ss[i] = rand(1, 3); sv[i] = rand(0.15, 0.45); sd[i] = Math.random();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aSize', new THREE.BufferAttribute(ss, 1));
    sg.setAttribute('aSpeed', new THREE.BufferAttribute(sv, 1));
    sg.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    this.snow = new THREE.Points(sg, new THREE.ShaderMaterial({ vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG, uniforms: { uTime: { value: 0 }, uPR: { value: this.renderer.getPixelRatio() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);

    // light orb
    this.orb = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.ShaderMaterial({ vertexShader: BG_VERT, fragmentShader: ORB_FRAG, uniforms: { uTime: { value: 0 }, uOn: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.orb);

    // post
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), this.reduced ? 0.4 : 0.65, 0.55, 0.12);
    this.composer.addPass(this.bloom);
    this.lensPass = new ShaderPass(LENS_SHADER);
    this.composer.addPass(this.lensPass);
    this.composer.addPass(new OutputPass());

    this.resize();
    const start: [Species, Size][] = mobile
      ? [['moon', 'large'], ['moon', 'medium'], ['pink', 'small'], ['crystal', 'small'], ['violet', 'small']]
      : [['moon', 'large'], ['moon', 'medium'], ['pink', 'medium'], ['violet', 'large'], ['crystal', 'small'], ['moon', 'small'], ['lantern', 'small'], ['violet', 'small']];
    for (const [s, z] of start) this.spawn(s, z, false);
    for (const j of this.jellies) j.fade = 0.0;

    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVis);
    this.loop();
  }

  bounds = (z: number) => {
    const d = this.camera.position.z - z;
    const h = Math.tan((this.camera.fov * Math.PI) / 360) * d;
    return { w: h * this.camera.aspect, h };
  };

  /** adds a jelly unless the tank is full; returns false when there is no room */
  spawn(species: Species, size: Size, fromBelow = true) {
    if (this.jellies.length >= this.max) return false;
    const [a, b] = SIZE_R[size];
    const R = rand(a, b) * (window.innerWidth < 760 ? 0.72 : 1);
    const z = size === 'large' ? rand(-2, 5) : size === 'medium' ? rand(-8, 2) : rand(-18, -4);
    const bd = this.bounds(z);
    const pos = new THREE.Vector3(rand(-bd.w * 0.8, bd.w * 0.8), fromBelow ? -bd.h - R * 3 : rand(-bd.h * 0.7, bd.h * 0.7), z);
    const j = new Jelly(this.scene, species, R, pos);
    if (fromBelow) j.vel.y = 0.7;
    this.jellies.push(j);
    this.onCount?.(this.jellies.length);
    return true;
  }

  setMode(m: Mode) {
    if (m === 'breathe' && this.mode !== 'breathe') this.breathStart = this.time;
    this.mode = m;
  }
  setBreath(p: BreathPattern) { this.breath = p; this.breathStart = this.time; }
  breathState() { return breathPhase(this.time - this.breathStart, this.breath); }
  setAudioLevel(v: number) { this.audioLevel = v; }

  pointer(x: number, y: number) {
    const v = new THREE.Vector3((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1, 0.5).unproject(this.camera);
    const dir = v.sub(this.camera.position).normalize();
    const t = (0 - this.camera.position.z) / dir.z;
    this.lightTarget.copy(this.camera.position).addScaledVector(dir, t);
    this.pointerActive = true;
    this.lensTarget.set(x / window.innerWidth, 1 - y / window.innerHeight);
    this.lastPointer = this.time;
  }

  releasePlankton() {
    if (this.mode !== 'light') return;
    const n = 260;
    const p = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = this.light.x; p[i * 3 + 1] = this.light.y; p[i * 3 + 2] = this.light.z;
      const a = Math.random() * Math.PI * 2, u = rand(-1, 1), s = rand(0.6, 2.4);
      vel[i * 3] = Math.cos(a) * Math.sqrt(1 - u * u) * s; vel[i * 3 + 1] = u * s; vel[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - u * u) * s;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbff4ff, size: 0.12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.bursts.push({ pts, vel, life: 1, center: this.light.clone(), rate: 1 / 5, feed: true });
  }

  /** screen-space hit test against each bell (front-most wins) */
  pick(x: number, y: number) {
    const w = window.innerWidth, h = window.innerHeight;
    let best: Jelly | null = null, bestZ = -Infinity;
    for (const j of this.jellies) {
      if (j.dying || j.fade < 0.3) continue;
      const c = j.group.position.clone().project(this.camera);
      const sx = (c.x + 1) / 2 * w, sy = (1 - c.y) / 2 * h;
      const dist = this.camera.position.distanceTo(j.group.position);
      const rpx = (j.R / (Math.tan((this.camera.fov * Math.PI) / 360) * dist)) * (h / 2);
      const dx = x - sx, dy = y - sy;
      // bell plus the upper part of the tentacles
      const inside = (dx * dx) / (rpx * rpx * 1.4) + ((dy > 0 ? dy * 0.45 : dy) ** 2) / (rpx * rpx * 1.1) < 1;
      if (inside && j.group.position.z > bestZ) { best = j; bestZ = j.group.position.z; }
    }
    return best;
  }

  /** returns the touched jelly's colour (for the sound), or null */
  boop(x: number, y: number): string | null {
    const j = this.pick(x, y);
    if (!j) return null;
    const v = new THREE.Vector3((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1, 0.5).unproject(this.camera);
    const dir = v.sub(this.camera.position).normalize();
    const hit = this.camera.position.clone().addScaledVector(dir, (j.group.position.z - this.camera.position.z) / dir.z);
    j.boop(hit);
    // a few soft sparkles in the jelly's colour
    const n = 46, p = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = hit.x; p[i * 3 + 1] = hit.y; p[i * 3 + 2] = hit.z;
      const a = Math.random() * Math.PI * 2, s = rand(0.3, 1.1) * j.R;
      vel[i * 3] = Math.cos(a) * s; vel[i * 3 + 1] = Math.sin(a) * s + 0.4; vel[i * 3 + 2] = rand(-0.3, 0.3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: j.color.clone().lerp(new THREE.Color(1, 1, 1), 0.4), size: 0.14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.bursts.push({ pts, vel, life: 1, center: hit, rate: 1 / 2.5, feed: false });
    return '#' + j.color.getHexString();
  }

  /** draw the intro title in WebGL exactly over the DOM heading (which then becomes transparent) */
  setTitle(text: string, rect: DOMRect, fontPx: number, fontFamily: string) {
    const pad = 1.7, dprS = Math.min(window.devicePixelRatio, 2);
    const cw = Math.ceil(rect.width * 1.2 * dprS), ch = Math.ceil(rect.height * pad * dprS);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `300 ${fontPx * dprS}px ${fontFamily}`;
    g.fillText(text, cw / 2, ch / 2 + fontPx * dprS * 0.04);
    const tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    if (!this.title) {
      const mat = new THREE.ShaderMaterial({ vertexShader: TITLE_VERT, fragmentShader: TITLE_FRAG, transparent: true, depthWrite: false,
        uniforms: { uMap: { value: tex }, uTime: { value: 0 }, uFade: { value: 1 } } });
      this.title = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 48, 12), mat);
      this.title.renderOrder = 5;
      this.camera.add(this.title);
    } else {
      this.title.material.uniforms.uMap.value.dispose();
      this.title.material.uniforms.uMap.value = tex;
    }
    // place it in camera space at a fixed distance so it stays locked to the DOM layout
    const D = 22, hh = Math.tan((this.camera.fov * Math.PI) / 360) * D, ww = hh * this.camera.aspect;
    const W = window.innerWidth, H = window.innerHeight;
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    this.title.position.set((cx / W * 2 - 1) * ww, -(cy / H * 2 - 1) * hh, -D);
    this.title.scale.set((cw / dprS) / W * 2 * ww, (ch / dprS) / H * 2 * hh, 1);
    this.titleCenter.set(cx / W, 1 - cy / H);
    this.lensPass.uniforms.uR.value = Math.min(0.2, Math.max(0.11, (rect.height * 0.62) / H));
    if (this.lastPointer < 0) this.lensTarget.copy(this.titleCenter);
  }
  setIntro(on: boolean) { this.intro = on; }

  resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const ph = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * 150;
    this.bg.scale.set(ph * this.camera.aspect * 1.05, ph * 1.05, 1);
    this.bg.material.uniforms.uAspect.value = this.camera.aspect;
  };

  onVis = () => {
    this.running = !document.hidden;
    if (this.running) { this.clock.getDelta(); this.loop(); } else cancelAnimationFrame(this.raf);
  };

  loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 1 / 20) * (this.reduced ? 0.55 : 1);
    this.time += dt;
    const t = this.time;

    // camera sway
    this.camera.position.x = Math.sin(t * 0.02) * 0.6;
    this.camera.position.y = Math.sin(t * 0.015) * 0.4;
    this.camera.lookAt(0, 0, 0);

    // breath-synced contraction
    let breathC: number | null = null;
    let breathLight = 0;
    if (this.mode === 'breathe') {
      const b = breathPhase(t - this.breathStart, this.breath);
      breathLight = b.inhale ? 0.5 - 0.5 * Math.cos(Math.PI * b.t) : 0.5 + 0.5 * Math.cos(Math.PI * b.t);
      breathC = b.inhale ? 0.45 * (1 - smooth(0, 1, b.t)) : (b.t < 0.2 ? 0.95 * smooth(0, 0.2, b.t) : 0.95 - 0.5 * smooth(0.2, 1, b.t));
    }

    // light orb
    const lightOn = this.mode === 'light';
    this.light.lerp(this.lightTarget, Math.min(1, dt * 3));
    this.orb.position.copy(this.light);
    const om = this.orb.material.uniforms;
    om.uTime.value = t;
    om.uOn.value += ((lightOn ? 1 : 0) - om.uOn.value) * Math.min(1, dt * 3);

    // plankton bursts
    const centers: THREE.Vector3[] = [];
    this.bursts = this.bursts.filter((b) => {
      b.life -= dt * b.rate;
      const arr = b.pts.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < arr.length; i++) { arr[i] += b.vel[i] * dt; b.vel[i] *= Math.exp(-1.2 * dt); }
      b.pts.geometry.attributes.position.needsUpdate = true;
      (b.pts.material as THREE.PointsMaterial).opacity = Math.max(0, b.life);
      if (b.life <= 0) { this.scene.remove(b.pts); b.pts.geometry.dispose(); (b.pts.material as THREE.Material).dispose(); return false; }
      if (b.feed) centers.push(b.center);
      return true;
    });

    // slow light swell: music level + (in Breathe) brighter on the in-breath. Smoothed so it never flickers.
    const target = Math.min(1, this.audioLevel * 1.4) * 0.7 + breathLight * 0.5;
    this.pulse += (target - this.pulse) * Math.min(1, dt * 1.2);
    this.bg.material.uniforms.uPulse.value = this.pulse;
    this.bloom.strength = (this.reduced ? 0.4 : 0.65) + this.pulse * 0.25;
    const ctx = { mode: this.mode, pulse: this.pulse, breathC, bounds: this.bounds, light: lightOn ? this.light : null, plankton: centers };
    // personal space: neighbours drift apart instead of piling up
    for (let i = 0; i < this.jellies.length; i++) for (let k = i + 1; k < this.jellies.length; k++) {
      const A = this.jellies[i], B = this.jellies[k];
      const d = A.group.position.clone().sub(B.group.position);
      const min = (A.R + B.R) * 1.8, dist = d.length();
      if (dist < min && dist > 1e-3) {
        d.multiplyScalar(((min - dist) / min) * 0.25 * dt / dist);
        A.vel.add(d); B.vel.sub(d);
      }
    }
    for (const j of this.jellies) j.update(t, dt, ctx);
    const before = this.jellies.length;
    this.jellies = this.jellies.filter((j) => { if (j.dying && j.fade <= 0) { j.dispose(); return false; } return true; });
    if (this.jellies.length !== before) this.onCount?.(this.jellies.filter((x) => !x.dying).length);

    // intro: wobbling title + glass lens (drifts around the title when the pointer is idle)
    const lu = this.lensPass.uniforms;
    lu.uOn.value += ((this.intro ? 1 : 0) - lu.uOn.value) * Math.min(1, dt * 2.5);
    if (this.intro && t - this.lastPointer > 3) {
      this.lensTarget.set(this.titleCenter.x + Math.sin(t * 0.35) * 0.12, this.titleCenter.y + Math.sin(t * 0.5) * 0.04);
    }
    lu.uMouse.value.lerp(this.lensTarget, Math.min(1, dt * 5));
    lu.uAspect.value = this.camera.aspect; lu.uTime.value = t;
    if (this.title) {
      const tm = this.title.material.uniforms;
      tm.uTime.value = t;
      tm.uFade.value += ((this.intro ? 1 : 0) - tm.uFade.value) * Math.min(1, dt * 2);
      this.title.visible = tm.uFade.value > 0.005;
    }
    this.bg.material.uniforms.uTime.value = t;
    this.snow.material.uniforms.uTime.value = t;
    this.composer.render();
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.onVis);
    for (const j of this.jellies) j.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
