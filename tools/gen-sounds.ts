/**
 * Synthesizes the sound effects of SPEC §15.4 (tap, place, wear, correct, wrong, hint, next,
 * fanfare, launch / tea-party jingle, star) as short chimes and plops: PCM rendered here,
 * written as WAV, encoded to MP3 at 96 kbps with ffmpeg (SPEC §15.4: MP3, under 50 KB each)
 * and their duration recorded in assets/manifest.json. No downloads, nothing royalty-bound.
 *
 *   node tools/gen-sounds.ts [--only <id>] [--wav-dir <dir>]
 *
 * Deterministic: the same script always renders the same samples. `ffmpeg` must be on PATH
 * (`brew install ffmpeg`); without it the script exits 1 and explains.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { SOUNDS } from './manifest-data.ts';
import { assetFile, readManifest, writeManifest } from './lib/manifest.ts';

const SAMPLE_RATE = 44100;
const MAX_BYTES = 50 * 1024;
const BITRATE = '96k';

const args = process.argv.slice(2);
const only = new Set<string>();
let wavDir: string | null = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--only' && args[i + 1]) only.add(args[++i]!);
  else if (args[i] === '--wav-dir' && args[i + 1]) wavDir = args[++i]!;
}

// --- Synthesis primitives --------------------------------------------------------------

type Samples = Float64Array;

function seconds(n: number): number {
  return Math.round(n * SAMPLE_RATE);
}

function silence(duration: number): Samples {
  return new Float64Array(seconds(duration));
}

/** Exponential decay envelope with a short linear attack, so nothing clicks. */
function envelope(i: number, length: number, attack = 0.005, decay = 4): number {
  const a = seconds(attack);
  const rise = i < a ? i / a : 1;
  const fall = Math.exp((-decay * i) / length);
  const tail = Math.min(1, (length - i) / seconds(0.01));
  return rise * fall * Math.max(0, tail);
}

interface ToneOptions {
  /** Frequency at the start and (optionally) the end of the note; a glide between them. */
  from: number;
  to?: number;
  duration: number;
  volume?: number;
  /** Harmonic weights over the fundamental: [1] is a sine, [1, 0.4, 0.2] a warmer chime. */
  harmonics?: number[];
  attack?: number;
  decay?: number;
}

/** One note as a sum of harmonics under a plucked envelope. */
function tone({
  from,
  to = from,
  duration,
  volume = 0.5,
  harmonics = [1, 0.35, 0.12],
  attack,
  decay,
}: ToneOptions): Samples {
  const length = seconds(duration);
  const out = new Float64Array(length);
  let phase = 0;
  const total = harmonics.reduce((s, h) => s + h, 0);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const f = from + (to - from) * t;
    phase += (2 * Math.PI * f) / SAMPLE_RATE;
    let v = 0;
    harmonics.forEach((h, k) => {
      v += h * Math.sin(phase * (k + 1));
    });
    out[i] = (v / total) * volume * envelope(i, length, attack, decay);
  }
  return out;
}

/** A soft filtered noise burst (the launch whoosh); a deterministic LCG, no Math.random. */
function whoosh(duration: number, volume: number, rising: boolean): Samples {
  const length = seconds(duration);
  const out = new Float64Array(length);
  let seed = 1234567;
  let low = 0;
  for (let i = 0; i < length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = (seed / 0xffffffff) * 2 - 1;
    const t = i / length;
    // One-pole low-pass whose cut-off opens (or closes) over the burst.
    const k = rising ? 0.02 + 0.3 * t : 0.32 - 0.3 * t;
    low += k * (n - low);
    const env = Math.sin(Math.PI * t) ** 1.5;
    out[i] = low * volume * env;
  }
  return out;
}

/** Mixes `part` into `into` starting at `at` seconds (extending the buffer if needed). */
function mix(into: Samples, part: Samples, at: number): Samples {
  const start = seconds(at);
  const length = Math.max(into.length, start + part.length);
  const out = new Float64Array(length);
  out.set(into);
  for (let i = 0; i < part.length; i++) out[start + i]! += part[i]!;
  return out;
}

/** Plays notes one after another (with `gap` seconds between starts) over a bed. */
function sequence(notes: ToneOptions[], gap: number, bed: Samples = silence(0)): Samples {
  let out = bed;
  notes.forEach((n, i) => {
    out = mix(out, tone(n), i * gap);
  });
  return out;
}

const N = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880,
  B5: 987.77,
  C6: 1046.5,
  E6: 1318.5,
  G6: 1568,
  C7: 2093,
};

/** Bell-like timbre for chimes: strong fundamental, a bright partial and a faint octave. */
const BELL = [1, 0.15, 0.25, 0.05];
const WARM = [1, 0.5, 0.2, 0.08];

// --- The ten effects (SPEC §15.4) -----------------------------------------------------------

const RECIPES: Record<string, () => Samples> = {
  // A short bright blip.
  'shared/sound/tap': () => tone({ from: N.A5, duration: 0.09, volume: 0.35, harmonics: BELL }),
  // A plop: a quick pitch drop with a round timbre.
  'shared/sound/place': () =>
    mix(
      tone({ from: 520, to: 210, duration: 0.16, volume: 0.55, harmonics: WARM, decay: 5 }),
      tone({ from: 260, duration: 0.12, volume: 0.25, harmonics: [1], decay: 6 }),
      0.02,
    ),
  // A soft two-note swish for putting something on.
  'shared/sound/wear': () =>
    mix(
      whoosh(0.22, 0.18, true),
      sequence(
        [
          { from: N.E5, duration: 0.18, volume: 0.35, harmonics: BELL },
          { from: N.A5, duration: 0.3, volume: 0.35, harmonics: BELL },
        ],
        0.1,
      ),
      0.04,
    ),
  // Rising major triad: the reward sound for a right answer.
  'shared/sound/correct': () =>
    sequence(
      [
        { from: N.C5, duration: 0.35, volume: 0.4, harmonics: BELL },
        { from: N.E5, duration: 0.35, volume: 0.4, harmonics: BELL },
        { from: N.G5, duration: 0.5, volume: 0.45, harmonics: BELL },
      ],
      0.11,
    ),
  // A gentle low "hmm": two soft notes stepping down, never a buzzer.
  'shared/sound/wrong': () =>
    sequence(
      [
        { from: 330, duration: 0.22, volume: 0.28, harmonics: WARM, attack: 0.02, decay: 3 },
        { from: 262, duration: 0.3, volume: 0.24, harmonics: WARM, attack: 0.02, decay: 3 },
      ],
      0.17,
    ),
  // A single clear bell with a twinkle.
  'shared/sound/hint': () =>
    mix(
      tone({ from: N.E6, duration: 0.55, volume: 0.35, harmonics: BELL, decay: 3.5 }),
      tone({ from: N.G6, duration: 0.4, volume: 0.2, harmonics: BELL, decay: 4 }),
      0.12,
    ),
  // A quick upward flick for moving on.
  'shared/sound/next': () =>
    sequence(
      [
        { from: N.C5, to: N.E5, duration: 0.12, volume: 0.35, harmonics: BELL },
        { from: N.G5, duration: 0.25, volume: 0.35, harmonics: BELL },
      ],
      0.09,
    ),
  // Mission complete: a four-note fanfare with a held top note.
  'shared/sound/fanfare': () =>
    sequence(
      [
        { from: N.C5, duration: 0.3, volume: 0.42, harmonics: WARM },
        { from: N.E5, duration: 0.3, volume: 0.42, harmonics: WARM },
        { from: N.G5, duration: 0.3, volume: 0.42, harmonics: WARM },
        { from: N.C6, duration: 0.9, volume: 0.5, harmonics: WARM, decay: 2.5 },
      ],
      0.16,
      mix(silence(0), tone({ from: N.C5 / 2, duration: 1.3, volume: 0.15, harmonics: WARM }), 0.48),
    ),
  // Launch: a rumble that lifts off with a rising whoosh and a bright arpeggio on top.
  'space/sound/jingle': () =>
    mix(
      mix(
        whoosh(1.4, 0.45, true),
        tone({ from: 70, to: 220, duration: 1.3, volume: 0.4, harmonics: WARM, decay: 2 }),
        0,
      ),
      sequence(
        [
          { from: N.C5, duration: 0.3, volume: 0.3, harmonics: BELL },
          { from: N.E5, duration: 0.3, volume: 0.3, harmonics: BELL },
          { from: N.G5, duration: 0.3, volume: 0.3, harmonics: BELL },
          { from: N.C6, duration: 0.7, volume: 0.35, harmonics: BELL, decay: 3 },
        ],
        0.14,
      ),
      0.55,
    ),
  // Tea party: a little waltz phrase on bells with a warm low note under it.
  'sweet/sound/jingle': () =>
    sequence(
      [
        { from: N.G5, duration: 0.3, volume: 0.36, harmonics: BELL },
        { from: N.E5, duration: 0.3, volume: 0.33, harmonics: BELL },
        { from: N.C5, duration: 0.3, volume: 0.33, harmonics: BELL },
        { from: N.E5, duration: 0.3, volume: 0.33, harmonics: BELL },
        { from: N.G5, duration: 0.3, volume: 0.36, harmonics: BELL },
        { from: N.C6, duration: 0.8, volume: 0.4, harmonics: BELL, decay: 3 },
      ],
      0.2,
      mix(
        mix(silence(0), tone({ from: N.C5 / 2, duration: 0.7, volume: 0.18, harmonics: WARM }), 0),
        tone({ from: N.G5 / 4, duration: 0.9, volume: 0.18, harmonics: WARM }),
        0.6,
      ),
    ),
  // Heart post (D21): a gentle rising bell phrase in thirds with a warm note under it, like
  // a music box opening.
  'hearts/sound/jingle': () =>
    sequence(
      [
        { from: N.E5, duration: 0.28, volume: 0.34, harmonics: BELL },
        { from: N.G5, duration: 0.28, volume: 0.34, harmonics: BELL },
        { from: N.E5, duration: 0.28, volume: 0.32, harmonics: BELL },
        { from: N.G5, duration: 0.28, volume: 0.34, harmonics: BELL },
        { from: N.C6, duration: 0.28, volume: 0.36, harmonics: BELL },
        { from: N.E6, duration: 0.8, volume: 0.4, harmonics: BELL, decay: 3 },
      ],
      0.18,
      mix(
        mix(silence(0), tone({ from: N.C5 / 2, duration: 0.8, volume: 0.16, harmonics: WARM }), 0),
        tone({ from: N.E5 / 4, duration: 0.9, volume: 0.16, harmonics: WARM }),
        0.7,
      ),
    ),
  // Showtime (D21): a bright drum-like low thump, a whoosh and a quick fanfare of bells
  // ending on a held high note, as the lights come up.
  'kpop/sound/jingle': () =>
    mix(
      mix(
        whoosh(1.0, 0.3, true),
        tone({ from: 90, to: 140, duration: 0.5, volume: 0.35, harmonics: WARM, decay: 4 }),
        0,
      ),
      sequence(
        [
          { from: N.G5, duration: 0.18, volume: 0.32, harmonics: BELL },
          { from: N.G5, duration: 0.18, volume: 0.32, harmonics: BELL },
          { from: N.C6, duration: 0.24, volume: 0.34, harmonics: BELL },
          { from: N.E6, duration: 0.24, volume: 0.34, harmonics: BELL },
          { from: N.G6, duration: 0.8, volume: 0.38, harmonics: BELL, decay: 3 },
        ],
        0.1,
      ),
      0.35,
    ),
  // Star earned: a fast sparkling run up to a high shimmer.
  'shared/sound/star': () =>
    sequence(
      [
        { from: N.C6, duration: 0.25, volume: 0.3, harmonics: BELL },
        { from: N.E6, duration: 0.25, volume: 0.3, harmonics: BELL },
        { from: N.G6, duration: 0.25, volume: 0.3, harmonics: BELL },
        { from: N.C7, duration: 0.6, volume: 0.32, harmonics: BELL, decay: 3 },
      ],
      0.08,
    ),
};

// --- Rendering -----------------------------------------------------------------------------

function toWav(samples: Samples): Buffer {
  // Normalise to −1 dBFS so the effects sit at one level.
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]! * gain));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function haveFfmpeg(): boolean {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!haveFfmpeg()) {
  console.error('gen-sounds: ffmpeg is not on PATH (brew install ffmpeg); nothing written.');
  process.exit(1);
}

const manifest = readManifest();
const tmp = wavDir ?? mkdtempSync(join(tmpdir(), 'mcr-sounds-'));
mkdirSync(tmp, { recursive: true });
let written = 0;
for (const sound of SOUNDS) {
  if (only.size && !only.has(sound.id)) continue;
  const recipe = RECIPES[sound.id];
  if (!recipe) throw new Error(`No recipe for ${sound.id}`);
  const entry = manifest.assets[sound.id];
  if (!entry) throw new Error(`${sound.id} is not in the manifest; run tools/build-manifest.ts`);
  const samples = recipe();
  const wav = join(tmp, sound.id.replace(/\//g, '_') + '.wav');
  writeFileSync(wav, toWav(samples));
  const target = assetFile(entry.path);
  mkdirSync(dirname(target), { recursive: true });
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-i',
      wav,
      '-map_metadata',
      '-1',
      '-c:a',
      'libmp3lame',
      '-b:a',
      BITRATE,
      '-ar',
      String(SAMPLE_RATE),
      '-ac',
      '1',
      '-write_xing',
      '0',
      '-id3v2_version',
      '0',
      target,
    ],
    { stdio: 'inherit' },
  );
  const bytes = statSync(target).size;
  if (bytes > MAX_BYTES) throw new Error(`${sound.id}: ${bytes} bytes exceeds ${MAX_BYTES}`);
  entry.duration = Math.round((samples.length / SAMPLE_RATE) * 100) / 100;
  console.log(
    `${sound.id.padEnd(22)} ${entry.duration.toFixed(2)} s  ${(bytes / 1024).toFixed(1)} KB`,
  );
  written++;
}
writeManifest(manifest);
if (!wavDir && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
console.log(`gen-sounds: ${written} file(s) written`);
