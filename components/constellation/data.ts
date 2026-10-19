/* Constellation — layout data lifted from the Figma page "Constellation — AI Chat".
   All coordinates are in design pixels: desktop frames are 1440×900, mobile frames 390×844.
   Star positions are the centres of the star frames (left + size/2, top + size/2). */

export type Layout = 'wD' | 'wM' | 'dConv' | 'dSky' | 'mConv' | 'mSky';
export type Con = 'welcome' | 'desk' | 'wins' | 'afraid' | 'tonight';
export type Pt = [number, number];

export const MOBILE_MAX = 700;

export function isMobileWidth(w: number) {
  return w <= MOBILE_MAX;
}

/** design → screen mapping shared by the WebGL scene and the DOM stage */
export function stageMetrics(W: number, H: number, mobile: boolean) {
  if (mobile) {
    const s = W / 390;
    return { s, offX: 0, offY: 0, sw: 390, sh: H / s };
  }
  const s = Math.min(W / 1440, H / 900);
  return { s, offX: (W - 1440 * s) / 2, offY: (H - 900 * s) / 2, sw: 1440, sh: 900 };
}

export type StarDef = {
  id: string;
  con: Con;
  /** 0..1 position on the Jul → Oct timeline (stars after the handle fade out) */
  at: number;
  pos: Partial<Record<Layout, Pt>>;
};

const S = (id: string, con: Con, at: number, pos: StarDef['pos']): StarDef => ({ id, con, at, pos });

export const STARS: StarDef[] = [
  S('welcome', 'welcome', 0, { wD: [720, 250], wM: [195, 150] }),

  // The Unfinished Desk
  S('desk1', 'desk', 0.12, { dConv: [760, 240], dSky: [840, 240], mConv: [60, 200], mSky: [70, 220] }),
  S('desk2', 'desk', 0.3, { dConv: [850, 200], dSky: [930, 200], mConv: [120, 160], mSky: [160, 170] }),
  S('desk3', 'desk', 0.5, { dConv: [940, 250], dSky: [1020, 250], mConv: [180, 190], mSky: [250, 210] }),
  S('desk4', 'desk', 0.72, { dConv: [960, 340], dSky: [1040, 340], mConv: [190, 250], mSky: [280, 300] }),
  S('desk5', 'desk', 0.88, { dConv: [870, 380], dSky: [950, 380], mSky: [180, 340] }),

  // Small Wins
  S('wins1', 'wins', 0.08, { dConv: [560, 560], dSky: [640, 560], mSky: [60, 470] }),
  S('wins2', 'wins', 0.35, { dConv: [640, 610], dSky: [720, 610], mSky: [120, 500] }),
  S('wins3', 'wins', 0.6, { dConv: [710, 540], dSky: [790, 540], mSky: [180, 450] }),
  S('wins4', 'wins', 0.8, { dConv: [790, 600], dSky: [870, 600] }),

  // Afraid of Being Left
  S('afraid1', 'afraid', 0.2, { dConv: [1080, 620], dSky: [1120, 620] }),
  S('afraid2', 'afraid', 0.55, { dConv: [1160, 560], dSky: [1200, 560] }),
  S('afraid3', 'afraid', 0.78, { dConv: [1230, 660], dSky: [1270, 660] }),

  // tonight's new star
  S('tonight', 'tonight', 0.97, { dConv: [1120, 330], dSky: [1200, 330], mConv: [300, 170] }),
];

export const CHAINS: [string, string][] = [
  ['desk1', 'desk2'], ['desk2', 'desk3'], ['desk3', 'desk4'], ['desk4', 'desk5'],
  ['wins1', 'wins2'], ['wins2', 'wins3'], ['wins3', 'wins4'],
  ['afraid1', 'afraid2'], ['afraid2', 'afraid3'],
];

/** dashed links to tonight's star, per layout */
export const DASHED: Record<Layout, [string, string][]> = {
  wD: [], wM: [],
  dConv: [['desk3', 'tonight'], ['desk4', 'tonight']],
  dSky: [['desk4', 'tonight']],
  mConv: [['desk3', 'tonight']],
  mSky: [],
};
export const ALL_DASHED: [string, string][] = [['desk3', 'tonight'], ['desk4', 'tonight']];

/** how bright each constellation is in each layout (missing = hidden) */
export const DIM: Record<Layout, Partial<Record<Con, number>>> = {
  wD: { welcome: 1 },
  wM: { welcome: 1 },
  dConv: { desk: 1, tonight: 1, wins: 0.6, afraid: 0.6 },
  dSky: { desk: 1, tonight: 1, wins: 1, afraid: 1 },
  mConv: { desk: 1, tonight: 1 },
  mSky: { desk: 1, wins: 1 },
};

export function starSize(def: StarDef, layout: Layout) {
  if (def.con === 'tonight' || def.con === 'welcome') return 48;
  if (layout === 'mConv') return 24;
  return ['desk1', 'wins1', 'afraid1'].includes(def.id) ? 36 : 28;
}

/** constellation captions per layout (Figma: left/top of the label, title size, opacities) */
export type LabelDef = { x: number; y: number; size: number; title: number; sub: number | null };
export const LABELS: Record<Layout, Partial<Record<'desk' | 'wins' | 'afraid', LabelDef>>> = {
  wD: {}, wM: {},
  dConv: {
    desk: { x: 760, y: 404, size: 24, title: 0.75, sub: 0.41 },
    wins: { x: 560, y: 634, size: 24, title: 0.5, sub: 0.28 },
    afraid: { x: 1080, y: 684, size: 24, title: 0.5, sub: 0.28 },
  },
  dSky: {
    desk: { x: 840, y: 404, size: 24, title: 1, sub: 0.55 },
    wins: { x: 640, y: 634, size: 24, title: 1, sub: 0.55 },
    afraid: { x: 1120, y: 684, size: 24, title: 1, sub: 0.55 },
  },
  mConv: { desk: { x: 60, y: 262, size: 18, title: 0.8, sub: null } },
  mSky: { desk: { x: 70, y: 364, size: 24, title: 1, sub: 0.55 } },
};

export const CRISIS_RE =
  /(suicid|kill myself|end my life|want to die|wanna die|hurt myself|harm myself|self[- ]?harm|ฆ่าตัวตาย|อยากตาย|ไม่อยากมีชีวิต|จบชีวิต|ทำร้ายตัวเอง)/i;
