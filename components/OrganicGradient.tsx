'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createLoop, dpr } from '@/lib/loop';

/**
 * "What we support" backdrop — organic radial gradients.
 * Same technique as the organic-gradients-shader reference (simplex noise → sin() banding → colour),
 * recoloured with the Support list palette from Figma: mist, linen, paper, sage and clay.
 */
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
uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse;
uniform vec3 uC0, uC1, uC2; uniform vec2 uStops; uniform vec2 uDir; // base linear gradient (CSS angle)
uniform vec3 uPaper, uColA, uColB; uniform vec2 uPosA, uPosB; uniform vec2 uAmp; // accent glows (Figma radials)
${SNOISE}
float glow(vec2 pos){ return exp(-length((vUv - pos) * uRes * vec2(1.0, 1.3)) / uRes.x * 2.6); }
void main(){
  float asp = uRes.x / uRes.y;
  vec2 uv = vec2(vUv.x * asp, vUv.y);
  vec2 m = vec2(uMouse.x * asp, uMouse.y);
  float t = uTime;

  // soft pull toward the pointer so the field feels alive
  vec2 q = uv + (m - uv) * exp(-dot(uv - m, uv - m) * 2.5) * 0.06;

  float n  = snoise(vec3(q * 0.9, t * 0.07));                 // main organic noise
  float n2 = snoise(vec3(q * 1.6 + n * 0.6 + 7.0, t * 0.09)); // domain-warped second layer
  float waves = sin(n * 6.0 + t * 0.35) * 0.5 + 0.5;          // banding, as in the reference

  // base = the section's Figma linear gradient
  vec2 p = (vUv - 0.5) * uRes;
  float g = clamp(dot(p, uDir) / (abs(uRes.x * uDir.x) + abs(uRes.y * uDir.y)) + 0.5, 0.0, 1.0);
  vec3 col = mix(uC0, uC1, smoothstep(0.0, uStops.x, g));
  col = mix(col, uC2, smoothstep(uStops.x, uStops.y, g));
  col = mix(col, uPaper, smoothstep(0.1, 1.0, waves) * 0.4);

  // accent glows drifting with the noise
  col = mix(col, uColA, clamp(glow(uPosA) * uAmp.x * (1.0 + n2) + smoothstep(0.55, 1.0, n2) * uAmp.x * 0.3, 0.0, 0.45));
  col = mix(col, uColB, clamp(glow(uPosB) * uAmp.y * (1.0 + n)  + smoothstep(0.65, 1.0, -n2) * uAmp.y * 0.4, 0.0, 0.3));

  // very soft, wide paper glow along the band edges (blurred so it melts into the background)
  col = mix(col, uPaper, (1.0 - smoothstep(0.0, 0.3, abs(waves - 0.5))) * 0.07);
  gl_FragColor = vec4(col, 1.0);
}`;

// Palettes lifted from the Figma backgrounds of each section (sRGB hex, colour management is off).
const VARIANTS = {
  // Trust strip: 140° mist → cream → linen, sand glow top-right, paper glow left
  trust: { c: [0xe3eae0, 0xf4efe6, 0xeae3d6], stops: [0.54, 0.89], angle: 139.92, a: [0xddd3c1, [0.9, 1.0], 0.5], b: [0xfbf8f2, [0.2, 0.35], 0.6] },
  // Meet the team: 160° cream → mist → linen, sage pooling bottom-left, clay top-centre
  team: { c: [0xf4efe6, 0xe3eae0, 0xeae3d6], stops: [0.47, 0.78], angle: 159.97, a: [0x3b5342, [0.17, 0.0], 0.3], b: [0x7a5c46, [0.54, 1.0], 0.22] },
} as const;

export type OrganicVariant = keyof typeof VARIANTS;

export default function OrganicGradient({ variant = 'trust' }: { variant?: OrganicVariant }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current!, canvas = canvasRef.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false }); }
    catch { return; }                                    // no WebGL → CSS gradient on .slist-wrap remains
    renderer.setPixelRatio(Math.min(dpr(), 1.5));        // smooth gradients don't need full DPR
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const v = VARIANTS[variant], rad = (v.angle * Math.PI) / 180;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uC0: { value: new THREE.Color(v.c[0]) }, uC1: { value: new THREE.Color(v.c[1]) }, uC2: { value: new THREE.Color(v.c[2]) },
        uStops: { value: new THREE.Vector2(...v.stops) },
        uDir: { value: new THREE.Vector2(Math.sin(rad), Math.cos(rad)) },
        uPaper: { value: new THREE.Color(0xfbf8f2) },
        uColA: { value: new THREE.Color(v.a[0]) }, uPosA: { value: new THREE.Vector2(...v.a[1]) },
        uColB: { value: new THREE.Color(v.b[0]) }, uPosB: { value: new THREE.Vector2(...v.b[1]) },
        uAmp: { value: new THREE.Vector2(v.a[2], v.b[2]) },
      },
    });
    const geo = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geo, mat));

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false); mat.uniforms.uRes.value.set(w, h);
    };
    const ro = new ResizeObserver(resize); ro.observe(host); resize();

    const target = new THREE.Vector2(0.5, 0.5);
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const stop = createLoop(host, (t) => {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uMouse.value.lerp(target, 0.04);
      renderer.render(scene, cam);
    });
    return () => { stop(); ro.disconnect(); window.removeEventListener('pointermove', onMove); geo.dispose(); mat.dispose(); renderer.dispose(); };
  }, [variant]);

  return (
    <div ref={hostRef} className="fx" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
