'use client';
import { useEffect } from 'react';
import * as THREE from 'three';
import { createLoop, dpr } from '@/lib/loop';

/**
 * Meet-the-team WebGL layer.
 * One persistent canvas draws every therapist photo as a plane that tracks its DOM slot
 * (getBoundingClientRect each frame). The DOM <img> stays in place for layout, SEO and fallback.
 * Effects: noisy wipe-in reveal, velocity-driven bend + RGB split while scrolling, hover zoom.
 */
const VERT = `
uniform float uVel; uniform float uHover; varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 p = position;
  float bell = sin(uv.x * 3.14159265);
  p.y += uVel * bell * 0.10;               // bow the card while the slider moves
  p.y += (uv.x - 0.5) * uVel * 0.06;       // slight skew toward travel direction
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FRAG = `
precision highp float;
uniform sampler2D uTex; uniform float uReveal; uniform float uVel; uniform float uHover; uniform float uAlpha;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec2 uv = (vUv - 0.5) * (1.0 - 0.06 * uHover) + 0.5;      // hover zoom
  float s = clamp(uVel, -1.0, 1.0) * 0.012;                  // RGB split from scroll speed
  vec3 c = vec3(texture2D(uTex, uv + vec2(s, 0.0)).r, texture2D(uTex, uv).g, texture2D(uTex, uv - vec2(s, 0.0)).b);
  // wipe-in from the bottom with a noisy edge, scaled so reveal 0 → nothing, 1 → everything
  float n = noise(vUv * vec2(5.0, 7.0));
  float edge = (1.0 - vUv.y) * 0.7 + n * 0.35;
  float m = smoothstep(0.0, 0.12, uReveal * 1.5 - edge);
  gl_FragColor = vec4(c * m, m) * uAlpha;                   // premultiplied
}`;

type Plane = { el: HTMLImageElement; mesh: THREE.Mesh; mat: THREE.ShaderMaterial; ready: boolean; reveal: number; started: number; hover: number; hoverT: number };

export default function TeamGL({ track }: { track: React.RefObject<HTMLDivElement> }) {
  useEffect(() => {
    const slider = track.current; if (!slider) return;
    const host = slider.parentElement as HTMLElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer;
    const canvas = document.createElement('canvas');
    canvas.className = 'team__gl'; canvas.setAttribute('aria-hidden', 'true');
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: true }); }
    catch { return; }                                        // no WebGL → DOM images remain
    host.appendChild(canvas);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
    const geo = new THREE.PlaneGeometry(1, 1, 24, 1);
    const loader = new THREE.TextureLoader();
    let W = 1, H = 1;
    const planes: Plane[] = [];
    slider.querySelectorAll<HTMLImageElement>('img.card__cover').forEach((el) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTex: { value: null }, uReveal: { value: 0 }, uVel: { value: 0 }, uHover: { value: 0 }, uAlpha: { value: 1 } },
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      });
      const mesh = new THREE.Mesh(geo, mat); mesh.visible = false; scene.add(mesh);
      const p: Plane = { el, mesh, mat, ready: false, reveal: reduce ? 1 : 0, started: -1, hover: 0, hoverT: 0 };
      planes.push(p);
      loader.load(el.currentSrc || el.src, (tex) => {
        tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
        mat.uniforms.uTex.value = tex; p.ready = true; el.style.opacity = '0';   // hide DOM copy once GL has it
      });
    });

    const place = () => {
      const s = slider.getBoundingClientRect(), t = host.getBoundingClientRect();
      W = Math.max(1, s.width); H = Math.max(1, s.height);
      canvas.style.left = `${s.left - t.left}px`; canvas.style.top = `${s.top - t.top}px`;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      renderer.setPixelRatio(dpr()); renderer.setSize(W, H, false);
      cam.right = W; cam.top = H; cam.updateProjectionMatrix();
    };
    place();
    const ro = new ResizeObserver(place); ro.observe(slider); ro.observe(host);

    let lastX = 0, vel = 0, mouse: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => { const s = slider.getBoundingClientRect(); mouse = { x: e.clientX - s.left, y: e.clientY - s.top }; };
    const onLeave = () => { mouse = null; };
    slider.addEventListener('pointermove', onMove); slider.addEventListener('pointerleave', onLeave);

    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    let order = 0;
    const stop = createLoop(host, () => {
      const now = performance.now();
      const first = planes.find((q) => q.ready);                  // slide speed = how far the first card moved this frame
      const lx = first ? first.el.getBoundingClientRect().left : 0;
      const dx = lastX ? lastX - lx : 0; lastX = lx;
      vel += ((reduce ? 0 : Math.max(-1, Math.min(1, dx / 60))) - vel) * 0.15;
      const s = slider.getBoundingClientRect();
      for (const p of planes) {
        if (!p.ready) continue;
        const r = p.el.getBoundingClientRect();
        const x = r.left - s.left, y = r.top - s.top;
        const onScreen = x < W && x + r.width > 0;
        p.mesh.visible = onScreen;
        if (!onScreen) continue;
        p.mesh.scale.set(r.width, r.height, 1);
        p.mesh.position.set(x + r.width / 2, H - (y + r.height / 2), 0);
        // reveal once, as soon as at least ~30% of the card is inside the visible slider area
        if (p.started < 0 && x < W * 0.9 && !reduce) { p.started = now + (order++ % 4) * 140; }
        if (p.started >= 0 && p.reveal < 1) p.reveal = Math.min(1, Math.max(0, (now - p.started) / 1300));
        p.hoverT = mouse && mouse.x >= x && mouse.x <= x + r.width && mouse.y >= y && mouse.y <= y + r.height ? 1 : 0;
        p.hover += (p.hoverT - p.hover) * 0.1;
        const u = p.mat.uniforms; u.uReveal.value = ease(p.reveal); u.uVel.value = vel; u.uHover.value = p.hover;
      }
      renderer.render(scene, cam);
    });

    return () => {
      stop(); ro.disconnect();
      slider.removeEventListener('pointermove', onMove); slider.removeEventListener('pointerleave', onLeave);
      planes.forEach((p) => { p.el.style.opacity = ''; p.mat.uniforms.uTex.value?.dispose(); p.mat.dispose(); });
      geo.dispose(); renderer.dispose(); canvas.remove();
    };
  }, [track]);
  return null;
}
