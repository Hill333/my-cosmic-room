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

function fillFor(entry: AssetEntry): string {
  const theme = entry.theme;
  switch (entry.category) {
    case 'room':
      return theme === 'sweet' ? '#F9D6C8' : PALETTE.peach;
    case 'decoration':
    case 'tile':
      return theme === 'sweet' ? PALETTE.pink : PALETTE.lavender;
    case 'garment':
    case 'heroine':
      return PALETTE.mint;
    case 'companion':
      return theme === 'sweet' ? '#D9D9E3' : '#7FDCD0';
    case 'entry':
      return PALETTE.coral;
    case 'sceneA':
    case 'sceneB':
      return theme === 'sweet' ? PALETTE.sunny : PALETTE.lilac;
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

/** Heroine layers share one 600×900 canvas; each layer draws only its region (SPEC §4.5). */
function heroineLayer(entry: AssetEntry, w: number, h: number): string {
  const tag = `<text x="${w / 2}" y="${h - 20}" font-family="system-ui, sans-serif" font-size="22" fill="${PALETTE.plum}" text-anchor="middle" opacity="0.7">${escape(entry.label)}</text>`;
  const stroke = `stroke="${PALETTE.plum}" stroke-width="6"`;
  switch (entry.layer) {
    case 'body':
      return `<ellipse cx="300" cy="200" rx="120" ry="130" fill="#F8D9C4" ${stroke}/><rect x="200" y="320" width="200" height="300" rx="60" fill="#F8D9C4" ${stroke}/><rect x="230" y="600" width="55" height="220" rx="26" fill="#F8D9C4" ${stroke}/><rect x="315" y="600" width="55" height="220" rx="26" fill="#F8D9C4" ${stroke}/>`;
    case 'face':
      return `<circle cx="100" cy="90" r="12" fill="${PALETTE.plum}"/><circle cx="200" cy="90" r="12" fill="${PALETTE.plum}"/><path d="M110 140 Q150 175 190 140" fill="none" ${stroke} stroke-linecap="round"/>${tag}`;
    case 'hair':
      return `<ellipse cx="300" cy="150" rx="135" ry="110" fill="#7A4A2E" ${stroke}/><circle cx="170" cy="120" r="45" fill="#7A4A2E" ${stroke}/><circle cx="430" cy="120" r="45" fill="#7A4A2E" ${stroke}/>${tag}`;
    case 'outfit':
      return `<rect x="195" y="330" width="210" height="290" rx="50" fill="${PALETTE.lilac}" ${stroke}/>${tag}`;
    case 'shoes':
      return `<ellipse cx="258" cy="835" rx="52" ry="30" fill="${PALETTE.blue}" ${stroke}/><ellipse cx="342" cy="835" rx="52" ry="30" fill="${PALETTE.blue}" ${stroke}/>${tag}`;
    case 'extra':
      return `<circle cx="420" cy="70" r="34" fill="${PALETTE.star}" ${stroke}/>${tag}`;
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
    body = `<rect width="${w}" height="${h}" fill="${fillFor(entry)}"/><rect y="${h * 0.68}" width="${w}" height="${h * 0.32}" fill="${entry.theme === 'sweet' ? '#EBC1A6' : '#D8C5F2'}"/>${label(entry, w, h * 0.5)}`;
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
