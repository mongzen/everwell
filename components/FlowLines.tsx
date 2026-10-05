'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createLoop, dpr } from '@/lib/loop';

/** Hero backdrop — 46 slow, breathing lines that lean toward the cursor. */
export default function FlowLines() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current!, canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(dpr());
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 9);
    const LINES = 46, POINTS = 260, WIDTH = 22;
    // Lines are 50% lighter than the original (see Figma "FX / Flow Lines")
    const palette = [0xf4efe6, 0xcfd8cf, 0x8da593, 0xc48a6b].map((c) => new THREE.Color(c));
    const group = new THREE.Group(); scene.add(group);

    const vert = /* glsl */`
      uniform float uTime; uniform vec2 uMouse; uniform float uIndex; uniform float uAmp;
      varying float vFade;
      void main(){
        vec3 p = position; float t = uTime * 0.12; float x = p.x * 0.22;
        float w = sin(x*1.6 + t*2.0 + uIndex*0.18) * uAmp
                + sin(x*0.7 - t*1.3 + uIndex*0.35) * uAmp * 0.6
                + sin(x*3.1 + t*0.8) * uAmp * 0.12;
        p.y += w; p.z += sin(x*1.1 + t + uIndex*0.2) * 0.8;
        vec2 d = p.xy - uMouse * vec2(9.0, 4.5);
        p.xy += normalize(d + 1e-4) * exp(-dot(d,d)*0.05) * 0.35;
        vFade = smoothstep(-11.0,-6.0,p.x) * (1.0 - smoothstep(6.0,11.0,p.x));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
      }`;
    const frag = /* glsl */`
      uniform vec3 uColor; uniform float uOpacity; varying float vFade;
      void main(){ gl_FragColor = vec4(uColor, uOpacity * vFade); }`;

    const mats: THREE.ShaderMaterial[] = [];
    const geos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < LINES; i++) {
      const t = i / (LINES - 1);
      const pos = new Float32Array(POINTS * 3);
      for (let k = 0; k < POINTS; k++) { pos[k*3] = (k/(POINTS-1)-0.5)*WIDTH; pos[k*3+1] = (t-0.5)*7.0; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const accent = i % 4 === 3;
      const m = new THREE.ShaderMaterial({
        vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
        uniforms: {
          uTime: { value: 0 }, uMouse: { value: new THREE.Vector2() }, uIndex: { value: i },
          uAmp: { value: 0.55 + 0.5 * Math.sin(t * Math.PI) },
          uColor: { value: accent ? palette[3] : palette[i % 3] },
          uOpacity: { value: ((accent ? 0.35 : 0.12) + 0.28 * Math.sin(t * Math.PI)) * 0.5 },
        },
      });
      mats.push(m); geos.push(g); group.add(new THREE.Line(g, m));
    }

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      group.scale.setScalar(Math.max(0.55, Math.min(1, w / 1440 + 0.25)));
    };
    const ro = new ResizeObserver(resize); ro.observe(host); resize();

    const mouse = new THREE.Vector2(), target = new THREE.Vector2();
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    };
    window.addEventListener('pointermove', onMove);

    const stop = createLoop(host, (t) => {
      mouse.lerp(target, 0.04);
      for (const m of mats) { m.uniforms.uTime.value = t; m.uniforms.uMouse.value.copy(mouse); }
      group.rotation.y = mouse.x * 0.06; group.rotation.x = -mouse.y * 0.04;
      renderer.render(scene, camera);
    });
    return () => {
      stop(); ro.disconnect(); window.removeEventListener('pointermove', onMove);
      geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()); renderer.dispose();
    };
  }, []);

  return (
    <div ref={hostRef} className="fx" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
