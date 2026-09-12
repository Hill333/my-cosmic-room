/**
 * Drives Codex CLI per manifest entry (SPEC §15.6). Not part of the app bundle.
 *
 *   node tools/gen-assets.ts [--smoke] [--only <id>...] [--regen <id>...] [--preset <p>]
 *                            [--limit <n>] [--dry-run] [--variant <name>] [--log <path>]
 *
 * Generates every entry whose gen.status is 'placeholder' (or the ids named with --regen),
 * never touches 'approved' entries, and records preset, attempts and timestamps in the
 * manifest. Raw output lands in assets/.gen/<id>.png with the agent's last message next
 * to it; post-processing into assets/<theme>/... is a separate step (SPEC §15.6).
 *
 * `--variant <name>` writes assets/.gen/<id>.<name>.png instead (a candidate to compare; copy
 * the chosen one over <id>.png before post-processing) and only bumps `attempts`.
 *
 * Usage guard: before every generation the Codex five-hour and weekly windows are read
 * (tools/codex-limits.ts). At 95 % or more of the five-hour window (or when the server reports
 * a reached limit, or a run's output mentions a rate or usage limit) the run prints
 * `PAUSED until <local time>` and sleeps until the window resets, then continues. At 95 % of
 * the weekly window the run stops. Every check is appended to the run log
 * (default assets/.gen/run.log, ignored by git).
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { AssetEntry, GenPreset } from '../src/assetTypes.ts';
import { formatLimits, readCodexLimits, type CodexLimits } from './codex-limits.ts';
import { ASSETS_DIR, ROOT, assetFile, readManifest, writeManifest } from './lib/manifest.ts';

const PAUSE_AT_PERCENT = 95;
const RESET_GRACE_MS = 60_000;
const LIMIT_PATTERN = /rate limit|usage limit|too many requests|limit reached|quota/i;
const MAX_LIMIT_RETRIES = 2;

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
const FIGURE_CLAUSE =
  'Single character, centred, plain white background, no text, no shadow, no watermark.';

interface Args {
  smoke: boolean;
  only: string[];
  regen: string[];
  preset: GenPreset | null;
  limit: number;
  dryRun: boolean;
  variant: string | null;
  log: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    smoke: false,
    only: [],
    regen: [],
    preset: null,
    limit: Infinity,
    dryRun: false,
    variant: null,
    log: resolve(ASSETS_DIR, '.gen', 'run.log'),
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
    else if (a === '--variant') args.variant = next();
    else if (a === '--log') args.log = resolve(ROOT, next());
    else throw new Error(`Unknown argument ${a}`);
  }
  return args;
}

function rawPath(id: string, variant: string | null = null): string {
  return resolve(ASSETS_DIR, '.gen', `${id}${variant ? '.' + variant : ''}.png`);
}

let runLog = resolve(ASSETS_DIR, '.gen', 'run.log');

function log(line: string): void {
  const stamped = `${new Date().toISOString()} ${line}`;
  mkdirSync(dirname(runLog), { recursive: true });
  appendFileSync(runLog, stamped + '\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function counter(l: CodexLimits | null): string {
  if (!l?.primary) return '5h n/a';
  return `5h ${l.primary.usedPercent}%${l.secondary ? `, weekly ${l.secondary.usedPercent}%` : ''}`;
}

/**
 * Reads the usage windows and waits while the five-hour window is (nearly) full. Returns the
 * last reading; throws when the weekly window is at the threshold (the run must stop).
 */
async function guardLimits(reason: string): Promise<CodexLimits | null> {
  for (;;) {
    let limits: CodexLimits;
    try {
      limits = await readCodexLimits();
    } catch (err) {
      log(`limits check (${reason}) failed: ${(err as Error).message}; continuing`);
      console.log(`  limits: unavailable (${(err as Error).message})`);
      return null;
    }
    log(`limits check (${reason}): ${formatLimits(limits)}`);
    if (limits.secondary && limits.secondary.usedPercent >= PAUSE_AT_PERCENT) {
      throw new Error(
        `weekly window at ${limits.secondary.usedPercent}% (resets ${new Date(limits.secondary.resetsAt * 1000).toLocaleString()}); stopping`,
      );
    }
    const full =
      (limits.primary && limits.primary.usedPercent >= PAUSE_AT_PERCENT) ||
      limits.rateLimitReachedType !== null;
    if (!full) return limits;
    const resetsAt = limits.primary
      ? limits.primary.resetsAt * 1000 + RESET_GRACE_MS
      : Date.now() + 15 * 60 * 1000;
    const wait = Math.max(RESET_GRACE_MS, resetsAt - Date.now());
    const until = new Date(resetsAt).toLocaleString();
    console.log(`PAUSED until ${until} (${formatLimits(limits)})`);
    log(`PAUSED until ${until} for ${(wait / 60000).toFixed(1)} min`);
    await sleep(wait);
    log('resumed after pause');
  }
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

function buildPrompt(id: string, entry: AssetEntry, variant: string | null): string {
  const [w, h] = entry.size;
  const clause =
    entry.category === 'room' || (entry.category === 'sceneA' && entry.size[0] > 2000)
      ? ROOM_CLAUSE
      : entry.category === 'heroine' && entry.layer === 'figure'
        ? FIGURE_CLAUSE
        : SINGLE_OBJECT;
  const out = `assets/.gen/${id}${variant ? '.' + variant : ''}.png`;
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
  variant: string | null,
): { ok: boolean; log: string; seconds: number; limited: boolean } {
  const preset = PRESETS[entry.gen!.preset];
  const out = rawPath(id, variant);
  mkdirSync(dirname(out), { recursive: true });
  const suffix = variant ? '.' + variant : '';
  const lastMessage = resolve(ASSETS_DIR, '.gen', `${id}${suffix}.last.md`);
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
    buildPrompt(id, entry, variant),
  ];
  const cmdLine = `codex ${args.map((a) => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}`;
  if (dryRun) return { ok: true, log: cmdLine, seconds: 0, limited: false };
  const started = Date.now();
  const result = spawnSync('codex', args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 15 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const seconds = Math.round((Date.now() - started) / 1000);
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const log = `${cmdLine}\n\n--- exit ${result.status} after ${seconds}s ---\n${output}`;
  writeFileSync(resolve(ASSETS_DIR, '.gen', `${id}${suffix}.log`), log);
  const ok = result.status === 0 && existsSync(out) && statSync(out).size > 0;
  return { ok, log, seconds, limited: !ok && LIMIT_PATTERN.test(output) };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  runLog = args.log;
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
  if (!args.dryRun)
    log(
      `run start: ${candidates.length} asset(s)${args.variant ? ` variant ${args.variant}` : ''}: ${candidates.map(([id]) => id).join(', ')}`,
    );

  let failures = 0;
  let index = 0;
  for (const [id, entry] of candidates) {
    index += 1;
    const refs = entry
      .gen!.references.map((r) => referenceFile(r, manifest))
      .filter((r): r is string => r !== null);
    const preset = entry.gen!.preset;
    if (!args.dryRun) await guardLimits(`before ${id}`);
    process.stdout.write(
      `- [${index}/${candidates.length}] ${id} [${preset} → ${PRESETS[preset].model}/${PRESETS[preset].effort}] ... `,
    );
    let result = runCodex(id, entry, refs, args.dryRun, args.variant);
    if (args.dryRun) {
      console.log('\n  ' + result.log);
      continue;
    }
    entry.gen!.attempts += 1;
    // A run that ran into a usage limit is retried after the window resets (same attempt count
    // bump per run, so the manifest history stays honest).
    for (let retry = 0; result.limited && retry < MAX_LIMIT_RETRIES; retry++) {
      console.log(`limit reached during the run; pausing`);
      log(`${id}: output mentions a usage limit after ${result.seconds}s; pausing and retrying`);
      await sleep(RESET_GRACE_MS);
      await guardLimits(`retry ${retry + 1} of ${id}`);
      result = runCodex(id, entry, refs, false, args.variant);
      entry.gen!.attempts += 1;
    }
    const after = await readCodexLimits().catch(() => null);
    const raw = `assets/.gen/${id}${args.variant ? '.' + args.variant : ''}.png`;
    if (result.ok) {
      if (!args.variant) {
        entry.gen!.generatedAt = new Date().toISOString();
        entry.gen!.status = 'generated';
      }
      console.log(`ok → ${raw} (${result.seconds}s; ${counter(after)})`);
      log(
        `${id}: ok ${preset} ${result.seconds}s attempts=${entry.gen!.attempts} → ${raw}; ${counter(after)}`,
      );
    } else {
      failures += 1;
      console.log(
        `FAILED (see ${raw.replace(/\.png$/, '.log')}; ${result.seconds}s; ${counter(after)})`,
      );
      console.log(result.log.split('\n').slice(-12).join('\n'));
      log(
        `${id}: FAILED ${preset} ${result.seconds}s attempts=${entry.gen!.attempts}; ${counter(after)}`,
      );
    }
    // Persist after every asset so an interrupted run keeps its history. Only this entry's
    // gen record is merged into a fresh read of the manifest, so a concurrent post-processing
    // run (tools/post-assets.ts) or a second generator never loses its writes.
    const fresh = readManifest();
    const target = fresh.assets[id];
    if (target?.gen && target.gen.status !== 'approved') {
      target.gen = {
        ...target.gen,
        attempts: entry.gen!.attempts,
        generatedAt: entry.gen!.generatedAt,
        status: entry.gen!.status,
      };
      writeManifest(fresh);
    }
  }
  if (!args.dryRun) log(`run end: ${failures} failure(s)`);
  if (failures) process.exit(1);
}

main().catch((err) => {
  console.error(`gen-assets: ${(err as Error).message}`);
  log(`run aborted: ${(err as Error).message}`);
  process.exit(2);
});
