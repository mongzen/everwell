'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createLoop, dpr } from '@/lib/loop';

/** Contact CTA backdrop — soft flowing ribbons plus drifting dust. */
export default function GlowField() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current!, canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(dpr()); renderer.setClearColor(0xeae3d6);
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const fieldMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(.5, .5) },
        uBg: { value: new THREE.Color(0xeae3d6) }, uPaper: { value: new THREE.Color(0xfbf8f2) },
        uSage: { value: new THREE.Color(0x8da593) }, uClay: { value: new THREE.Color(0xc48a6b) }, uMist: { value: new THREE.Color(0xb9c7bd) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        precision highp float; varying vec2 vUv;
        uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse;
        uniform vec3 uBg, uPaper, uSage, uClay, uMist;
        float ribbon(vec2 p, float base, float amp, float ph, float t){
          float y = base + sin(p.x * 2.2 + t * 0.35 + ph) * amp + sin(p.x * 4.1 - t * 0.22 + ph * 1.7) * amp * 0.45;
          return abs(p.y - y);
        }
        void main(){
          vec2 uv = vUv; float asp = uRes.x / uRes.y;
          vec2 p = vec2(uv.x * asp, uv.y); float t = uTime;
          vec2 m = vec2(uMouse.x * asp, uMouse.y);
          float md = length(p - m); float pull = exp(-md * md * 3.0) * 0.06;
          vec3 col = uBg;
          float halo = exp(-length((uv - vec2(0.5, 0.52)) * vec2(1.1, 1.7)) * 2.4);
          col = mix(col, uPaper, halo * 0.55);
          float g1 = ribbon(p, 0.50 + pull, 0.10, 0.0, t);
          float g2 = ribbon(p, 0.56 - pull, 0.08, 2.1, t);
          float g3 = ribbon(p, 0.44 + pull * 0.5, 0.09, 4.2, t);
          float a1 = exp(-g1 * 9.0) * 0.55, a2 = exp(-g2 * 11.0) * 0.45, a3 = exp(-g3 * 9.0) * 0.6;
          col = mix(col, uSage, clamp(a1 * 0.22, 0.0, 1.0));
          col = mix(col, uClay, clamp(a2 * 0.2, 0.0, 1.0));
          col = mix(col, uMist, clamp(a3 * 0.22, 0.0, 1.0));
          col = mix(col, uPaper, clamp(exp(-g1 * 90.0) * 0.8 + exp(-g2 * 100.0) * 0.6 + exp(-g3 * 80.0) * 0.6, 0.0, 0.9) * 0.45);
          col = mix(col, uPaper, exp(-md * md * 6.0) * 0.1);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const planeGeo = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(planeGeo, fieldMat));

    const COUNT = window.innerWidth < 800 ? 260 : 520;
    const pos = new Float32Array(COUNT * 3), seed = new Float32Array(COUNT), tint = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i*3] = Math.random(); pos[i*3+1] = 0.2 + 0.6 * (Math.random() + Math.random()) / 2; pos[i*3+2] = Math.random();
      seed[i] = Math.random() * 100; tint[i] = Math.floor(Math.random() * 4);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    pg.setAttribute('tint', new THREE.BufferAttribute(tint, 1));
    const pm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(.5, .5) }, uPR: { value: 1 } },
      vertexShader: `
        attribute float seed; attribute float tint;
        uniform float uTime; uniform vec2 uMouse; uniform float uPR;
        varying float vA; varying float vT;
        void main(){
          vec3 p = position; float t = uTime * 0.12;
          p.x += sin(t * 1.3 + seed) * 0.02 + t * 0.01 * (0.3 + p.z); p.x = fract(p.x);
          p.y += sin(t * 0.9 + seed * 1.7) * 0.025;
          vec2 ndc = vec2(p.x, p.y) * 2.0 - 1.0;
          vec2 mp = uMouse * 2.0 - 1.0; vec2 d = ndc - mp; float k = exp(-dot(d, d) * 6.0);
          ndc += normalize(d + 1e-4) * k * 0.03;
          gl_Position = vec4(ndc, 0.0, 1.0);
          gl_PointSize = (1.6 + p.z * 2.8) * uPR;
          vA = (0.25 + 0.55 * (0.5 + 0.5 * sin(uTime * 0.5 + seed * 3.0))) * (0.4 + p.z * 0.6);
          vT = tint;
        }`,
      fragmentShader: `
        precision highp float; varying float vA; varying float vT;
        void main(){
          vec2 c = gl_PointCoord - 0.5; float d = length(c);
          float a = smoothstep(0.5, 0.0, d) * vA;
          vec3 col = vT < 1.0 ? vec3(1.0) : (vT < 2.0 ? vec3(0.553, 0.647, 0.576) : (vT < 3.0 ? vec3(0.769, 0.541, 0.420) : vec3(1.0)));
          gl_FragColor = vec4(col, a * 0.6);
        }`,
    });
    scene.add(new THREE.Points(pg, pm));

    const mouse = new THREE.Vector2(.5, .5), target = new THREE.Vector2(.5, .5);
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    };
    window.addEventListener('pointermove', onMove);
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      fieldMat.uniforms.uRes.value.set(w, h); pm.uniforms.uPR.value = renderer.getPixelRatio();
    };
    const ro = new ResizeObserver(resize); ro.observe(host); resize();

    const stop = createLoop(host, (t) => {
      mouse.lerp(target, 0.03);
      fieldMat.uniforms.uTime.value = t; fieldMat.uniforms.uMouse.value.copy(mouse);
      pm.uniforms.uTime.value = t; pm.uniforms.uMouse.value.copy(mouse);
      renderer.render(scene, cam);
    });
    return () => { stop(); ro.disconnect(); window.removeEventListener('pointermove', onMove); planeGeo.dispose(); fieldMat.dispose(); pg.dispose(); pm.dispose(); renderer.dispose(); };
  }, []);

  return (
    <div ref={hostRef} className="fx" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
