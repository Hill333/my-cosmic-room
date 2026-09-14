/**
 * Writes an SVG placeholder for every manifest entry whose file is missing
 * (SPEC §15.2 item 1): a coloured rounded shape with the asset's name.
 * Existing files are never overwritten unless --force is given.
 *
 *   node tools/gen-placeholders.ts [--force]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AssetEntry } from '../src/assetTypes.ts';
import { assetFile, readManifest } from './lib/manifest.ts';

const force = process.argv.includes('--force');

const PALETTE = {
  plum: '#3B2A5E',
  peach: '#F6D3C0',
  lavender: '#B9A6E8',
  mint: '#A9E5D0',
  purple: '#5A3D8A',
  star: '#FFD86B',
  pink: '#F5B5C8',
  sunny: '#FFD97D',
  lilac: '#C9B6F0',
  cream: '#FFF7EE',
  coral: '#E8735F',
  blue: '#4C7DE0',
};

/** Placeholder tints per room (shared assets use the Space tints). */
const THEME_TINTS: Record<
  AssetEntry['theme'],
  { wall: string; floor: string; item: string; companion: string; scene: string }
> = {
  space: {
    wall: PALETTE.peach,
    floor: '#D8C5F2',
    item: PALETTE.lavender,
    companion: '#7FDCD0',
    scene: PALETTE.lilac,
  },
  shared: {
    wall: PALETTE.peach,
    floor: '#D8C5F2',
    item: PALETTE.lavender,
    companion: '#7FDCD0',
    scene: PALETTE.lilac,
  },
  sweet: {
    wall: '#F9D6C8',
    floor: '#EBC1A6',
    item: PALETTE.pink,
    companion: '#D9D9E3',
    scene: PALETTE.sunny,
  },
  hearts: {
    wall: '#FBD3DC',
    floor: '#EBC1A6',
    item: '#F7A8C0',
    companion: '#FFFFFF',
    scene: '#F9C6D2',
  },
  kpop: {
    wall: '#E9DAF7',
    floor: '#D9B98F',
    item: '#B48BE0',
    companion: '#7FB3F0',
    scene: '#C9A6F2',
  },
};

function fillFor(entry: AssetEntry): string {
  const tints = THEME_TINTS[entry.theme];
  switch (entry.category) {
    case 'room':
      return tints.wall;
    case 'decoration':
    case 'tile':
      return tints.item;
    case 'garment':
    case 'heroine':
      return PALETTE.mint;
    case 'companion':
      return tints.companion;
    case 'entry':
      return PALETTE.coral;
    case 'sceneA':
    case 'sceneB':
      return tints.scene;
    case 'ui':
    case 'logo':
    case 'sound':
      return PALETTE.star;
  }
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function label(entry: AssetEntry, w: number, h: number): string {
  const fontSize = Math.max(14, Math.min(w, h) / 9);
  const lines = wrap(entry.label, Math.max(6, Math.floor(w / (fontSize * 0.6))));
  const startY = h / 2 - ((lines.length - 1) * fontSize * 1.15) / 2;
  return lines
    .map(
      (l, i) =>
        `<text x="${w / 2}" y="${(startY + i * fontSize * 1.15).toFixed(1)}" font-family="system-ui, sans-serif" font-size="${fontSize.toFixed(1)}" font-weight="700" fill="${PALETTE.plum}" text-anchor="middle" dominant-baseline="middle">${escape(l)}</text>`,
    )
    .join('');
}

/**
 * Heroine placeholders (SPEC §4.5): a figure is a whole standing doll on the 600 × 900 canvas;
 * shoes, extras and faces are small overlays drawn to fill their own box.
 */
function heroineLayer(entry: AssetEntry, w: number, h: number): string {
  const tag = `<text x="${w / 2}" y="${h - 20}" font-family="system-ui, sans-serif" font-size="22" fill="${PALETTE.plum}" text-anchor="middle" opacity="0.7">${escape(entry.label)}</text>`;
  const stroke = `stroke="${PALETTE.plum}" stroke-width="6"`;
  switch (entry.layer) {
    case 'figure':
      return (
        `<ellipse cx="300" cy="150" rx="135" ry="110" fill="#7A4A2E" ${stroke}/><circle cx="170" cy="100" r="45" fill="#7A4A2E" ${stroke}/><circle cx="430" cy="100" r="45" fill="#7A4A2E" ${stroke}/>` +
        `<ellipse cx="300" cy="205" rx="112" ry="118" fill="#F8D9C4" ${stroke}/>` +
        `<circle cx="255" cy="195" r="12" fill="${PALETTE.plum}"/><circle cx="345" cy="195" r="12" fill="${PALETTE.plum}"/><path d="M270 245 Q300 270 330 245" fill="none" ${stroke} stroke-linecap="round"/>` +
        `<rect x="195" y="330" width="210" height="290" rx="50" fill="${PALETTE.lilac}" ${stroke}/>` +
        `<rect x="230" y="600" width="55" height="250" rx="26" fill="#F8D9C4" ${stroke}/><rect x="315" y="600" width="55" height="250" rx="26" fill="#F8D9C4" ${stroke}/>` +
        `<ellipse cx="258" cy="865" rx="50" ry="28" fill="#fff" ${stroke}/><ellipse cx="342" cy="865" rx="50" ry="28" fill="#fff" ${stroke}/>${tag}`
      );
    case 'face':
      return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 6}" ry="${h / 2 - 6}" fill="#F8D9C4"/><circle cx="${w * 0.35}" cy="${h * 0.42}" r="12" fill="${PALETTE.plum}"/><circle cx="${w * 0.65}" cy="${h * 0.42}" r="12" fill="${PALETTE.plum}"/><path d="M${w * 0.38} ${h * 0.68} Q${w / 2} ${h * 0.82} ${w * 0.62} ${h * 0.68}" fill="none" ${stroke} stroke-linecap="round"/>`;
    case 'shoes':
      return `<ellipse cx="${w * 0.3}" cy="${h * 0.7}" rx="${w * 0.2}" ry="${h * 0.22}" fill="${PALETTE.blue}" ${stroke}/><ellipse cx="${w * 0.7}" cy="${h * 0.7}" rx="${w * 0.2}" ry="${h * 0.22}" fill="${PALETTE.blue}" ${stroke}/>`;
    case 'extra':
      return `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="${Math.min(w, h) * 0.3}" fill="${PALETTE.star}" ${stroke}/>`;
    default:
      return tag;
  }
}

function svgFor(entry: AssetEntry): string {
  const [w, h] = entry.size;
  let body: string;
  if (entry.category === 'garment' || entry.category === 'heroine') {
    body = heroineLayer(entry, w, h);
  } else if (entry.category === 'room') {
    // Room: wall, floor band and faint markers where the seven slots go.
    body = `<rect width="${w}" height="${h}" fill="${fillFor(entry)}"/><rect y="${h * 0.68}" width="${w}" height="${h * 0.32}" fill="${THEME_TINTS[entry.theme].floor}"/>${label(entry, w, h * 0.5)}`;
  } else {
    const r = Math.min(w, h) * 0.18;
    body = `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="${r}" fill="${fillFor(entry)}" stroke="${PALETTE.plum}" stroke-width="6"/>${label(entry, w, h)}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${escape(entry.label)} (placeholder)">${body}</svg>\n`;
}

const manifest = readManifest();
let written = 0;
let skipped = 0;
for (const entry of Object.values(manifest.assets)) {
  const target = assetFile(entry.path);
  if (existsSync(target) && !force) {
    skipped++;
    continue;
  }
  if (!entry.path.endsWith('.svg')) {
    // A generated PNG is referenced but missing: leave it to the asset check to report.
    skipped++;
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, svgFor(entry));
  written++;
}
console.log(`placeholders: ${written} written, ${skipped} skipped`);
