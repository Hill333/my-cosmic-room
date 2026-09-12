/**
 * Draws the heroine as SVG layers on one 600 × 900 template (SPEC §4.5, §15.2 item 2):
 * body, four faces, three hair styles, outfits, shoes and extras, plus the wardrobe tiles as
 * cropped views of the same drawings. Every layer shares the coordinates below, so garments
 * align by construction and need no per-item offsets. Traced loosely from the generated
 * reference sheet (assets/shared/heroine/referenceSheet.png); style from SPEC §15.1.
 *
 *   node tools/gen-heroine.ts
 *
 * Writes assets/shared/heroine/** and the garment tiles named in the manifest. Sweet garments
 * are left to M4 (their placeholders stay until drawn).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { assetFile, readManifest } from './lib/manifest.ts';

// --- Template (canvas 600 × 900, feet on y ≈ 880) ---------------------------------------
const W = 600;
const H = 900;
const HEAD = { cx: 300, cy: 200, rx: 112, ry: 118 };
const NECK = { x: 278, y: 300, w: 44, h: 48 };
const TORSO = { x: 205, y: 338, w: 190, h: 210 }; // shoulders → hips
const ARM = { l: [212, 360, 150, 560] as const, r: [388, 360, 450, 560] as const };
const LEG = { l: 258, r: 342, top: 530, bottom: 828, w: 54 };
const FOOT = { y: 810, w: 92, h: 70 };

const PLUM = '#3B2A5E';
const SKIN = '#F5C9A8';
const SKIN_DARK = '#E7AE8C';
const HAIR = '#7A4A2E';
const HAIR_LIGHT = '#9C6A46';
const LILAC = '#C9B6F0';
const LAVENDER = '#B9A6E8';
const MINT = '#A9E5D0';
const MINT_DARK = '#7FCDB0';
const PINK = '#F5B5C8';
const STAR = '#FFD86B';
const NAVY = '#3F3A7A';
const CORAL = '#E8735F';
const BLUE = '#4C7DE0';
const SKY = '#BFE3F5';
const WHITE = '#FFFFFF';

const outline = `stroke="${PLUM}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;

function svg(body: string, viewBox = `0 0 ${W} ${H}`, label = 'Heroine layer'): string {
  const [, , vw, vh] = viewBox.split(' ').map(Number);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${vw}" height="${vh}" role="img" aria-label="${label}">${body}</svg>\n`;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, extra = ''): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${outline} ${extra}/>`;
}
function circle(cx: number, cy: number, r: number, fill: string, extra = ''): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${outline} ${extra}/>`;
}
function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  rx = 20,
  extra = '',
): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${outline} ${extra}/>`;
}
function path(d: string, fill: string, extra = ''): string {
  return `<path d="${d}" fill="${fill}" ${outline} ${extra}/>`;
}
function limb(x1: number, y1: number, x2: number, y2: number, width: number, fill: string): string {
  return (
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${PLUM}" stroke-width="${width + 12}" stroke-linecap="round"/>` +
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fill}" stroke-width="${width}" stroke-linecap="round"/>`
  );
}
function star(cx: number, cy: number, r: number, fill: string, stroke = true): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" ${stroke ? `stroke="${PLUM}" stroke-width="4" stroke-linejoin="round"` : ''}/>`;
}

// --- Body ------------------------------------------------------------------------------
function body(): string {
  const [lx1, ly1, lx2, ly2] = ARM.l;
  const [rx1, ry1, rx2, ry2] = ARM.r;
  return [
    // legs
    limb(LEG.l, LEG.top, LEG.l, LEG.bottom, LEG.w, SKIN),
    limb(LEG.r, LEG.top, LEG.r, LEG.bottom, LEG.w, SKIN),
    // neck and torso (skin; the outfit covers it)
    rect(NECK.x, NECK.y, NECK.w, NECK.h, SKIN, 16),
    rect(TORSO.x, TORSO.y, TORSO.w, TORSO.h, SKIN, 60),
    // arms and hands
    limb(lx1, ly1, lx2, ly2, 40, SKIN),
    limb(rx1, ry1, rx2, ry2, 40, SKIN),
    circle(lx2, ly2 + 6, 30, SKIN),
    circle(rx2, ry2 + 6, 30, SKIN),
    // ears, head
    circle(HEAD.cx - HEAD.rx + 2, HEAD.cy + 10, 22, SKIN),
    circle(HEAD.cx + HEAD.rx - 2, HEAD.cy + 10, 22, SKIN),
    ellipse(HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry, SKIN),
    // blush and nose
    `<circle cx="${HEAD.cx - 70}" cy="${HEAD.cy + 40}" r="16" fill="${PINK}" opacity="0.75"/>`,
    `<circle cx="${HEAD.cx + 70}" cy="${HEAD.cy + 40}" r="16" fill="${PINK}" opacity="0.75"/>`,
    `<circle cx="${HEAD.cx}" cy="${HEAD.cy + 32}" r="5" fill="${SKIN_DARK}"/>`,
  ].join('');
}

// --- Faces (300 × 200 overlay at canvas x 150–450, y 99–299) ------------------------------
// Canvas → face coords: fx = x − 150, fy = y − 99. Eyes at canvas (255, 190) and (345, 190).
const EYE_L = { x: 105, y: 91 };
const EYE_R = { x: 195, y: 91 };
const MOUTH = { x: 150, y: 150 };
const lineStroke = (w: number) =>
  `stroke="${PLUM}" stroke-width="${w}" stroke-linecap="round" fill="none"`;
const eyeStroke = lineStroke(7);

function openEye(x: number, y: number, look = 0): string {
  return (
    `<ellipse cx="${x}" cy="${y}" rx="17" ry="21" fill="${WHITE}" stroke="${PLUM}" stroke-width="4"/>` +
    `<circle cx="${x + look * 4}" cy="${y + 3 - Math.abs(look) * 3}" r="11" fill="#5A3A24"/>` +
    `<circle cx="${x + look * 4}" cy="${y + 3 - Math.abs(look) * 3}" r="6" fill="${PLUM}"/>` +
    `<circle cx="${x + 4 + look * 4}" cy="${y - 4 - Math.abs(look) * 3}" r="4" fill="${WHITE}"/>` +
    `<path d="M${x - 18} ${y - 18} q 18 -14 36 0" ${eyeStroke}/>`
  );
}
function happyEye(x: number, y: number): string {
  return `<path d="M${x - 18} ${y + 4} q 18 -26 36 0" ${eyeStroke}/>`;
}
function brow(x: number, y: number, tilt = 0): string {
  return `<path d="M${x - 20} ${y + tilt} q 20 -10 40 ${-tilt}" ${lineStroke(6)}/>`;
}
const FACES: Record<string, string> = {
  neutral:
    brow(EYE_L.x, 58) +
    brow(EYE_R.x, 58) +
    openEye(EYE_L.x, EYE_L.y) +
    openEye(EYE_R.x, EYE_R.y) +
    `<path d="M${MOUTH.x - 16} ${MOUTH.y - 2} q 16 16 32 0" ${eyeStroke}/>`,
  happy:
    brow(EYE_L.x, 54) +
    brow(EYE_R.x, 54) +
    happyEye(EYE_L.x, EYE_L.y) +
    happyEye(EYE_R.x, EYE_R.y) +
    `<path d="M${MOUTH.x - 24} ${MOUTH.y - 6} q 24 34 48 0 z" fill="${CORAL}" stroke="${PLUM}" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="M${MOUTH.x - 12} ${MOUTH.y + 12} q 12 8 24 0" fill="${PINK}" stroke="none"/>`,
  thinking:
    brow(EYE_L.x, 60, 6) +
    brow(EYE_R.x, 50, -4) +
    openEye(EYE_L.x, EYE_L.y, 1) +
    openEye(EYE_R.x, EYE_R.y, 1) +
    `<path d="M${MOUTH.x - 14} ${MOUTH.y + 4} q 8 -10 16 0 t 16 0" ${eyeStroke}/>`,
  cheering:
    brow(EYE_L.x, 50) +
    brow(EYE_R.x, 50) +
    happyEye(EYE_L.x, EYE_L.y) +
    happyEye(EYE_R.x, EYE_R.y) +
    `<path d="M${MOUTH.x - 26} ${MOUTH.y - 10} q 26 46 52 0 z" fill="${CORAL}" stroke="${PLUM}" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="M${MOUTH.x - 18} ${MOUTH.y - 6} h 36 q -18 10 -36 0 z" fill="${WHITE}" stroke="none"/>`,
};

// --- Hair -------------------------------------------------------------------------------
const hairCap = () =>
  path(
    `M${HEAD.cx - HEAD.rx - 8} ${HEAD.cy - 10} q 8 -140 ${HEAD.rx + 8} -140 q ${HEAD.rx} 0 ${HEAD.rx + 8} 140 q -30 -40 -70 -50 q -30 30 -60 20 q -40 -10 -60 20 q -20 -30 -46 10 z`,
    HAIR,
  ) +
  `<path d="M${HEAD.cx - 60} ${HEAD.cy - 100} q 40 -18 80 -4" stroke="${HAIR_LIGHT}" stroke-width="8" stroke-linecap="round" fill="none"/>`;
const wisps = () =>
  `<path d="M${HEAD.cx - HEAD.rx - 4} ${HEAD.cy + 10} q -14 40 6 80" stroke="${HAIR}" stroke-width="12" stroke-linecap="round" fill="none"/>` +
  `<path d="M${HEAD.cx + HEAD.rx + 4} ${HEAD.cy + 10} q 14 40 -6 80" stroke="${HAIR}" stroke-width="12" stroke-linecap="round" fill="none"/>`;

const HAIRS: Record<string, string> = {
  buns:
    circle(HEAD.cx - 118, HEAD.cy - 118, 52, HAIR) +
    circle(HEAD.cx + 118, HEAD.cy - 118, 52, HAIR) +
    `<path d="M${HEAD.cx - 140} ${HEAD.cy - 140} a 30 30 0 0 1 44 -8" stroke="${HAIR_LIGHT}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    `<path d="M${HEAD.cx + 96} ${HEAD.cy - 140} a 30 30 0 0 1 44 -8" stroke="${HAIR_LIGHT}" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    hairCap() +
    wisps(),
  ponytail:
    path(
      `M${HEAD.cx + 60} ${HEAD.cy - 110} q 120 -20 110 120 q -10 120 -60 190 q -30 -60 -10 -130 q -20 -80 -80 -120 z`,
      HAIR,
    ) +
    `<path d="M${HEAD.cx + 110} ${HEAD.cy - 60} q 30 80 -10 170" stroke="${HAIR_LIGHT}" stroke-width="8" fill="none" stroke-linecap="round"/>` +
    hairCap() +
    ellipse(HEAD.cx + 92, HEAD.cy - 92, 24, 16, STAR, 'transform="rotate(-30 392 108)"') +
    wisps(),
  loose:
    path(
      `M${HEAD.cx - HEAD.rx - 30} ${HEAD.cy - 40} q -30 160 20 300 q 40 20 70 -10 q -20 -120 -10 -200 z`,
      HAIR,
    ) +
    path(
      `M${HEAD.cx + HEAD.rx + 30} ${HEAD.cy - 40} q 30 160 -20 300 q -40 20 -70 -10 q 20 -120 10 -200 z`,
      HAIR,
    ) +
    hairCap() +
    `<path d="M${HEAD.cx - HEAD.rx - 10} ${HEAD.cy + 40} q -10 100 10 180" stroke="${HAIR_LIGHT}" stroke-width="8" fill="none" stroke-linecap="round"/>` +
    `<path d="M${HEAD.cx + HEAD.rx + 10} ${HEAD.cy + 40} q 10 100 -10 180" stroke="${HAIR_LIGHT}" stroke-width="8" fill="none" stroke-linecap="round"/>` +
    rect(HEAD.cx + 62, HEAD.cy - 96, 44, 18, LILAC, 9, 'transform="rotate(-25 384 113)"'),
};

// --- Outfits ------------------------------------------------------------------------------
function tee(fill: string): string {
  return (
    path(
      `M${TORSO.x - 10} ${TORSO.y + 8} q 20 -20 50 -12 q 55 20 110 0 q 30 -8 50 12 l 30 80 l -45 18 l -10 -20 v 90 h -170 v -90 l -10 20 l -45 -18 z`,
      fill,
    ) + `<path d="M${HEAD.cx - 30} ${TORSO.y + 6} q 30 24 60 0" ${lineStroke(5)}/>`
  );
}
function skirt(fill: string, dark: string): string {
  const top = TORSO.y + 120;
  return (
    path(
      `M${TORSO.x + 10} ${top} h ${TORSO.w - 20} q 40 60 50 130 h -270 q 10 -70 50 -130 z`,
      fill,
    ) +
    [0, 1, 2, 3, 4]
      .map(
        (i) =>
          `<line x1="${TORSO.x + 30 + i * 33}" y1="${top + 10}" x2="${TORSO.x + 5 + i * 45}" y2="${top + 122}" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>`,
      )
      .join('') +
    `<rect x="${TORSO.x + 10}" y="${top - 6}" width="${TORSO.w - 20}" height="14" rx="7" fill="${dark}" stroke="${PLUM}" stroke-width="4"/>`
  );
}
function trousers(fill: string, dark: string): string {
  const top = TORSO.y + 150;
  return (
    path(
      `M${TORSO.x + 18} ${top} h ${TORSO.w - 36} v 120 q 0 20 -20 20 h -50 q -10 0 -10 -10 v -70 h -20 v 70 q 0 10 -10 10 h -50 q -20 0 -20 -20 z`,
      fill,
    ) +
    `<line x1="${TORSO.x + 30}" y1="${top + 12}" x2="${TORSO.x + TORSO.w - 30}" y2="${top + 12}" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>`
  );
}
function longSleeves(fill: string): string {
  const [lx1, ly1, lx2, ly2] = ARM.l;
  const [rx1, ry1, rx2, ry2] = ARM.r;
  const f = 0.78;
  return (
    limb(lx1, ly1, lx1 + (lx2 - lx1) * f, ly1 + (ly2 - ly1) * f, 46, fill) +
    limb(rx1, ry1, rx1 + (rx2 - rx1) * f, ry1 + (ry2 - ry1) * f, 46, fill)
  );
}
const cloud = (x: number, y: number, s = 1) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M-24 8 a 12 12 0 0 1 12 -14 a 14 14 0 0 1 26 -4 a 12 12 0 0 1 14 18 z" fill="${WHITE}" stroke="${PLUM}" stroke-width="3" stroke-linejoin="round"/>`;

const OUTFITS: Record<string, string> = {
  planetTee:
    tee(LILAC) +
    circle(HEAD.cx, TORSO.y + 62, 22, LAVENDER) +
    `<ellipse cx="${HEAD.cx}" cy="${TORSO.y + 62}" rx="38" ry="9" fill="none" stroke="${STAR}" stroke-width="5" transform="rotate(-20 ${HEAD.cx} ${TORSO.y + 62})"/>` +
    star(HEAD.cx - 52, TORSO.y + 40, 9, STAR, false) +
    star(HEAD.cx + 54, TORSO.y + 84, 8, STAR, false) +
    skirt(MINT, MINT_DARK),
  floralSweater:
    longSleeves(PINK) +
    tee(PINK) +
    rect(TORSO.x + 30, TORSO.y + 110, TORSO.w - 60, 150, NAVY, 26) +
    `<line x1="${TORSO.x + 60}" y1="${TORSO.y + 20}" x2="${TORSO.x + 60}" y2="${TORSO.y + 112}" stroke="${NAVY}" stroke-width="14" stroke-linecap="round"/>` +
    `<line x1="${TORSO.x + TORSO.w - 60}" y1="${TORSO.y + 20}" x2="${TORSO.x + TORSO.w - 60}" y2="${TORSO.y + 112}" stroke="${NAVY}" stroke-width="14" stroke-linecap="round"/>` +
    [
      [HEAD.cx - 10, TORSO.y + 60],
      [HEAD.cx + 40, TORSO.y + 40],
      [HEAD.cx - 50, TORSO.y + 30],
    ]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="9" fill="${WHITE}" stroke="${PLUM}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="3" fill="${STAR}"/>`,
      )
      .join(''),
  starHoodie:
    longSleeves(NAVY) +
    tee(NAVY) +
    path(
      `M${HEAD.cx - 70} ${TORSO.y + 10} q 70 40 140 0 q -20 30 -70 34 q -50 -4 -70 -34 z`,
      NAVY,
    ) +
    star(HEAD.cx - 40, TORSO.y + 70, 10, STAR, false) +
    star(HEAD.cx + 34, TORSO.y + 96, 12, STAR, false) +
    star(HEAD.cx + 10, TORSO.y + 46, 7, STAR, false) +
    trousers(LAVENDER, LILAC),
  cloudPyjamas:
    longSleeves(SKY) +
    tee(SKY) +
    trousers(SKY, '#9CCDE8') +
    cloud(HEAD.cx - 40, TORSO.y + 70, 0.9) +
    cloud(HEAD.cx + 46, TORSO.y + 100, 0.7) +
    cloud(HEAD.cx - 46, TORSO.y + 220, 0.7) +
    cloud(HEAD.cx + 50, TORSO.y + 250, 0.6),
  spacesuit:
    longSleeves(WHITE) +
    tee(WHITE) +
    trousers(WHITE, LILAC) +
    rect(TORSO.x + 20, TORSO.y + 30, TORSO.w - 40, 60, CORAL, 18) +
    rect(TORSO.x + 20, TORSO.y + 95, TORSO.w - 40, 30, STAR, 12) +
    rect(TORSO.x + 20, TORSO.y + 130, TORSO.w - 40, 30, MINT, 12) +
    circle(HEAD.cx, TORSO.y + 60, 14, BLUE),
};

// --- Shoes ---------------------------------------------------------------------------------
function shoe(x: number, fill: string, detail: string): string {
  return (
    path(
      `M${x - FOOT.w / 2} ${FOOT.y + 20} q 0 -30 30 -30 h 32 q 30 0 30 30 v 30 q 0 20 -20 20 h -52 q -20 0 -20 -20 z`,
      fill,
    ) + detail
  );
}
function sock(x: number, fill: string, top = 740): string {
  return (
    rect(x - 30, top, 60, 80, fill, 18) +
    `<line x1="${x - 24}" y1="${top + 22}" x2="${x + 24}" y2="${top + 22}" stroke="${WHITE}" stroke-width="5"/>`
  );
}
const SHOES: Record<string, string> = {
  sneakers:
    sock(LEG.l, STAR) +
    sock(LEG.r, STAR) +
    shoe(
      LEG.l,
      WHITE,
      `<path d="M${LEG.l - 24} ${FOOT.y + 24} l 12 10 l 12 -10 l 12 10" ${lineStroke(4)}/>`,
    ) +
    shoe(
      LEG.r,
      WHITE,
      `<path d="M${LEG.r - 24} ${FOOT.y + 24} l 12 10 l 12 -10 l 12 10" ${lineStroke(4)}/>`,
    ),
  maryJanes:
    sock(LEG.l, WHITE) +
    sock(LEG.r, WHITE) +
    shoe(
      LEG.l,
      PINK,
      `<rect x="${LEG.l - 34}" y="${FOOT.y + 20}" width="68" height="10" rx="5" fill="${PINK}" stroke="${PLUM}" stroke-width="4"/>`,
    ) +
    shoe(
      LEG.r,
      PINK,
      `<rect x="${LEG.r - 34}" y="${FOOT.y + 20}" width="68" height="10" rx="5" fill="${PINK}" stroke="${PLUM}" stroke-width="4"/>`,
    ),
  bunnySlippers:
    shoe(
      LEG.l,
      WHITE,
      ellipse(LEG.l - 20, FOOT.y - 4, 10, 26, WHITE) +
        ellipse(LEG.l + 4, FOOT.y - 4, 10, 26, WHITE) +
        `<circle cx="${LEG.l - 14}" cy="${FOOT.y + 36}" r="4" fill="${PLUM}"/><circle cx="${LEG.l + 6}" cy="${FOOT.y + 36}" r="4" fill="${PLUM}"/><circle cx="${LEG.l - 4}" cy="${FOOT.y + 46}" r="4" fill="${PINK}"/>`,
    ) +
    shoe(
      LEG.r,
      WHITE,
      ellipse(LEG.r - 4, FOOT.y - 4, 10, 26, WHITE) +
        ellipse(LEG.r + 20, FOOT.y - 4, 10, 26, WHITE) +
        `<circle cx="${LEG.r - 6}" cy="${FOOT.y + 36}" r="4" fill="${PLUM}"/><circle cx="${LEG.r + 14}" cy="${FOOT.y + 36}" r="4" fill="${PLUM}"/><circle cx="${LEG.r + 4}" cy="${FOOT.y + 46}" r="4" fill="${PINK}"/>`,
    ),
  spaceBoots:
    rect(LEG.l - 34, 730, 68, 90, WHITE, 20) +
    rect(LEG.r - 34, 730, 68, 90, WHITE, 20) +
    shoe(LEG.l, WHITE, star(LEG.l - 6, FOOT.y + 34, 12, LILAC)) +
    shoe(LEG.r, WHITE, star(LEG.r + 6, FOOT.y + 34, 12, LILAC)) +
    `<rect x="${LEG.l - 30}" y="748" width="60" height="10" rx="5" fill="${LILAC}"/><rect x="${LEG.r - 30}" y="748" width="60" height="10" rx="5" fill="${LILAC}"/>`,
};

// --- Extras --------------------------------------------------------------------------------
const EXTRAS: Record<string, string> = {
  starClip: star(HEAD.cx + 84, HEAD.cy - 96, 26, STAR),
  rocketBackpack:
    rect(TORSO.x + 40, TORSO.y - 6, 22, 120, CORAL, 11) +
    rect(TORSO.x + TORSO.w - 62, TORSO.y - 6, 22, 120, CORAL, 11) +
    `<g transform="translate(${TORSO.x - 40} ${TORSO.y + 40})">` +
    path('M0 60 q 0 -60 30 -80 q 30 20 30 80 v 60 h -60 z', WHITE) +
    path('M-14 130 l 14 -30 v 30 z', CORAL) +
    path('M74 130 l -14 -30 v 30 z', CORAL) +
    path('M0 -20 q 30 -30 60 0 q -30 -14 -60 0 z', LILAC) +
    circle(30, 30, 12, BLUE) +
    '</g>',
};

// --- Tiles: cropped views of the same drawings (SPEC §4.4 "on a neutral background") ------
const TILE_VIEW = {
  outfit: '110 300 380 380',
  shoes: '150 700 300 220',
  hair: '120 20 360 360',
  extra: '120 20 360 360',
} as const;

function tileFor(kind: keyof typeof TILE_VIEW, drawing: string, label: string): string {
  const [x, y, w, h] = TILE_VIEW[kind].split(' ').map(Number) as [number, number, number, number];
  const bg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${WHITE}"/>`;
  const context =
    kind === 'hair' || kind === 'extra'
      ? ellipse(HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry, SKIN) + (kind === 'extra' ? HAIRS['buns'] : '')
      : kind === 'shoes'
        ? limb(LEG.l, 700, LEG.l, LEG.bottom, LEG.w, SKIN) +
          limb(LEG.r, 700, LEG.r, LEG.bottom, LEG.w, SKIN)
        : '';
  // Extras sit on top of the hair, so the clip is drawn after the context.
  return svg(bg + context + drawing, `${x} ${y} ${w} ${h}`, label);
}

// --- Write ---------------------------------------------------------------------------------
function write(rel: string, content: string): void {
  const file = assetFile(rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  written.push(rel);
}
const written: string[] = [];
const manifest = readManifest();
const tileOf = (layerId: string) =>
  Object.keys(manifest.assets).find((id) => manifest.assets[id]!.derivedFrom === layerId);

write('shared/heroine/body.svg', svg(body(), undefined, 'Heroine body'));
for (const [name, drawing] of Object.entries(FACES)) {
  write(`shared/heroine/face/${name}.svg`, svg(drawing, '0 0 300 200', `Face ${name}`));
}
const layers: [keyof typeof TILE_VIEW, Record<string, string>][] = [
  ['hair', HAIRS],
  ['outfit', OUTFITS],
  ['shoes', SHOES],
  ['extra', EXTRAS],
];
for (const [kind, table] of layers) {
  for (const [name, drawing] of Object.entries(table)) {
    const id = `shared/heroine/${kind}/${name}`;
    const label = manifest.assets[id]?.label ?? name;
    write(`${id}.svg`, svg(drawing, undefined, label));
    const tile = tileOf(id);
    if (tile) write(`${tile}.svg`, tileFor(kind, drawing, label));
  }
}
console.log(`heroine: ${written.length} SVG files written`);
