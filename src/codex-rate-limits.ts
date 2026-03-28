import { spawn } from 'node:child_process';

export type RateLimitSnapshot = {
  primary?: { usedPercent?: number; windowDurationMins?: number; resetsAt?: number };
  secondary?: { usedPercent?: number; windowDurationMins?: number; resetsAt?: number };
};

function nowHm() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatFooter(snapshot: RateLimitSnapshot): string | null {
  const primaryUsed = snapshot?.primary?.usedPercent;
  const secondaryUsed = snapshot?.secondary?.usedPercent;
  if (typeof primaryUsed !== 'number' || typeof secondaryUsed !== 'number') return null;
  const hourLeft = Math.max(0, Math.min(100, 100 - Math.round(primaryUsed)));
  const weekLeft = Math.max(0, Math.min(100, 100 - Math.round(secondaryUsed)));
  return `• ⏱ ${hourLeft}% · 📅 ${weekLeft}% (last check ${nowHm()})`;
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
          name: 'openclaw_codex_usage_footer',
          title: 'OpenClaw Codex Usage Footer',
          version: '0.1.0'
        },
        capabilities: { experimentalApi: true }
      }
    });
    send({ method: 'initialized', params: {} });
    send({ method: 'account/rateLimits/read', id: 2, params: {} });
  });
}

export async function getCodexUsageFooter(codexBin: string): Promise<string | null> {
  const snapshot = await readCodexRateLimits(codexBin);
  if (!snapshot) return null;
  return formatFooter(snapshot);
}
