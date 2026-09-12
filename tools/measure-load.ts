/**
 * First-load measurement of the production build (SPEC §3.3: interactive within 2 s on a
 * normal connection; §16.3: first-load budget 4 MB for one room). Serves dist/ with
 * `vite preview`, opens it in the installed Google Chrome with a cold cache under CDP network
 * throttling, and reports for each profile:
 *
 *   S0 interactive   the room cards are in the DOM with their handlers (app code ran)
 *   S0 painted       every image on S0 has loaded
 *   S1 interactive   after clicking the Space card: the room heading has focus
 *   S1 painted       every image in the Space room has loaded
 *   bytes / requests everything transferred up to that point
 *
 * Run after `npm run build`:  node tools/measure-load.ts [--profile cable|4g|fast3g|all]
 */
import { spawn } from 'node:child_process';
import { chromium, type Page } from '@playwright/test';
import { createFreshSave } from '../src/core/save.ts';

function seededSave() {
  const save = createFreshSave();
  save.settings.language = 'en';
  return save;
}

const PORT = 4179;
const ORIGIN = `http://localhost:${PORT}`;

/** Throughput in bytes per second, latency in ms (DevTools' presets for 3G and 4G-like). */
const PROFILES: Record<
  string,
  { download: number; upload: number; latency: number; label: string }
> = {
  cable: {
    download: (10 * 1024 * 1024) / 8,
    upload: (5 * 1024 * 1024) / 8,
    latency: 40,
    label: 'Cable-like 10 Mbps, 40 ms',
  },
  '4g': {
    download: (4 * 1024 * 1024) / 8,
    upload: (3 * 1024 * 1024) / 8,
    latency: 100,
    label: '4G-like 4 Mbps, 100 ms',
  },
  fast3g: {
    download: (1.6 * 1024 * 1024) / 8,
    upload: (750 * 1024) / 8,
    latency: 562.5,
    label: 'Fast 3G (DevTools preset) 1.6 Mbps, 562.5 ms',
  },
};

const args = process.argv.slice(2);
const wanted = args.includes('--profile') ? args[args.indexOf('--profile') + 1]! : 'all';
const profiles = wanted === 'all' ? Object.keys(PROFILES) : [wanted];

function startPreview(): Promise<() => void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const stop = () => child.kill();
    child.stdout.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes(String(PORT))) resolve(stop);
    });
    child.on('exit', (code) => reject(new Error(`vite preview exited with ${code}`)));
    setTimeout(() => resolve(stop), 4000);
  });
}

/** In-page (the tools project has no DOM types, so browser code is passed as strings). */
const NOW = 'performance.now()';
const loadedIn = (scope: string) =>
  `(() => { const imgs = [...document.querySelectorAll('${scope} img')]; return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0); })()`;

async function imagesLoaded(page: Page, scope: string): Promise<number> {
  await page.waitForFunction(loadedIn(scope), undefined, { polling: 16 });
  return page.evaluate(NOW);
}

async function measure(profile: string): Promise<void> {
  const p = PROFILES[profile]!;
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  // A save with the language chosen, so S0 shows the cards (the common repeat-visit case).
  await context.addInitScript(
    `if (!localStorage.getItem('mcr.save.v1')) localStorage.setItem('mcr.save.v1', ${JSON.stringify(JSON.stringify(seededSave()))});`,
  );
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: p.download,
    uploadThroughput: p.upload,
    latency: p.latency,
  });

  let bytes = 0;
  let requests = 0;
  const byType = new Map<string, number>();
  page.on('response', async (res) => {
    try {
      const body = await res.body();
      bytes += body.length;
      requests++;
      const ext = new URL(res.url()).pathname.split('.').pop() ?? '';
      byType.set(ext, (byType.get(ext) ?? 0) + body.length);
    } catch {
      // Redirects and aborted responses have no body.
    }
  });

  await page.goto(ORIGIN + '/', { waitUntil: 'commit' });
  await page.waitForSelector('[data-testid="room-card-space"]');
  const s0Interactive: number = await page.evaluate(NOW);
  const s0Painted = await imagesLoaded(page, '.s0');
  const s0Bytes = bytes;
  const s0Requests = requests;

  const clickAt: number = await page.evaluate(NOW);
  await page.click('[data-testid="room-card-space"]');
  await page.waitForFunction(`document.activeElement && document.activeElement.id === 's1-title'`);
  const s1Interactive = ((await page.evaluate(NOW)) as number) - clickAt;
  const s1Painted = (await imagesLoaded(page, '.s1')) - clickAt;
  await page.waitForTimeout(300); // let the last responses land in the counters

  console.log(`\n${p.label}`);
  console.log(`  S0 interactive  ${(s0Interactive / 1000).toFixed(2)} s`);
  console.log(
    `  S0 painted      ${(s0Painted / 1000).toFixed(2)} s   (${(s0Bytes / 1024).toFixed(0)} KB, ${s0Requests} requests)`,
  );
  console.log(`  S1 interactive  +${(s1Interactive / 1000).toFixed(2)} s after the click`);
  console.log(`  S1 painted      +${(s1Painted / 1000).toFixed(2)} s after the click`);
  console.log(`  total           ${(bytes / 1024).toFixed(0)} KB in ${requests} requests`);
  for (const [ext, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${ext.padEnd(5)} ${(n / 1024).toFixed(0)} KB`);
  }
  await browser.close();
}

const stop = await startPreview();
try {
  for (const profile of profiles) await measure(profile);
} finally {
  stop();
}
