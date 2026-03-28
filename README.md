# openclaw-codex-usage-footer

OpenClaw extension that appends a Codex usage footer to outgoing messages.

Example footer:

`• ⏱ 91% · 📅 78% (last check 07:53)`

It reads rate limits from `codex app-server` and injects the footer through the `message_sending` hook.

## What it does

- reads Codex rate limits programmatically;
- uses the 5-hour window as `⏱`;
- uses the weekly window as `📅`;
- appends a short footer to outgoing messages.

## Requirements

- OpenClaw with local workspace extensions enabled;
- Codex CLI installed and logged in;
- a working `codex app-server` command.

## Files

- `src/index.ts` — OpenClaw hook
- `src/codex-rate-limits.ts` — Codex app-server client
- `openclaw.plugin.json` — plugin metadata and config schema

## Config

Example:

```json
{
  "plugins": {
    "entries": {
      "codex-usage-footer": {
        "enabled": true,
        "codexBin": "/absolute/path/to/codex",
        "directOnly": true,
        "channelIds": ["telegram"],
        "conversationIds": ["telegram:YOUR_CHAT_ID"]
      }
    }
  }
}
```

## Scope controls

- `enabled` — turn plugin on/off
- `codexBin` — path to Codex CLI
- `directOnly` — only direct chats
- `channelIds` — optional channel allowlist
- `conversationIds` — optional conversation allowlist

## Install

Place this project under an OpenClaw extension root and enable the plugin entry in `openclaw.json`.

Typical workspace path:

- `.openclaw/extensions/codex-usage-footer/`

## Notes

- no model tokens are spent to compute the footer;
- data is read locally from Codex app-server;
- if Codex is unavailable, the message is sent without footer.

## Why this exists

This extension exists because OpenClaw did not expose Codex rate-limit status in outgoing replies by default. It adds that footer through the `message_sending` hook and `codex app-server`.
