'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createLoop, dpr } from '@/lib/loop';

/** "What we support" backdrop — concentric rings forming slow, breathing jellyfish. */
export default function Jellyfish() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current!, canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(dpr()); renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 1.2, 9); camera.lookAt(0, 0, 0);
    const RINGS = 26, SEG = 160;

    const vert = /* glsl */`
      uniform float uTime; uniform float uPhase; uniform float uRing; uniform float uRings;
      varying float vA;
      void main(){
        float t = uRing / (uRings - 1.0);
        float pulse = sin(uTime * 0.70 + uPhase);
        float wave  = sin(uTime * 0.50 + uPhase - t * 3.2);
        float r = (0.12 + 0.88 * t) * (1.0 + 0.045 * pulse + 0.02 * wave);
        float ang = position.x;
        vec3 p = vec3(cos(ang) * r, 0.0, sin(ang) * r);
        p.y = (1.0 - t) * (0.9 + 0.12 * pulse) - t * 0.5 + 0.03 * sin(ang * 3.0 + uTime * 0.6 + t * 4.0);
        p.xz += 0.01 * vec2(sin(uTime * 0.4 + ang * 2.0), cos(uTime * 0.35 + ang * 2.0));
        vA = 0.25 + 0.55 * sin(clamp(t * 1.1, 0.0, 1.0) * 2.8) + 0.12 * wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`;
    const frag = /* glsl */`
      uniform float uOpacity; varying float vA;
      void main(){ gl_FragColor = vec4(1.0, 1.0, 1.0, clamp(vA, 0.0, 1.0) * uOpacity); }`;

    const disposables: { dispose(): void }[] = [];
    function makeJelly(scale: number, opacity: number, phase: number, pos: [number, number, number]) {
      const g = new THREE.Group(); const mats: THREE.ShaderMaterial[] = [];
      const angles = new Float32Array(SEG * 3);
      for (let k = 0; k < SEG; k++) angles[k * 3] = (k / (SEG - 1)) * Math.PI * 2;
      for (let i = 0; i < RINGS; i++) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(angles, 3));
        const m = new THREE.ShaderMaterial({
          vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
          uniforms: { uTime: { value: 0 }, uPhase: { value: phase }, uRing: { value: i }, uRings: { value: RINGS }, uOpacity: { value: opacity } },
        });
        mats.push(m); disposables.push(geo, m); g.add(new THREE.Line(geo, m));
      }
      const tMat = new THREE.ShaderMaterial({
        vertexShader: /* glsl */`
          uniform float uTime; uniform float uPhase; attribute float seed; varying float vA;
          void main(){
            vec3 p = position; float k = -p.y;
            p.x += sin(uTime * 0.45 + uPhase + k * 2.2 + seed * 6.0) * 0.18 * k;
            p.z += cos(uTime * 0.38 + uPhase + k * 1.8 + seed * 4.0) * 0.14 * k;
            vA = (1.0 - smoothstep(0.0, 2.2, k)) * 0.5;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */`uniform float uOpacity; varying float vA; void main(){ gl_FragColor = vec4(1.0,1.0,1.0,vA*uOpacity); }`,
        transparent: true, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uPhase: { value: phase }, uOpacity: { value: opacity } },
      });
      mats.push(tMat); disposables.push(tMat);
      for (let n = 0; n < 9; n++) {
        const a = (n / 9) * Math.PI * 2, r = 0.55 + 0.25 * (n % 3) * 0.5;
        const pts: number[] = [], seeds: number[] = [];
        for (let s = 0; s <= 40; s++) { pts.push(Math.cos(a) * r * 0.9, -0.5 - s * 0.055, Math.sin(a) * r * 0.9); seeds.push(n / 9); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        geo.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
        disposables.push(geo); g.add(new THREE.Line(geo, tMat));
      }
      g.scale.setScalar(scale); g.position.set(...pos); g.rotation.x = 0.18; scene.add(g);
      return { g, mats };
    }
    const jellies = [makeJelly(2.2, 0.55, 0.0, [2.6, 0.3, -2]), makeJelly(1.3, 0.35, 2.1, [-3.4, -1.2, 0.5])];

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      const narrow = w < 700;
      jellies[0].g.position.set(narrow ? 0.8 : 2.6, narrow ? 1.6 : 0.3, -2);
      jellies[1].g.position.set(narrow ? -1.2 : -3.4, narrow ? -2.2 : -1.2, 0.5);
    };
    const ro = new ResizeObserver(resize); ro.observe(host); resize();

    const stop = createLoop(host, (t) => {
      jellies.forEach((j, idx) => {
        for (const m of j.mats) m.uniforms.uTime.value = t;
        j.g.rotation.y = Math.sin(t * 0.08) * 0.3;
        j.g.position.y += Math.sin(t * 0.2 + idx) * 0.0006;
      });
      renderer.render(scene, camera);
    });
    return () => { stop(); ro.disconnect(); disposables.forEach((d) => d.dispose()); renderer.dispose(); };
  }, []);

  return (
    <div ref={hostRef} className="fx" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
