import { definePluginEntry } from '/usr/local/lib/node_modules/openclaw/dist/plugin-sdk/plugin-entry.js';
import { getCodexUsageMessage } from './codex-rate-limits.ts';

export default definePluginEntry({
  id: 'openclaw-codex-usage-command',
  name: 'Codex Usage Command',
  description: 'Reply with Codex usage when /codex-usage is invoked.',
  register(api) {
    api.registerCommand({
      name: 'codex-usage',
      description: 'Show Codex hourly/weekly usage percentages',
      acceptsArgs: false,
      handler: async () => {
        const enabled = api.config?.enabled ?? true;
        const codexBin = api.config?.codexBin ?? 'codex';
        if (!enabled) {
          return { text: 'Codex usage command is disabled.' };
        }

        const usageText = await getCodexUsageMessage(codexBin);
        if (usageText) return { text: usageText };

        return { text: 'Unable to read Codex rate limits right now.' };
      }
    });
  }
});
