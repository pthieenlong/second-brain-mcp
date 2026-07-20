# Second Brain MCP

*[Bản tiếng Việt](README.md)*

An [MCP](https://modelcontextprotocol.io) server that lets an AI assistant take notes for you — into an ordinary Markdown folder, the kind Obsidian reads.

You talk to your AI normally. When something is worth keeping, ask it to save: it picks a category, adds tags, writes a `.md` file. Later you ask it to find things back. The notes stay yours — plain files on your disk, readable without this tool.

---

## Setup

### Step 1 — What you need

- **Node.js 20 or newer.** Check by opening Terminal (macOS) or Command Prompt (Windows) and running `node --version`. If that errors or shows below 20, install from [nodejs.org](https://nodejs.org).
- **An MCP-capable AI client** — Claude Desktop, Antigravity, Cursor, or similar.

### Step 2 — Pick where notes live

Decide on a folder, e.g. `/Users/you/Documents/Notes`. It doesn't need to exist yet — it'll be created on first use.

Already using Obsidian? Point this at your existing vault.

### Step 3 — Add it to your AI client's config

Open your client's MCP configuration file and add:

```json
{
  "mcpServers": {
    "second-brain": {
      "command": "npx",
      "args": ["-y", "second-brain-mcp"],
      "env": {
        "VAULT_PATH": "/Users/you/Documents/Notes"
      }
    }
  }
}
```

Replace `/Users/you/Documents/Notes` with your actual path. It must be absolute — no `~` shortcuts.

If your config already has an `mcpServers` block with other servers, add `"second-brain": {...}` inside it rather than replacing the whole block.

Where that config file lives depends on your client — check its documentation for "MCP servers".

### Step 4 — Restart the client

Quit the AI client completely and reopen it. The first launch is slow while `npx` downloads the package.

### Step 5 — Try it

Say to your AI: *"Save this to my second brain: learned how React hooks work today"*

If it worked, it'll confirm and you'll find a new `.md` file in your chosen folder.

---

## What your AI can do

| Tool | What it does |
|---|---|
| `capture_note` | Save a new note. The AI classifies category and tags from the content. |
| `search_notes` | Find notes by title keyword, category, and/or tags. |
| `get_note` | Read a note's full content. |
| `update_note` | Edit a note. Changing title or category moves the file to its new path. |
| `delete_note` | Remove a note from both the folder and the index. |

You never call these by name. Just talk normally — *"find my notes about React"* — and the AI picks the right one.

---

## How notes are stored

Files live under `VAULT_PATH/<category>/` with YAML frontmatter:

```markdown
---
date: 2026-07-20
category: 01-Fundamentals
tags:
  - react
  - hooks
source: chat-capture
---
# React hooks

Note content...
```

These files are the source of truth. Open them in Obsidian, grep them, sync them, back them up — this tool holds no lock on them.

Alongside them sits `<VAULT_PATH>/.second-brain/index.db`, a small SQLite file holding note metadata so search doesn't read every file. It's derived data: delete it and it gets recreated (though empty — see [Known limitations](#known-limitations)).

---

## Changing the categories

The defaults:

```
01-Fundamentals  02-Work  03-Product-Thinking  04-Learning
05-Career        06-Personal  07-Projects
```

To use your own, add `NOTE_CATEGORIES` to the `env` block in your client config:

```json
"env": {
  "VAULT_PATH": "/Users/you/Documents/Notes",
  "NOTE_CATEGORIES": "Recipes,Travel,Work,Ideas"
}
```

Comma-separated, no extra spaces. Restart the client afterwards.

If the AI picks something not on the list, the note lands in `00-Inbox` rather than being rejected — you sort it out later instead of losing it.

---

## Troubleshooting

**The AI doesn't see any tools**
Check your JSON is valid — a missing comma or stray brace breaks it silently. Then restart the client.

**Errors mentioning `VAULT_PATH`**
The path must be absolute: `/Users/you/Documents/Notes`, not `~/Documents/Notes` or `./Notes`.

**First run takes forever**
Normal — `npx` is downloading the package. Later runs are much faster.

**Notes saved but search finds nothing**
The index may have drifted from the folder. See below.

---

## Known limitations

Stated plainly so you know upfront:

**The index can drift from the folder.** A note is written to disk first, then indexed. If the index write fails afterwards, the file exists but won't show up in search. Editing notes directly in Obsidian doesn't update the index either. There's no reindex command yet — [contributions welcome](#contributing).

**Search covers titles, not content.** `search_notes` matches on title, category, and tags. Full-text search over note bodies isn't implemented.

**Case sensitivity for non-ASCII.** Title search ignores case for English text, but not for accented characters (Vietnamese, etc.) — a SQLite limitation.

**Windows on ARM isn't supported.** The SQLite driver publishes no build for that platform. macOS (Intel and Apple Silicon), Windows x64, and Linux all work.

---

## Development

Requires [pnpm](https://pnpm.io). Copy `.env.example` to `.env` and set `VAULT_PATH`.

```bash
pnpm install
pnpm run build
pnpm run test
pnpm run lint

npx prisma migrate dev    # after changing prisma/schema.prisma
npx prisma generate
```

Drive the server by hand — it speaks JSON-RPC over stdin/stdout:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | VAULT_PATH=/tmp/test-vault node dist/src/main.js
```

One rule when working on this: **nothing may write to stdout.** That stream carries the protocol; a stray `console.log` corrupts it and the client drops the connection. Use `console.error` (stderr) for logging.

---

## Contributing

Issues and pull requests are welcome. Things that would genuinely help:

- A `reindex` command that rebuilds the index from the vault
- Full-text search over note content
- Test coverage — the service layer has none

---

## License

MIT — see [LICENSE](LICENSE).
