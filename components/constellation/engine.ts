import * as THREE from 'three';
import {
  ALL_DASHED, CHAINS, DASHED, DIM, STARS, isMobileWidth, starSize, stageMetrics,
  type Layout, type Pt, type StarDef,
} from './data';

/* ------------------------------------------------------------------ */
/*  Constellation — night-sky engine (Three.js)                        */
/*  World units are screen pixels; design coordinates are mapped with   */
/*  stageMetrics() so the sky lines up with the DOM stage.              */
/* ------------------------------------------------------------------ */

const GOLD = new THREE.Color('#ffe2aa');
const LINE = new THREE.Color('#f4efe6');

/** nodes 223:1511–1513 — nebula ellipses (x, y, w, h in desktop design px) */
const NEBULAE = [
  { x: 504, y: 45, w: 720, h: 495, color: '#4d6b58', alpha: 0.42 }, // sage
  { x: 864, y: 450, w: 648, h: 405, color: '#8f5f4c', alpha: 0.36 }, // clay
  { x: -144, y: 495, w: 648, h: 405, color: '#3d4a94', alpha: 0.46 }, // blue
];
const DUST_COUNT = 185;

export type SkyState = { layout: Layout; tonight: boolean; time: number; hidden: boolean };

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function radialTexture(stops: [number, string][], size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

type RStar = {
  def: StarDef;
  sprite: THREE.Sprite;
  x: number; y: number; // current design position
  size: number;
  alpha: number;
  phase: number;
  burstAt: number;
};
type RLine = {
  a: RStar; b: RStar; dashed: boolean;
  line: THREE.Line; geo: THREE.BufferGeometry; mat: THREE.LineBasicMaterial | THREE.LineDashedMaterial;
  on: number; // 0..1 gate for dashed lines
};

export class Sky {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
  private W = 1; private H = 1;
  private m = stageMetrics(1, 1, false);
  private mobile = false;
  private raf = 0;
  private disposed = false;
  private active = true;
  private reduced: boolean;
  private last = performance.now();
  private start = performance.now();

  private st: SkyState = { layout: 'wD', tonight: false, time: 1, hidden: false };

  private nebula = new THREE.Group();
  private nebulaMeshes: { mesh: THREE.Mesh; alpha: number; phase: number; n: (typeof NEBULAE)[number] }[] = [];
  private dustGeo = new THREE.BufferGeometry();
  private dustMat: THREE.ShaderMaterial;
  private dust: THREE.Points;
  private dustData: { x: number; y: number }[] = [];
  private starGroup = new THREE.Group();
  private lineGroup = new THREE.Group();
  private stars = new Map<string, RStar>();
  private lines: RLine[] = [];
  private rings: THREE.LineLoop[] = [];
  private ringAlpha = 0;
  private glowTex: THREE.CanvasTexture;
  private texs: THREE.Texture[] = [];
  private mouse = { x: 0, y: 0 };
  private smooth = { x: 0, y: 0 };

  constructor(private canvas: HTMLCanvasElement) {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.add(this.nebula, this.lineGroup, this.starGroup);

    /* nebula */
    NEBULAE.forEach((n, i) => {
      const col = new THREE.Color(n.color);
      const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
      const tex = radialTexture([[0, `rgba(${rgb},1)`], [0.45, `rgba(${rgb},.45)`], [1, `rgba(${rgb},0)`]]);
      this.texs.push(tex);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: n.alpha, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      mesh.position.z = -10 + i * 0.1;
      this.nebula.add(mesh);
      this.nebulaMeshes.push({ mesh, alpha: n.alpha, phase: i * 2.1, n });
    });

    /* dust */
    const rnd = mulberry32(1509);
    const size = new Float32Array(DUST_COUNT), phase = new Float32Array(DUST_COUNT), speed = new Float32Array(DUST_COUNT);
    for (let i = 0; i < DUST_COUNT; i++) {
      this.dustData.push({ x: rnd(), y: rnd() });
      size[i] = 1 + rnd() * 1.6; phase[i] = rnd() * Math.PI * 2; speed[i] = 0.4 + rnd() * 1.2;
    }
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_COUNT * 3), 3));
    this.dustGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    this.dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    this.dustGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    this.dustMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uPx: { value: this.renderer.getPixelRatio() } },
      vertexShader: /* glsl */ `
        attribute float aSize; attribute float aPhase; attribute float aSpeed;
        uniform float uTime; uniform float uPx; varying float vA;
        void main(){
          vA = 0.55 + 0.45 * sin(uTime * aSpeed + aPhase);
          gl_PointSize = aSize * 2.2 * uPx;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5) * 2.0;
          gl_FragColor = vec4(0.96, 0.94, 0.90, smoothstep(1.0, 0.0, d) * vA);
        }`,
    });
    this.dust = new THREE.Points(this.dustGeo, this.dustMat);
    this.dust.position.z = -5;
    this.scene.add(this.dust);

    /* stars */
    this.glowTex = radialTexture([
      [0, 'rgba(255,248,225,1)'], [0.12, 'rgba(255,226,170,.95)'], [0.3, 'rgba(255,226,170,.35)'], [1, 'rgba(255,226,170,0)'],
    ]);
    for (const def of STARS) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
      );
      sprite.position.z = 1;
      this.starGroup.add(sprite);
      const p = (def.pos.dConv ?? def.pos.wD)!;
      this.stars.set(def.id, { def, sprite, x: p[0], y: p[1], size: 28, alpha: 0, phase: Math.random() * 6.28, burstAt: -1e9 });
    }

    /* constellation lines (solid) and links to tonight's star (dashed) */
    const mk = (a: string, b: string, dashed: boolean) => {
      const A = this.stars.get(a)!, B = this.stars.get(b)!;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = dashed
        ? new THREE.LineDashedMaterial({ color: GOLD, transparent: true, opacity: 0, dashSize: 4, gapSize: 4, depthWrite: false })
        : new THREE.LineBasicMaterial({ color: LINE, transparent: true, opacity: 0, depthWrite: false });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      this.lineGroup.add(line);
      this.lines.push({ a: A, b: B, dashed, line, geo, mat, on: 0 });
    };
    CHAINS.forEach(([a, b]) => mk(a, b, false));
    ALL_DASHED.forEach(([a, b]) => mk(a, b, true));

    /* two thin rings round tonight's star on the desktop conversation view */
    [26, 42].forEach((r, i) => {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k < 72; k++) pts.push(new THREE.Vector3(Math.cos((k / 72) * 6.2832) * r, Math.sin((k / 72) * 6.2832) * r, 0));
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0, depthWrite: false }),
      );
      ring.userData = { base: i === 0 ? 0.4 : 0.2 };
      this.starGroup.add(ring);
      this.rings.push(ring);
    });

    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onMove);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------- public ---------- */

  set(next: Partial<SkyState>) {
    if (next.tonight && !this.st.tonight) this.stars.get('tonight')!.burstAt = performance.now();
    this.st = { ...this.st, ...next };
  }

  setActive(on: boolean) {
    this.active = on;
    if (on) this.last = performance.now();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onMove);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    this.glowTex.dispose();
    this.texs.forEach((t) => t.dispose());
    this.renderer.dispose();
  }

  /* ---------- internals ---------- */

  private onMove = (e: PointerEvent) => {
    this.mouse.x = e.clientX / window.innerWidth - 0.5;
    this.mouse.y = e.clientY / window.innerHeight - 0.5;
  };

  private toWorld(x: number, y: number): [number, number] {
    const { s, offX, offY } = this.m;
    return [offX + x * s - this.W / 2, this.H / 2 - (offY + y * s)];
  }

  private resize = () => {
    const W = (this.W = window.innerWidth);
    const H = (this.H = window.innerHeight);
    this.mobile = isMobileWidth(W);
    this.m = stageMetrics(W, H, this.mobile);
    this.renderer.setSize(W, H, false);
    Object.assign(this.camera, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 });
    this.camera.updateProjectionMatrix();

    // nebula + dust fill the viewport (the Figma frames are full-bleed)
    this.nebulaMeshes.forEach(({ mesh, n }) => {
      mesh.position.x = ((n.x + n.w / 2) / 1440 - 0.5) * W;
      mesh.position.y = (0.5 - (n.y + n.h / 2) / 900) * H;
      mesh.scale.set((n.w / 1440) * W * 1.5, (n.h / 900) * H * 1.5, 1);
    });
    const p = this.dustGeo.attributes.position as THREE.BufferAttribute;
    this.dustData.forEach((d, i) => p.setXYZ(i, (d.x - 0.5) * W, (0.5 - d.y) * H, 0));
    p.needsUpdate = true;
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.active) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const t = (now - this.start) / 1000;
    const k = this.reduced ? 0 : 1;
    const ease = this.reduced ? 1 : 1 - Math.exp(-dt * 4.5);
    const { layout, tonight, time, hidden } = this.st;
    const { s } = this.m;

    this.dustMat.uniforms.uTime.value = t * k;
    this.smooth.x += (this.mouse.x - this.smooth.x) * 0.04;
    this.smooth.y += (this.mouse.y - this.smooth.y) * 0.04;
    this.nebula.position.set(-this.smooth.x * 24 * k, this.smooth.y * 16 * k, 0);
    this.dust.position.set(-this.smooth.x * 10 * k, this.smooth.y * 7 * k, -5);
    this.starGroup.position.set(-this.smooth.x * 12 * k, this.smooth.y * 8 * k, 0);
    this.lineGroup.position.copy(this.starGroup.position);
    this.nebulaMeshes.forEach(({ mesh, alpha, phase }) => {
      (mesh.material as THREE.MeshBasicMaterial).opacity = alpha * (0.94 + 0.06 * Math.sin(t * 0.3 * k + phase));
    });

    /* stars */
    this.stars.forEach((r) => {
      const target: Pt | undefined = r.def.pos[layout];
      let ta = 0;
      if (target) {
        ta = DIM[layout][r.def.con] ?? 0;
        if (r.def.con === 'tonight' && !tonight) ta = 0;
        if (r.def.at > time && r.def.con !== 'welcome') ta = 0;
        if (hidden && r.def.con !== 'welcome') ta = 0;
      }
      if (target) {
        r.x += (target[0] - r.x) * ease;
        r.y += (target[1] - r.y) * ease;
        r.size += (starSize(r.def, layout) - r.size) * ease;
      }
      r.alpha += (ta - r.alpha) * ease;
      const tw = Math.sin(t * 1.4 * k + r.phase);
      const burst = this.reduced ? 1 : 1 + 0.9 * Math.exp(-(now - r.burstAt) / 500);
      const [wx, wy] = this.toWorld(r.x, r.y);
      r.sprite.position.set(wx, wy, 1);
      (r.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, r.alpha) * (0.88 + 0.12 * tw);
      r.sprite.scale.setScalar(Math.max(0.001, r.size * 1.625 * s * (1 + 0.07 * tw) * burst));
      r.sprite.visible = r.alpha > 0.003;
    });

    /* lines */
    const linkSet = new Set(DASHED[layout].map(([a, b]) => `${a}|${b}`));
    this.lines.forEach((l) => {
      const [ax, ay] = this.toWorld(l.a.x, l.a.y);
      const [bx, by] = this.toWorld(l.b.x, l.b.y);
      const pos = l.geo.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, ax, ay, 0); pos.setXYZ(1, bx, by, 0); pos.needsUpdate = true;
      const both = Math.min(l.a.alpha, l.b.alpha);
      if (l.dashed) {
        const want = linkSet.has(`${l.a.def.id}|${l.b.def.id}`) ? 1 : 0;
        l.on += (want - l.on) * ease;
        l.mat.opacity = both * l.on * 0.6;
        (l.mat as THREE.LineDashedMaterial).dashSize = 4 * s; (l.mat as THREE.LineDashedMaterial).gapSize = 4 * s;
        l.line.computeLineDistances();
      } else {
        l.mat.opacity = both * 0.38;
      }
      l.line.visible = l.mat.opacity > 0.004;
    });

    /* rings round tonight's star (desktop conversation view only) */
    const tn = this.stars.get('tonight')!;
    const want = layout === 'dConv' ? tn.alpha : 0;
    this.ringAlpha += (want - this.ringAlpha) * ease;
    const [rx, ry] = this.toWorld(tn.x, tn.y);
    this.rings.forEach((r) => {
      r.position.set(rx, ry, 1);
      r.scale.setScalar(s * (1 + 0.04 * Math.sin(t * 1.2 * k)));
      (r.material as THREE.LineBasicMaterial).opacity = this.ringAlpha * (r.userData.base as number);
      r.visible = this.ringAlpha > 0.004;
    });

    this.renderer.render(this.scene, this.camera);
  };
}
