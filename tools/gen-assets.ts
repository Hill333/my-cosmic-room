/**
 * Drives Codex CLI per manifest entry (SPEC §15.6). Not part of the app bundle.
 *
 *   node tools/gen-assets.ts [--smoke] [--only <id>...] [--regen <id>...] [--preset <p>]
 *                            [--limit <n>] [--dry-run]
 *
 * Generates every entry whose gen.status is 'placeholder' (or the ids named with --regen),
 * never touches 'approved' entries, and records preset, attempts and timestamps in the
 * manifest. Raw output lands in assets/.gen/<id>.png with the agent's last message next
 * to it; post-processing into assets/<theme>/... is a separate step (SPEC §15.6).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { AssetEntry, GenPreset } from '../src/assetTypes.ts';
import { ASSETS_DIR, ROOT, assetFile, readManifest, writeManifest } from './lib/manifest.ts';

// --- Presets (D16). astra is the more capable model: high-complexity assets at light effort;
// sol at medium effort for simple single objects. Model ids verified against Codex CLI 0.153.4.
const PRESETS: Record<GenPreset, { model: string; effort: 'low' | 'medium' }> = {
  'astra-light': { model: 'gpt-6-astra', effort: 'low' },
  'sol-med': { model: 'gpt-5.6-sol', effort: 'medium' },
};

const STYLE_BLOCK =
  "Style: cosy dollhouse cartoon for a children's game; flat fills with soft shading; rounded dark-plum outlines (#3B2A5E, about 3 px at 2x); no gradients heavier than a soft vignette; no photo textures. " +
  'Palette: dark plum #3B2A5E, peach #F6D3C0, lavender #B9A6E8, mint #A9E5D0, deep purple #5A3D8A, star yellow #FFD86B, pink #F5B5C8, sunny yellow #FFD97D, lilac #C9B6F0, coral #E8735F, blue #4C7DE0. ' +
  'Original design, not based on any existing brand or character.';

const SINGLE_OBJECT =
  'Single object, centred, plain white background, no text, no shadow, no watermark.';
const ROOM_CLAUSE = 'Full scene, no text, no watermark.';

interface Args {
  smoke: boolean;
  only: string[];
  regen: string[];
  preset: GenPreset | null;
  limit: number;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    smoke: false,
    only: [],
    regen: [],
    preset: null,
    limit: Infinity,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const next = () => argv[++i] ?? '';
    if (a === '--smoke') args.smoke = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--only') args.only.push(next());
    else if (a === '--regen') args.regen.push(next());
    else if (a === '--preset') args.preset = next() as GenPreset;
    else if (a === '--limit') args.limit = Number(next());
    else throw new Error(`Unknown argument ${a}`);
  }
  return args;
}

function rawPath(id: string): string {
  return resolve(ASSETS_DIR, '.gen', `${id}.png`);
}

function referenceFile(ref: string, manifest: ReturnType<typeof readManifest>): string | null {
  if (ref.startsWith('docs/')) return resolve(ROOT, ref);
  const entry = manifest.assets[ref];
  if (!entry?.gen || entry.gen.status === 'placeholder') return null; // no point attaching a placeholder
  const raw = rawPath(ref);
  if (existsSync(raw)) return raw;
  const file = assetFile(entry.path);
  return existsSync(file) && !file.endsWith('.svg') ? file : null;
}

function buildPrompt(id: string, entry: AssetEntry): string {
  const [w, h] = entry.size;
  const clause =
    entry.category === 'room' || (entry.category === 'sceneA' && entry.size[0] > 2000)
      ? ROOM_CLAUSE
      : SINGLE_OBJECT;
  const out = `assets/.gen/${id}.png`;
  return (
    `You are generating one piece of game art. Use your image generation tool. ${STYLE_BLOCK} ` +
    `Subject: ${entry.gen!.prompt}. ${clause} ` +
    `Intended display size ${w}x${h} pixels at 2x, so use the closest supported aspect ratio and keep the image at the tool's native resolution (1024 px or more on the long side); do not resize, crop or recolour it, the pipeline does that later. ` +
    `Save the final PNG in this repository as ${out} (create directories as needed; if the tool saved the image elsewhere, copy it there). ` +
    `Do not modify any other file. Reply with one line: the saved path and the image size.`
  );
}

function runCodex(
  id: string,
  entry: AssetEntry,
  refs: string[],
  dryRun: boolean,
): { ok: boolean; log: string } {
  const preset = PRESETS[entry.gen!.preset];
  const out = rawPath(id);
  mkdirSync(dirname(out), { recursive: true });
  const lastMessage = resolve(ASSETS_DIR, '.gen', `${id}.last.md`);
  const args = [
    'exec',
    '-m',
    preset.model,
    '-c',
    `model_reasoning_effort="${preset.effort}"`,
    ...refs.flatMap((r) => ['-i', r]),
    '-s',
    'workspace-write',
    '--skip-git-repo-check',
    '-C',
    ROOT,
    '-o',
    lastMessage,
    buildPrompt(id, entry),
  ];
  const cmdLine = `codex ${args.map((a) => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}`;
  if (dryRun) return { ok: true, log: cmdLine };
  const started = Date.now();
  const result = spawnSync('codex', args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 15 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  const log = `${cmdLine}\n\n--- exit ${result.status} after ${seconds}s ---\n${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  writeFileSync(resolve(ASSETS_DIR, '.gen', `${id}.log`), log);
  const ok = result.status === 0 && existsSync(out) && statSync(out).size > 0;
  return { ok, log };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const manifest = readManifest();
  let candidates = Object.entries(manifest.assets).filter(([, e]) => e.gen);

  if (args.only.length) candidates = candidates.filter(([id]) => args.only.includes(id));
  else if (args.regen.length) candidates = candidates.filter(([id]) => args.regen.includes(id));
  else candidates = candidates.filter(([, e]) => e.gen!.status === 'placeholder');

  candidates = candidates.filter(([, e]) => e.gen!.status !== 'approved');
  if (args.preset) candidates = candidates.filter(([, e]) => e.gen!.preset === args.preset);

  if (args.smoke) {
    // One small asset per preset: enough to prove both model ids resolve and write PNGs.
    const pick = (preset: GenPreset, preferred: string) =>
      candidates.find(([id, e]) => e.gen!.preset === preset && id === preferred) ??
      candidates.find(([, e]) => e.gen!.preset === preset);
    candidates = [
      pick('sol-med', 'space/decorations/starLamp'),
      pick('astra-light', 'space/decorations/moonBed'),
    ].filter((c): c is [string, AssetEntry] => Boolean(c));
  }
  candidates = candidates.slice(0, args.limit);

  if (candidates.length === 0) {
    console.log('gen-assets: nothing to generate');
    return;
  }
  console.log(`gen-assets: ${candidates.length} asset(s)${args.dryRun ? ' (dry run)' : ''}`);

  let failures = 0;
  for (const [id, entry] of candidates) {
    const refs = entry
      .gen!.references.map((r) => referenceFile(r, manifest))
      .filter((r): r is string => r !== null);
    const preset = entry.gen!.preset;
    process.stdout.write(
      `- ${id} [${preset} → ${PRESETS[preset].model}/${PRESETS[preset].effort}] ... `,
    );
    const { ok, log } = runCodex(id, entry, refs, args.dryRun);
    if (args.dryRun) {
      console.log('\n  ' + log);
      continue;
    }
    entry.gen!.attempts += 1;
    if (ok) {
      entry.gen!.generatedAt = new Date().toISOString();
      entry.gen!.status = 'generated';
      console.log(`ok → assets/.gen/${id}.png`);
    } else {
      failures += 1;
      console.log(`FAILED (see assets/.gen/${id}.log)`);
      console.log(log.split('\n').slice(-12).join('\n'));
    }
    writeManifest(manifest); // persist after every asset so an interrupted run keeps its history
  }
  if (failures) process.exit(1);
}

main();
