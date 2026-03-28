import { t as definePluginEntry } from '/usr/local/lib/node_modules/openclaw/dist/plugin-entry-CK-4XWE0.js';
import { getCodexUsageFooter } from './codex-rate-limits.ts';

function shouldSkip(content: unknown): boolean {
  if (!content || typeof content !== 'string') return true;
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (trimmed === 'NO_REPLY') return true;
  if (trimmed === 'HEARTBEAT_OK') return true;
  return false;
}

function appendFooter(content: string, footer: string): string {
  if (content.includes('• ⏱') || content.includes('📅')) return content;
  return `${content}\n\n${footer}`;
}

function matchesScope(ctx: any, config: any): boolean {
  if (config.directOnly && ctx.chatType && ctx.chatType !== 'direct') return false;
  if (Array.isArray(config.channelIds) && config.channelIds.length > 0 && !config.channelIds.includes(ctx.channelId)) {
    return false;
  }
  if (Array.isArray(config.conversationIds) && config.conversationIds.length > 0 && !config.conversationIds.includes(ctx.conversationId)) {
    return false;
  }
  return true;
}

export default definePluginEntry({
  id: 'openclaw-codex-usage-footer',
  name: 'Codex Usage Footer',
  description: 'Append Codex 5h/weekly usage footer to outgoing messages',
  register(api) {
    api.on('message_sending', async (event, ctx) => {
      try {
        const config = {
          enabled: api.config?.enabled ?? true,
          codexBin: api.config?.codexBin ?? 'codex',
          channelIds: api.config?.channelIds ?? [],
          conversationIds: api.config?.conversationIds ?? [],
          directOnly: api.config?.directOnly ?? true,
        };
        if (!config.enabled) return;
        if (shouldSkip(event.content)) return;
        if (!matchesScope(ctx, config)) return;
        const footer = await getCodexUsageFooter(config.codexBin);
        if (!footer) return;
        return { content: appendFooter(event.content, footer) };
      } catch (err) {
        api.logger?.warn?.(`codex-usage-footer failed: ${String(err)}`);
      }
    });
  }
});
