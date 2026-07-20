# Second Brain MCP

An [MCP](https://modelcontextprotocol.io) server that lets an AI assistant capture, search, read, update, and delete notes in a plain Markdown vault — the kind Obsidian reads.

You talk to your AI normally. When something is worth keeping, it files the note away for you: picks a category, adds tags, writes a `.md` file with YAML frontmatter. Later you can ask it to find things back. The notes stay yours — plain files on your disk, readable without this tool.

## How it works

Two storage layers, each doing what it's good at:

- **The vault** — your notes as `.md` files under `VAULT_PATH/<category>/`, with YAML frontmatter. This is the source of truth. Open it in Obsidian, grep it, back it up, sync it — it's just files.
- **Postgres** — an index of note metadata (title, category, tags, file path) so search is fast without scanning every file. Rebuildable from the vault if lost.

```
capture_note  →  writes .md to vault  →  indexes metadata in Postgres
search_notes  →  queries Postgres     →  returns metadata + note id
get_note      →  looks up path by id  →  reads the file from disk
```

## Tools exposed

| Tool | What it does |
|---|---|
| `capture_note` | Save a new note. The AI classifies category and tags from the content. |
| `search_notes` | Find notes by title keyword, category, and/or tags. Returns metadata, not content. |
| `get_note` | Read a note's full content by id. |
| `update_note` | Edit a note. Changing title or category moves the file to its new path. |
| `delete_note` | Remove a note from both the vault and the index. |

## Setup

You need [Docker](https://docs.docker.com/get-docker/) and a folder to keep notes in.

```bash
git clone https://github.com/pthieenlong/second-brain-mcp.git
cd second-brain-mcp

cp .env.example .env
# Open .env and set VAULT_PATH to an absolute path on your machine.
# Everything else has working defaults.

docker compose up -d
```

That's it. The server is at `http://localhost:3000/mcp`, Postgres migrations run automatically on startup, and both containers restart on their own if your machine reboots.

Check it came up:

```bash
docker compose logs app
```

### Connecting your AI client

Point any MCP client at `http://localhost:3000/mcp` over **HTTP** — this server speaks Streamable HTTP, not stdio. Configuration differs per client, but it usually looks like:

```json
{
  "mcpServers": {
    "second-brain": {
      "serverUrl": "http://localhost:3000/mcp"
    }
  }
}
```

If your client offers a transport dropdown, pick HTTP/SSE/Streamable rather than stdio. Clients configured with `command` + `args` will try to spawn this as a subprocess and fail — it's a web server, not a stdio process.

### Categories

Notes are filed into folders under your vault. The defaults:

```
01-Fundamentals  02-Work  03-Product-Thinking  04-Learning
05-Career        06-Personal  07-Projects
```

Change them in `.env` via `NOTE_CATEGORIES` (comma-separated), then `docker compose up -d --build`. Anything the AI picks that isn't on the list lands in `00-Inbox` instead of being rejected — so you sort it later rather than losing it.

## Development

The project uses **pnpm**. Postgres must be running (`docker compose up -d postgres`) and `.env` filled in.

```bash
pnpm install
pnpm run start:dev        # watch mode

pnpm run test             # unit tests
pnpm run build
pnpm run lint

npx prisma migrate dev    # create + apply a migration
npx prisma generate       # regenerate client after schema changes
```

Try a tool without an AI client:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_notes","arguments":{"keyword":"test"}}}'
```

## Things worth knowing

**No authentication.** Anything that can reach port 3000 can read and write your vault. Fine on `localhost`; put it behind auth before exposing it anywhere else.

**File and database can drift.** A note is written to disk first, then indexed. If the database write fails afterwards, the file exists but won't show up in search. There's no reconciliation job yet — [contributions welcome](#contributing).

**Default Postgres password.** `.env.example` ships with `brainpass`. Change it if the database is reachable beyond your machine.

## Contributing

Issues and pull requests are welcome. Some things that would genuinely help:

- Full-text or semantic search over note content (currently only titles are searchable)
- A reconciliation command that rebuilds the index from the vault
- Authentication for the MCP endpoint
- Test coverage — the service layer has none

## License

MIT — see [LICENSE](LICENSE).
