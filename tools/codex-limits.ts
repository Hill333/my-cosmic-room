/**
 * Reads the Codex CLI usage windows (SPEC §15.6) through `codex app-server`, a stdio JSON-RPC
 * server that answers `account/rateLimits/read`. Used by tools/gen-assets.ts before every
 * generation so a run pauses instead of failing on a full five-hour window.
 *
 *   node tools/codex-limits.ts        # prints the windows and exits 0
 */
import { spawn } from 'node:child_process';

export interface UsageWindow {
  usedPercent: number;
  windowDurationMins: number;
  /** Epoch seconds. */
  resetsAt: number;
}

export interface CodexLimits {
  /** The five-hour window. */
  primary: UsageWindow | null;
  /** The weekly window. */
  secondary: UsageWindow | null;
  /** Set by the server when a window is exhausted (`primary`, `secondary`, ...). */
  rateLimitReachedType: string | null;
  planType: string | null;
}

interface RpcResponse {
  id?: number;
  result?: {
    rateLimits?: {
      primary?: UsageWindow | null;
      secondary?: UsageWindow | null;
      rateLimitReachedType?: string | null;
      planType?: string | null;
    };
  };
  error?: { message?: string };
}

/**
 * Spawns `codex app-server`, performs the initialize handshake, asks for the rate limits and
 * kills the process. Rejects when the reply does not arrive within `timeoutMs`.
 */
export function readCodexLimits(timeoutMs = 20_000): Promise<CodexLimits> {
  return new Promise((resolve, reject) => {
    const child = spawn('codex', ['app-server'], { stdio: ['pipe', 'pipe', 'ignore'] });
    let buffer = '';
    let done = false;
    const finish = (err: Error | null, value?: CodexLimits) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      if (err) reject(err);
      else resolve(value!);
    };
    const timer = setTimeout(() => finish(new Error('codex app-server: timeout')), timeoutMs);
    const send = (o: unknown) => child.stdin.write(JSON.stringify(o) + '\n');
    child.on('error', (err) => finish(err));
    child.on('exit', () => finish(new Error('codex app-server exited before replying')));
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let msg: RpcResponse;
        try {
          msg = JSON.parse(line) as RpcResponse;
        } catch {
          continue;
        }
        if (msg.id === 1) {
          send({ jsonrpc: '2.0', method: 'initialized' });
          send({ jsonrpc: '2.0', id: 2, method: 'account/rateLimits/read', params: {} });
        } else if (msg.id === 2) {
          if (msg.error) return finish(new Error(msg.error.message ?? 'rateLimits error'));
          const rl = msg.result?.rateLimits ?? {};
          finish(null, {
            primary: rl.primary ?? null,
            secondary: rl.secondary ?? null,
            rateLimitReachedType: rl.rateLimitReachedType ?? null,
            planType: rl.planType ?? null,
          });
        }
      }
    });
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { clientInfo: { name: 'mcr-gen', version: '0.1' } },
    });
  });
}

export function formatLimits(l: CodexLimits): string {
  const win = (w: UsageWindow | null, name: string) =>
    w
      ? `${name} ${w.usedPercent}% used, resets ${new Date(w.resetsAt * 1000).toLocaleString()}`
      : `${name} n/a`;
  const reached = l.rateLimitReachedType ? `, LIMIT REACHED (${l.rateLimitReachedType})` : '';
  return `${win(l.primary, '5h')}; ${win(l.secondary, 'weekly')}${reached}`;
}

if (process.argv[1] && process.argv[1].endsWith('codex-limits.ts')) {
  readCodexLimits().then(
    (l) => {
      console.log(formatLimits(l));
      console.log(JSON.stringify(l));
    },
    (err) => {
      console.error(`codex-limits: ${(err as Error).message}`);
      process.exit(1);
    },
  );
}
