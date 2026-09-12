/**
 * Build gate (SPEC §15.5): every catalogue art id must exist in the manifest and every
 * manifest path must exist on disk. Placeholders count as present. Exit code 1 on failure.
 *
 *   node tools/check-assets.ts
 */
import { existsSync } from 'node:fs';
import { allItems } from '../src/catalog/index.ts';
import { assetFile, readManifest } from './lib/manifest.ts';

const manifest = readManifest();
const problems: string[] = [];

for (const item of allItems) {
  for (const [role, id] of Object.entries(item.art)) {
    if (!id) continue;
    if (!manifest.assets[id])
      problems.push(`${item.id}: art.${role} "${id}" is not in the manifest`);
  }
}
for (const [id, entry] of Object.entries(manifest.assets)) {
  if (!existsSync(assetFile(entry.path)))
    problems.push(`${id}: file assets/${entry.path} is missing`);
  if (entry.derivedFrom && !manifest.assets[entry.derivedFrom]) {
    problems.push(`${id}: derivedFrom "${entry.derivedFrom}" is not in the manifest`);
  }
  for (const ref of entry.gen?.references ?? []) {
    const ok = ref.startsWith('docs/')
      ? existsSync(assetFile('../' + ref))
      : Boolean(manifest.assets[ref]);
    if (!ok) problems.push(`${id}: reference "${ref}" not found`);
  }
}

if (problems.length) {
  console.error(`check-assets: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`check-assets: ${Object.keys(manifest.assets).length} assets OK`);
