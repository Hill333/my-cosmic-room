import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AssetManifest } from '../../src/assetTypes.ts';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ASSETS_DIR = resolve(ROOT, 'assets');
export const MANIFEST_PATH = resolve(ASSETS_DIR, 'manifest.json');

export function readManifest(): AssetManifest {
  if (!existsSync(MANIFEST_PATH)) return { version: 1, assets: {} };
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as AssetManifest;
}

export function writeManifest(manifest: AssetManifest): void {
  // Sorted keys keep diffs small.
  const sorted: AssetManifest = { version: 1, assets: {} };
  for (const id of Object.keys(manifest.assets).sort()) sorted.assets[id] = manifest.assets[id]!;
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + '\n');
}

export function assetFile(relPath: string): string {
  return resolve(ASSETS_DIR, relPath);
}
