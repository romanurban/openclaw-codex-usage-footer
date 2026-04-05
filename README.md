# openclaw-codex-usage-command

OpenClaw extension that adds a `/codex-usage` command.

When you type `/codex-usage` in Telegram, it reads rate limits from `codex app-server` and replies in chat with usage info like:

`⏱ Hourly: 45% used (55% left). 📅 Weekly: 78% used (22% left). Resets at HH:MM.`

## Requirements

- OpenClaw with local workspace extensions enabled
- Codex CLI installed and logged in
- a working `codex app-server` command

## Files

- `src/index.ts` - command registration
- `src/codex-rate-limits.ts` - Codex app-server client and formatter
- `openclaw.plugin.json` - plugin metadata and config schema

## Config

```json
{
  "plugins": {
    "entries": {
      "codex-usage-command": {
        "enabled": true,
        "codexBin": "/absolute/path/to/codex"
      }
    }
  }
}
```

- `enabled` - turn command on/off
- `codexBin` - path to Codex CLI
