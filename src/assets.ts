/**
 * Asset lookup by manifest id (SPEC §15.5). Vite bundles every file under assets/ that the
 * manifest references; placeholders and real art are addressed the same way.
 */
import manifestJson from '@assets/manifest.json';
import type { AssetEntry, AssetManifest } from './assetTypes.ts';

export const manifest = manifestJson as unknown as AssetManifest;

const files = import.meta.glob('/assets/**/*.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function assetEntry(id: string): AssetEntry {
  const entry = manifest.assets[id];
  if (!entry) throw new Error(`Unknown asset id: ${id}`);
  return entry;
}

export function assetUrl(id: string): string {
  const entry = assetEntry(id);
  const url = files[`/assets/${entry.path}`];
  if (!url) throw new Error(`Asset file missing for ${id}: assets/${entry.path}`);
  return url;
}
