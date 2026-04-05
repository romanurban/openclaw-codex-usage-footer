import { spawn } from 'node:child_process';

export type RateLimitSnapshot = {
  primary?: { usedPercent?: number; windowDurationMins?: number; resetsAt?: number };
  secondary?: { usedPercent?: number; windowDurationMins?: number; resetsAt?: number };
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveResetsHm(snapshot: RateLimitSnapshot): string | null {
  const raw = snapshot?.primary?.resetsAt ?? snapshot?.secondary?.resetsAt;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const ts = raw > 1e12 ? raw : raw * 1000;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatUsageMessage(snapshot: RateLimitSnapshot): string | null {
  const primaryUsed = snapshot?.primary?.usedPercent;
  const secondaryUsed = snapshot?.secondary?.usedPercent;
  if (typeof primaryUsed !== 'number' || typeof secondaryUsed !== 'number') return null;

  const hourlyUsed = clampPercent(primaryUsed);
  const weeklyUsed = clampPercent(secondaryUsed);
  const hourlyLeft = 100 - hourlyUsed;
  const weeklyLeft = 100 - weeklyUsed;
  const resetsAt = resolveResetsHm(snapshot) ?? 'unknown';

  return `⏱ Hourly: ${hourlyUsed}% used (${hourlyLeft}% left). 📅 Weekly: ${weeklyUsed}% used (${weeklyLeft}% left). Resets at ${resetsAt}.`;
}

export async function readCodexRateLimits(codexBin: string): Promise<RateLimitSnapshot | null> {
  return await new Promise((resolve) => {
    const proc = spawn(codexBin, ['app-server'], {
      stdio: ['pipe', 'pipe', 'ignore'],
      env: process.env,
    });

    let settled = false;
    const finish = (value: RateLimitSnapshot | null) => {
      if (settled) return;
      settled = true;
      try { proc.kill(); } catch {}
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), 6000);

    const send = (msg: unknown) => {
      proc.stdin.write(JSON.stringify(msg) + '\n');
    };

    let buffer = '';
    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      while (true) {
        const idx = buffer.indexOf('\n');
        if (idx === -1) break;
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        let msg: any;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === 2) {
          clearTimeout(timer);
          finish(msg?.result?.rateLimits ?? null);
          return;
        }
      }
    });

    proc.on('error', () => {
      clearTimeout(timer);
      finish(null);
    });

    proc.on('exit', () => {
      clearTimeout(timer);
      finish(null);
    });

    send({
      method: 'initialize',
      id: 1,
      params: {
        clientInfo: {
          name: 'openclaw_codex_usage',
          title: 'OpenClaw Codex Usage',
          version: '0.1.0'
        },
        capabilities: { experimentalApi: true }
      }
    });
    send({ method: 'initialized', params: {} });
    send({ method: 'account/rateLimits/read', id: 2, params: {} });
  });
}

export async function getCodexUsageMessage(codexBin: string): Promise<string | null> {
  const snapshot = await readCodexRateLimits(codexBin);
  if (!snapshot) return null;
  return formatUsageMessage(snapshot);
}
